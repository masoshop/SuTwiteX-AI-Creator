
import React, { useState, useRef } from 'react';
import SparklesIcon from './icons/SparklesIcon';
import ListIcon from './icons/ListIcon';
import LoaderIcon from './icons/LoaderIcon';
import VideoIcon from './icons/VideoIcon';

interface SimpleGeneratorProps {
  onGenerate: (text: string, mode: 'tweet' | 'thread') => void;
  onGenerateVideo: (text: string) => void;
  isLoading: boolean;
}

const SimpleGenerator: React.FC<SimpleGeneratorProps> = ({ onGenerate, onGenerateVideo, isLoading }) => {
  const [input, setInput] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onGenerate(input.trim(), 'tweet');
        setInput('');
      }
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-3xl p-6 shadow-2xl ring-1 ring-white/5 space-y-6 relative overflow-hidden group/gen">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-3xl rounded-full group-hover/gen:bg-accent-primary/10 transition-colors duration-700" />
      
      <div className="space-y-2 relative z-10">
        <h3 className="text-sm font-black uppercase tracking-widest text-accent-primary flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 animate-pulse" />
          Generador de Contenido
        </h3>
        <p className="text-xs text-text-secondary">Escribe tu idea o tema y TwixAI creará el contenido perfecto para X.</p>
      </div>

      <div className="relative group z-10">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ej: 5 consejos para programadores junior..."
          className="w-full bg-bg-primary border border-border-primary rounded-2xl p-5 min-h-[180px] text-[15px] focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary focus:outline-none transition-all resize-none placeholder:text-text-secondary/30 shadow-inner"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-bg-primary/60 backdrop-blur-[4px] rounded-2xl flex items-center justify-center z-20 border border-accent-primary/20">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <LoaderIcon className="h-10 w-10 text-accent-primary animate-spin" />
                <SparklesIcon className="h-4 w-4 text-accent-primary absolute top-0 right-0 animate-bounce" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-accent-primary animate-pulse">Destilando Magia...</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
        <button
          onClick={() => { onGenerate(input, 'tweet'); setInput(''); }}
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-white/5 border border-white/10 text-text-primary rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-white/10 hover:border-white/20 transition-all disabled:opacity-30 active:scale-95 group/btn"
        >
          <SparklesIcon className="h-4 w-4 group-hover/btn:rotate-12 transition-transform" />
          Crear Tuit
        </button>
        <button
          onClick={() => { onGenerate(input, 'thread'); setInput(''); }}
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-accent-primary text-bg-primary rounded-xl text-[11px] font-black uppercase tracking-wider hover:opacity-90 hover:shadow-glow-primary transition-all disabled:opacity-30 active:scale-95 shadow-lg"
        >
          <ListIcon className="h-4 w-4" />
          Crear Hilo
        </button>
        <button
          onClick={() => onGenerateVideo(input)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-purple-500/20 transition-all disabled:opacity-30 active:scale-95 group/video relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/video:translate-x-full transition-transform duration-1000" />
          <VideoIcon className="h-4 w-4" />
          Video IA
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-bg-secondary border border-border-primary px-3 py-1.5 rounded-lg text-[9px] font-bold opacity-0 group-hover/video:opacity-100 transition-all pointer-events-none whitespace-nowrap z-20 shadow-2xl translate-y-2 group-hover/video:translate-y-0">
            Análisis de Video
          </span>
        </button>
      </div>
    </div>
  );
};

export default SimpleGenerator;
