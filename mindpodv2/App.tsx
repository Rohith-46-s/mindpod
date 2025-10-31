import React, { useState, useEffect, useMemo } from 'react';
import StoryView from './components/StoryView';
import ReadingView from './components/ReadingView';
import NotesView from './components/NotesView';
import TasksView from './components/TasksView';
import ProgressView from './components/ProgressView';
import QuizView from './components/QuizView';
import CodeView from './components/CodeView';
import GameView from './components/GameView';
import SearchModal from './components/SearchModal';
import VoiceAssistant from './components/VoiceAssistant';
import { useStoredNotes } from './hooks/useStoredNotes';
import { useStoredDocuments } from './hooks/useStoredDocuments';
import { useVoiceAssistant, AssistantStatus } from './hooks/useVoiceAssistant';
import { summarizeText, getVoiceAssistantReply } from './services/geminiService';

import BookIcon from './components/icons/BookIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import ReadingIcon from './components/icons/ReadingIcon';
import NotesIcon from './components/icons/NotesIcon';
import TasksIcon from './components/icons/TasksIcon';
import ProgressIcon from './components/icons/ProgressIcon';
import QuizIcon from './components/icons/QuizIcon';
import CodeIcon from './components/icons/CodeIcon';
import BrainIcon from './components/icons/BrainIcon';

type AppMode = 'story' | 'reading' | 'notes' | 'tasks' | 'progress' | 'quiz' | 'code' | 'game';

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
};


const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('notes');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [targetNoteId, setTargetNoteId] = useState<string | null>(null);
  
  const { notes } = useStoredNotes();
  const { documents } = useStoredDocuments();
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const [userName, setUserName] = useState<string | null>(() => localStorage.getItem("userName"));
  const [isGatheringName, setIsGatheringName] = useState(false);

  const selectedDocument = useMemo(() => {
    return documents.find(doc => doc.id === selectedDocumentId) || null;
  }, [documents, selectedDocumentId]);

  const { status, speak, startListening, stopListening, stopSpeaking, setAssistantStatus } = useVoiceAssistant({
      onTranscript: async (transcript: string) => {
        if (isGatheringName) {
            const name = transcript.replace(/\./g, '').trim();
            if (name) {
                localStorage.setItem("userName", name);
                setUserName(name);
                setIsGatheringName(false);
                speak(`Nice to meet you, ${name}. You can click the microphone to ask for help.`);
                setAssistantStatus('idle');
            } else {
                speak("I didn't quite catch that. Could you tell me your name again?", () => {
                    startListening();
                });
            }
            return;
        }

        setAssistantStatus('thinking');
        const command = transcript.toLowerCase();
        const currentUserName = localStorage.getItem("userName") || 'friend';

        // Navigation
        if (command.includes('open my notes') || command.includes('show notes')) {
            setMode('notes');
            speak('Opening your notes.');
        } else if (command.includes('open reading') || command.includes('show reading')) {
            setMode('reading');
            speak('Opening the reading view.');
        } else if (command.includes('open my tasks') || command.includes('show tasks')) {
            setMode('tasks');
            speak('Here are your tasks.');
        } else if (command.includes('show my progress')) {
            setMode('progress');
            speak('Here is your progress report.');
        } else if (command.includes('start quiz') || command.includes('open quiz')) {
            setMode('quiz');
            speak('Opening the quiz section.');
        } else if (command.includes('open code') || command.includes('show code')) {
            setMode('code');
            speak('Opening the code editor.');
        // Actions
        } else if (command.includes('summarize this document')) {
            if (mode === 'reading' && selectedDocument) {
                try {
                    const file = dataURLtoFile(selectedDocument.fileDataUrl, selectedDocument.fileName);
                    const text = await file.text();
                    const summary = await summarizeText(text);
                    speak(`Here is a summary of the document: ${summary}`);
                } catch (e) {
                    speak("I'm sorry, I couldn't read that document to summarize it.");
                }
            } else {
                speak("Please select a document in the reading view first.");
            }
        // Control
        } else if (command.includes('stop listening') || command.includes('be quiet')) {
            stopListening();
        } else if (command.includes('stop speaking')) {
            stopSpeaking();
        // Greeting
        } else if (command.includes('hello') || command.includes('hi')) {
            speak(`Hello, ${currentUserName}! How can I help you today?`);
        // Fallback to AI
        } else {
            try {
                const reply = await getVoiceAssistantReply(command);
                speak(reply);
            } catch (e) {
                speak("I had trouble understanding that. Could you please try again?");
            }
        }
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSelectNote = (noteId: string) => {
    setMode('notes');
    setTargetNoteId(noteId);
    setIsSearchOpen(false);
  };

  const navButtons = [
    { mode: 'story', label: 'Story', Icon: SparklesIcon },
    { mode: 'reading', label: 'Reading', Icon: ReadingIcon },
    { mode: 'notes', label: 'Notes', Icon: NotesIcon },
    { mode: 'tasks', label: 'Tasks', Icon: TasksIcon },
    { mode: 'progress', label: 'Progress', Icon: ProgressIcon },
    { mode: 'quiz', label: 'Quiz', Icon: QuizIcon },
    { mode: 'code', label: 'Code', Icon: CodeIcon },
    { mode: 'game', label: 'Game', Icon: BrainIcon },
  ];

  const renderContent = () => {
    switch (mode) {
      case 'story': return <StoryView setMode={setMode} />;
      case 'reading': return <ReadingView selectedDocumentId={selectedDocumentId} onSelectDocument={setSelectedDocumentId} />;
      case 'notes': return <NotesView targetNoteId={targetNoteId} onNoteSelected={() => setTargetNoteId(null)} />;
      case 'tasks': return <TasksView />;
      case 'progress': return <ProgressView />;
      case 'quiz': return <QuizView />;
      case 'code': return <CodeView />;
      case 'game': return <GameView />;
      default: return <StoryView setMode={setMode}/>;
    }
  }

  return (
    <div className="min-h-screen bg-[#121826] text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      {isSearchOpen && (
        <SearchModal 
          notes={notes}
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)}
          onSelectNote={handleSearchSelectNote}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-teal-400 to-cyan-600 p-1 rounded-full">
              <div className="bg-[#161b2a] p-1.5 rounded-full">
                <BookIcon className="w-6 h-6 text-teal-400" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
              MindPod
            </h1>
          </div>
          <div className="bg-[#161b2a] p-1 rounded-full flex items-center text-sm font-semibold border border-slate-700 flex-wrap justify-center">
            {navButtons.map(({ mode: buttonMode, label, Icon }) => (
              <button
                key={buttonMode}
                onClick={() => setMode(buttonMode as AppMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                  mode === buttonMode
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
             <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 ml-2 px-3 py-1.5 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Search (Ctrl+K)"
            >
              Search
              <kbd className="ml-2 text-xs font-sans px-1.5 py-0.5 border border-slate-600 rounded">⌘K</kbd>
            </button>
            <div className="ml-2">
                <VoiceAssistant 
                  speak={speak}
                  status={status}
                  startListening={startListening}
                  stopListening={stopListening}
                  userName={userName}
                  setIsGatheringName={setIsGatheringName}
                />
            </div>
          </div>
        </header>

        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;