import { useState, useEffect, useCallback } from 'react';

const STREAK_KEY = 'mindpod_streak_count';
const LAST_PLAYED_KEY = 'mindpod_streak_last_played';

const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

const isYesterday = (date1: Date, date2: Date) => {
    const yesterday = new Date(date2);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date1, yesterday);
};

export const useStreak = () => {
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    try {
      const storedStreak = localStorage.getItem(STREAK_KEY);
      if (storedStreak) {
        setStreak(parseInt(storedStreak, 10));
      }
    } catch (error) {
      console.error("Failed to load streak from localStorage", error);
    }
  }, []);
  
  const updateStreak = useCallback(() => {
    const today = new Date();
    const lastPlayedStr = localStorage.getItem(LAST_PLAYED_KEY);
    const lastPlayedDate = lastPlayedStr ? new Date(lastPlayedStr) : null;
    let newStreak = streak;

    if (!lastPlayedDate) {
        newStreak = 1; // First time playing
    } else {
        if (isYesterday(lastPlayedDate, today)) {
            newStreak = streak + 1; // Continued streak
        } else if (!isSameDay(lastPlayedDate, today)) {
            newStreak = 1; // Streak broken
        }
        // If it's the same day, streak doesn't change
    }
    
    setStreak(newStreak);
    localStorage.setItem(STREAK_KEY, String(newStreak));
    localStorage.setItem(LAST_PLAYED_KEY, today.toISOString());

  }, [streak]);

  return { streak, updateStreak };
};
