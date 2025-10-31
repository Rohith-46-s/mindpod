import React, { useState, useEffect, useMemo } from 'react';
import { useStoredNotes } from '../hooks/useStoredNotes';
import { useStoredDocuments } from '../hooks/useStoredDocuments';
import { summarizeText, suggestTitle, highlightKeyPoints, generateFlashcards } from '../services/geminiService';
import { Flashcard } from '../types';

import LinkDocumentModal from './LinkDocumentModal';
import AiSuggestionModal from './AiSuggestionModal';
import FlashcardsModal from './FlashcardsModal';

import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import NotesIcon from './icons/NotesIcon';
import SparklesIcon from './icons/SparklesIcon';
import LinkIcon from './icons/LinkIcon';
import DownloadIcon from './icons/DownloadIcon';
import FileIcon from './icons/FileIcon';
import StarIcon from './icons/StarIcon';
import BellIcon from './icons/BellIcon';
import DocumentIcon from './icons/DocumentIcon';


// This tells TypeScript that jspdf will be available on the window object
declare const jspdf: any;

type SaveStatus = 'idle' | 'saving' | 'saved';

interface NotesViewProps {
  targetNoteId: string | null;
  onNoteSelected: () => void;
}

const NotesView: React.FC<NotesViewProps> = ({ targetNoteId, onNoteSelected }) => {
  const { notes, addNote, updateNote, deleteNote, updateNoteLink, updateNoteTags, togglePinNote } = useStoredNotes();
  const { documents } = useStoredDocuments();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [currentTags, setCurrentTags] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [suggestionData, setSuggestionData] = useState<{ title: string; content: string; onApply: () => void; } | null>(null);

  const [isFlashcardsModalOpen, setIsFlashcardsModalOpen] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);
  const linkedDocument = useMemo(() => documents.find(d => d.id === selectedNote?.linkedDocumentId), [documents, selectedNote]);

  // Handle external note selection (e.g., from search)
  useEffect(() => {
    if (targetNoteId) {
      setSelectedNoteId(targetNoteId);
      onNoteSelected(); // Reset the target ID in the parent
    }
  }, [targetNoteId, onNoteSelected]);

  useEffect(() => {
    if (selectedNote) {
      setCurrentTitle(selectedNote.title);
      setCurrentContent(selectedNote.content);
      setCurrentTags((selectedNote.tags || []).join(', '));
      setSaveStatus('idle');
    } else {
      if (!selectedNoteId && notes.length > 0) {
        setSelectedNoteId(notes[0].id);
      } else if (notes.length === 0) {
          setCurrentTitle('');
          setCurrentContent('');
          setCurrentTags('');
      }
    }
  }, [selectedNote, notes]);
  
  // Auto-save logic
  useEffect(() => {
    if (!selectedNote) return;
    const isChanged = currentTitle !== selectedNote.title || currentContent !== selectedNote.content;
    
    if (isChanged) setSaveStatus('saving');

    const handler = setTimeout(() => {
        if (isChanged) {
          updateNote(selectedNote.id, currentTitle, currentContent);
          setSaveStatus('saved');
          const savedTimeout = setTimeout(() => setSaveStatus('idle'), 2000);
          return () => clearTimeout(savedTimeout);
        }
    }, 1500); // Debounce time

    return () => clearTimeout(handler);
  }, [currentTitle, currentContent, selectedNote, updateNote]);

  // Auto-save for tags
  useEffect(() => {
    if (!selectedNote) return;
    const tagsArray = currentTags.split(',').map(t => t.trim()).filter(Boolean);
    const tagsChanged = JSON.stringify(tagsArray) !== JSON.stringify(selectedNote.tags);
    if (tagsChanged) {
        const handler = setTimeout(() => {
            updateNoteTags(selectedNote.id, tagsArray);
        }, 500);
        return () => clearTimeout(handler);
    }
  }, [currentTags, selectedNote, updateNoteTags]);


  const handleAddNote = () => {
    const newNoteId = addNote();
    setSelectedNoteId(newNoteId);
  };

  const handleDeleteNote = (id: string) => {
    const currentIndex = notes.findIndex(n => n.id === id);
    deleteNote(id);
    if (selectedNoteId === id) {
      const newNotes = notes.filter(n => n.id !== id);
      if (newNotes.length > 0) {
        setSelectedNoteId(newNotes[Math.max(0, currentIndex - 1)].id);
      } else {
        setSelectedNoteId(null);
      }
    }
  };

  const handleAiAction = async (action: 'summarize' | 'title' | 'highlight' | 'flashcards') => {
    if (!currentContent) return;
    setIsLoading(prev => ({...prev, [action]: true}));
    try {
        if (action === 'summarize') {
            const summary = await summarizeText(currentContent);
            setSuggestionData({
                title: "AI Summary",
                content: summary,
                onApply: () => setCurrentContent(prev => `${prev}\n\n---\n\n**Summary:**\n${summary}`)
            });
            setIsSuggestionModalOpen(true);
        } else if (action === 'title') {
            const title = await suggestTitle(currentContent);
            setSuggestionData({
                title: "Suggested Title",
                content: `The AI suggests the title: "${title}"`,
                onApply: () => setCurrentTitle(title)
            });
            setIsSuggestionModalOpen(true);
        } else if (action === 'highlight') {
            const points = await highlightKeyPoints(currentContent);
            setSuggestionData({
                title: "Key Points",
                content: points,
                onApply: () => setCurrentContent(prev => `${prev}\n\n---\n\n**Key Points:**\n${points}`)
            });
            setIsSuggestionModalOpen(true);
        } else if (action === 'flashcards') {
            const generatedFlashcards = await generateFlashcards(currentContent);
            setFlashcards(generatedFlashcards);
            setIsFlashcardsModalOpen(true);
        }
    } catch (error) {
        console.error(`${action} failed:`, error);
        alert(`Failed to perform AI action: ${action}.`);
    } finally {
        setIsLoading(prev => ({...prev, [action]: false}));
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedNote) return;
    try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(currentTitle, 10, 20);
        doc.setFontSize(12);
        const splitText = doc.splitTextToSize(currentContent, 180);
        doc.text(splitText, 10, 30);
        doc.save(`${currentTitle.replace(/ /g, '_')}.pdf`);
    } catch (error) {
        console.error("PDF generation failed:", error);
        alert("Could not download PDF. The jspdf library might not be loaded.");
    }
  };

  const handleLinkDocument = (documentId: string | undefined) => {
    if (selectedNoteId) {
      updateNoteLink(selectedNoteId, documentId);
    }
    setIsLinkModalOpen(false);
  }
  
  const wordCount = useMemo(() => currentContent.trim().split(/\s+/).filter(Boolean).length, [currentContent]);

  return (
    <>
    {isLinkModalOpen && selectedNoteId && (
        <LinkDocumentModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} documents={documents} onLink={handleLinkDocument} currentLinkedId={selectedNote?.linkedDocumentId}/>
    )}
    {isSuggestionModalOpen && suggestionData && (
        <AiSuggestionModal {...suggestionData} isOpen={isSuggestionModalOpen} onClose={() => setIsSuggestionModalOpen(false)} />
    )}
    {isFlashcardsModalOpen && (
        <FlashcardsModal flashcards={flashcards} isOpen={isFlashcardsModalOpen} onClose={() => setIsFlashcardsModalOpen(false)} />
    )}

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[70vh]">
      <div className="lg:col-span-1 bg-[#161b2a] p-4 rounded-xl border border-slate-700 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-200">My Notes</h2>
          <button onClick={handleAddNote} className="p-2 rounded-full text-slate-300 bg-slate-700 hover:bg-indigo-600 hover:text-white transition-transform hover:scale-110 active:scale-95" title="Add New Note">
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-grow space-y-2 overflow-y-auto pr-2">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => setSelectedNoteId(note.id)}
              className={`group flex items-center justify-between p-3 rounded-md cursor-pointer transition-all duration-200 ${selectedNoteId === note.id ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#161b2a]' : 'hover:bg-slate-700'}`}
            >
              <div className="flex items-center gap-3 truncate">
                <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium truncate text-sm">{note.title}</span>
              </div>
              <div className="flex items-center">
                 <button onClick={(e) => { e.stopPropagation(); togglePinNote(note.id); }} className={`p-1 rounded transition-colors ${note.isPinned ? 'text-yellow-400' : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-yellow-400'}`} >
                    <StarIcon filled={note.isPinned} className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }} className="p-1 rounded text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-600 hover:text-red-400 transition-opacity">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {notes.length === 0 && <p className="text-center text-slate-500 text-sm py-4">No notes yet. Create one!</p>}
        </div>
      </div>

      <div className="lg:col-span-3 bg-[#161b2a] p-6 rounded-xl border border-slate-700 flex flex-col">
        {selectedNote ? (
          <>
            <input type="text" value={currentTitle} onChange={(e) => setCurrentTitle(e.target.value)} placeholder="Note Title" className="w-full bg-transparent text-3xl font-bold text-slate-100 focus:outline-none mb-2" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs text-slate-400">
                <span>{new Date(selectedNote.updatedAt).toLocaleString()}</span>
                <span>|</span>
                <span>{wordCount} words</span>
                <div className="w-20">
                    {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
                    {saveStatus === 'saved' && <span className="text-green-400">✓ Saved</span>}
                </div>
            </div>
            {linkedDocument && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 px-3 py-1 rounded-full mb-4 w-fit">
                    <FileIcon className="w-3 h-3"/>
                    <span>Linked to: {linkedDocument.fileName}</span>
                </div>
            )}
            <textarea value={currentContent} onChange={(e) => setCurrentContent(e.target.value)} placeholder="Start writing your note here..." className="w-full flex-grow bg-[#121826] font-mono text-slate-300 p-4 rounded-md border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" />
            <input type="text" value={currentTags} onChange={(e) => setCurrentTags(e.target.value)} placeholder="Add tags, separated by commas..." className="w-full bg-slate-700/50 text-sm p-2 mt-4 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            
            <div className="flex flex-wrap gap-2 mt-4">
                <button disabled={isLoading['title'] || !currentContent} className="flex items-center gap-2 text-sm text-white bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 rounded-lg font-semibold disabled:bg-slate-600 transition-transform hover:scale-105 active:scale-95" onClick={() => handleAiAction('title')}>
                    <SparklesIcon className="w-4 h-4" /> {isLoading['title'] ? 'Thinking...' : 'Suggest Title'}
                </button>
                <button disabled={isLoading['summarize'] || !currentContent} className="flex items-center gap-2 text-sm text-white bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-lg font-semibold disabled:bg-slate-600 transition-transform hover:scale-105 active:scale-95" onClick={() => handleAiAction('summarize')}>
                    <SparklesIcon className="w-4 h-4" /> {isLoading['summarize'] ? 'Summarizing...' : 'Summarize'}
                </button>
                 <button disabled={isLoading['highlight'] || !currentContent} className="flex items-center gap-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-semibold disabled:bg-slate-600 transition-transform hover:scale-105 active:scale-95" onClick={() => handleAiAction('highlight')}>
                    <SparklesIcon className="w-4 h-4" /> {isLoading['highlight'] ? 'Analyzing...' : 'Highlight Points'}
                </button>
                <button disabled={isLoading['flashcards'] || !currentContent} className="text-sm text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg font-semibold transition-transform hover:scale-105 active:scale-95" onClick={() => handleAiAction('flashcards')}> {isLoading['flashcards'] ? 'Creating...' : 'Gen. Flashcards'}</button>
                <button className="flex items-center gap-2 text-sm text-white bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-lg font-semibold transition-transform hover:scale-105 active:scale-95" onClick={handleDownloadPdf}>
                    <DownloadIcon className="w-4 h-4" /> PDF
                </button>
                 <button className="flex items-center gap-2 text-sm text-white bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-lg font-semibold transition-transform hover:scale-105 active:scale-95" onClick={() => setIsLinkModalOpen(true)}>
                    <LinkIcon className="w-4 h-4" /> Link
                </button>
                <button className="flex items-center gap-2 text-sm text-white bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded-lg font-semibold transition-transform hover:scale-105 active:scale-95" onClick={() => alert('Reminder feature coming soon!')}>
                    <BellIcon className="w-4 h-4" /> Remind Me
                </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <NotesIcon className="mx-auto h-16 w-16 text-slate-600" />
              <h2 className="mt-4 text-xl font-semibold text-slate-300">Select a note to view or edit</h2>
              <p className="mt-1 text-slate-500">Or create a new one to get started.</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default NotesView;