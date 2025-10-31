import React, { useState, useMemo } from 'react';
import { useStoredDocuments } from '../hooks/useStoredDocuments';
import { useStoredQuizHistory } from '../hooks/useStoredQuizHistory';
import { generateQuiz } from '../services/geminiService';
import { QuizQuestion } from '../types';
import LoadingSpinner from './LoadingSpinner';
import BookIcon from './icons/BookIcon';

// This is the same helper from ReadingView. Ideally, it would be in a shared utils file.
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new File([u8arr], filename, {type:mime});
}

const QuizView: React.FC = () => {
    const { documents } = useStoredDocuments();
    const { history, addQuizResult } = useStoredQuizHistory();
    const [selectedDocId, setSelectedDocId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[] | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<string[]>([]);
    const [showResults, setShowResults] = useState(false);

    const score = useMemo(() => {
        if (!currentQuiz) return 0;
        return currentQuiz.reduce((total, question, index) => {
            return total + (question.correctAnswer === userAnswers[index] ? 1 : 0);
        }, 0);
    }, [currentQuiz, userAnswers]);

    const handleGenerateQuiz = async () => {
        const doc = documents.find(d => d.id === selectedDocId);
        if (!doc) {
            setError("Please select a document first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setCurrentQuiz(null);
        setShowResults(false);
        setUserAnswers([]);
        setCurrentQuestionIndex(0);

        try {
            const file = dataURLtoFile(doc.fileDataUrl, doc.fileName);
            const questions = await generateQuiz(file);
            setCurrentQuiz(questions);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not generate quiz from this document.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerSelect = (answer: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = answer;
        setUserAnswers(newAnswers);

        setTimeout(() => {
            if (currentQuestionIndex < currentQuiz!.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            } else {
                const finalScore = currentQuiz!.reduce((total, q, i) => total + (q.correctAnswer === newAnswers[i] ? 1 : 0), 0);
                const percentage = Math.round((finalScore / currentQuiz!.length) * 100);
                const doc = documents.find(d => d.id === selectedDocId);
                addQuizResult(doc?.fileName || 'Quiz', percentage);
                setShowResults(true);
            }
        }, 300);
    };
    
    const resetQuiz = () => {
        setCurrentQuiz(null);
        setShowResults(false);
        setUserAnswers([]);
        setCurrentQuestionIndex(0);
        setSelectedDocId('');
    }

    if (isLoading) {
        return <div className="min-h-[70vh] flex items-center justify-center"><LoadingSpinner message="Generating your quiz..." /></div>;
    }

    if (error) {
        return (
             <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={resetQuiz} className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500">Try Again</button>
            </div>
        );
    }
    
    if (currentQuiz) {
        if (showResults) {
             return (
                <div className="bg-[#161b2a] p-6 rounded-xl border border-slate-700 max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Quiz Complete!</h2>
                    <p className="text-slate-400 mb-6">You scored</p>
                    <p className="text-6xl font-bold text-cyan-400 mb-6">{Math.round((score / currentQuiz.length) * 100)}%</p>
                    <div className="space-y-4 text-left">
                        {currentQuiz.map((q, i) => (
                            <div key={i} className={`p-3 rounded-lg ${q.correctAnswer === userAnswers[i] ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                                <p className="font-semibold">{q.question}</p>
                                <p className="text-sm">Your answer: {userAnswers[i]}</p>
                                <p className="text-sm">Correct answer: {q.correctAnswer}</p>
                            </div>
                        ))}
                    </div>
                    <button onClick={resetQuiz} className="mt-8 bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500">Take Another Quiz</button>
                </div>
            );
        }

        const question = currentQuiz[currentQuestionIndex];
        return (
            <div className="bg-[#161b2a] p-6 rounded-xl border border-slate-700 max-w-2xl mx-auto">
                <p className="text-sm text-slate-400 mb-2">Question {currentQuestionIndex + 1} of {currentQuiz.length}</p>
                <h2 className="text-xl font-semibold text-white mb-6">{question.question}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {question.options.map((option, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleAnswerSelect(option)}
                            className={`p-4 rounded-lg text-left transition-colors ${userAnswers[currentQuestionIndex] === option ? 'bg-indigo-600 text-white ring-2 ring-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[70vh]">
            <div className="lg:col-span-1 bg-[#161b2a] p-6 rounded-xl border border-slate-700">
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Generate a Quiz</h2>
                <p className="text-slate-400 text-sm mb-4">Select an uploaded document to generate a quiz from its content.</p>
                <select 
                    value={selectedDocId} 
                    onChange={e => setSelectedDocId(e.target.value)}
                    className="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none mb-4"
                >
                    <option value="">-- Select a document --</option>
                    {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                </select>
                <button 
                    onClick={handleGenerateQuiz} 
                    disabled={!selectedDocId}
                    className="w-full bg-indigo-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-indigo-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                >
                    Generate Quiz
                </button>
                {documents.length === 0 && <p className="text-xs text-slate-500 mt-2">No documents found. Please upload a document in the 'Reading' tab first.</p>}
            </div>
             <div className="lg:col-span-2 bg-[#161b2a] p-6 rounded-xl border border-slate-700">
                <h3 className="text-xl font-bold text-slate-100 mb-4">Quiz History</h3>
                 {history.length > 0 ? (
                    <div className="space-y-2">
                        {history.sort((a,b) => b.takenAt - a.takenAt).map(h => (
                            <div key={h.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-md">
                                <div>
                                    <p className="font-semibold text-slate-200">{h.topic}</p>
                                    <p className="text-xs text-slate-400">{new Date(h.takenAt).toLocaleString()}</p>
                                </div>
                                <p className={`font-bold text-lg ${h.score > 70 ? 'text-green-400' : 'text-yellow-400'}`}>{h.score}%</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-center">
                         <div>
                            <BookIcon className="mx-auto h-16 w-16 text-slate-600" />
                            <h2 className="mt-4 text-xl font-semibold text-slate-300">No quizzes taken yet</h2>
                            <p className="mt-1 text-slate-500">Generate and complete a quiz to see your history here.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizView;