import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import DocumentIcon from './icons/DocumentIcon';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, notes, onSelectNote }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredNotes = React.useMemo(() => {
    if (!searchTerm) return notes.slice(0, 10); // Show recent notes initially
    const lowercasedTerm = searchTerm.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(lowercasedTerm) || 
      note.content.toLowerCase().includes(lowercasedTerm) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, notes]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveIndex(0);
    }
  }, [isOpen]);
  
  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredNotes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredNotes.length) % filteredNotes.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNotes[activeIndex]) {
          onSelectNote(filteredNotes[activeIndex].id);
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, filteredNotes, onSelectNote]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161b2a] rounded-xl border border-slate-700 w-full max-w-2xl flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search notes by title, content, or tag..."
          className="w-full bg-transparent text-lg p-4 text-slate-100 focus:outline-none"
          autoFocus
        />
        <div className="border-t border-slate-700 overflow-y-auto">
            {filteredNotes.length > 0 ? (
                filteredNotes.map((note, index) => (
                    <div
                        key={note.id}
                        onClick={() => onSelectNote(note.id)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex items-center gap-4 p-4 cursor-pointer ${activeIndex === index ? 'bg-indigo-600' : ''}`}
                    >
                        <DocumentIcon className="w-6 h-6 flex-shrink-0 text-slate-400" />
                        <div>
                            <p className={`font-semibold ${activeIndex === index ? 'text-white' : 'text-slate-200'}`}>{note.title}</p>
                            <p className={`text-sm truncate max-w-md ${activeIndex === index ? 'text-indigo-200' : 'text-slate-500'}`}>{note.content || 'No content'}</p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="p-4 text-center text-slate-500">No results found.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;