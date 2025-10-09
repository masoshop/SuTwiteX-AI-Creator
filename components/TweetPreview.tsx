import React, { useRef, useEffect } from 'react';
import type { Tweet, EditableTweet } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import VerifiedIcon from './icons/VerifiedIcon';
import CameraIcon from './icons/CameraIcon';
import VideoIcon from './icons/VideoIcon';
import UploadIcon from './icons/UploadIcon';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import LoaderIcon from './icons/LoaderIcon';

const MAX_CHARS = 275;

interface TweetPreviewProps {
  tweet: Tweet;
  isGenerating?: boolean;
  editableTweet?: EditableTweet;
  onCopy?: () => void;
  onGenerateMedia?: (type: 'image' | 'video') => void;
  onUploadMedia?: () => void;
  onRemoveMedia?: () => void;
  onTweetChange?: (value: string) => void;
  onRegenerate?: () => void;
  onDeleteTweet?: () => void;
}

const TweetPreview: React.FC<TweetPreviewProps> = ({ tweet, isGenerating = false, editableTweet, onCopy, onGenerateMedia, onUploadMedia, onRemoveMedia, onTweetChange, onRegenerate, onDeleteTweet }) => {
  const isEditable = !!editableTweet && !!onCopy && !!onGenerateMedia && !!onUploadMedia && !!onRemoveMedia && !!onTweetChange && !!onRegenerate && !!onDeleteTweet;
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [tweet.content, isEditable]);

  return (
    <div className="bg-bg-secondary/80 backdrop-blur-sm border border-border-primary rounded-lg p-4 flex space-x-4 transition-all hover:border-accent-primary/50">
      <img src={tweet.author.avatarUrl} alt="Author Avatar" className="h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center space-x-1">
          <p className="font-bold">{tweet.author.name}</p>
          {tweet.author.verified && <VerifiedIcon />}
          <p className="text-text-secondary">{tweet.author.handle}</p>
          <span className="text-text-secondary">·</span>
          <p className="text-text-secondary text-sm">
            {tweet.postedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        {isEditable && onTweetChange ? (
          <textarea
            ref={textareaRef}
            value={tweet.content}
            onChange={(e) => onTweetChange(e.target.value)}
            placeholder="El contenido de tu tuit..."
            className="w-full bg-transparent text-text-primary focus:outline-none resize-none mt-1 whitespace-pre-wrap overflow-hidden"
            rows={1}
          />
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-text-primary">{tweet.content}</p>
        )}


        {editableTweet?.isLoadingMedia ? (
             <div className="mt-3 aspect-video bg-bg-primary rounded-2xl flex items-center justify-center border border-border-primary">
                <LoaderIcon className="h-8 w-8 text-accent-primary" />
             </div>
        ) : tweet.media && (
          <div className="relative group mt-3 rounded-2xl overflow-hidden border border-border-primary">
            {tweet.media.type === 'image' ? (
              <img src={tweet.media.url} alt="Tweet media" className="w-full h-auto object-cover" />
            ) : (
              <video src={tweet.media.url} controls className="w-full h-auto" />
            )}
            <a
              href={tweet.media.url}
              download={`generated-media.${tweet.media.type === 'image' ? 'jpeg' : 'mp4'}`}
              className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              aria-label="Download media"
              title="Download"
            >
              <DownloadIcon className="h-5 w-5" />
            </a>
          </div>
        )}

        <div className="flex justify-between items-center text-text-secondary mt-4">
            <div className="flex gap-x-6 max-w-sm">
                <button className="flex items-center space-x-2 hover:text-accent-primary">
                    <span>💬</span> <span>{tweet.stats.replies}</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-success">
                    <span>🔁</span> <span>{tweet.stats.retweets}</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-danger">
                    <span>❤️</span> <span>{tweet.stats.likes}</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-accent-primary">
                    <span>📊</span> <span>{tweet.stats.impressions.toLocaleString()}</span>
                </button>
            </div>
            {isEditable && (
                 <div className={`text-right text-sm font-mono ${tweet.content.length > MAX_CHARS ? 'text-danger' : 'text-text-secondary'}`}>
                    {tweet.content.length}/{MAX_CHARS}
                </div>
            )}
        </div>

        {isEditable && editableTweet && (
            <div className="mt-4 pt-4 border-t border-border-primary/50 flex items-center justify-end gap-2 flex-wrap">
                {(editableTweet.isRegenerating) && 
                    <p className="text-sm text-text-primary animate-pulse mr-auto">
                        Regenerando tuit...
                    </p>
                }
                
                {/* Content Actions */}
                <button onClick={onCopy} className="action-button w-24" title="Copiar Texto" disabled={isGenerating || editableTweet.isRegenerating}>
                    {editableTweet.isCopied ? <><CheckIcon/> ¡Copiado!</> : <><CopyIcon /> Copiar</>}
                </button>
                <button onClick={onRegenerate} className="action-button" title="Regenerar Tuit" disabled={!editableTweet.content || isGenerating || editableTweet.isRegenerating}>
                    {editableTweet.isRegenerating ? <LoaderIcon className="h-5 w-5" /> : <SparklesIcon />}
                </button>
                
                <div className="w-px h-6 bg-border-primary/50 mx-1"></div>

                {/* Media Actions */}
                {!editableTweet.media ? (
                    <>
                    <button onClick={onUploadMedia} className="action-button" title="Subir Contenido" disabled={isGenerating || editableTweet.isRegenerating}><UploadIcon /></button>
                    <button onClick={() => onGenerateMedia('image')} disabled={!editableTweet.content || isGenerating || editableTweet.isRegenerating} className="action-button" title="Generar Imagen"><CameraIcon /></button>
                    <button onClick={() => onGenerateMedia('video')} disabled={!editableTweet.content || isGenerating || editableTweet.isRegenerating} className="action-button" title="Generar Video"><VideoIcon /></button>
                    </>
                ) : (
                    <>
                    <button onClick={onUploadMedia} className="action-button" title="Cambiar Contenido" disabled={isGenerating || editableTweet.isRegenerating}><UploadIcon /></button>
                    <button onClick={onRemoveMedia} className="action-button !bg-danger/70 hover:!bg-danger/90" title="Eliminar Contenido"><TrashIcon /></button>
                    </>
                )}

                <div className="w-px h-6 bg-border-primary/50 mx-1"></div>

                {/* Tweet Actions */}
                <button onClick={onDeleteTweet} className="action-button !bg-danger/70 hover:!bg-danger/90" title="Eliminar Tuit" disabled={isGenerating || editableTweet.isRegenerating}>
                    <TrashIcon />
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default TweetPreview;