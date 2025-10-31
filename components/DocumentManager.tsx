import React, { useState } from 'react';
import { StoredDocument } from '../types';
import FileIcon from './icons/FileIcon';
import TrashIcon from './icons/TrashIcon';
import UploadIcon from './icons/UploadIcon';
import FileUpload from './FileUpload';

interface DocumentManagerProps {
  documents: StoredDocument[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string | null) => void;
  onDeleteDocument: (id: string) => void;
  onFileUpload: (file: File) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
  onFileUpload,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleFileUploaded = (file: File) => {
    onFileUpload(file);
    setIsUploadModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-slate-200 mb-4">My Documents</h2>
      <div className="flex-grow space-y-2 overflow-y-auto pr-2">
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No documents yet. Upload one to get started!</p>
        ) : (
          documents.map(doc => (
            <div
              key={doc.id}
              onClick={() => onSelectDocument(doc.id)}
              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                selectedDocumentId === doc.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <FileIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium truncate" title={doc.fileName}>
                  {doc.fileName}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent selection when deleting
                  onDeleteDocument(doc.id);
                }}
                className={`p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ${
                    selectedDocumentId === doc.id ? 'hover:text-white hover:bg-indigo-500' : 'hover:text-red-400 hover:bg-slate-600'
                }`}
                title="Delete document"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-700">
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          <UploadIcon className="w-5 h-5" />
          Upload New
        </button>
      </div>

      {isUploadModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl">
            <FileUpload onFileUpload={handleFileUploaded} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;