import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';

const STORAGE_KEY = 'storypod_notes';

export const useStoredNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setNotes(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to load notes from localStorage", error);
    }
  }, []);

  const persistNotes = useCallback((newNotes: Note[]) => {
    try {
      // Sort notes by pinned status first, then by last updated time
      const sortedNotes = newNotes.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedNotes));
      setNotes(sortedNotes);
    } catch (error) {
      console.error("Failed to save notes to localStorage", error);
    }
  }, []);

  const addNote = (initialValues?: { title?: string; content?: string; linkedDocumentId?: string }): string => {
    const newNote: Note = {
      id: `${Date.now()}`,
      title: initialValues?.title || 'New Note',
      content: initialValues?.content || '',
      tags: [],
      isPinned: false,
      linkedDocumentId: initialValues?.linkedDocumentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    persistNotes([...notes, newNote]);
    return newNote.id;
  };

  const updateNote = (id: string, title: string, content: string) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, title, content, updatedAt: Date.now() } : note
    );
    persistNotes(updatedNotes);
  };
  
  const updateNoteLink = (id: string, linkedDocumentId: string | undefined) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, linkedDocumentId, updatedAt: Date.now() } : note
    );
    persistNotes(updatedNotes);
  };
  
  const updateNoteTags = (id: string, tags: string[]) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, tags, updatedAt: Date.now() } : note
    );
    persistNotes(updatedNotes);
  };

  const togglePinNote = (id: string) => {
    const updatedNotes = notes.map(note =>
        note.id === id ? { ...note, isPinned: !note.isPinned, updatedAt: Date.now() } : note
    );
    persistNotes(updatedNotes);
  };

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    persistNotes(updatedNotes);
  };

  return { notes, addNote, updateNote, deleteNote, updateNoteLink, updateNoteTags, togglePinNote };
};