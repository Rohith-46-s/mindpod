import { useState, useEffect } from 'react';
import { StoredDocument, ChatMessage } from '../types';

const STORAGE_KEY = 'storypod_documents';

// Helper to convert a File object to a Base64 Data URL
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const useStoredDocuments = () => {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);

  // Load documents from localStorage on initial render
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setDocuments(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to load documents from localStorage", error);
    }
  }, []);

  // Persist documents to localStorage whenever they change
  const persistDocuments = (docs: StoredDocument[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to save documents to localStorage", error);
    }
  };

  const addDocument = async (file: File): Promise<string> => {
    const fileDataUrl = await fileToDataURL(file);
    const newDocument: StoredDocument = {
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      fileType: file.type,
      fileDataUrl: fileDataUrl,
      chatHistory: [],
    };
    const updatedDocuments = [...documents, newDocument];
    persistDocuments(updatedDocuments);
    return newDocument.id;
  };

  const deleteDocument = (id: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== id);
    persistDocuments(updatedDocuments);
  };

  const updateDocumentChat = (id: string, chatHistory: ChatMessage[]) => {
    const updatedDocuments = documents.map(doc =>
      doc.id === id ? { ...doc, chatHistory } : doc
    );
    // Persist changes immediately to ensure chat history is saved.
    persistDocuments(updatedDocuments);
  };
  
  return { documents, addDocument, deleteDocument, updateDocumentChat };
};