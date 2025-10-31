import React, { useState, useEffect, useRef } from 'react';
import { generateCode, explainCode, reviewCode } from '../services/geminiService';
import { useStoredNotes } from '../hooks/useStoredNotes';
import GenerateCodeModal from './GenerateCodeModal';
import UploadIcon from './icons/UploadIcon';

declare const Prism: any;
declare const loadPyodide: any;

const CodeView: React.FC = () => {
    const [code, setCode] = useState<string>('// Welcome to the Code Sandbox!\n// Try writing some JavaScript or Python.\n\nfunction greet() {\n    console.log("Hello, World!");\n}\n\ngreet();');
    const [language, setLanguage] = useState('javascript');
    const [output, setOutput] = useState<string>('// Console output will be shown here.\n// Press "Run ▶️" to execute your code.');
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    const { addNote } = useStoredNotes();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pyodide, setPyodide] = useState<any | null>(null);
    const [isPyodideLoading, setIsPyodideLoading] = useState<boolean>(true);
    const [htmlContent, setHtmlContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cursorPositionRef = useRef<number | null>(null);

    // State for interactive Python input
    const [isAwaitingInput, setIsAwaitingInput] = useState<boolean>(false);
    const [inputPrompt, setInputPrompt] = useState<string>('');
    const [inputValue, setInputValue] = useState<string>('');
    const inputPromiseResolveRef = useRef<((value: string) => void) | null>(null);


    useEffect(() => {
        const initPyodide = async () => {
            try {
                const pyodideInstance = await loadPyodide();
                setPyodide(pyodideInstance);
            } catch (error) {
                console.error("Pyodide loading failed:", error);
                setOutput("// Error: Could not initialize Python runtime.");
            } finally {
                setIsPyodideLoading(false);
            }
        };
        initPyodide();
    }, []);

    // This effect re-runs Prism highlighting whenever the output or code changes
    useEffect(() => {
        if (typeof Prism !== 'undefined') {
            Prism.highlightAll();
        }
    }, [output, code, isLoading, language]);

    // Effect to manage cursor position after state updates (e.g., from tabbing)
    useEffect(() => {
        if (textareaRef.current && cursorPositionRef.current !== null) {
            textareaRef.current.selectionStart = cursorPositionRef.current;
            textareaRef.current.selectionEnd = cursorPositionRef.current;
            cursorPositionRef.current = null; // Reset after use
        }
    }, [code]);
    
    useEffect(() => {
        if (language === 'html' || language === 'css') {
            runCode();
        }
    }, [code, language]);

    const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const target = e.currentTarget;
            const { selectionStart, selectionEnd } = target;

            const newCode = code.substring(0, selectionStart) + '    ' + code.substring(selectionEnd);
            setCode(newCode);

            // Store the new cursor position to be set after the re-render
            cursorPositionRef.current = selectionStart + 4;
        }
    };

    const handleAiAction = async (action: 'generate' | 'explain' | 'review', prompt?: string) => {
        setIsLoading(prev => ({ ...prev, [action]: true }));
        setOutput(`Thinking...`);
        try {
            let result = '';
            if (action === 'generate' && prompt) {
                result = await generateCode(prompt, language);
                setCode(result);
                setOutput(`// AI-generated ${language} code for: "${prompt}"`);
            } else if (action === 'explain') {
                result = await explainCode(code);
                setOutput(result);
            } else if (action === 'review') {
                result = await reviewCode(code);
                setOutput(result);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "An unknown error occurred.";
            setOutput(`// Error: ${message}`);
        } finally {
            setIsLoading(prev => ({ ...prev, [action]: false }));
            if (action === 'generate') setIsPromptModalOpen(false);
        }
    };
    
    const runJavascript = () => {
        let capturedOutput = '';
        const oldLog = console.log;
        const oldError = console.error;
        console.log = (...args) => {
            capturedOutput += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') + '\n';
        };
        console.error = (...args) => {
            capturedOutput += `// Error: ${args.join(' ')}\n`;
        };

        try {
            new Function(code)();
            setOutput(capturedOutput || '// Code executed without errors.');
        } catch (e) {
            if (e instanceof Error) {
                setOutput(`// Error: ${e.message}`);
            } else {
                setOutput('// An unknown error occurred during execution.');
            }
        } finally {
            console.log = oldLog;
            console.error = oldError;
        }
    };
    
    const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputPromiseResolveRef.current) {
                inputPromiseResolveRef.current(inputValue);
                inputPromiseResolveRef.current = null;
            }
            setIsAwaitingInput(false);
            setInputValue('');
        }
    };

    const runPython = async () => {
        if (isPyodideLoading) {
            setOutput('// Python runtime is still loading, please wait...');
            return;
        }
        if (!pyodide) {
            setOutput('// Python runtime failed to load.');
            return;
        }
        
        setOutput(''); // Clear previous output
    
        // Function to be called from Python to get user input
        const askForInput = (prompt: string): Promise<string> => {
            setInputPrompt(prompt);
            setIsAwaitingInput(true);
            return new Promise<string>((resolve) => {
                inputPromiseResolveRef.current = (value: string) => {
                    setOutput(prev => prev + value + '\n'); // Echo user input to console
                    resolve(value);
                };
            });
        };
    
        // Expose the JS input function to Pyodide's global scope
        pyodide.globals.set('__prompt_input__', askForInput);
    
        // This Python code will monkey-patch the built-in `input` function
        const pythonSetupCode = `
import sys

def custom_input(prompt=""):
    # Write the prompt to stdout (which is our console)
    sys.stdout.write(prompt)
    sys.stdout.flush()
    # Call the global JS function '__prompt_input__' which was set from the JS side.
    return __prompt_input__(prompt)

# Overwrite the built-in input function
__builtins__.input = custom_input
        `;
    
        try {
            // Setup stdout and stderr to stream to our output state
            pyodide.setStdout({ batched: (str: string) => setOutput(prev => prev + str) });
            pyodide.setStderr({ batched: (str: string) => setOutput(prev => prev + `// ${str}`) });
            
            // Run the setup code to patch the input function
            await pyodide.runPythonAsync(pythonSetupCode);
            
            // Now run the user's code
            await pyodide.loadPackagesFromImports(code);
            await pyodide.runPythonAsync(code);
    
        } catch (e) {
            if (e instanceof Error) {
                const formattedError = e.message.replace(/\n/g, '\n// ');
                setOutput(prev => prev + `\n// Python Execution Error:\n// ${formattedError}`);
            } else {
                setOutput(prev => prev + '\n// An unknown error occurred during Python execution.');
            }
        } finally {
            // Clean up in case the script is interrupted
            setIsAwaitingInput(false);
            setInputValue('');
            inputPromiseResolveRef.current = null;
        }
    };
    

    const runCode = async () => {
        setIsLoading(prev => ({ ...prev, run: true }));
        switch (language) {
            case 'javascript':
                runJavascript();
                break;
            case 'python':
                await runPython();
                break;
            case 'html':
                setHtmlContent(code);
                setOutput('// HTML preview updated.');
                break;
            case 'css':
                setHtmlContent(`<style>${code}</style><h1>Styled Preview</h1><p>Your CSS is applied to this content.</p><button class="bg-blue-500 text-white p-2 rounded">Example Button</button>`);
                setOutput('// CSS preview updated.');
                break;
            default:
                setOutput(`// Running ${language.toUpperCase()} in the browser is not yet supported. You can still use the AI tools.`);
        }
        setIsLoading(prev => ({ ...prev, run: false }));
    };

    const saveAsNote = () => {
        const title = `Code Snippet: ${code.substring(0, 20).split('\n')[0]}...`;
        const content = `
## Code (${language})

\`\`\`${language}
${code}
\`\`\`

## Output / Review

\`\`\`
${output}
\`\`\`
        `;
        addNote({ title, content });
        alert('Code and output saved as a new note!');
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    setCode(text);
                    setOutput(`// Loaded content from ${file.name}`);
                }
            };
            reader.readAsText(file);
        }
        if(event.target) event.target.value = '';
    };


    const actionButtons = [
        { key: 'generate', label: 'Prompt AI ✨', onClick: () => setIsPromptModalOpen(true) },
        { key: 'explain', label: 'Explain 🧠', onClick: () => handleAiAction('explain') },
        { key: 'review', label: 'Review 🧩', onClick: () => handleAiAction('review') },
        { key: 'run', label: 'Run ▶️', onClick: runCode },
        { key: 'save', label: 'Save as Note 🗒️', onClick: saveAsNote },
    ];

    const isRunDisabled = isLoading['run'] || (language === 'python' && isPyodideLoading);

    return (
        <>
        {isPromptModalOpen && (
            <GenerateCodeModal
                isOpen={isPromptModalOpen}
                onClose={() => setIsPromptModalOpen(false)}
                onGenerate={(prompt) => handleAiAction('generate', prompt)}
                isLoading={isLoading['generate']}
            />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[70vh]">
            <div className="bg-[#161b2a] p-4 rounded-xl border border-slate-700 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-slate-200">Code Editor</h2>
                    <div className="flex items-center gap-2">
                         <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-slate-300 bg-slate-700 hover:bg-indigo-600 hover:text-white transition-colors" title="Import Code File">
                            <UploadIcon className="w-5 h-5"/>
                         </button>
                         <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".js,.ts,.py,.jsx,.tsx,.cpp,.c,.html,.css,.json" />
                        <select
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                            className="bg-slate-700 text-sm p-2 rounded-md border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="c">C</option>
                            <option value="cpp">C++</option>
                            <option value="java">Java</option>
                            <option value="tsx">TSX</option>
                        </select>
                    </div>
                </div>
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    onKeyDown={handleTabKey}
                    className="w-full flex-grow bg-[#0d1117] font-mono text-slate-300 p-4 rounded-md border border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-6 text-sm"
                    spellCheck="false"
                />
            </div>
            <div className="bg-[#161b2a] p-4 rounded-xl border border-slate-700 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-slate-200">Console / Output</h2>
                </div>
                <div className="flex-grow bg-[#0d1117] rounded-md border border-slate-600 overflow-auto font-mono text-sm flex flex-col">
                   {language === 'html' || language === 'css' ? (
                        <iframe
                            srcDoc={htmlContent}
                            title="HTML/CSS Preview"
                            className="w-full h-full bg-white border-0"
                            sandbox="allow-scripts"
                        />
                   ) : (
                    <pre className="flex-grow p-4 whitespace-pre-wrap break-words">
                        <code className={`language-${language} h-full`}>{
                            isLoading.explain || isLoading.review ? 'Thinking...' :
                            (isPyodideLoading && language === 'python') ? 'Initializing Python Runtime...' :
                            output
                        }</code>
                    </pre>
                   )}
                   {isAwaitingInput && (
                       <form onSubmit={(e) => { e.preventDefault(); handleInputSubmit({ key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>); }} className="flex items-center gap-2 p-2 border-t border-slate-600 bg-[#161b2a]">
                           <label htmlFor="python-input" className="text-cyan-400 flex-shrink-0">{inputPrompt}</label>
                           <input
                               id="python-input"
                               type="text"
                               value={inputValue}
                               onChange={(e) => setInputValue(e.target.value)}
                               onKeyDown={handleInputSubmit}
                               autoFocus
                               className="flex-grow bg-transparent text-slate-200 focus:outline-none"
                           />
                       </form>
                   )}
                </div>
                <div className="flex flex-wrap gap-2 pt-4 mt-auto border-t border-slate-700">
                    {actionButtons.map(btn => (
                        <button
                            key={btn.key}
                            onClick={btn.onClick}
                            disabled={isLoading[btn.key] || (btn.key === 'run' && isRunDisabled) || (btn.key !== 'generate' && btn.key !== 'run' && (!code || code.trim() === ''))}
                            className="flex items-center gap-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-transform hover:scale-105 active:scale-95"
                        >
                           {isLoading[btn.key] ? 'Working...' : (btn.key === 'run' && isRunDisabled) ? 'Loading...' : btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
        </>
    );
};

export default CodeView;