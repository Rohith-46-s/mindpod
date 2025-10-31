import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface StoryCreatorProps {
  onGenerateStory: (prompt: string) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const StoryCreator: React.FC<StoryCreatorProps> = ({ onGenerateStory, onCancel, isLoading }) => {
  const [prompt, setPrompt] = useState<string>("A sci-fi story about hope");

  const handleGenerateClick = () => {
    if (prompt.trim()) {
      onGenerateStory(prompt);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
        {isLoading ? (
            <LoadingSpinner message="Generating your amazing story..." />
        ) : (
            <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-lg p-8 space-y-6 border border-slate-700">
                <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Create a New Story</h2>
                <p className="text-center text-slate-400">Enter a theme or a starting sentence, and let the AI bring your idea to life.</p>
                
                <div className="space-y-2">
                    <label htmlFor="prompt-input" className="text-sm font-medium text-slate-300">Your Prompt</label>
                    <input
                        id="prompt-input"
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'A cat who dreams of being an astronaut'"
                        className="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        onKeyUp={(e) => e.key === 'Enter' && handleGenerateClick()}
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                        onClick={onCancel}
                        className="w-full bg-slate-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-slate-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerateClick}
                        disabled={!prompt.trim()}
                        className="w-full bg-indigo-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-indigo-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                        Generate Story
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default StoryCreator;