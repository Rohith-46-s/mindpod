import { useState, useEffect, useRef, useCallback } from 'react';

export type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface UseVoiceAssistantProps {
  onTranscript: (transcript: string) => void;
  onStatusChange?: (status: AssistantStatus) => void;
}

// Add a minimal interface for SpeechRecognition to satisfy TypeScript
// as it may not be in the default TS DOM library.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

// Renamed to avoid shadowing the global type name.
const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const synthesis = window.speechSynthesis;

export const useVoiceAssistant = ({ onTranscript, onStatusChange }: UseVoiceAssistantProps) => {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Use a ref to track the latest status to avoid stale closures in callbacks.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const setAssistantStatus = useCallback((newStatus: AssistantStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && statusRef.current === 'listening') {
      recognitionRef.current.stop();
      // The onend handler will set status to idle.
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!text || !synthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      stopListening(); // Stop listening when assistant starts speaking.
      setAssistantStatus('speaking');
    };
    utterance.onend = () => {
      setAssistantStatus('idle');
      onEnd?.();
    };
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setAssistantStatus('error');
    };
    
    // This function contains the logic to actually speak.
    const doSpeak = () => {
        synthesis.cancel(); // Cancel any current or pending speech.
        synthesis.speak(utterance);
    }
    
    // Robustness Fix: The browser's voice list loads asynchronously.
    // We must wait for it to be populated before trying to speak.
    if (synthesis.getVoices().length > 0) {
        doSpeak();
    } else {
        // If voices aren't ready, set a listener. It will fire once they are.
        synthesis.onvoiceschanged = doSpeak;
    }

  }, [setAssistantStatus, stopListening]);

  useEffect(() => {
    if (!SpeechRecognitionImpl) {
      console.error("Browser does not support Speech Recognition API.");
      setAssistantStatus('error');
      return;
    }

    // Initialize the recognition instance.
    const recognition: SpeechRecognition = new SpeechRecognitionImpl();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setAssistantStatus('listening');
    };

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      if (transcript) {
          onTranscript(transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      // "no-speech" is a common event when the user doesn't say anything.
      // We don't treat this as an error.
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error', event.error);
        setAssistantStatus('error');
      } else {
        setAssistantStatus('idle');
      }
    };

    recognition.onend = () => {
      // Only transition to idle if we were 'listening'. This prevents
      // this handler from incorrectly setting status to 'idle' while
      // the assistant is 'speaking' or 'thinking'.
      if (statusRef.current === 'listening') {
        setAssistantStatus('idle');
      }
    };
    
    recognitionRef.current = recognition;

    return () => {
        synthesis.cancel();
        if (recognition) {
            recognition.onstart = null;
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            recognition.stop();
        }
    }
  }, [onTranscript, setAssistantStatus]);

  const startListening = () => {
    if (recognitionRef.current && statusRef.current !== 'listening') {
      try {
        synthesis.cancel(); // Stop any speaking before listening.
        recognitionRef.current.start();
      } catch (e) {
        // This can happen if recognition is already started.
        console.error("Could not start recognition:", e);
      }
    }
  };
  
  const stopSpeaking = () => {
    synthesis.cancel();
    if (statusRef.current === 'speaking') {
      setAssistantStatus('idle');
    }
  };

  return { status, startListening, stopListening, speak, stopSpeaking, setAssistantStatus };
};
