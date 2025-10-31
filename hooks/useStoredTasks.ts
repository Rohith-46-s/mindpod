import { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';

const STORAGE_KEY = 'storypod_tasks';

export const useStoredTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setTasks(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error("Failed to load tasks from localStorage", error);
    }
  }, []);

  const persistTasks = useCallback((newTasks: Task[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (error) {
      console.error("Failed to save tasks to localStorage", error);
    }
  }, []);

  const addTask = (title: string, relatedDocumentId?: string) => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: `${Date.now()}-${Math.random()}`,
      title: title.trim(),
      status: 'pending',
      type: 'user',
      createdAt: Date.now(),
      relatedDocumentId,
    };
    persistTasks([...tasks, newTask]);
  };

  const addTasks = (titles: string[], relatedDocumentId: string) => {
    const newTasks: Task[] = titles.map((title, index) => ({
      id: `${Date.now()}-${relatedDocumentId}-${index}`,
      title,
      status: 'pending',
      type: 'ai',
      relatedDocumentId,
      createdAt: Date.now()
    }));
    persistTasks([...tasks, ...newTasks]);
  };

  const updateTaskStatus = (id: string, status: 'pending' | 'done') => {
    const updatedTasks = tasks.map(task =>
      task.id === id ? { ...task, status } : task
    );
    persistTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    const updatedTasks = tasks.filter(task => task.id !== id);
    persistTasks(updatedTasks);
  };

  return { tasks, addTask, addTasks, updateTaskStatus, deleteTask };
};