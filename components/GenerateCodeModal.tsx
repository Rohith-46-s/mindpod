import React, { useState } from 'react';

interface GenerateCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

const GenerateCodeModal: React.FC<GenerateCodeModalProps> = ({ isOpen, onClose, onGenerate, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Generate Code with AI</h2>
        <p className="text-slate-400 mb-4">Describe the code you want to generate. For example, "a function to calculate the factorial of a number".</p>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="w-full h-32 bg-slate-900 text-slate-300 p-3 rounded-md border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
          autoFocus
        />

        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={onClose}
            className="bg-slate-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-500 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500 transition-colors disabled:bg-slate-500"
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateCodeModal;