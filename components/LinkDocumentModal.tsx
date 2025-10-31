import React from 'react';
import { StoredDocument } from '../types';
import FileIcon from './icons/FileIcon';

interface LinkDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: StoredDocument[];
  onLink: (documentId: string | undefined) => void;
  currentLinkedId?: string;
}

const LinkDocumentModal: React.FC<LinkDocumentModalProps> = ({ isOpen, onClose, documents, onLink, currentLinkedId }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">Link to a Document</h2>
        <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
          {documents.length > 0 ? (
            documents.map(doc => (
              <button
                key={doc.id}
                onClick={() => onLink(doc.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                  currentLinkedId === doc.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{doc.fileName}</span>
              </button>
            ))
          ) : (
            <p className="text-slate-400 text-sm text-center py-4">
              No documents found. Upload a document in the 'Reading' tab first.
            </p>
          )}
        </div>
        <div className="flex justify-between items-center mt-6">
          {currentLinkedId && (
            <button
              onClick={() => onLink(undefined)}
              className="text-sm text-red-400 hover:text-red-300 font-semibold"
            >
              Unlink Document
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto bg-slate-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkDocumentModal;
