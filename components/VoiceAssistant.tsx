import React, { useEffect } from 'react';
import { AssistantStatus } from '../hooks/useVoiceAssistant';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface VoiceAssistantProps {
  speak: (text: string, onEnd?: () => void) => void;
  status: AssistantStatus;
  startListening: () => void;
  stopListening: () => void;
  userName: string | null;
  setIsGatheringName: (isGathering: boolean) => void;
}

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  speak, 
  status, 
  startListening, 
  stopListening,
  userName,
  setIsGatheringName
}) => {

  useEffect(() => {
    // On first load when userName is not set, greet the user and ask for their name.
    if (userName === null) {
      // Use sessionStorage to prevent re-asking if the user refreshes mid-greeting.
      const hasBeenGreeted = sessionStorage.getItem('voiceAssistantGreeted');
      if (!hasBeenGreeted) {
          sessionStorage.setItem('voiceAssistantGreeted', 'true');
          // The speak function now handles voice readiness, so we can call it directly.
          speak("Hi there! To personalize our chat, what should I call you?", () => {
            setIsGatheringName(true);
            startListening();
          });
      }
    }
    // Only re-run if the user name changes (i.e. on initial load and after name is set).
    // The other functions are stable.
  }, [userName, speak, setIsGatheringName, startListening]);

  const statusClasses: Record<AssistantStatus, string> = {
    idle: 'text-slate-400 hover:text-white',
    listening: 'text-red-500 animate-pulse',
    speaking: 'text-cyan-400',
    thinking: 'text-amber-400 animate-pulse',
    error: 'text-red-600',
  };

  const statusTitle: Record<AssistantStatus, string> = {
    idle: 'Click to activate voice assistant',
    listening: 'Listening... Click to stop',
    speaking: 'Speaking...',
    thinking: 'Thinking...',
    error: 'An error occurred. Please refresh.',
  };
  
  return (
    <button
      onClick={status === 'listening' ? stopListening : startListening}
      className={`p-2 rounded-full transition-colors ${statusClasses[status]}`}
      title={statusTitle[status]}
    >
      <MicrophoneIcon className="w-5 h-5" />
    </button>
  );
};

export default VoiceAssistant;