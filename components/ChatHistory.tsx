import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import LoaderIcon from './icons/LoaderIcon';

interface ChatHistoryProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="animate-fade-in flex flex-col h-full">
        <div className="flex-grow space-y-4 overflow-y-auto pr-2 mb-4 bg-bg-primary/50 backdrop-blur-sm p-3 rounded-lg border border-border-primary/50">
            {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${msg.author === 'user' ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-text-primary'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                     <div className="max-w-[80%] p-3 rounded-lg bg-bg-secondary text-text-primary">
                        <LoaderIcon className="h-5 w-5" />
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>
        <div className="relative mt-auto">
             <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ej: Hazlo más corto y añade un emoji..."
                className="w-full bg-bg-primary border border-border-primary rounded-full p-3 pr-24 focus:ring-2 focus:ring-accent-primary focus:outline-none transition resize-none"
                rows={1}
                disabled={isLoading}
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 ai-button bg-accent-primary text-white px-4 py-2 text-sm"
            >
                Enviar
            </button>
        </div>
    </div>
  );
};

export default ChatHistory;