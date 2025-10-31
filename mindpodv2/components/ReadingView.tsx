import React, { useState, useMemo } from 'react';
import { useStoredDocuments } from '../hooks/useStoredDocuments';
import { useStoredNotes } from '../hooks/useStoredNotes';
import DocumentManager from './DocumentManager';
import DocumentViewer from './DocumentViewer';
import ChatPanel from './ChatPanel';
import AiNoteEditorModal from './AiNoteEditorModal';
import { askAboutDocument, generateNotesFromDocument } from '../services/geminiService';
import { ChatMessage } from '../types';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import BookIcon from './icons/BookIcon';
import NotesIcon from './icons/NotesIcon';

interface ReadingViewProps {
  selectedDocumentId: string | null;
  onSelectDocument: (id: string | null) => void;
}

// Helper to convert a Data URL back to a File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    // The first part of the array is the one that has the mime type
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}


const ReadingView: React.FC<ReadingViewProps> = ({ selectedDocumentId, onSelectDocument }) => {
  const { documents, addDocument, deleteDocument, updateDocumentChat } = useStoredDocuments();
  const { addNote } = useStoredNotes();
  
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isAiNoteLoading, setIsAiNoteLoading] = useState<boolean>(false);
  const [isAiNoteModalOpen, setIsAiNoteModalOpen] = useState(false);
  const [aiGeneratedNoteContent, setAiGeneratedNoteContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedDocument = useMemo(() => {
    return documents.find(doc => doc.id === selectedDocumentId) || null;
  }, [documents, selectedDocumentId]);

  const documentFile = useMemo(() => {
    if (selectedDocument) {
      try {
        return dataURLtoFile(selectedDocument.fileDataUrl, selectedDocument.fileName);
      } catch (e) {
        setError("Failed to load the document file. It might be corrupted.");
        return null;
      }
    }
    return null;
  }, [selectedDocument]);

  const handleSendMessage = async (message: string) => {
    if (!documentFile || !selectedDocument) return;

    setIsChatLoading(true);
    setError(null);
    const newMessages: ChatMessage[] = [...selectedDocument.chatHistory, { sender: 'user', text: message }];
    updateDocumentChat(selectedDocument.id, newMessages);
    
    try {
      const answer = await askAboutDocument(documentFile, message);
      const finalMessages: ChatMessage[] = [...newMessages, { sender: 'ai', text: answer }];
      updateDocumentChat(selectedDocument.id, finalMessages);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMsg);
      const errorMessages: ChatMessage[] = [...newMessages, { sender: 'ai', text: `Sorry, I encountered an error: ${errorMsg}` }];
      updateDocumentChat(selectedDocument.id, errorMessages);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateAiNotes = async () => {
    if (!documentFile) return;
    setIsAiNoteLoading(true);
    setError(null);
    try {
        const notes = await generateNotesFromDocument(documentFile);
        setAiGeneratedNoteContent(notes);
        setIsAiNoteModalOpen(true);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not generate notes from this document.');
    } finally {
        setIsAiNoteLoading(false);
    }
  };

  const handleSaveAiNote = (content: string) => {
    if (!selectedDocument) return;
    addNote({
        title: `Notes for ${selectedDocument.fileName}`,
        content: content,
        linkedDocumentId: selectedDocument.id,
    });
    setIsAiNoteModalOpen(false);
    // Optionally, switch to the notes tab after saving.
    // setMode('notes'); // This would require lifting state up to App.tsx
  };

  const handleSelectDocument = (id: string | null) => {
    onSelectDocument(id);
    setError(null);
  }

  const handleDeleteDocument = (id: string) => {
    deleteDocument(id);
    if (selectedDocumentId === id) {
      onSelectDocument(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const newDocId = await addDocument(file);
      onSelectDocument(newDocId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the document.');
    }
  };
  
  return (
    <div>
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-300">&times;</button>
        </div>
      )}
      
      {isAiNoteModalOpen && selectedDocument && (
        <AiNoteEditorModal
          isOpen={isAiNoteModalOpen}
          onClose={() => setIsAiNoteModalOpen(false)}
          initialContent={aiGeneratedNoteContent}
          onSave={handleSaveAiNote}
          documentTitle={selectedDocument.fileName}
        />
      )}

      {selectedDocument && documentFile ? (
        // FOCUSED DOCUMENT VIEW
        <div>
            <div className="flex flex-wrap gap-4 items-center mb-4">
              <button
                  onClick={() => handleSelectDocument(null)}
                  className="flex items-center gap-2 px-4 py-2 font-semibold text-slate-300 bg-[#161b2a] rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
              >
                  <ArrowLeftIcon className="w-5 h-5" />
                  Back to My Documents
              </button>
               <button
                  onClick={handleGenerateAiNotes}
                  disabled={isAiNoteLoading}
                  className="flex items-center gap-2 px-4 py-2 font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-500 transition-colors disabled:bg-slate-600"
              >
                  <NotesIcon className="w-5 h-5" />
                  {isAiNoteLoading ? 'Generating...' : 'Generate AI Notes'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
                <div className="md:col-span-7 bg-[#161b2a] p-6 rounded-xl border border-slate-700">
                    <DocumentViewer file={documentFile} setError={setError} />
                </div>
                <div className="md:col-span-3 bg-[#161b2a] p-6 rounded-xl border border-slate-700">
                    <ChatPanel
                    messages={selectedDocument.chatHistory}
                    onSendMessage={handleSendMessage}
                    isLoading={isChatLoading}
                    title="Chat with your document"
                    placeholder="What is this document about?"
                    />
                </div>
            </div>
        </div>
      ) : (
        // DOCUMENT LIST VIEW
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-1 bg-[#161b2a] p-4 rounded-xl border border-slate-700 h-full">
                <DocumentManager 
                    documents={documents}
                    selectedDocumentId={selectedDocumentId}
                    onSelectDocument={handleSelectDocument}
                    onDeleteDocument={handleDeleteDocument}
                    onFileUpload={handleFileUpload}
                />
            </div>
            <div className="lg:col-span-4 flex items-center justify-center min-h-[70vh] bg-[#161b2a] p-6 rounded-xl border border-slate-700">
                <div className="text-center">
                    <BookIcon className="mx-auto h-16 w-16 text-slate-600" />
                    <h2 className="mt-4 text-xl font-semibold text-slate-300">Select a document</h2>
                    <p className="mt-1 text-slate-500">Choose a document from the list on the left to start chatting, or upload a new one.</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReadingView;