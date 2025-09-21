
import React, { useState, useCallback, useRef } from 'react';
import { generateTweet, generateTweetThread, proofreadThread, generateImage, generateVideo, summarizeUrl } from '../services/geminiService';
import { CreateMode } from '../types';
import type { Source, XUserProfile, EditableTweet } from '../types';
import TweetPreview from './TweetPreview';
import TextIcon from './icons/TextIcon';
import LinkIcon from './icons/LinkIcon';
import UploadIcon from './icons/UploadIcon';
import SparklesIcon from './icons/SparklesIcon';
import CameraIcon from './icons/CameraIcon';
import VideoIcon from './icons/VideoIcon';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import TrashIcon from './icons/TrashIcon';
import BufferIcon from './icons/BufferIcon';
import InfoIcon from './icons/InfoIcon';
import PaperclipIcon from './icons/PaperclipIcon';

const MAX_CHARS = 280;

const DEFAULT_USER: XUserProfile = {
  name: 'Preview User',
  handle: '@preview_user',
  avatarUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23657786'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E`,
  verified: false
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });
}

const Dashboard: React.FC = () => {
  const [createMode, setCreateMode] = useState<CreateMode>(CreateMode.Text);
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [tweets, setTweets] = useState<EditableTweet[]>([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false }]);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState('');
  const [imageProgress, setImageProgress] = useState('');
  
  const [linkUrl, setLinkUrl] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [isProofreading, setIsProofreading] = useState(false);
  const [proofreadSuggestions, setProofreadSuggestions] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaTargetIndex, setMediaTargetIndex] = useState<number | null>(null);
  
  const handleTweetChange = (index: number, value: string) => {
    const newTweets = [...tweets];
    newTweets[index].content = value;
    setTweets(newTweets);
  };

  const addTweetToThread = () => {
    setTweets([...tweets, { id: `tweet-${Date.now()}`, content: '', media: null, isLoadingMedia: false, isCopied: false }]);
  };

  const handleGenerate = useCallback(async (type: 'tweet' | 'thread') => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    let sourceToUse: Source | undefined;
    if (createMode === CreateMode.Link && linkUrl) {
      sourceToUse = { web: { uri: linkUrl, title: 'External Link' } };
    }
    
    let fileToUse: { mimeType: string, data: string } | undefined;
    if (createMode === CreateMode.File && uploadedFile) {
        try {
            const base64Data = await fileToBase64(uploadedFile);
            fileToUse = { mimeType: uploadedFile.type, data: base64Data };
        } catch (error) {
            console.error("Error reading file:", error);
            // In a real app, show a toast notification here
            setIsLoading(prev => ({ ...prev, [type]: false }));
            return;
        }
    }

    const audienceToUse = audience.trim() || undefined;

    let results: string[];
    if (type === 'tweet') {
        results = [await generateTweet(prompt, sourceToUse, audienceToUse, fileToUse)];
    } else {
        results = await generateTweetThread(prompt, sourceToUse, audienceToUse, fileToUse);
    }

    if (results.length > 0 && !results[0].startsWith("Error:")) {
        setTweets(results.map((content, i) => ({ id: `tweet-${i}`, content, media: null, isLoadingMedia: false, isCopied: false })));
    } else {
        setTweets([{ id: `tweet-0`, content: results[0] || 'Error: Empty response from AI.', media: null, isLoadingMedia: false, isCopied: false }]);
    }

    setIsLoading(prev => ({ ...prev, [type]: false }));
  }, [prompt, createMode, linkUrl, audience, uploadedFile]);

  const handleFetchLink = async () => {
      if (!linkUrl) return;
      setIsFetchingLink(true);
      const summary = await summarizeUrl(linkUrl);
      setPrompt(summary);
      setIsFetchingLink(false);
  }

  const handleProofread = async () => {
      setIsProofreading(true);
      setProofreadSuggestions([]);
      const originalContent = tweets.map(t => t.content);
      const suggestions = await proofreadThread(originalContent);
      if (suggestions.length > 0) {
        setProofreadSuggestions(suggestions);
      }
      setIsProofreading(false);
  }

  const handleAcceptSuggestion = (index: number) => {
      const newTweets = [...tweets];
      newTweets[index].content = proofreadSuggestions[index];
      setTweets(newTweets);
      
      const newSuggestions = [...proofreadSuggestions];
      newSuggestions[index] = newTweets[index].content; // Mark as accepted
      setProofreadSuggestions(newSuggestions);
  };

  const handleAcceptAllSuggestions = () => {
      const newTweets = tweets.map((tweet, index) => ({
          ...tweet,
          content: proofreadSuggestions[index] || tweet.content,
      }));
      setTweets(newTweets);
      setProofreadSuggestions([]);
  }

  const handleGenerateMedia = useCallback(async (type: 'image' | 'video', mediaPrompt: string, tweetIndex: number) => {
      let currentTweets = [...tweets];
      currentTweets[tweetIndex] = { ...currentTweets[tweetIndex], isLoadingMedia: true, media: null };
      setTweets(currentTweets);

      setImageProgress('');
      setVideoProgress('');
      
      try {
          let mediaUrl: string;
          if (type === 'image') {
              setImageProgress('🎨 Generating image, please wait...');
              mediaUrl = await generateImage(mediaPrompt);
              setImageProgress('✅ Image generated successfully!');
              setTimeout(() => setImageProgress(''), 3000);
          } else {
              mediaUrl = await generateVideo(mediaPrompt, setVideoProgress);
              setTimeout(() => setVideoProgress(''), 5000);
          }
          setTweets(prevTweets => {
            const finalTweets = [...prevTweets];
            finalTweets[tweetIndex] = { ...finalTweets[tweetIndex], media: { type, url: mediaUrl } };
            return finalTweets;
          });

      } catch (error) {
          console.error(`Error generating ${type}:`, error);
          if (type === 'image') {
            const message = error instanceof Error ? error.message : String(error);
            setImageProgress(`Error: ${message}`);
          }
          // For video, error is handled by the onProgress callback in the service
      } finally {
          setTweets(prevTweets => {
            const finalTweets = [...prevTweets];
            finalTweets[tweetIndex] = { ...finalTweets[tweetIndex], isLoadingMedia: false };
            return finalTweets;
          });
      }
  }, [tweets]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mediaTargetIndex === null) return;
    const tweetIndex = mediaTargetIndex;

    const file = event.target.files?.[0];
    if (!file) return;

    const mediaUrl = URL.createObjectURL(file);
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

    const newTweets = [...tweets];
    const oldUrl = newTweets[tweetIndex].media?.url;
    if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
    }
    
    newTweets[tweetIndex] = {
        ...newTweets[tweetIndex],
        media: { type: mediaType, url: mediaUrl }
    };
    setTweets(newTweets);
    
    setMediaTargetIndex(null);
    if(event.target) event.target.value = ''; // Allow re-uploading the same file
  };

  const handleContextFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleRemoveMedia = (tweetIndex: number) => {
    const newTweets = [...tweets];
    const currentTweet = newTweets[tweetIndex];

    if (currentTweet.media?.url && currentTweet.media.url.startsWith('blob:')) {
        URL.revokeObjectURL(currentTweet.media.url);
    }
    currentTweet.media = null;
    setTweets(newTweets);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setTweets(prevTweets => {
        const newTweets = [...prevTweets];
        newTweets[index] = {...newTweets[index], isCopied: true};
        return newTweets;
      });
      setTimeout(() => {
        setTweets(prevTweets => {
          const resetTweets = [...prevTweets];
          resetTweets[index] = {...resetTweets[index], isCopied: false};
          return resetTweets;
        });
      }, 2000);
    });
  };
  
  const handleModeChange = (mode: CreateMode) => {
    setCreateMode(mode);
    setPrompt('');
    setAudience('');
    setLinkUrl('');
    setUploadedFile(null);
    setProofreadSuggestions([]);
    setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false }]);
  };

  const handleShareOnBuffer = () => {
    const content = tweets.map(t => t.content).join('\n\n');
    if (!content.trim()) return;
    const bufferUrl = `https://buffer.com/add?text=${encodeURIComponent(content)}`;
    window.open(bufferUrl, '_blank', 'noopener,noreferrer');
  };

  const ModeButton: React.FC<{ mode: CreateMode; label: string; icon: React.ReactNode }> = ({ mode, label, icon }) => (
    <button
      onClick={() => handleModeChange(mode)}
      className={`flex-1 p-3 flex items-center justify-center gap-2 rounded-t-lg transition-colors ${ createMode === mode ? 'bg-bg-secondary text-accent-primary' : 'bg-transparent text-text-primary hover:bg-bg-primary/50' }`}
    >
      {icon} {label}
    </button>
  );

  const renderProgressIndicator = (progressMessage: string) => {
    if (!progressMessage) return null;
    const isError = progressMessage.startsWith('Error:');
    return (
        <div className={`p-4 rounded-lg border text-center ${isError ? 'bg-red-900/50 border-red-700 text-red-300' : 'bg-bg-secondary border-border-primary text-text-primary'}`}>
            <p className={isError ? '' : 'animate-pulse'}>{progressMessage}</p>
        </div>
    )
  }

  const renderCreationPanel = () => {
    if (createMode === CreateMode.Proofread) {
        return (
            <>
                <div className="my-4">
                    <button onClick={handleProofread} disabled={isProofreading || tweets.every(t => t.content.length === 0)} className="ai-button bg-green-600 hover:bg-green-700 w-full"><CheckIcon /> {isProofreading ? 'Checking...' : 'Proofread'}</button>
                    {isProofreading && <p className="text-center text-sm text-text-secondary mt-2 animate-pulse">Checking for spelling and grammar...</p>}
                </div>
                {proofreadSuggestions.length > 0 && (
                     <div className="mt-4 border-t border-border-primary pt-4 animate-fade-in space-y-4 max-h-96 overflow-y-auto pr-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-text-primary">AI Suggestions</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setProofreadSuggestions([])} className="ai-button bg-gray-600 hover:bg-gray-700 px-3 py-1 text-xs">Dismiss</button>
                                <button onClick={handleAcceptAllSuggestions} className="ai-button bg-green-600 hover:bg-green-700 px-3 py-1 text-xs">Accept All</button>
                            </div>
                        </div>
                        {tweets.map((tweet, index) => {
                             const original = tweet.content;
                             const suggestion = proofreadSuggestions[index];
                             const isCorrected = original !== suggestion;
                             const isAccepted = suggestion === original;

                            if (!isCorrected) return null;

                             return (
                                 <div key={tweet.id} className="bg-bg-primary p-3 rounded-lg border border-border-primary">
                                     <p className="text-xs font-bold text-text-secondary mb-2">Tweet {index + 1}</p>
                                     <p className="text-sm text-red-400 line-through mb-1">{original}</p>
                                     <p className="text-sm text-green-400 mb-2">{suggestion}</p>
                                     {!isAccepted && (
                                         <div className="text-right">
                                             <button onClick={() => handleAcceptSuggestion(index)} className="text-xs text-accent-primary hover:underline">Accept Suggestion</button>
                                         </div>
                                     )}
                                 </div>
                             )
                         })}
                     </div>
                )}
            </>
        )
    }

    return (
        <>
        {createMode === CreateMode.Link && (
            <div className="mb-4">
                <label htmlFor="linkUrl" className="text-sm font-semibold text-text-primary mb-2">Enter a URL to summarize</label>
                <div className="flex gap-2">
                    <input id="linkUrl" type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/article" className="flex-grow bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" />
                    <button onClick={handleFetchLink} disabled={isFetchingLink || !linkUrl} className="ai-button bg-green-600 hover:bg-green-700 px-4">{isFetchingLink ? '...' : 'Fetch & Summarize'}</button>
                </div>
            </div>
        )}

        {createMode === CreateMode.File && (
             <div className="mb-4">
                <label className="text-sm font-semibold text-text-primary mb-2 block">Upload a File for Context</label>
                <input type="file" id="context-file-upload" className="hidden" onChange={handleContextFileSelect} accept=".txt,.md,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                {!uploadedFile ? (
                    <label htmlFor="context-file-upload" className="cursor-pointer flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border-primary rounded-lg text-text-primary hover:border-accent-primary hover:text-accent-primary transition">
                       <UploadIcon />
                       <span>Select a file (.txt, .pdf, .docx)</span>
                    </label>
                ) : (
                    <div className="bg-bg-primary p-3 rounded-lg flex items-center justify-between border border-border-primary">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <PaperclipIcon className="h-5 w-5 flex-shrink-0" />
                            <span className="font-mono text-sm truncate" title={uploadedFile.name}>{uploadedFile.name}</span>
                            <span className="text-xs text-text-secondary flex-shrink-0">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button onClick={() => setUploadedFile(null)} className="p-1 text-text-secondary hover:text-white rounded-full"><TrashIcon /></button>
                    </div>
                )}
             </div>
        )}

      <label htmlFor="prompt" className="text-sm font-semibold text-text-primary mb-2">{createMode === CreateMode.File ? "What should the post be about? (using the file for context)" : "What do you want to post about?"}</label>
      <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., The future of space exploration with AI..." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" rows={3} />
      <div className="my-2">
        <label htmlFor="audience" className="text-sm font-semibold text-text-primary mb-2">Target Audience (Optional)</label>
        <input type="text" id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g., Software Developers, Digital Marketers..." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
          <button onClick={() => handleGenerate('tweet')} disabled={isLoading.tweet || !prompt} className="ai-button"><SparklesIcon /> {isLoading.tweet ? 'Generating...' : 'Generate Tweet'}</button>
          <button onClick={() => handleGenerate('thread')} disabled={isLoading.thread || !prompt} className="ai-button"><SparklesIcon /> {isLoading.thread ? 'Generating...' : 'Generate Thread'}</button>
      </div>
      </>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*"
      />
      {/* --- CREATION PANEL --- */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border-primary flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Create a new Post</h1>
        <div className="flex border-b border-border-primary mb-4">
            <ModeButton mode={CreateMode.Text} label="Text" icon={<TextIcon />} />
            <ModeButton mode={CreateMode.Link} label="Link" icon={<LinkIcon />} />
            <ModeButton mode={CreateMode.File} label="File" icon={<UploadIcon />} />
            <ModeButton mode={CreateMode.Proofread} label="Proofread" icon={<CheckIcon />} />
        </div>

        <div className="flex-grow flex flex-col">
          {renderCreationPanel()}
          
          <div className="space-y-4 flex-grow mt-4">
            {tweets.map((tweet, index) => (
              <div key={tweet.id} className="bg-bg-primary border border-border-primary rounded-lg p-1">
                <div className="relative">
                  <textarea value={tweet.content} onChange={(e) => handleTweetChange(index, e.target.value)} placeholder={`Tweet ${index + 1}/${tweets.length}...`} className="w-full bg-transparent p-2 pr-16 focus:outline-none" rows={4} />
                  <span className={`absolute bottom-3 right-3 text-sm ${tweet.content.length > MAX_CHARS ? 'text-accent-secondary' : 'text-text-secondary'}`}>{tweet.content.length}/{MAX_CHARS}</span>
                </div>
                <div className="mt-1 p-2 border-t border-border-primary/50 flex items-center justify-end gap-2">
                    {tweet.isLoadingMedia && <p className="text-sm text-text-primary animate-pulse mr-auto">Generating media...</p>}
                    <button onClick={() => handleCopy(tweet.content, index)} className="action-button w-20" title="Copy Text">{tweet.isCopied ? 'Copied!' : <CopyIcon />}</button>
                    
                    {!tweet.media ? (
                        <>
                           <button onClick={() => { setMediaTargetIndex(index); fileInputRef.current?.click(); }} className="action-button" title="Upload Media"><UploadIcon /></button>
                           <button onClick={() => handleGenerateMedia('image', tweet.content, index)} disabled={!tweet.content || tweet.isLoadingMedia} className="action-button" title="Generate Image"><CameraIcon /></button>
                           <button onClick={() => handleGenerateMedia('video', tweet.content, index)} disabled={!tweet.content || tweet.isLoadingMedia} className="action-button" title="Generate Video"><VideoIcon /></button>
                        </>
                    ) : (
                        <>
                           <button onClick={() => { setMediaTargetIndex(index); fileInputRef.current?.click(); }} className="action-button" title="Change Media"><UploadIcon /></button>
                           <button onClick={() => handleRemoveMedia(index)} className="action-button !bg-red-900/70 hover:!bg-red-800/70" title="Remove Media"><TrashIcon /></button>
                        </>
                    )}
                </div>
              </div>
            ))}
          </div>

          <button onClick={addTweetToThread} className="mt-4 text-accent-primary font-semibold hover:underline self-start">+ Add to Thread</button>
        </div>
        
        <div className="mt-6">
             <button className="w-full py-3 bg-transparent border border-accent-primary text-accent-primary rounded-full font-bold hover:bg-accent-primary/10 transition">Save Draft</button>
        </div>
      </div>

      {/* --- PREVIEW PANEL --- */}
      <div>
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <div className="space-y-4">
          {tweets.map((tweet) => (
            <TweetPreview 
              key={tweet.id}
              tweet={{ id: tweet.id, content: tweet.content, author: DEFAULT_USER, media: tweet.media || undefined, stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 }, postedAt: new Date() }} 
            />
          ))}
          {renderProgressIndicator(imageProgress)}
          {renderProgressIndicator(videoProgress)}
        </div>

        <div className="mt-6">
            <button 
                onClick={handleShareOnBuffer} 
                className="w-full py-3 bg-accent-primary text-bg-primary rounded-full font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
                disabled={tweets.every(t => t.content.trim() === '')}
            >
                <BufferIcon className="h-5 w-5" /> Share on Buffer
            </button>
            <div className="flex items-start text-xs text-text-secondary mt-3 p-2">
                <InfoIcon className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                <span>
                    Opens the Buffer composer in a new tab to schedule this post. Media must be added manually.
                </span>
            </div>
        </div>

      </div>
      <style>{`
          .ai-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 9999px; font-weight: bold; transition: all 0.2s; background-color: #5A67D8; color: white; text-align: center; white-space: nowrap; }
          .ai-button:hover:not(:disabled) { background-color: #434190; }
          .ai-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .action-button { background-color: #374151; color: #E5E7EB; border-radius: 9999px; padding: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-height: 36px; }
          .action-button:hover:not(:disabled) { background-color: #4B5563; color: white; }
          .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .overflow-y-auto::-webkit-scrollbar { width: 8px; }
          .overflow-y-auto::-webkit-scrollbar-track { background: #1F2937; }
          .overflow-y-auto::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #4B5563; }
          .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Dashboard;