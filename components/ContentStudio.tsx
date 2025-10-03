import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Chat } from "@google/genai";
import { createChatSession, getSystemInstructionTweet, getSystemInstructionThread, generateTweet, generateTweetThread, proofreadThread, generateImage, generateVideo, summarizeUrl, summarizeFileContent, regenerateTweet } from '../services/geminiService';
import { CreateMode } from '../types';
import type { Source, XUserProfile, EditableTweet, Draft, BrandVoiceProfile, ChatMessage } from '../types';
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
import XLogoIcon from './icons/XLogoIcon';
import InfoIcon from './icons/InfoIcon';
import PaperclipIcon from './icons/PaperclipIcon';
import GenerationStatus from './GenerationStatus';
import LoaderIcon from './icons/LoaderIcon';
import DraftsPanel from './DraftsPanel';
import BrandVoiceModal from './BrandVoiceModal';
import ChatHistory from './ChatHistory';

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

const ContentStudio: React.FC = () => {
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
  const [videoStyle, setVideoStyle] = useState<'cinematic' | 'documentary' | 'animation'>('cinematic');

  const [isBrandVoiceModalOpen, setIsBrandVoiceModalOpen] = useState(false);
  const [brandVoiceProfile, setBrandVoiceProfile] = useState<BrandVoiceProfile | null>(null);
  
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);


  useEffect(() => {
    const savedDrafts = localStorage.getItem('sutwitex-drafts');
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
    const savedProfile = localStorage.getItem('sutwitex-brand-voice');
    if (savedProfile) {
      setBrandVoiceProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleSaveBrandVoice = (profile: BrandVoiceProfile) => {
    setBrandVoiceProfile(profile);
    localStorage.setItem('sutwitex-brand-voice', JSON.stringify(profile));
  };

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
      setChatSession(null);
      setChatMessages([]);
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
  
  const parseAIResponse = (response: string, isThread: boolean): string[] => {
    try {
        if (isThread) {
            const jsonStr = response.trim();
            const result = JSON.parse(jsonStr);
            return result.thread || [];
        }
        return [response];
    } catch (error) {
        console.error("Failed to parse AI response:", error, "Raw response:", response);
        if (isThread) {
             return response.split('\n').filter(line => line.trim() !== '');
        }
        return [response];
    }
  };

  const handleGenerate = useCallback(async (type: 'tweet' | 'thread') => {
    setIsLoading(true);
    setChatMessages([]);
    const isThread = type === 'thread';
    const title = isThread ? 'Generando Hilo...' : 'Generando Tuit...';
    const steps = ['Redactando contenido', 'Puliendo el tono', 'Finalizando', '¡Listo!'];
    setGenerationStatus({ title, steps, currentStep: 0, error: null });

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
            ? await generateTweetThread(prompt, sourceToUse, audienceToUse, fileToUse, toneToUse, formatToUse, keywordsToUse, brandVoiceProfile || undefined)
            : [await generateTweet(prompt, sourceToUse, audienceToUse, fileToUse, toneToUse, formatToUse, keywordsToUse, brandVoiceProfile || undefined)];
        
        setGenerationStatus(prev => prev ? { ...prev, currentStep: 3 } : null);

        if (results.length > 0) {
            setTweets(results.map((content, i) => ({ id: `tweet-${i}`, content, media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false })));
            const systemInstruction = isThread 
                ? getSystemInstructionThread(audienceToUse, toneToUse, formatToUse, keywordsToUse, brandVoiceProfile || undefined)
                : getSystemInstructionTweet(audienceToUse, toneToUse, formatToUse, keywordsToUse, brandVoiceProfile || undefined);
            
            let fullPromptForHistory = prompt;
            if (sourceToUse) {
                fullPromptForHistory = `Based on the information from the article titled "${sourceToUse.web.title}" found at ${sourceToUse.web.uri}, write content about: ${prompt}`;
            }

            const fileParts = fileToUse 
                ? [{ inlineData: { mimeType: fileToUse.mimeType, data: fileToUse.data } }] 
                : [];
            
            const history = [
                {
                    role: 'user',
                    parts: [{ text: fullPromptForHistory }, ...fileParts],
                },
                {
                    role: 'model',
                    parts: [{ text: isThread ? JSON.stringify({ thread: results }) : results[0] }],
                },
            ];

            const chat = createChatSession(systemInstruction, isThread, history);
            setChatSession(chat);
            setChatMessages([{ author: 'user', content: prompt }]);
        } else {
             throw new Error("La IA devolvió una respuesta vacía.");
        }
    } catch (error) {
         const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
         setGenerationStatus(prev => prev ? { ...prev, currentStep: steps.length, error: message } : null);
         setChatSession(null);
    } finally {
        setIsLoading(false);
        setTimeout(() => setGenerationStatus(null), 5000); 
    }
  }, [prompt, createMode, linkUrl, audience, uploadedFile, tone, format, keywords, brandVoiceProfile]);
  
  const handleSendRefinement = async (message: string) => {
    if (!chatSession) return;
    
    setIsChatLoading(true);
    const isThread = tweets.length > 1;
    const fullMessage = `Aquí está mi petición de refinamiento: "${message}". Por favor, regenera el tuit/hilo entero basándote en esto y proporciona la salida completa en el formato original ${isThread ? 'JSON' : 'de texto crudo'}.`;
    
    setChatMessages(prev => [...prev, { author: 'user', content: message }]);

    try {
      const response = await chatSession.sendMessage({ message: fullMessage });
      const results = parseAIResponse(response.text, isThread);

      if (results.length > 0) {
        setTweets(results.map((content, i) => ({
            id: `tweet-${Date.now()}-${i}`,
            content,
            media: null,
            isLoadingMedia: false,
            isCopied: false,
            isRegenerating: false,
        })));
      } else {
        throw new Error("La IA devolvió una respuesta vacía.");
      }
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
       setChatMessages(prev => [...prev, { author: 'ai', content: `Lo siento, ocurrió un error: ${errorMessage}` }]);
    } finally {
        setIsChatLoading(false);
    }
  };

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
      newSuggestions[index] = newTweets[index].content;
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
    setMediaPrompt(tweetContent || prompt);
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
        aspectRatio: '16:9',
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
    tweetPreviewRefs.current[tweetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
    setTweets(prevTweets => {
        const newTweets = [...prevTweets];
        newTweets[tweetIndex] = { ...newTweets[tweetIndex], isLoadingMedia: true, media: null };
        return newTweets;
    });
    setIsLoading(true);
    
    try {
        if (type === 'image') {
            const steps = ['Componiendo prompt', 'Generando píxeles', 'Renderizando imagen', '¡Listo!'];
            setGenerationStatus({ title: 'Generando Imagen...', steps, currentStep: 0, error: null });
            setTimeout(() => setGenerationStatus(prev => prev ? { ...prev, currentStep: 1 } : null), 1000);

            const base64Data = await generateImage(mediaPrompt, options.aspectRatio);
            
            setGenerationStatus(prev => prev ? { ...prev, currentStep: 2 } : null);
            setTweets(prevTweets => {
              const finalTweets = [...prevTweets];
              finalTweets[tweetIndex] = { ...finalTweets[tweetIndex], media: { type, url: `data:image/jpeg;base64,${base64Data}` } };
              return finalTweets;
            });
            setGenerationStatus(prev => prev ? { ...prev, currentStep: 3 } : null);

        } else {
            const videoSteps = ['Iniciando', 'Procesando IA', 'Generando fotogramas', 'Finalizando video', '¡Listo!'];
            setGenerationStatus({ title: 'Generando Video...', steps: videoSteps, currentStep: 0, error: null });

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
    if(event.target) event.target.value = '';
  };

  const handleContextFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setIsSummarizingFile(true);
      setPrompt("🧠 Resumiendo el contenido del archivo, por favor espera...");
      try {
        const base64Data = await fileToBase64(file);
        const filePart = { mimeType: file.type, data: base64Data };
        const summary = await summarizeFileContent(filePart);
        setPrompt(summary);
      } catch (e) {
        const message = e instanceof Error ? e.message : "An unknown error occurred.";
        setPrompt(`Error: No se pudo leer o resumir el archivo. Detalles: ${message}`);
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
        setTweets(prev => prev.map((t, i) => i === index ? { ...t, isRegenerating: false } : t));
    }
  };

  const handleDeleteTweet = (index: number) => {
    if (tweets.length === 1) {
      setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
    } else {
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
    setChatSession(null);
    setChatMessages([]);
  };

  const handleShare = () => {
    if (tweets.every(t => t.content.trim() === '')) return;

    const text = tweets[0]?.content || '';
    if (!text) return;

    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleStartNew = () => {
    setChatSession(null);
    setChatMessages([]);
    setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
    setPrompt('');
    setAudience('');
    setLinkUrl('');
    setUploadedFile(null);
    setProofreadSuggestions([]);
  };

  const InfoTooltip: React.FC<{ content: React.ReactNode }> = ({ content, children }) => {
      const [isVisible, setIsVisible] = useState(false);
      return (
          <div className="relative flex items-center" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
              {children}
              {isVisible && (
                  <div className="absolute left-0 bottom-full mb-2 w-72 bg-bg-secondary border border-border-primary text-text-secondary text-sm p-3 rounded-lg shadow-lg z-10 animate-fade-in">
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
                        Edita tu hilo en el panel de vista previa de la derecha, luego haz clic aquí para obtener sugerencias de la IA.
                    </p>
                    <button onClick={handleProofread} disabled={isProofreading || tweets.every(t => t.content.length === 0)} className="ai-button bg-success/80 hover:bg-success text-white w-full"><CheckIcon /> {isProofreading ? 'Revisando...' : 'Revisar Ortografía'}</button>
                    {isProofreading && <p className="text-center text-sm text-text-secondary mt-2 animate-pulse">Revisando ortografía y gramática...</p>}
                </div>
                {proofreadSuggestions.length > 0 && (
                     <div className="mt-4 border-t border-border-primary pt-4 animate-fade-in space-y-4 max-h-96 overflow-y-auto pr-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-text-primary">Sugerencias de la IA</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setProofreadSuggestions([])} className="ai-button bg-gray-600 hover:bg-gray-700 px-3 py-1 text-xs">Descartar</button>
                                <button onClick={handleAcceptAllSuggestions} className="ai-button bg-success/80 hover:bg-success text-white px-3 py-1 text-xs">Aceptar Todo</button>
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
                                     <p className="text-xs font-bold text-text-secondary mb-2">Tuit {index + 1}</p>
                                     <p className="text-sm text-danger line-through mb-1">{original}</p>
                                     <p className="text-sm text-success mb-2">{suggestion}</p>
                                     {!isAccepted && (
                                         <div className="text-right">
                                             <button onClick={() => handleAcceptSuggestion(index)} className="text-xs text-accent-primary hover:underline">Aceptar Sugerencia</button>
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
                <label htmlFor="linkUrl" className="text-sm font-semibold text-text-primary mb-2">Introduce una URL para resumir</label>
                <div className="flex gap-2">
                    <input id="linkUrl" type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://ejemplo.com/articulo" className="flex-grow bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" />
                    <button onClick={handleFetchLink} disabled={isFetchingLink || !linkUrl} className="ai-button bg-success/80 hover:bg-success text-white px-4">{isFetchingLink ? '...' : 'Obtener y Resumir'}</button>
                </div>
            </div>
        )}

        {createMode === CreateMode.File && (
             <div className="mb-4">
                <label className="text-sm font-semibold text-text-primary mb-2 block">Sube un Archivo como Contexto</label>
                <input type="file" id="context-file-upload" className="hidden" onChange={handleContextFileSelect} accept=".txt,.md,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                {!uploadedFile ? (
                    <label htmlFor="context-file-upload" className="cursor-pointer flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border-primary rounded-lg text-text-primary hover:border-accent-primary hover:text-accent-primary transition">
                       <UploadIcon />
                       <span>Selecciona un archivo (.txt, .pdf, .docx)</span>
                    </label>
                ) : (
                    <div className="bg-bg-primary p-3 rounded-lg flex items-center justify-between border border-border-primary">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <PaperclipIcon className="h-5 w-5 flex-shrink-0" />
                            <span className="font-mono text-sm truncate" title={uploadedFile.name}>{uploadedFile.name}</span>
                            <span className="text-xs text-text-secondary flex-shrink-0">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                            {isSummarizingFile && <LoaderIcon className="h-4 w-4 text-accent-primary ml-2" />}
                        </div>
                        <button onClick={() => { setUploadedFile(null); setPrompt(''); }} className="p-1 text-text-secondary hover:text-text-primary rounded-full"><TrashIcon /></button>
                    </div>
                )}
             </div>
        )}

      <label htmlFor="prompt" className="text-sm font-semibold text-text-primary mb-2">{createMode === CreateMode.File ? "¿Sobre qué debería ser la publicación? (usando el archivo como contexto)" : "¿Sobre qué quieres publicar?"}</label>
      <textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ejemplo: El futuro de la exploración espacial con IA..." className="w-full bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" rows={3} />
      <div className="my-2">
        <InfoTooltip content={<>
            <p className="mb-1">Define tu Audiencia</p>
            <p>Especifica tu público (ejemplo: 'entusiastas tech', 'dueños de negocios') para que la inteligencia artificial adapte el lenguaje y estilo. Mientras más específico, mejor.</p>
        </>}>
            <label htmlFor="audience" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                Público Objetivo (Opcional) <InfoIcon className="h-4 w-4 text-text-secondary" />
            </label>
        </InfoTooltip>
        <input type="text" id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ejemplo: Desarrolladores de Software, Expertos en Marketing Digital..." className="w-full bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" />
      </div>

      <div className="my-4 border-t border-border-primary pt-4">
         <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold text-text-secondary">Opciones Avanzadas</h3>
            <button onClick={() => setIsBrandVoiceModalOpen(true)} className="text-sm font-bold text-accent-primary hover:underline">
                Definir Voz de Marca
            </button>
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                 <InfoTooltip content={<>
                    <p className="mb-1 font-bold">Elige la Voz del Contenido</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Autoridad:</strong> Tono experto y formal.</li>
                      <li><strong>Narrativo:</strong> Conecta con historias y anécdotas.</li>
                      <li><strong>Analítico:</strong> Desglosa datos y temas complejos.</li>
                      <li><strong>Conversacional:</strong> Amigable y cercano, como hablando con un amigo.</li>
                      <li><strong>Inspirador:</strong> Motivacional y positivo.</li>
                    </ul>
                 </>}>
                    <label htmlFor="tone" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        Tono <InfoIcon className="h-4 w-4 text-text-secondary" />
                    </label>
                </InfoTooltip>
                <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition">
                    <option value="default">Neutral y Claro</option>
                    <option value="authority">Autoridad</option>
                    <option value="storytelling">Narrativo</option>
                    <option value="analytical">Analítico</option>
                    <option value="conversational">Conversacional</option>
                    <option value="inspirational">Inspirador</option>
                </select>
            </div>
            <div>
                <InfoTooltip content={<>
                    <p className="mb-1 font-bold">Selecciona una Estructura</p>
                     <ul className="list-disc list-inside space-y-1">
                      <li><strong>Anuncio:</strong> Ideal para noticias o lanzamientos.</li>
                      <li><strong>Listado:</strong> Enumera puntos clave o recursos.</li>
                      <li><strong>Guía Práctica:</strong> Tutoriales o guías paso a paso.</li>
                      <li><strong>Pregunta Abierta:</strong> Fomenta el debate y la interacción.</li>
                      <li><strong>Consejo Rápido:</strong> Ofrece un tip útil y conciso.</li>
                    </ul>
                </>}>
                    <label htmlFor="format" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        Formato <InfoIcon className="h-4 w-4 text-text-secondary" />
                    </label>
                </InfoTooltip>
                 <select id="format" value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition">
                    <option value="default">Estándar</option>
                    <option value="announcement">Anuncio</option>
                    <option value="listicle">Listado</option>
                    <option value="how_to">Guía Práctica</option>
                    <option value="question">Pregunta Abierta</option>
                    <option value="quick_tip">Consejo Rápido</option>
                </select>
            </div>
             <div>
                <InfoTooltip content={<>
                    <p className="mb-1">Define Palabras Clave</p>
                    <p>Introduce palabras o frases clave separadas por comas (ejemplo: 'IA generativa, marketing de contenidos') para asegurar que se incluyan en el contenido generado.</p>
                </>}>
                    <label htmlFor="keywords" className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        Palabras Clave (Opcional) <InfoIcon className="h-4 w-4 text-text-secondary" />
                    </label>
                </InfoTooltip>
                <input type="text" id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Ej: IA generativa, marketing..." className="w-full bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" />
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
        <button onClick={() => handleGenerate('tweet')} disabled={isLoading || !prompt.trim()} className="ai-button bg-accent-primary text-white">
            <SparklesIcon /> {isLoading ? 'Generando...' : 'Generar Tuit'}
        </button>
        <button onClick={() => handleGenerate('thread')} disabled={isLoading || !prompt.trim()} className="ai-button bg-accent-primary text-white">
            <SparklesIcon /> {isLoading ? 'Generando...' : 'Generar Hilo'}
        </button>
      </div>
      </>
    )
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      <div className="bg-bg-secondary p-4 sm:p-6 rounded-xl border border-border-primary flex flex-col shadow-sm" ref={creationPanelRef}>
        <div className="flex border-b border-border-primary">
            <ModeButton mode={CreateMode.Text} label="Texto" icon={<TextIcon />} />
            <ModeButton mode={CreateMode.Link} label="Enlace" icon={<LinkIcon />} />
            <ModeButton mode={CreateMode.File} label="Archivo" icon={<PaperclipIcon />} />
            <ModeButton mode={CreateMode.Proofread} label="Corregir" icon={<CheckIcon />} />
        </div>
        <div className="flex-grow flex flex-col py-4">
            {generationStatus ? (
                <GenerationStatus title={generationStatus.title} steps={generationStatus.steps} currentStepIndex={generationStatus.currentStep} error={generationStatus.error} />
            ) : chatSession ? (
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold text-text-primary">Refinar Contenido</h3>
                        <button onClick={handleStartNew} className="text-sm font-semibold text-accent-primary hover:underline">
                            Empezar de Nuevo
                        </button>
                    </div>
                    <ChatHistory messages={chatMessages} onSendMessage={handleSendRefinement} isLoading={isChatLoading} />
                </div>
            ) : (
                renderCreationPanel()
            )}
        </div>
        <div className="flex gap-4 mt-auto pt-4 border-t border-border-primary">
            <button onClick={handleSaveDraft} className="flex-1 py-3 bg-transparent border border-accent-primary text-accent-primary rounded-full font-bold hover:bg-accent-primary/10 transition">{saveButtonText}</button>
            <button onClick={handleShare} className="flex-1 py-3 bg-text-primary text-bg-secondary rounded-full font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                <XLogoIcon className="h-5 w-5"/>
                <span>Share on X</span>
            </button>
        </div>
      </div>

      <div className="space-y-8">
        <div>
            <h2 className="text-xl font-bold mb-4">Estudio de Creación</h2>
            <div className="space-y-4 max-h-[75vh] lg:max-h-[60vh] overflow-y-auto pr-2">
                {tweets.map((tweet, index) => {
                    const previewTweet = {
                        id: tweet.id,
                        content: tweet.content,
                        author: DEFAULT_USER,
                        media: tweet.media || undefined,
                        stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 },
                        postedAt: new Date(),
                    };
                    return (
                        <div key={tweet.id} ref={el => tweetPreviewRefs.current[index] = el}>
                            <TweetPreview
                                tweet={previewTweet}
                                editableTweet={tweet}
                                isGenerating={isLoading}
                                onCopy={() => handleCopy(tweet.content, index)}
                                onGenerateMedia={(type) => openMediaPromptModal(type, index)}
                                onUploadMedia={() => {
                                    setMediaTargetIndex(index);
                                    fileInputRef.current?.click();
                                }}
                                onRemoveMedia={() => handleRemoveMedia(index)}
                                onTweetChange={(value) => handleTweetChange(index, value)}
                                onRegenerate={() => handleRegenerateTweet(index)}
                                onDeleteTweet={() => handleDeleteTweet(index)}
                            />
                        </div>
                    );
                })}
                 {tweets.length > 0 && tweets.some(t => t.content) && (
                    <button onClick={addTweetToThread} className="mt-4 text-accent-primary font-semibold hover:underline self-start">
                        + Añadir Tweet al Hilo
                    </button>
                )}
            </div>
        </div>
        <DraftsPanel drafts={drafts} onLoad={handleLoadDraft} onDelete={handleDeleteDraft} />
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />

       {isMediaPromptModalOpen && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 w-full max-w-lg relative shadow-2xl shadow-black/50">
                <h2 className="text-xl font-bold mb-4">Generar {mediaGenerationTarget?.type === 'image' ? 'Imagen' : 'Video'}</h2>
                <textarea
                    value={mediaPrompt}
                    onChange={(e) => setMediaPrompt(e.target.value)}
                    placeholder="Introduce un prompt para el contenido multimedia..."
                    className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition"
                    rows={4}
                />
                {mediaGenerationTarget?.type === 'image' && (
                  <div className="mt-4 text-sm text-text-secondary p-2 bg-bg-primary rounded-lg border border-border-primary">
                    <p>🖼️ La imagen se generará en formato horizontal (16:9), ideal para X.</p>
                  </div>
                )}
                {mediaGenerationTarget?.type === 'video' && (
                    <div className="mt-4">
                        <label className="text-sm font-semibold text-text-primary mb-2 block">Estilo de Video</label>
                        <div className="flex gap-2">
                             {(['cinematic', 'documentary', 'animation'] as const).map(style => (
                                <button key={style} onClick={() => setVideoStyle(style)} className={`flex-1 p-2 rounded-lg border-2 capitalize ${videoStyle === style ? 'border-accent-primary bg-accent-primary/10' : 'border-border-primary hover:border-text-secondary'}`}>
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={closeMediaPromptModal} className="ai-button bg-bg-primary hover:bg-border-primary/50 text-text-primary px-6">Cancelar</button>
                    <button onClick={handleConfirmMediaGeneration} disabled={!mediaPrompt} className="ai-button bg-accent-primary hover:opacity-90 text-white px-6">Generar</button>
                </div>
            </div>
        </div>
      )}

      <BrandVoiceModal 
        isOpen={isBrandVoiceModalOpen}
        onClose={() => setIsBrandVoiceModalOpen(false)}
        onSave={handleSaveBrandVoice}
      />

      <style>{`
          .ai-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 9999px; font-weight: bold; transition: all 0.2s; text-align: center; white-space: nowrap; }
          .ai-button:hover:not(:disabled) { opacity: 0.9; }
          .ai-button:disabled { opacity: 0.5; cursor: not-allowed; }
           .action-button {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              padding: 0.5rem;
              border-radius: 0.5rem;
              font-weight: 600;
              font-size: 0.875rem;
              transition: all 0.2s;
              background-color: #161B22; /* bg-secondary */
              color: #E6EDF3; /* text-primary */
              border: 1px solid #30363D; /* border-primary */
          }
          .action-button:hover:not(:disabled) {
              background-color: #30363D; /* border-primary */
              color: #E6EDF3; /* text-primary */
          }
           .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ContentStudio;