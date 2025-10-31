export interface DialogueLine {
  character: string;
  line: string;
}

export interface CharacterVoice {
  character: string;
  voiceName: string;
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface StoredDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileDataUrl: string; // The file content as a Data URL for persistence in localStorage
  chatHistory: ChatMessage[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  linkedDocumentId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Task {
  id:string;
  title: string;
  status: 'pending' | 'done';
  type: 'user' | 'ai';
  relatedDocumentId?: string;
  relatedNoteId?: string;
  createdAt: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizResult {
  id: string;
  topic: string;
  score: number; // e.g. 80 for 80%
  takenAt: number;
}

export interface Flashcard {
  front: string;
  back: string;
}