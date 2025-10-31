import React, { useState } from 'react';

interface AiNoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent: string;
  onSave: (content: string) => void;
  documentTitle: string;
}

const AiNoteEditorModal: React.FC<AiNoteEditorModalProps> = ({
  isOpen,
  onClose,
  initialContent,
  onSave,
  documentTitle,
}) => {
  const [content, setContent] = useState(initialContent);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(content);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-3xl p-6 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-2">AI-Generated Notes</h2>
        <p className="text-sm text-slate-400 mb-4">
          Review and edit the notes for "{documentTitle}".
        </p>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full flex-grow bg-slate-900 text-slate-300 p-4 rounded-md border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          placeholder="AI-generated notes will appear here..."
        />

        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={onClose}
            className="bg-slate-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500 transition-colors"
          >
            Save as New Note
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiNoteEditorModal;
