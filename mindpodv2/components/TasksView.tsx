import React, { useState, useMemo } from 'react';
import { useStoredTasks } from '../hooks/useStoredTasks';
import { useStoredDocuments } from '../hooks/useStoredDocuments';
import { generateTasksFromDocument } from '../services/geminiService';
import { Task } from '../types';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';
import LoadingSpinner from './LoadingSpinner';

// Helper to convert a Data URL back to a File object. 
// Ideally, this should be in a shared utils file.
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

const TaskItem: React.FC<{ task: Task; onStatusChange: (id: string, status: 'pending' | 'done') => void; onDelete: (id: string) => void; }> = ({ task, onStatusChange, onDelete }) => {
    return (
        <div className="group flex items-center gap-3 bg-slate-800 p-3 rounded-md transition-colors hover:bg-slate-700/50">
            {/* FIX: Moved title prop to a wrapping span to fix typing error and provide a tooltip. */}
            {task.type === 'ai' && <span title="AI-Generated"><SparklesIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" /></span>}
            <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={() => onStatusChange(task.id, task.status === 'pending' ? 'done' : 'pending')}
                className={`h-5 w-5 rounded bg-slate-700 border-slate-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer ${task.type === 'user' ? 'ml-4' : ''}`}
                aria-label={task.title}
            />
            <span className={`flex-grow ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{task.title}</span>
            <button onClick={() => onDelete(task.id)} className="p-1 rounded text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400" aria-label={`Delete task: ${task.title}`}>
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    );
};


const TasksView: React.FC = () => {
    const { documents } = useStoredDocuments();
    const { tasks, addTask, addTasks, updateTaskStatus, deleteTask } = useStoredTasks();
    const [selectedDocIdForGeneration, setSelectedDocIdForGeneration] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
    const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({ general: '' });

    const tasksByDocument = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        tasks.forEach(task => {
            if (task.relatedDocumentId) {
                if (!grouped[task.relatedDocumentId]) {
                    grouped[task.relatedDocumentId] = [];
                }
                grouped[task.relatedDocumentId].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    const generalTasks = useMemo(() => tasks.filter(t => !t.relatedDocumentId), [tasks]);
    
    const documentsWithTasks = useMemo(() => documents.filter(doc => tasksByDocument[doc.id]), [documents, tasksByDocument]);

    const handleGenerateTasks = async () => {
        const doc = documents.find(d => d.id === selectedDocIdForGeneration);
        if (!doc) {
            setError("Please select a document first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const file = dataURLtoFile(doc.fileDataUrl, doc.fileName);
            const taskTitles = await generateTasksFromDocument(file);
            addTasks(taskTitles, doc.id);
            setExpandedDocs(prev => ({ ...prev, [doc.id]: true }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not generate tasks from this document.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddTask = (e: React.FormEvent, docId?: string) => {
        e.preventDefault();
        const key = docId || 'general';
        const title = newTaskInputs[key];
        if (title) {
            addTask(title, docId);
            setNewTaskInputs(prev => ({...prev, [key]: ''}));
        }
    };
    
    const handleInputChange = (value: string, docId?: string) => {
        const key = docId || 'general';
        setNewTaskInputs(prev => ({...prev, [key]: value}));
    };

    const toggleExpand = (docId: string) => {
        setExpandedDocs(prev => ({...prev, [docId]: !prev[docId]}));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
             {/* AI Task Generation Section */}
            <div className="bg-[#161b2a] p-6 rounded-xl border border-slate-700">
                <h2 className="text-2xl font-bold text-slate-100 mb-4">AI Study Planner</h2>
                <p className="text-slate-400 text-sm mb-4">Select an uploaded document to automatically generate a study plan.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <select
                        value={selectedDocIdForGeneration}
                        onChange={e => setSelectedDocIdForGeneration(e.target.value)}
                        className="flex-grow bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    >
                        <option value="">-- Select a document --</option>
                        {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
                    </select>
                    <button
                        onClick={handleGenerateTasks}
                        disabled={!selectedDocIdForGeneration || isLoading}
                        className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="w-5 h-5"/>
                        {isLoading ? 'Generating...' : 'Generate Study Plan'}
                    </button>
                </div>
                 {documents.length === 0 && <p className="text-xs text-slate-500 mt-2">No documents found. Please upload a document in the 'Reading' tab first.</p>}
                 {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
            </div>

            {isLoading && !tasksByDocument[selectedDocIdForGeneration] && <div className="flex justify-center"><LoadingSpinner message="Creating your study plan..." /></div>}

            {/* Document-specific Tasks */}
            {documentsWithTasks.map(doc => {
                const docTasks = tasksByDocument[doc.id] || [];
                const completedCount = docTasks.filter(t => t.status === 'done').length;
                const progress = docTasks.length > 0 ? Math.round((completedCount / docTasks.length) * 100) : 0;
                const isExpanded = expandedDocs[doc.id] ?? false;

                return (
                    <div key={doc.id} className="bg-[#161b2a] p-4 rounded-xl border border-slate-700">
                        <button className="w-full flex justify-between items-center text-left" onClick={() => toggleExpand(doc.id)} aria-expanded={isExpanded}>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200">{doc.fileName}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <span>{completedCount}/{docTasks.length} tasks done</span>
                                    <div className="w-24 bg-slate-700 rounded-full h-1.5" aria-hidden="true">
                                        <div className="bg-teal-500 h-1.5 rounded-full" style={{width: `${progress}%`}}></div>
                                    </div>
                                    <span aria-label={`Progress: ${progress} percent`}>{progress}%</span>
                                </div>
                            </div>
                            {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-slate-400"/> : <ChevronDownIcon className="w-5 h-5 text-slate-400"/>}
                        </button>
                        
                        {isExpanded && (
                            <div className="mt-4 space-y-2">
                                {docTasks.sort((a,b) => a.createdAt - b.createdAt).map(task => (
                                    <TaskItem key={task.id} task={task} onStatusChange={updateTaskStatus} onDelete={deleteTask} />
                                ))}
                                <form onSubmit={(e) => handleAddTask(e, doc.id)} className="flex gap-2 pt-2">
                                    <input type="text" value={newTaskInputs[doc.id] || ''} onChange={e => handleInputChange(e.target.value, doc.id)} placeholder="Add a custom task to this document..." className="flex-grow bg-slate-800 text-sm text-slate-200 border border-slate-600 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition"/>
                                    <button type="submit" disabled={!(newTaskInputs[doc.id] || '').trim()} className="bg-slate-600 text-white text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-slate-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed">Add</button>
                                </form>
                            </div>
                        )}
                    </div>
                );
            })}
            
            {/* General Tasks */}
            <div className="bg-[#161b2a] p-6 rounded-xl border border-slate-700">
                <h3 className="text-xl font-bold text-slate-100 mb-4">General Tasks</h3>
                 <form onSubmit={(e) => handleAddTask(e)} className="flex gap-2 mb-4">
                    <input type="text" value={newTaskInputs.general || ''} onChange={e => handleInputChange(e.target.value)} placeholder="Add a new general task..." className="flex-grow bg-slate-700 text-slate-200 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"/>
                    <button type="submit" disabled={!(newTaskInputs.general || '').trim()} className="bg-indigo-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-indigo-500 transition-colors disabled:bg-slate-500 disabled:cursor-not-allowed">Add Task</button>
                </form>
                <div className="space-y-2">
                    {generalTasks.length > 0 ? generalTasks.sort((a,b) => a.createdAt - b.createdAt).map(task => (
                         <TaskItem key={task.id} task={task} onStatusChange={updateTaskStatus} onDelete={deleteTask} />
                    )) : (
                        <p className="text-center text-slate-500 text-sm py-4">No general tasks. Add one above or generate a plan from a document!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TasksView;