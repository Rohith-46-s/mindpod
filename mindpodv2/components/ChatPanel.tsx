import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import SendIcon from './icons/SendIcon';
import SparklesIcon from './icons/SparklesIcon';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  title?: string;
  placeholder?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  title = "Ask about the story",
  placeholder = "Why did the hero fail?" 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-slate-200 mb-4">{title}</h2>
      <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4 min-h-[40vh]">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white"/>
              </div>
            )}
            <div className={`max-w-xs md:max-w-sm lg:max-w-md p-3 rounded-xl ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white animate-pulse"/>
                </div>
                <div className="max-w-xs md:max-w-sm lg:max-w-md p-3 rounded-xl bg-slate-700">
                    <div className="flex items-center justify-center space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && handleSend()}
          placeholder={placeholder}
          className="w-full bg-slate-700 text-slate-200 border border-slate-600 rounded-lg pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;