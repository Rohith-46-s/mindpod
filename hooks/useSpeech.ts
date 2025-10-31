
import { useState, useEffect, useCallback, useRef } from 'react';
import { DialogueLine, CharacterVoice } from '../types';

export const useSpeech = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null);

  const utteranceQueue = useRef<SpeechSynthesisUtterance[]>([]);

  const populateVoices = useCallback(() => {
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0) {
      setVoices(availableVoices.filter(voice => voice.lang.startsWith('en')));
    }
  }, []);

  useEffect(() => {
    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [populateVoices]);
  
  const play = (script: DialogueLine[], characterVoices: CharacterVoice[]) => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
    }
    
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentLineIndex(0);

    const characterVoiceMap = new Map(characterVoices.map(cv => [cv.character, cv.voiceName]));

    utteranceQueue.current = script.map((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line.line);
      const voiceName = characterVoiceMap.get(line.character);
      const voice = voices.find(v => v.name === voiceName);
      
      utterance.voice = voice || voices[index % voices.length] || null; // Fallback voice
      utterance.pitch = 1;
      utterance.rate = 1;

      utterance.onstart = () => {
        setCurrentLineIndex(index);
      };

      utterance.onend = () => {
        if (index === script.length - 1) {
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentLineIndex(null);
        }
      };
      
      return utterance;
    });

    utteranceQueue.current.forEach(utterance => window.speechSynthesis.speak(utterance));
  };

  const pause = () => {
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resume = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentLineIndex(null);
    utteranceQueue.current = [];
  };

  return { voices, play, pause, resume, stop, isPlaying, isPaused, currentLineIndex };
};
