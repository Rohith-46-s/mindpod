import { useState, useEffect, useCallback } from 'react';
import { QuizResult } from '../types';

const STORAGE_KEY = 'storypod_quiz_history';

export const useStoredQuizHistory = () => {
  const [history, setHistory] = useState<QuizResult[]>([]);

  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setHistory(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to load quiz history from localStorage", error);
    }
  }, []);

  const persistHistory = useCallback((newHistory: QuizResult[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error("Failed to save quiz history to localStorage", error);
    }
  }, []);

  const addQuizResult = (topic: string, score: number) => {
    const newResult: QuizResult = {
      id: `${Date.now()}`,
      topic,
      score,
      takenAt: Date.now(),
    };
    persistHistory([...history, newResult]);
  };

  return { history, addQuizResult };
};
