import React, { useState } from 'react';
import StoryCreator from './StoryCreator';
import ScriptPlayer from './ScriptPlayer';
import ChatPanel from './ChatPanel';
import LoadingSpinner from './LoadingSpinner';
import { DialogueLine, ChatMessage } from '../types';
import { generateStory, generateScriptFromStory, askAboutStory } from '../services/geminiService';
import { SAMPLE_STORY } from '../constants';

import PlayIcon from './icons/PlayIcon';
import BrainIcon from './icons/BrainIcon';
import KeyIcon from './icons/KeyIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

type ViewMode = 'CREATING' | 'VIEWING' | 'PLAYING';
type AppMode = 'story' | 'reading' | 'notes' | 'tasks' | 'progress' | 'quiz' | 'code' | 'game';

interface StoryViewProps {
  setMode: (mode: AppMode) => void;
}

const StoryView: React.FC<StoryViewProps> = ({ setMode }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('VIEWING');
  const [story, setStory] = useState<string>(SAMPLE_STORY);
  const [script, setScript] = useState<DialogueLine[] | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [isStoryLoading, setIsStoryLoading] = useState<boolean>(false);
  const [isSkitLoading, setIsSkitLoading] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const [showFullStory, setShowFullStory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStory = async (prompt: string) => {
    setIsStoryLoading(true);
    setError(null);
    setChatMessages([]);
    try {
      const newStory = await generateStory(prompt);
      setStory(newStory);
      setViewMode('VIEWING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setViewMode('CREATING'); // Stay on creator page if error
    } finally {
      setIsStoryLoading(false);
    }
  };

  const handlePlayStory = async () => {
    if (!story) return;
    setIsSkitLoading(true);
    setError(null);
    try {
      const newScript = await generateScriptFromStory(story);
      setScript(newScript);
      setViewMode('PLAYING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSkitLoading(false);
    }
  };

  const handleAskQuestion = async (question: string) => {
    setIsChatLoading(true);
    setError(null);
    const newMessages: ChatMessage[] = [...chatMessages, { sender: 'user', text: question }];
    setChatMessages(newMessages);

    try {
      const answer = await askAboutStory(story, question);
      setChatMessages([...newMessages, { sender: 'ai', text: answer }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMsg);
      setChatMessages([...newMessages, { sender: 'ai', text: `Sorry, I encountered an error: ${errorMsg}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  const renderContent = () => {
    if (viewMode === 'CREATING') {
      return <StoryCreator 
        onGenerateStory={handleGenerateStory} 
        onCancel={() => setViewMode('VIEWING')}
        isLoading={isStoryLoading}
      />;
    }

    if (viewMode === 'PLAYING' && script) {
      return <ScriptPlayer 
        script={script} 
        onBack={() => setViewMode('VIEWING')}
      />;
    }

    // VIEWING mode
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel */}
        <div className="lg:col-span-3 bg-[#161b2a] p-6 rounded-xl border border-slate-700 space-y-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={handlePlayStory}
                disabled={isSkitLoading}
                className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-500 transition-colors disabled:bg-slate-600"
              >
                {isSkitLoading ? <div className="w-5 h-5"><LoadingSpinner message=''/></div> : <PlayIcon className="w-5 h-5" />}
                Play Story
              </button>
              <button onClick={() => setMode('game')} className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
                <BrainIcon className="w-5 h-5" />
                Play a Game
              </button>
            </div>
            <button onClick={() => setViewMode('CREATING')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <KeyIcon className="w-4 h-4" />
              Start New Story
            </button>
          </div>

          <div className="pt-4">
            <button onClick={() => setShowFullStory(!showFullStory)} className="flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 mb-2">
              {showFullStory ? 'Hide Full Story' : 'Show Full Story'}
              {showFullStory ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
            {showFullStory && (
              <div className="bg-[#121826] p-4 rounded-lg border border-slate-700 max-h-[50vh] overflow-y-auto space-y-4 text-slate-300 leading-relaxed">
                {story.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="lg:col-span-2 bg-[#161b2a] p-6 rounded-xl border border-slate-700">
          <ChatPanel 
            messages={chatMessages}
            onSendMessage={handleAskQuestion}
            isLoading={isChatLoading}
          />
        </div>
      </div>
    );
  };
  
  return (
    <>
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-300">&times;</button>
        </div>
      )}
      <div className="min-h-[70vh]">
        {renderContent()}
      </div>
    </>
  );
};

export default StoryView;