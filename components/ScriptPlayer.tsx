
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DialogueLine, CharacterVoice } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import StopIcon from './icons/StopIcon';

interface ScriptPlayerProps {
  script: DialogueLine[];
  onBack: () => void;
}

const ScriptPlayer: React.FC<ScriptPlayerProps> = ({ script, onBack }) => {
  const { voices, play, pause, resume, stop, isPlaying, isPaused, currentLineIndex } = useSpeech();
  const [characterVoices, setCharacterVoices] = useState<CharacterVoice[]>([]);
  
  const characters = useMemo(() => {
    const uniqueCharacters = new Set(script.map(line => line.character));
    return Array.from(uniqueCharacters);
  }, [script]);

  const dialogueContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (voices.length > 0 && characters.length > 0) {
      setCharacterVoices(characters.map((char, index) => ({
        character: char,
        voiceName: voices[index % voices.length]?.name || voices[0]?.name,
      })));
    }
  }, [voices, characters]);

  useEffect(() => {
    if (currentLineIndex !== null && dialogueContainerRef.current) {
        const activeElement = dialogueContainerRef.current.children[currentLineIndex] as HTMLElement;
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [currentLineIndex]);


  const handleVoiceChange = (character: string, voiceName: string) => {
    setCharacterVoices(prev => prev.map(cv => cv.character === character ? { ...cv, voiceName } : cv));
  };
  
  const handlePlay = () => {
    if(isPaused) resume();
    else play(script, characterVoices);
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-cyan-400">2. Play Your Skit</h2>
        <button
          onClick={onBack}
          className="bg-gray-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-500 transition-colors"
        >
          &larr; Back to Story
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
        {/* Voice Settings Panel */}
        <div className="md:col-span-1 bg-gray-900 p-4 rounded-lg flex flex-col space-y-4 overflow-y-auto">
          <h3 className="text-xl font-semibold text-gray-200 border-b border-gray-700 pb-2">Voice Settings</h3>
          {characters.map(char => (
            <div key={char}>
              <label className="block text-sm font-medium text-cyan-300 mb-1">{char}</label>
              <select
                value={characterVoices.find(cv => cv.character === char)?.voiceName || ''}
                onChange={(e) => handleVoiceChange(char, e.target.value)}
                className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                disabled={isPlaying}
              >
                {voices.map(voice => (
                  <option key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Script Panel */}
        <div className="md:col-span-2 bg-gray-900 p-4 rounded-lg flex flex-col min-h-0">
          <h3 className="text-xl font-semibold text-gray-200 border-b border-gray-700 pb-2 mb-2">Script</h3>
          <div ref={dialogueContainerRef} className="flex-grow overflow-y-auto space-y-3 pr-2">
            {script.map((line, index) => (
              <div key={index} className={`p-3 rounded-lg transition-all duration-300 ${currentLineIndex === index ? 'bg-cyan-900/50 ring-2 ring-cyan-500' : 'bg-gray-800'}`}>
                <p className="font-bold text-cyan-400">{line.character}</p>
                <p className="text-gray-300">{line.line}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-center space-x-4">
        <button
            onClick={isPlaying && !isPaused ? pause : handlePlay}
            disabled={!characterVoices.length}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:bg-gray-500 transition-colors"
            title={isPlaying && !isPaused ? 'Pause' : 'Play'}
        >
            {isPlaying && !isPaused ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8"/>}
        </button>
        <button
            onClick={stop}
            disabled={!isPlaying}
            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-500 disabled:bg-gray-500 transition-colors"
            title="Stop"
        >
            <StopIcon className="w-8 h-8"/>
        </button>
      </div>
    </div>
  );
};

export default ScriptPlayer;