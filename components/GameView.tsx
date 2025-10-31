import React, { useState, useEffect, FormEvent } from 'react';
import { getWordAssociation } from '../services/geminiService';
import { useStreak } from '../hooks/useStreak';
import LoadingSpinner from './LoadingSpinner';
import BrainIcon from './icons/BrainIcon';
import SendIcon from './icons/SendIcon';

type GameStatus = 'intro' | 'playing' | 'gameover';

const GameView: React.FC = () => {
    const [gameStatus, setGameStatus] = useState<GameStatus>('intro');
    const [wordChain, setWordChain] = useState<string[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState('');
    const { streak, updateStreak } = useStreak();

    const level = Math.floor(wordChain.length / 5) + 1;
    const levelProgress = (wordChain.length % 5) / 5 * 100;

    useEffect(() => {
        if (gameStatus === 'playing' && wordChain.length === 0) {
            handlePlayAgain();
        }
    }, [gameStatus]);

    const handleUserSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setAiFeedback('');
        const previousWord = wordChain[wordChain.length - 1];
        const newWord = userInput.trim();

        try {
            const result = await getWordAssociation(previousWord, newWord);
            setAiFeedback(result.explanation);
            if (result.related) {
                setWordChain(prev => [...prev, newWord, result.nextWord]);
                updateStreak();
            } else {
                setGameStatus('gameover');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An AI error occurred. Please try again.");
        } finally {
            setUserInput('');
            setIsLoading(false);
        }
    };

    const handlePlayAgain = () => {
        setGameStatus('playing');
        setWordChain(['Mind']);
        setUserInput('');
        setError(null);
        setAiFeedback("Let's begin! What's related to 'Mind'?");
    };

    const renderGameContent = () => {
        switch (gameStatus) {
            case 'gameover':
                return (
                    <div className="text-center">
                        <h2 className="text-4xl font-bold text-red-400 mb-2">Game Over</h2>
                        <p className="text-slate-400 mb-4">{aiFeedback}</p>
                        <p className="text-xl text-white mb-6">You reached a chain of <span className="font-bold text-cyan-400">{wordChain.length}</span> words!</p>
                        <button onClick={handlePlayAgain} className="bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-500 transition-colors">
                            Play Again
                        </button>
                    </div>
                );
            case 'playing':
                return (
                    <>
                        <div className="w-full flex justify-between items-center mb-4 text-slate-300">
                            <div className="font-semibold">Level: <span className="text-cyan-400">{level}</span></div>
                            <div className="font-semibold">Streak: <span className="text-amber-400">{streak} 🔥</span></div>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5 mb-6">
                           <div className="bg-cyan-500 h-2.5 rounded-full" style={{width: `${levelProgress}%`}}></div>
                        </div>

                        <div className="flex flex-wrap justify-center items-center gap-2 mb-6">
                            {wordChain.map((word, index) => (
                                <React.Fragment key={index}>
                                    <div className={`px-4 py-2 rounded-full text-lg font-medium ${index === wordChain.length - 1 ? 'bg-cyan-500 text-white animate-pulse' : 'bg-slate-700 text-slate-200'}`}>
                                        {word}
                                    </div>
                                    {index < wordChain.length - 1 && <div className="w-4 h-1 bg-slate-600"></div>}
                                </React.Fragment>
                            ))}
                        </div>
                        
                        <p className="text-center text-slate-400 h-6 mb-4">{aiFeedback}</p>

                        <form onSubmit={handleUserSubmit} className="relative w-full max-w-md mx-auto">
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={`What's related to "${wordChain[wordChain.length - 1]}"?`}
                                className="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                                disabled={isLoading}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !userInput.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                                aria-label="Submit word"
                            >
                                {isLoading ? <div className="w-5 h-5 animate-spin"><LoadingSpinner message=''/></div> : <SendIcon className="w-5 h-5" />}
                            </button>
                        </form>
                    </>
                );
            case 'intro':
            default:
                return (
                    <div className="text-center">
                        <BrainIcon className="w-20 h-20 mx-auto text-cyan-400 mb-4" />
                        <h2 className="text-4xl font-bold text-white mb-2">Word Weave</h2>
                        <p className="text-slate-400 max-w-md mx-auto mb-6">Create the longest chain of related words. The AI will be your partner and your judge. How long can you keep the weave going?</p>
                        <button onClick={handlePlayAgain} className="bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-indigo-500 transition-colors">
                            Start Playing
                        </button>
                    </div>
                );
        }
    };
    
    return (
        <div className="bg-[#161b2a] p-6 rounded-xl border border-slate-700 min-h-[70vh] flex flex-col items-center justify-center">
            {error ? (
                <div className="text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button onClick={handlePlayAgain} className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500">
                        Try Again
                    </button>
                </div>
            ) : renderGameContent()}
        </div>
    );
};

export default GameView;
