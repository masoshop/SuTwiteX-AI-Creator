import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateTweet, generateTweetThread, proofreadThread, generateImage, generateVideo, summarizeUrl, summarizeFileContent, regenerateTweet } from '../services/geminiService';
import { CreateMode } from '../types';
import type { Source, XUserProfile, EditableTweet, Draft } from '../types';
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
import XLogoIcon from './icons/XLogoIcon';
import InfoIcon from './icons/InfoIcon';
import PaperclipIcon from './icons/PaperclipIcon';
import GenerationStatus from './GenerationStatus';
import LoaderIcon from './icons/LoaderIcon';
import DraftsPanel from './DraftsPanel';

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
  const [tweets, setTweets] = useState<EditableTweet[]>([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
  const [isLoading, setIsLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{ title: string; steps: string[]; currentStep: number; error: string | null; } | null>(null);

  const [linkUrl, setLinkUrl] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSummarizingFile, setIsSummarizingFile] = useState(false);

  const [isProofreading, setIsProofreading] = useState(false);
  const [proofreadSuggestions, setProofreadSuggestions] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaTargetIndex, setMediaTargetIndex] = useState<number | null>(null);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saveButtonText, setSaveButtonText] = useState('Save Draft');
  const creationPanelRef = useRef<HTMLDivElement>(null);
  const tweetPreviewRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [tone, setTone] = useState<string>('default');
  const [format, setFormat] = useState<string>('default');
  const [keywords, setKeywords] = useState<string>('');
  
  const [isMediaPromptModalOpen, setIsMediaPromptModalOpen] = useState(false);
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [mediaGenerationTarget, setMediaGenerationTarget] = useState<{type: 'image' | 'video', index: number} | null>(null);

  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');
  const [videoStyle, setVideoStyle] = useState<'cinematic' | 'documentary' | 'animation'>('cinematic');

  useEffect(() => {
    const savedDrafts = localStorage.getItem('sutwitex-drafts');
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
  }, []);

  const handleSaveDraft = () => {
    const hasContent = tweets.some(t => t.content.trim() !== '') || prompt.trim() !== '';
    if (!hasContent) return;

    const newDraft: Draft = {
      id: `draft-${Date.now()}`,
      createdAt: new Date().toISOString(),
      prompt,
      audience,
      createMode,
      tweets,
    };
    const updatedDrafts = [newDraft, ...drafts];
    setDrafts(updatedDrafts);
    localStorage.setItem('sutwitex-drafts', JSON.stringify(updatedDrafts));
    
    setSaveButtonText('Draft Saved!');
    setTimeout(() => setSaveButtonText('Save Draft'), 2000);
  };

  const handleLoadDraft = (id: string) => {
    const draftToLoad = drafts.find(d => d.id === id);
    if (draftToLoad) {
      setCreateMode(draftToLoad.createMode);
      setPrompt(draftToLoad.prompt);
      setAudience(draftToLoad.audience);
      const loadedTweets = draftToLoad.tweets.map(t => ({
          ...t,
          isLoadingMedia: t.isLoadingMedia || false,
          isCopied: t.isCopied || false,
          isRegenerating: t.isRegenerating || false,
      }));
      setTweets(loadedTweets);
      setLinkUrl('');
      setUploadedFile(null);
      setProofreadSuggestions([]);
      creationPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteDraft = (id: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== id);
    setDrafts(updatedDrafts);
    localStorage.setItem('sutwitex-drafts', JSON.stringify(updatedDrafts));
  };
  
  const handleTweetChange = (index: number, value: string) => {
    const newTweets = [...tweets];
    newTweets[index].content = value;
    setTweets(newTweets);
  };

  const addTweetToThread = () => {
    setTweets([...tweets, { id: `tweet-${Date.now()}`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
  };

  const handleGenerate = useCallback(async (type: 'tweet' | 'thread') => {
    setIsLoading(true);
    const isThread = type === 'thread';
    const title = isThread ? 'Generating Thread...' : 'Generating Tweet...';
    const steps = ['Drafting content', 'Polishing tone', 'Finalizing output', 'Done!'];
    setGenerationStatus({ title, steps, currentStep: 0, error: null });

    // Simulate progress for better UX
    setTimeout(() => setGenerationStatus(prev => prev ? { ...prev, currentStep: 1 } : null), 1000);
    setTimeout(() => setGenerationStatus(prev => prev ? { ...prev, currentStep: 2 } : null), 2500);

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
            setGenerationStatus(prev => prev ? { ...prev, error: "Failed to read the uploaded file." } : null);
            setIsLoading(false);
            return;
        }
    }

    const audienceToUse = audience.trim() || undefined;
    const toneToUse = tone === 'default' ? undefined : tone;
    const formatToUse = format === 'default' ? undefined : format;
    const keywordsToUse = keywords.trim() || undefined;

    try {
        const results = isThread
            ? await generateTweetThread(prompt, sourceToUse, audienceToUse, fileToUse, toneToUse, formatToUse, keywordsToUse)
            : [await generateTweet(prompt, sourceToUse, audienceToUse, fileToUse, toneToUse, formatToUse, keywordsToUse)];
        
        setGenerationStatus(prev => prev ? { ...prev, currentStep: 3 } : null);

        if (results.length > 0) {
            setTweets(results.map((content, i) => ({ id: `tweet-${i}`, content, media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false })));
        } else {
             throw new Error("The AI returned an empty response.");
        }
    } catch (error) {
         const message = error instanceof Error ? error.message : "An unknown error occurred.";
         setGenerationStatus(prev => prev ? { ...prev, currentStep: steps.length, error: message } : null);
    } finally {
        setIsLoading(false);
        setTimeout(() => setGenerationStatus(null), 5000); 
    }
  }, [prompt, createMode, linkUrl, audience, uploadedFile, tone, format, keywords]);

  const handleFetchLink = async () => {
      if (!linkUrl) return;
      setIsFetchingLink(true);
      try {
        const summary = await summarizeUrl(linkUrl);
        setPrompt(summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        setPrompt(`Error summarizing URL: ${message}`);
      }
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

  const openMediaPromptModal = (type: 'image' | 'video', index: number) => {
    setMediaGenerationTarget({ type, index });
    const tweetContent = tweets[index]?.content?.trim() || '';
    setMediaPrompt(tweetContent || prompt); // Use main prompt as fallback
    setImageAspectRatio('16:9');
    setVideoStyle('cinematic');
    setIsMediaPromptModalOpen(true);
  };

  const closeMediaPromptModal = () => {
    setIsMediaPromptModalOpen(false);
    setMediaPrompt('');
    setMediaGenerationTarget(null);
  }

  const handleConfirmMediaGeneration = () => {
    if (!mediaGenerationTarget || !mediaPrompt) return;
    const { type, index } = mediaGenerationTarget;
    handleGenerateMedia(type, mediaPrompt, index, {
        aspectRatio: imageAspectRatio,
        videoStyle: videoStyle
    });
    closeMediaPromptModal();
  }

  const handleGenerateMedia = useCallback(async (
    type: 'image' | 'video', 
    mediaPrompt: string, 
    tweetIndex: number,
    options: { aspectRatio?: string, videoStyle?: string } = {}
  ) => {
    // Ensure the target tweet is in view before starting.
    tweetPreviewRefs.current[tweetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
    setTweets(prevTweets => {
        const newTweets = [...prevTweets];
        newTweets[tweetIndex] = { ...newTweets[tweetIndex], isLoadingMedia: true, media: null };
        return newTweets;
    });
    setIsLoading(true);
    
    try {
        if (type === 'image') {
            const steps = ['Composing prompt', 'Generating pixels', 'Rendering image', 'Done!'];
            setGenerationStatus({ title: 'Generating Image...', steps, currentStep: 0, error: null });
            setTimeout(() => setGenerationStatus(prev => prev ? { ...prev, currentStep: 1 } : null), 1000);

            const mediaUrl = await generateImage(mediaPrompt, options.aspectRatio);
            
            setGenerationStatus(prev => prev ? { ...prev, currentStep: 2 } : null);
            setTweets(prevTweets => {
              const finalTweets = [...prevTweets];
              finalTweets[tweetIndex] = { ...finalTweets[tweetIndex], media: { type, url: mediaUrl } };
              return finalTweets;
            });
            setGenerationStatus(prev => prev ? { ...prev, currentStep: 3 } : null);

        } else {
            const videoSteps = ['Starting up', 'AI processing', 'Generating frames', 'Finalizing video', 'Done!'];
            setGenerationStatus({ title: 'Generating Video...', steps: videoSteps, currentStep: 0, error: null });

            const onProgress = (message: string) => {
              setGenerationStatus(prevStatus => {
                  if (!prevStatus) return null;
                  let currentStep = prevStatus.currentStep;
                  let error: string | null = null;
                  if (message.includes('🚀')) currentStep = 0;
                  else if (message.includes('🤖')) currentStep = 1;
                  else if (message.includes('⏳')) currentStep = 2;
                  else if (message.includes('✅')) currentStep = 3;
                  else if (message.includes('🎉')) currentStep = 4;
                  else if (message.toLowerCase().includes('error:')) {
                      error = message.replace('Error: ', '');
                      currentStep = videoSteps.length;
                  }
                  return { ...prevStatus, currentStep, error };
              });
            };
            const mediaUrl = await generateVideo(mediaPrompt, options.videoStyle, onProgress);
             setTweets(prevTweets => {
              const finalTweets = [...prevTweets];
              finalTweets[tweetIndex] = { ...finalTweets[tweetIndex], media: { type, url: mediaUrl } };
              return finalTweets;
            });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setGenerationStatus(prev => prev ? { ...prev, error: message } : null);
    } finally {
        setIsLoading(false);
        setTweets(prevTweets => {
          const finalTweets = [...prevTweets];
          if (finalTweets[tweetIndex]) {
              finalTweets[tweetIndex] = { ...finalTweets[tweetIndex], isLoadingMedia: false };
          }
          return finalTweets;
        });
        setTimeout(() => setGenerationStatus(null), 5000);
        
        // Re-center the view on the tweet after media is loaded and state is updated.
        setTimeout(() => {
          tweetPreviewRefs.current[tweetIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 100);
    }
  }, []);

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

  const handleContextFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setIsSummarizingFile(true);
      setPrompt("🧠 Summarizing file content, please wait...");
      try {
        const base64Data = await fileToBase64(file);
        const filePart = { mimeType: file.type, data: base64Data };
        const summary = await summarizeFileContent(filePart);
        setPrompt(summary);
      } catch (e) {
        const message = e instanceof Error ? e.message : "An unknown error occurred.";
        setPrompt(`Error: Could not read or summarize the file. Details: ${message}`);
      } finally {
        setIsSummarizingFile(false);
      }
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

  const handleRegenerateTweet = async (index: number) => {
    const originalTweet = tweets[index];
    if (!originalTweet || originalTweet.content.trim() === '') return;

    setTweets(prev => prev.map((t, i) => i === index ? { ...t, isRegenerating: true } : t));

    try {
        const regeneratedContent = await regenerateTweet(originalTweet.content);
        setTweets(prev => prev.map((t, i) => i === index ? { ...t, content: regeneratedContent, isRegenerating: false } : t));
    } catch (error) {
        console.error("Error regenerating tweet:", error);
        // In a real app, show a toast notification with the error.
        setTweets(prev => prev.map((t, i) => i === index ? { ...t, isRegenerating: false } : t));
    }
  };

  const handleDeleteTweet = (index: number) => {
    if (tweets.length === 1) {
      // If it's the last tweet, just clear it instead of removing it.
      setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
    } else {
      // Otherwise, remove it from the thread.
      setTweets(prevTweets => prevTweets.filter((_, i) => i !== index));
    }
  };
  
  const handleModeChange = (mode: CreateMode) => {
    setCreateMode(mode);
    setPrompt('');
    setAudience('');
    setLinkUrl('');
    setUploadedFile(null);
    setProofreadSuggestions([]);
    setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
  };

  const handleShare = (platform: 'x' | 'buffer') => {
    if (tweets.every(t => t.content.trim() === '')) return;

    let url = '';
    if (platform === 'x') {
        const text = tweets[0]?.content || '';
        url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    } else if (platform === 'buffer') {
        const fullText = tweets.map(t => t.content).join('\n\n');
        url = `https://buffer.com/add?text=${encodeURIComponent(fullText)}`;
    }

    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const InfoTooltip: React.FC<{ content: React.ReactNode }> = ({ content, children }) => {
      const [isVisible, setIsVisible] = useState(false);
      return (
          <div className="relative flex items-center" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
              {children}
              {isVisible && (
                  <div className="absolute left-0 bottom-full mb-2 w-72 bg-bg-primary border border-border-primary text-text-secondary text-sm p-3 rounded-lg shadow-lg z-10 animate-fade-in">
                      {content}
                  </div>
              )}
          </div>
      )
  };

  const ModeButton: React.FC<{ mode: CreateMode; label: string; icon: React.ReactNode }> = ({ mode, label, icon }) => (
    <button
      onClick={() => handleModeChange(mode)}
      className={`flex-1 p-3 flex items-center justify-center gap-2 rounded-t-lg transition-colors ${ createMode === mode ? 'bg-bg-secondary text-accent-primary' : 'bg-transparent text-text-primary hover:bg-bg-primary/50' }`}
    >
      {icon} {label}
    </button>
  );

  const renderCreationPanel = () => {
    if (createMode === CreateMode.Proofread) {
        return (
            <>
                <div className="my-4">
                    <p className="text-sm text-center text-text-secondary mb-4">
                        Edit your thread in the preview panel on the right, then click here to get AI-powered suggestions.
                    </p>
                    <button onClick={handleProofread} disabled={isProofreading || tweets.every(t => t.content.length === 0)} className="ai-button bg-success/80 hover:bg-success text-bg-primary w-full"><CheckIcon /> {isProofreading ? 'Checking...' : 'Proofread'}</button>
                    {isProofreading && <p className="text-center text-sm text-text-secondary mt-2 animate-pulse">Checking for spelling and grammar...</p>}
                </div>
                {proofreadSuggestions.length > 0 && (
                     <div className="mt-4 border-t border-border-primary pt-4 animate-fade-in space-y-4 max-h-96 overflow-y-auto pr-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-text-primary">AI Suggestions</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setProofreadSuggestions([])} className="ai-button bg-gray-600 hover:bg-gray-700 px-3 py-1 text-xs">Dismiss</button>
                                <button onClick={handleAcceptAllSuggestions} className="ai-button bg-success/80 hover:bg-success text-bg-primary px-3 py-1 text-xs">Accept All</button>
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
                                     <p className="text-sm text-success mb-2">{suggestion}</p>
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
                    <button onClick={handleFetchLink} disabled={isFetchingLink || !linkUrl} className="ai-button bg-success/80 hover:bg-success text-bg-primary px-4">{isFetchingLink ? '...' : 'Fetch & Summarize'}</button>
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
                            {isSummarizingFile && <LoaderIcon className="h-4 w-4 text-accent-primary ml-2" />}
                        </div>
                        <button onClick={() => { setUploadedFile(null); setPrompt(''); }} className="p-1 text-text-secondary hover:text-white rounded-full"><TrashIcon /></button>
                    </div>
                )}
             </div>
        )}

      <label htmlFor="prompt" className="text-sm font-semibold text-text-primary mb-2">{createMode === CreateMode.File ? "What should the post be about? (using the file for context)" : "What do you want to post about?"}</label>
      <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ejemplo: El futuro de la exploración espacial con IA..." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" rows={3} />
      <div className="my-2">
        <InfoTooltip content={<>
            <p className="mb-1">Define tu Audiencia</p>
            <p>Especifica tu público (ejemplo: 'entusiastas tech', 'dueños de negocios') para que la inteligencia artificial adapte el lenguaje y estilo. Mientras más específico, mejor.</p>
        </>}>
            <label htmlFor="audience" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                Público Objetivo (Opcional) <InfoIcon className="h-4 w-4 text-text-secondary" />
            </label>
        </InfoTooltip>
        <input type="text" id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ejemplo: Desarrolladores de Software, Expertos en Marketing Digital..." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" />
      </div>

      <div className="my-4 border-t border-border-primary pt-4">
        <h3 className="text-md font-semibold text-text-secondary mb-2">Opciones Avanzadas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                 <InfoTooltip content={<>
                    <p className="mb-1">Elige la Voz del Contenido</p>
                    <p>'Reflexivo y Articulado' es para un tono pensado y serio, 'Profesional' es formal, 'Humorístico' añade ingenio, y 'Inspirador' es motivacional. Piensa en cómo quieres que tu audiencia se sienta.</p>
                 </>}>
                    <label htmlFor="tone" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        Tono <InfoIcon className="h-4 w-4 text-text-secondary" />
                    </label>
                </InfoTooltip>
                <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition">
                    <option value="default">Default (Reflexivo y Articulado)</option>
                    <option value="professional">Profesional</option>
                    <option value="humorous">Humorístico</option>
                    <option value="inspirational">Inspirador</option>
                </select>
            </div>
            <div>
                <InfoTooltip content={<>
                    <p className="mb-1">Selecciona una Estructura</p>
                    <p>'Listado' crea una lista, 'Preguntas y Respuestas' formatea como preguntas y respuestas, y 'Tutorial' da instrucciones paso a paso. Ideal para simplificar información.</p>
                </>}>
                    <label htmlFor="format" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        Formato <InfoIcon className="h-4 w-4 text-text-secondary" />
                    </label>
                </InfoTooltip>
                <select id="format" value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition">
                    <option value="default">Post Normal</option>
                    <option value="listicle">Listado</option>
                    <option value="qa">Preguntas y Respuestas</option>
                    <option value="tutorial">Tutorial / Cómo hacerlo</option>
                </select>
            </div>
        </div>
        <div className="mt-4">
            <InfoTooltip content={<>
                <p className="mb-1">Integra Palabras Clave</p>
                <p>Introduce términos que quieres incluir. La inteligencia artificial los integrará naturalmente para mejorar la visibilidad en búsquedas (SEO). Separa múltiples palabras con comas.</p>
            </>}>
                 <label htmlFor="keywords" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                    Palabras Clave SEO (separadas por coma) <InfoIcon className="h-4 w-4 text-text-secondary" />
                </label>
            </InfoTooltip>
            <input type="text" id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Ejemplo: IA, machine learning, tecnología..." className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
          <button onClick={() => handleGenerate('tweet')} disabled={isLoading || !prompt} className="ai-button"><SparklesIcon /> Generate Tweet</button>
          <button onClick={() => handleGenerate('thread')} disabled={isLoading || !prompt} className="ai-button"><SparklesIcon /> Generate Thread</button>
      </div>
      </>
    )
  }

  const OptionButton: React.FC<{ onClick: () => void; isActive: boolean; children: React.ReactNode }> = ({ onClick, isActive, children }) => (
    <button
        onClick={onClick}
        className={`flex-1 p-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-accent-primary text-bg-primary' : 'bg-bg-primary hover:bg-bg-primary/50 border border-border-primary'}`}
    >
        {children}
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*"
      />

      {isMediaPromptModalOpen && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 w-full max-w-lg relative shadow-2xl shadow-black/50">
                <h3 className="text-xl font-bold mb-4">Describe the {mediaGenerationTarget?.type} you want to create</h3>
                <p className="text-sm text-text-secondary mb-4">Provide a detailed prompt to guide the AI in generating the perfect visual for your tweet.</p>
                <textarea 
                    value={mediaPrompt}
                    onChange={(e) => setMediaPrompt(e.target.value)}
                    placeholder="Ejemplo: Un robot futurista pintando una obra maestra en un lienzo en el espacio..."
                    className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition"
                    rows={4} 
                />

                <div className="my-4 space-y-4">
                    {mediaGenerationTarget?.type === 'image' && (
                        <div>
                            <label className="text-sm font-semibold text-text-primary mb-2 block">Aspect Ratio</label>
                            <div className="flex gap-2">
                                <OptionButton onClick={() => setImageAspectRatio('1:1')} isActive={imageAspectRatio === '1:1'}>Square</OptionButton>
                                <OptionButton onClick={() => setImageAspectRatio('16:9')} isActive={imageAspectRatio === '16:9'}>Landscape</OptionButton>
                                <OptionButton onClick={() => setImageAspectRatio('9:16')} isActive={imageAspectRatio === '9:16'}>Portrait</OptionButton>
                            </div>
                        </div>
                    )}
                    {mediaGenerationTarget?.type === 'video' && (
                         <div>
                            <label className="text-sm font-semibold text-text-primary mb-2 block">Video Style</label>
                            <div className="flex gap-2">
                                <OptionButton onClick={() => setVideoStyle('cinematic')} isActive={videoStyle === 'cinematic'}>Cinematic</OptionButton>
                                <OptionButton onClick={() => setVideoStyle('documentary')} isActive={videoStyle === 'documentary'}>Documentary</OptionButton>
                                <OptionButton onClick={() => setVideoStyle('animation')} isActive={videoStyle === 'animation'}>Animation</OptionButton>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={closeMediaPromptModal} className="ai-button bg-transparent border border-text-secondary text-text-secondary hover:bg-text-secondary/10">Cancel</button>
                    <button onClick={handleConfirmMediaGeneration} disabled={!mediaPrompt || isLoading} className="ai-button">
                        <SparklesIcon /> {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- CREATION PANEL --- */}
      <div ref={creationPanelRef} className="bg-bg-secondary/80 backdrop-blur-sm p-6 rounded-xl border border-border-primary flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Create a new Post</h1>

        {generationStatus && (
            <div className="my-4">
                <GenerationStatus
                    title={generationStatus.title}
                    steps={generationStatus.steps}
                    currentStepIndex={generationStatus.currentStep}
                    error={generationStatus.error}
                />
            </div>
        )}

        <fieldset disabled={isLoading} className="flex-grow flex flex-col min-h-0">
            <div className="flex border-b border-border-primary mb-4">
                <ModeButton mode={CreateMode.Text} label="Text" icon={<TextIcon />} />
                <ModeButton mode={CreateMode.Link} label="Link" icon={<LinkIcon />} />
                <ModeButton mode={CreateMode.File} label="File" icon={<UploadIcon />} />
                <ModeButton mode={CreateMode.Proofread} label="Proofread" icon={<CheckIcon />} />
            </div>

            <div className="flex-grow flex flex-col">
                {renderCreationPanel()}
            </div>
        </fieldset>
      </div>

      {/* --- PREVIEW PANEL --- */}
      <div>
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <div className="space-y-4">
          {tweets.map((tweet, index) => (
            // FIX: The ref callback was implicitly returning the element, which is not allowed. Changed to a block statement to ensure a 'void' return type.
            <div key={tweet.id} ref={el => { tweetPreviewRefs.current[index] = el; }}>
                <TweetPreview 
                  tweet={{ 
                    id: tweet.id, 
                    content: tweet.content, 
                    author: DEFAULT_USER, 
                    media: tweet.media || undefined, 
                    stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 }, 
                    postedAt: new Date() 
                  }}
                  isGenerating={isLoading}
                  editableTweet={tweet}
                  onCopy={() => handleCopy(tweet.content, index)}
                  onGenerateMedia={(type) => openMediaPromptModal(type, index)}
                  onUploadMedia={() => { setMediaTargetIndex(index); fileInputRef.current?.click(); }}
                  onRemoveMedia={() => handleRemoveMedia(index)}
                  onTweetChange={(value) => handleTweetChange(index, value)}
                  onRegenerate={() => handleRegenerateTweet(index)}
                  onDeleteTweet={() => handleDeleteTweet(index)}
                />
            </div>
          ))}
        </div>

        <button onClick={addTweetToThread} className="mt-4 text-accent-primary font-semibold hover:underline self-start disabled:cursor-not-allowed disabled:opacity-50">+ Add to Thread</button>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
                onClick={handleSaveDraft}
                disabled={isLoading || saveButtonText === 'Draft Saved!'} 
                className="w-full py-3 bg-transparent border border-accent-secondary text-accent-secondary rounded-full font-bold hover:bg-accent-secondary/10 transition disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
              >
                {saveButtonText}
            </button>
            <button 
                onClick={() => handleShare('x')}
                className="w-full py-3 bg-bg-primary text-text-primary border border-border-primary rounded-full font-bold hover:bg-border-primary transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
                disabled={tweets.every(t => t.content.trim() === '') || isLoading}
            >
                <XLogoIcon className="h-5 w-5" /> Share on X
            </button>
            <button 
                onClick={() => handleShare('buffer')}
                className="w-full py-3 bg-accent-primary text-bg-primary rounded-full font-bold hover:bg-accent-primary/90 transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
                disabled={tweets.every(t => t.content.trim() === '') || isLoading}
            >
                <BufferIcon className="h-5 w-5" /> Share on Buffer
            </button>
        </div>
        
        <div className="mt-8">
            <DraftsPanel
                drafts={drafts}
                onLoad={handleLoadDraft}
                onDelete={handleDeleteDraft}
            />
        </div>

      </div>

      {/* FIX: Replace 'tailwind' variables with hardcoded hex colors to resolve reference errors. The color values are inferred from other components and a conventional dark theme. */}
      <style>{`
          .ai-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 9999px; font-weight: bold; transition: all 0.2s; background-color: #5A67D8; color: white; text-align: center; white-space: nowrap; }
          .ai-button:hover:not(:disabled) { opacity: 0.9; }
          .ai-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .action-button { background-color: #374151; color: white; border-radius: 9999px; padding: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; min-height: 36px; gap: 0.5rem; font-weight: 600; font-size: 0.875rem; }
          .action-button:hover:not(:disabled) { background-color: #374151; filter: brightness(1.2); }
          .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .overflow-y-auto::-webkit-scrollbar { width: 8px; }
          .overflow-y-auto::-webkit-scrollbar-track { background: #1F2937; }
          .overflow-y-auto::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #5A67D8; }
          .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Dashboard;