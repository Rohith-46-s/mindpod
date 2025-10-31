import React, { useState, useMemo } from 'react';
import { Flashcard } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
}

type ModalMode = 'study' | 'quiz' | 'results';

const FlashcardsModal: React.FC<FlashcardsModalProps> = ({ isOpen, onClose, flashcards }) => {
  const [mode, setMode] = useState<ModalMode>('study');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // State for quiz mode
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');

  const isAnswerSimilar = (userAnswer: string, correctAnswer: string): boolean => {
    if (!userAnswer || !correctAnswer) return false;

    // Normalize strings: lowercase, trim, remove common punctuation that doesn't affect meaning.
    const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,?!`']/g, '');
    
    const cleanUser = normalize(userAnswer);
    const cleanCorrect = normalize(correctAnswer);

    if (cleanUser === '') return false;

    // 1. Exact match after cleaning
    if (cleanUser === cleanCorrect) return true;

    // 2. Check for substring inclusion. This covers cases where one answer is a subset of the other.
    // e.g., user: "function", correct: "the function keyword"
    // e.g., user: "we use console.log()", correct: "console.log()"
    if (cleanCorrect.includes(cleanUser) || cleanUser.includes(cleanCorrect)) {
        return true;
    }

    return false;
  };

  const score = useMemo(() => {
    return flashcards.reduce((correctCount, card, index) => {
        const userAnswer = userAnswers[index] || '';
        return isAnswerSimilar(userAnswer, card.back) ? correctCount + 1 : correctCount;
    }, 0);
  }, [flashcards, userAnswers]);

  if (!isOpen) return null;

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = currentAnswer;
    setUserAnswers(newAnswers);
    setCurrentAnswer('');

    if (currentIndex === flashcards.length - 1) {
        setMode('results');
    } else {
        setCurrentIndex(prev => prev + 1);
    }
  };

  const switchMode = (newMode: ModalMode) => {
    setMode(newMode);
    setCurrentIndex(0);
    setIsFlipped(false);
    setUserAnswers([]);
    setCurrentAnswer('');
  };

  const currentCard = flashcards[currentIndex];

  const renderStudyView = () => (
    <>
      <div className="[perspective:1000px] w-full h-64 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <div 
            className={`relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
        >
            {/* Front */}
            <div className="absolute w-full h-full [backface-visibility:hidden] bg-slate-700 rounded-lg flex items-center justify-center p-4">
                <p className="text-xl text-slate-200">{currentCard?.front}</p>
            </div>
            {/* Back */}
            <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-indigo-700 rounded-lg flex items-center justify-center p-4">
                 <p className="text-lg text-white">{currentCard?.back}</p>
            </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
          <button onClick={handlePrev} className="p-2 rounded-full hover:bg-slate-700"><ChevronLeftIcon className="w-6 h-6"/></button>
          <p className="font-semibold">{currentIndex + 1} / {flashcards.length}</p>
          <button onClick={handleNext} className="p-2 rounded-full hover:bg-slate-700"><ChevronRightIcon className="w-6 h-6"/></button>
      </div>
    </>
  );
  
  const renderQuizView = () => (
    <>
      <div className="w-full h-64 bg-slate-700 rounded-lg flex flex-col items-center justify-center p-4">
        <p className="text-sm text-slate-400 mb-2">Question {currentIndex + 1} of {flashcards.length}</p>
        <p className="text-xl text-center text-slate-200">{currentCard?.front}</p>
      </div>
      <form onSubmit={handleAnswerSubmit} className="flex gap-2 mt-4">
        <input 
            type="text" 
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="flex-grow bg-slate-600 text-slate-200 border border-slate-500 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            autoFocus
        />
        <button 
            type="submit"
            className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500 transition-colors"
        >
            {currentIndex === flashcards.length - 1 ? 'Finish' : 'Next'}
        </button>
      </form>
    </>
  );

  const renderResultsView = () => (
    <div className="w-full text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Quiz Results</h3>
        <p className="text-5xl font-bold text-cyan-400 mb-6">{score} / {flashcards.length}</p>
        <div className="space-y-3 text-left max-h-64 overflow-y-auto pr-2">
            {flashcards.map((card, index) => {
                const isCorrect = isAnswerSimilar(userAnswers[index], card.back);
                return (
                    <div key={index} className={`p-3 rounded-lg ${isCorrect ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                        <p className="font-semibold text-slate-300">{card.front}</p>
                        <p className={`text-sm ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                            Your answer: {userAnswers[index] || <span className="italic">No answer</span>}
                        </p>
                        {!isCorrect && <p className="text-sm text-slate-400">Correct answer: {card.back}</p>}
                    </div>
                )
            })}
        </div>
        <button onClick={() => switchMode('quiz')} className="mt-6 bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500">
            Retake Quiz
        </button>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl p-6 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4 text-center">AI-Generated Flashcards</h2>

        <div className="flex justify-center mb-4 bg-slate-900 p-1 rounded-full">
            <button onClick={() => switchMode('study')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${mode === 'study' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                Study Mode
            </button>
            <button onClick={() => switchMode('quiz')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${mode === 'quiz' || mode === 'results' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
                Quiz Mode
            </button>
        </div>

        {flashcards.length > 0 ? (
          <>
            {mode === 'study' && renderStudyView()}
            {mode === 'quiz' && renderQuizView()}
            {mode === 'results' && renderResultsView()}
          </>
        ) : (
          <p className="text-center text-slate-400 py-10">No flashcards were generated.</p>
        )}
        
        <button onClick={onClose} className="mt-6 mx-auto bg-slate-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-slate-500 transition-colors">
            Close
        </button>
      </div>
    </div>
  );
};

export default FlashcardsModal;