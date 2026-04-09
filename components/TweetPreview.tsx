
import React, { useRef, useEffect, useState } from 'react';
import type { Tweet, EditableTweet } from '../types';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import DownloadIcon from './icons/DownloadIcon';
import VerifiedIcon from './icons/VerifiedIcon';
import CameraIcon from './icons/CameraIcon';
import UploadIcon from './icons/UploadIcon';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import LoaderIcon from './icons/LoaderIcon';
import VolumeUpIcon from './icons/VolumeUpIcon';

const MAX_CHARS = 280;
const WARNING_CHARS = 275;

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s`;
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
};


interface TweetPreviewProps {
  tweet: Tweet;
  isGenerating?: boolean;
  editableTweet?: EditableTweet;
  onCopy?: () => void;
  onGenerateMedia?: (type: 'image') => void;
  onUploadMedia?: () => void;
  onRemoveMedia?: () => void;
  onTweetChange?: (value: string) => void;
  onRegenerate?: () => void;
  onDeleteTweet?: () => void;
}

const TweetPreview: React.FC<TweetPreviewProps> = ({ tweet, isGenerating = false, editableTweet, onCopy, onGenerateMedia, onUploadMedia, onRemoveMedia, onTweetChange, onRegenerate, onDeleteTweet }) => {
  const isEditable = !!editableTweet;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);


  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [tweet.content, isEditable]);

  const handlePlaySpeech = async () => {
      if (isPlaying) {
          audioSourceRef.current?.stop();
          setIsPlaying(false);
          return;
      }

      if (!tweet.content) return;
      setIsGeneratingSpeech(true);
      try {
          const base64Audio = await generateSpeech(tweet.content);
          
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          }
          const audioContext = audioContextRef.current;
          
          const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.start();

          audioSourceRef.current = source;
          setIsPlaying(true);
          source.onended = () => setIsPlaying(false);

      } catch (error) {
          console.error("Error generating or playing speech:", error);
      } finally {
          setIsGeneratingSpeech(false);
      }
  };

  const ActionButton = ({ onClick, icon, label, disabled, isCopied, isRegenerating }: { onClick?: () => void, icon: React.ReactNode, label?: string, disabled?: boolean, isCopied?: boolean, isRegenerating?: boolean }) => (
    <button 
      type="button"
      onClick={onClick} 
      disabled={disabled} 
      className={`flex flex-col items-center justify-center gap-1 text-slate-300 bg-white/5 border border-white/10 rounded-xl h-14 w-14 hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm ${isRegenerating ? 'cursor-wait' : ''}`}
      title={label}
    >
        <div className="p-1">
            {isRegenerating ? <LoaderIcon className="h-4 w-4 animate-spin text-accent-primary"/> : icon}
        </div>
        {label && <span className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${isCopied ? 'text-success' : 'text-text-secondary'}`}>{isCopied ? 'OK' : label}</span>}
    </button>
  );

  return (
    <div className="bg-bg-secondary/40 border border-border-primary/50 rounded-2xl p-5 flex space-x-4 transition-all shadow-xl hover:bg-bg-secondary/60 backdrop-blur-md relative overflow-hidden group">
      {editableTweet?.isRegenerating && (
           <div className="absolute inset-0 bg-bg-primary/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
               <LoaderIcon className="h-8 w-8 text-accent-primary" />
           </div>
      )}
      <img src={tweet.author.avatarUrl} alt="Author Avatar" className="h-12 w-12 rounded-full flex-shrink-0 border border-border-primary ring-2 ring-white/5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1 flex-wrap">
          <p className="font-bold text-text-primary truncate">{tweet.author.name}</p>
          {tweet.author.verified && <VerifiedIcon />}
          <p className="text-text-secondary truncate text-sm">{tweet.author.handle}</p>
          <span className="text-text-secondary">·</span>
          <p className="text-text-secondary text-xs">
            {tweet.created_at ? formatDate(tweet.created_at) : (isGenerating ? 'ahora' : '1m')}
          </p>
        </div>
        
        {isEditable && onTweetChange ? (
          <textarea
            ref={textareaRef}
            value={tweet.content}
            onChange={(e) => onTweetChange(e.target.value)}
            placeholder="El contenido de tu tuit..."
            className="w-full bg-transparent text-text-primary focus:outline-none resize-none mt-2 whitespace-pre-wrap overflow-hidden text-[15px] leading-relaxed placeholder:text-text-secondary/30 selection:bg-accent-primary/30"
            rows={1}
            spellCheck="false"
          />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-text-primary text-[15px] leading-relaxed">{tweet.content || 'Escribiendo...'}</p>
        )}


        {editableTweet?.isLoadingMedia ? (
             <div className="mt-4 aspect-video bg-bg-primary/50 rounded-2xl flex items-center justify-center border border-border-primary/30 animate-pulse">
                <LoaderIcon className="h-8 w-8 text-accent-primary" />
             </div>
        ) : tweet.media && (
          <div className="relative group/media mt-4 rounded-2xl overflow-hidden border border-border-primary/30 bg-black shadow-inner">
            {isEditable && (
                 <button type="button" onClick={onRemoveMedia} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity z-10 hover:bg-danger" aria-label="Remove media">
                    <TrashIcon className="h-4 w-4" />
                </button>
            )}
            {tweet.media.type === 'image' && (
                <a href={tweet.media.url} download="tweet-image.png" className="absolute top-2 left-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity z-10 hover:bg-accent-primary" aria-label="Download media">
                    <DownloadIcon className="h-4 w-4" />
                </a>
            )}
            {tweet.media.type === 'image' ? (
              <img src={tweet.media.url} alt="Tweet media" className="w-full h-auto object-cover max-h-[450px]" />
            ) : (
              <video src={tweet.media.url} controls className="w-full h-auto max-h-[450px]" />
            )}
          </div>
        )}

        {/* X Stats Mockup */}
        <div className="flex justify-between items-center text-text-secondary mt-5 max-w-md">
                <button type="button" className="group/stat flex items-center space-x-1.5 hover:text-accent-primary transition-colors">
                    <div className="p-1.5 rounded-full group-hover/stat:bg-accent-primary/10 transition-colors">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g></svg>
                    </div>
                    <span className="text-[11px]">{formatNumber(tweet.public_metrics.reply_count)}</span>
                </button>
                <button type="button" className="group/stat flex items-center space-x-1.5 hover:text-success transition-colors">
                    <div className="p-1.5 rounded-full group-hover/stat:bg-success/10 transition-colors">
                         <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H19v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g></svg>
                    </div>
                    <span className="text-[11px]">{formatNumber(tweet.public_metrics.retweet_count)}</span>
                </button>
                <button type="button" className="group/stat flex items-center space-x-1.5 hover:text-danger transition-colors">
                    <div className="p-1.5 rounded-full group-hover/stat:bg-danger/10 transition-colors">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.605 3.01.894 1.81.846 4.17-.518 6.67z"></path></g></svg>
                    </div>
                    <span className="text-[11px]">{formatNumber(tweet.public_metrics.like_count)}</span>
                </button>
                 <button type="button" className="group/stat flex items-center space-x-1.5 hover:text-accent-primary transition-colors">
                    <div className="p-1.5 rounded-full group-hover/stat:bg-accent-primary/10 transition-colors">
                         <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current"><g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g></svg>
                    </div>
                    <span className="text-[11px]">{formatNumber(tweet.public_metrics.impression_count)}</span>
                </button>
                {isEditable && (
                    <div className="flex items-center gap-2">
                        <div className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            tweet.content.length > MAX_CHARS 
                                ? 'text-danger border-danger bg-danger/10 animate-pulse' 
                                : tweet.content.length > WARNING_CHARS
                                    ? 'text-warning border-warning bg-warning/10'
                                    : 'text-text-secondary border-border-primary opacity-50'
                        }`}>
                            {tweet.content.length}/{MAX_CHARS}
                        </div>
                    </div>
                )}
        </div>
        
        {isEditable && editableTweet && (
            <div className="mt-5 pt-5 border-t border-border-primary/50 flex items-center justify-between gap-3 flex-wrap relative z-10">
                <div className="flex items-center gap-2 flex-wrap">
                    <ActionButton onClick={onCopy} icon={editableTweet.isCopied ? <CheckIcon className="text-success h-4 w-4"/> : <CopyIcon className="h-4 w-4" />} label="Copy" disabled={isGenerating} isCopied={editableTweet.isCopied}/>
                    <ActionButton onClick={onRegenerate} icon={<SparklesIcon className="h-4 w-4" />} label="Viral" disabled={!editableTweet.content || isGenerating} isRegenerating={editableTweet.isRegenerating}/>
                    <ActionButton onClick={onUploadMedia} icon={<UploadIcon className="h-4 w-4" />} label="Subir" disabled={isGenerating}/>
                    <ActionButton onClick={() => onGenerateMedia?.('image')} icon={<CameraIcon className="h-4 w-4" />} label="IA Img" disabled={!editableTweet.content || isGenerating}/>
                    <ActionButton onClick={handlePlaySpeech} icon={isGeneratingSpeech ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <VolumeUpIcon className="h-4 w-4" />} label="Audio" disabled={isGeneratingSpeech || !editableTweet.content}/>
                </div>
                <button type="button" onClick={onDeleteTweet} disabled={isGenerating} className="p-3 rounded-xl bg-danger/5 text-danger/60 hover:bg-danger hover:text-white transition-all border border-danger/10 active:scale-90 group/del" title="Eliminar">
                    <TrashIcon className="h-5 w-5 group-hover/del:scale-110 transition-transform" />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default TweetPreview;
