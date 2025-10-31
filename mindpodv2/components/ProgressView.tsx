import React from 'react';
import { useStoredNotes } from '../hooks/useStoredNotes';
import { useStoredTasks } from '../hooks/useStoredTasks';
import { useStoredQuizHistory } from '../hooks/useStoredQuizHistory';
import NotesIcon from './icons/NotesIcon';
import TasksIcon from './icons/TasksIcon';
import QuizIcon from './icons/QuizIcon';
import DocumentIcon from './icons/DocumentIcon';

const colorMap = {
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
    },
    indigo: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
    },
    teal: {
      bg: 'bg-teal-500/10',
      text: 'text-teal-400',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
    }
};

type Color = keyof typeof colorMap;

const StatCard: React.FC<{ icon: React.ReactElement<{ className?: string }>; title: string; value: string | number; color: Color }> = ({ icon, title, value, color }) => (
    <div className={`bg-slate-800 p-6 rounded-xl border border-slate-700 flex items-center gap-4`}>
        <div className={`p-3 rounded-full ${colorMap[color].bg}`}>
            {React.cloneElement(icon, { className: `w-8 h-8 ${colorMap[color].text}` })}
        </div>
        <div>
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const ProgressView: React.FC = () => {
  const { notes } = useStoredNotes();
  const { tasks } = useStoredTasks();
  const { history: quizHistory } = useStoredQuizHistory();

  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const totalTasks = tasks.length;
  const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const notesWithContent = notes.filter(note => note.content.trim().length > 10).length;


  return (
    <div className="bg-[#161b2a] p-6 rounded-xl border border-slate-700 min-h-[70vh]">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-100">My Progress</h2>
            <button
                className="text-sm text-white bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-lg font-semibold"
                onClick={() => alert(`Here's your progress summary:\n- ${notes.length} notes created.\n- ${completedTasks}/${totalTasks} tasks completed.\n- ${quizHistory.length} quizzes taken.`)}
            >
                Generate Summary
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard icon={<NotesIcon />} title="Total Notes Created" value={notes.length} color="cyan" />
            <StatCard icon={<TasksIcon />} title="Tasks Completed" value={`${completedTasks} / ${totalTasks}`} color="indigo" />
            <StatCard icon={<QuizIcon />} title="Quizzes Taken" value={quizHistory.length} color="teal" />
            <StatCard icon={<DocumentIcon />} title="Notes with Content" value={notesWithContent} color="amber" />
            
            <div className="md:col-span-2 lg:col-span-3 bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="font-semibold text-lg text-white mb-3">Task Completion</h3>
                <div className="w-full bg-slate-700 rounded-full h-4">
                    <div 
                        className="bg-indigo-500 h-4 rounded-full transition-all duration-500" 
                        style={{ width: `${taskCompletionPercentage}%` }}
                    ></div>
                </div>
                <p className="text-right text-sm text-slate-400 mt-2">{taskCompletionPercentage}% Complete</p>
            </div>
        </div>
    </div>
  );
};

export default ProgressView;