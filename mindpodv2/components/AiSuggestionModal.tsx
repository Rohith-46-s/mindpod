import React from 'react';

interface AiSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onApply: () => void;
}

const AiSuggestionModal: React.FC<AiSuggestionModalProps> = ({
  isOpen,
  onClose,
  title,
  content,
  onApply,
}) => {
  if (!isOpen) return null;

  const handleApply = () => {
    onApply();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl p-6 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        
        <div className="flex-grow bg-slate-900 text-slate-300 p-4 rounded-md border border-slate-700 overflow-y-auto">
             {content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-2">{paragraph}</p>
            ))}
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={onClose}
            className="bg-slate-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiSuggestionModal;