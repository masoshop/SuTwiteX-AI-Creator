import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Chat } from "@google/genai";
import { createChatSession, getSystemInstructionTweet, getSystemInstructionThread, generateTweet, generateTweetThread, regenerateTweet, generateImage, generateVideo, summarizeUrl, summarizeFileContent, searchWeb, getTrendingTopics, proofreadThread } from '../services/geminiService';
import { CreateMode } from '../types';
import type { XUserProfile, EditableTweet, BrandVoiceProfile, ChatMessage, Source, Tweet, TrendingTopic } from '../types';
import TweetPreview from './TweetPreview';
import GenerationStatus from './GenerationStatus';
import BrandVoiceModal from './BrandVoiceModal';
import ChatHistory from './ChatHistory';
// --- ICONS ---
import SparklesIcon from './icons/SparklesIcon';
import LogoIcon from './icons/LogoIcon';
import AtomIcon from './icons/AtomIcon';
import ListIcon from './icons/ListIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import PaperclipIcon from './icons/PaperclipIcon';
import PlusIcon from './icons/PlusIcon';
import TextIcon from './icons/TextIcon';
import LinkIcon from './icons/LinkIcon';
import SearchIcon from './icons/SearchIcon';
import UploadIcon from './icons/UploadIcon';
import LoaderIcon from './icons/LoaderIcon';
import TrashIcon from './icons/TrashIcon';
import CheckIcon from './icons/CheckIcon';


const DEFAULT_USER: XUserProfile = {
  name: 'Usuario de Vista Previa',
  handle: '@usuario_preview',
  avatarUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23657786'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E`,
  verified: false
};

const fileToBase64 = (file: File): Promise<{data: string, mimeType: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({ data: result.split(',')[1], mimeType: file.type });
        };
        reader.onerror = error => reject(error);
    });
}

const PopoverChip: React.FC<{
  name: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  activePopover: string | null;
  togglePopover: (name: string) => void;
  popoverRef: React.RefObject<HTMLDivElement>;
}> = ({ name, icon, label, children, activePopover, togglePopover, popoverRef }) => {
  const isActive = activePopover === name;
  return (
    <div className="relative" ref={isActive ? popoverRef : null}>
        <button onClick={() => togglePopover(name)} className="chip-button">
            {icon}
            <span>{label}</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isActive ? 'rotate-180' : ''}`} />
        </button>
        {isActive && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-bg-secondary border border-border-primary rounded-lg shadow-xl p-4 w-72 z-20 animate-fade-in-up">
                {children}
            </div>
        )}
    </div>
  );
};

type ContentStudioHandles = {
  generateTweet: () => void;
  generateThread: () => void;
};

export const ContentStudio = forwardRef<ContentStudioHandles, {}>((props, ref) => {
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [tweets, setTweets] = useState<EditableTweet[]>([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
  const [isLoading, setIsLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{ title: string; steps: string[]; currentStep: number; error: string | null; } | null>(null);

  const [tone, setTone] = useState<string>('default');
  const [format, setFormat] = useState<string>('default');
  
  const [isBrandVoiceModalOpen, setIsBrandVoiceModalOpen] = useState(false);
  const [brandVoiceProfile, setBrandVoiceProfile] = useState<BrandVoiceProfile | null>(null);
  
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);


  const [activePopover, setActivePopover] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // State for media generation
  const [isMediaPromptModalOpen, setIsMediaPromptModalOpen] = useState(false);
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [mediaGenerationTarget, setMediaGenerationTarget] = useState<{type: 'image' | 'video', index: number} | null>(null);
  const [mediaTargetIndex, setMediaTargetIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tweetPreviewRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // --- STATE FOR NEW MODES ---
  const [createMode, setCreateMode] = useState<CreateMode>(CreateMode.Text);
  // Link mode
  const [linkUrl, setLinkUrl] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  // File mode
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSummarizingFile, setIsSummarizingFile] = useState(false);
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  // Web search mode
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSources, setSearchSources] = useState<Source[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [trendsSources, setTrendsSources] = useState<Source[]>([]);
  const [isTrendsLoading, setIsTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);
  const [webSearchResults, setWebSearchResults] = useState<{ title: string; uri: string; summary: string }[]>([]);
  const [searchStepMessage, setSearchStepMessage] = useState('');
  // Proofread mode
  const [isProofreading, setIsProofreading] = useState(false);
  const [proofreadSuggestions, setProofreadSuggestions] = useState<string[]>([]);


  useEffect(() => {
    const savedProfile = localStorage.getItem('twixai-brand-voice');
    if (savedProfile) {
      setBrandVoiceProfile(JSON.parse(savedProfile));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    let intervalId: number;
    if (isSearchLoading) {
      const messages = [
        "Analizando los principales resultados...",
        "Buscando fuentes relevantes...",
        "Sintetizando información de la web...",
        "Compilando los mejores enlaces...",
        "Verificando la actualidad de los datos...",
      ];
      let messageIndex = 0;
      setSearchStepMessage(messages[messageIndex]);
      intervalId = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setSearchStepMessage(messages[messageIndex]);
      }, 2000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isSearchLoading]);


  const handleSaveBrandVoice = (profile: BrandVoiceProfile) => {
    setBrandVoiceProfile(profile);
    localStorage.setItem('twixai-brand-voice', JSON.stringify(profile));
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
            let jsonStr = response.trim();
            if (jsonStr.includes('```json')) {
                jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
            } else if (jsonStr.startsWith('```') && jsonStr.endsWith('```')) {
                jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
            }
            const result = JSON.parse(jsonStr);
            return result.thread || [];
        }
        return [response];
    } catch (error) {
        console.error("No se pudo analizar la respuesta de la IA:", error, "Respuesta sin procesar:", response);
        if (isThread) {
             return response.split('\n').filter(line => line.trim() !== '');
        }
        return [response];
    }
  };

  const handleGenerate = useCallback(async (type: 'tweet' | 'thread') => {
    if (prompt.trim() === '' || isLoading) return;
    
    setIsLoading(true);
    setChatMessages([]);
    setChatSession(null);
    const isThread = type === 'thread';
    const title = isThread ? 'Generando Hilo...' : 'Generando Tuit...';
    const steps = ['Redactando contenido', 'Puliendo el tono', 'Finalizando', '¡Listo!'];
    setGenerationStatus({ title, steps, currentStep: 0, error: null });

    let sourceToUse: Source | undefined;
    if (createMode === CreateMode.Link && linkUrl) {
      sourceToUse = { web: { uri: linkUrl, title: 'Enlace Externo' } };
    }
    
    let fileToUse: { mimeType: string, data: string } | undefined;
    if (createMode === CreateMode.File && uploadedFile) {
        try {
            fileToUse = await fileToBase64(uploadedFile);
        } catch (error) {
            console.error("Error al leer el archivo:", error);
            setGenerationStatus(prev => prev ? { ...prev, error: "No se pudo leer el archivo subido." } : null);
            setIsLoading(false);
            return;
        }
    }
    
    const audienceToUse = audience.trim() || undefined;
    const toneToUse = tone === 'default' ? undefined : tone;
    const formatToUse = format === 'default' ? undefined : format;
    const useWebSearch = createMode === CreateMode.WebSearch;
    
    try {
        const results = isThread
            ? await generateTweetThread(prompt, sourceToUse, audienceToUse, fileToUse, toneToUse, formatToUse, undefined, brandVoiceProfile || undefined, useWebSearch)
            : [await generateTweet(prompt, sourceToUse, audienceToUse, fileToUse, toneToUse, formatToUse, undefined, brandVoiceProfile || undefined)];
        
        setGenerationStatus(prev => prev ? { ...prev, currentStep: 3 } : null);

        if (results.length > 0) {
            setTweets(results.map((content, i) => ({ id: `tweet-${i}`, content, media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false })));
            setChatMessages([{ author: 'user', content: prompt }]);
            
            const assistantResponse = isThread ? JSON.stringify({ thread: results }) : results[0];

            const systemInstruction = isThread 
                ? getSystemInstructionThread(audienceToUse, toneToUse, formatToUse, undefined, brandVoiceProfile || undefined)
                : getSystemInstructionTweet(audienceToUse, toneToUse, formatToUse, undefined, brandVoiceProfile || undefined);
            
            const history = [
                { role: 'user', parts: [{ text: prompt }] },
                { role: 'model', parts: [{ text: assistantResponse }] }
            ];

            const chat = createChatSession(systemInstruction, isThread, history);
            setChatSession(chat);

        } else {
             throw new Error("La IA devolvió una respuesta vacía.");
        }
    } catch (error) {
         const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
         setGenerationStatus(prev => prev ? { ...prev, currentStep: steps.length, error: message } : null);
    } finally {
        setIsLoading(false);
        setTimeout(() => setGenerationStatus(null), 5000); 
    }
  }, [prompt, createMode, linkUrl, uploadedFile, audience, tone, format, brandVoiceProfile, isLoading]);

  useImperativeHandle(ref, () => ({
    generateTweet: () => handleGenerate('tweet'),
    generateThread: () => handleGenerate('thread'),
  }));
  
  const handleSendRefinement = async (message: string) => {
    setChatMessages(prev => [...prev, { author: 'user', content: message }]);
    setIsChatLoading(true);
    
    const isThread = tweets.length > 1;
    const refinementPrompt = `Basado en nuestra conversación anterior, por favor refina tu última respuesta de acuerdo con esta nueva instrucción: "${message}". CRÍTICO: Proporciona ÚNICAMENTE el ${isThread ? 'objeto JSON completo y actualizado para el hilo' : 'texto sin formato para el tuit'}. No agregues ningún texto explicativo antes o después de tu respuesta.`;
    
    try {
        if (!chatSession) throw new Error("La sesión de chat no está inicializada.");
        const response = await chatSession.sendMessage({ message: refinementPrompt });
        const assistantResponseForHistory = response.text;
        
        const results = parseAIResponse(assistantResponseForHistory, isThread);
        setChatMessages(prev => [...prev, { author: 'ai', content: assistantResponseForHistory }]);

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
        console.error("Error al regenerar el tuit:", error);
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
  
  const handleStartNew = () => {
    setChatSession(null);
    setChatMessages([]);
    setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
    setPrompt('');
    setAudience('');
  };
  
  // --- Media Generation Logic ---
  const openMediaPromptModal = (type: 'image' | 'video', index: number) => {
    setMediaGenerationTarget({ type, index });
    const tweetContent = tweets[index]?.content?.trim() || '';
    setMediaPrompt(tweetContent || prompt);
    setIsMediaPromptModalOpen(true);
  };

  const closeMediaPromptModal = () => {
    setIsMediaPromptModalOpen(false);
    setMediaPrompt('');
    setMediaGenerationTarget(null);
  };

  const handleConfirmMediaGeneration = () => {
    if (!mediaGenerationTarget || !mediaPrompt) return;
    const { type, index } = mediaGenerationTarget;
    handleGenerateMedia(type, mediaPrompt, index, { aspectRatio: '16:9' });
    closeMediaPromptModal();
  };
  
  const handleGenerateMedia = useCallback(async (
    type: 'image' | 'video', 
    mediaPrompt: string, 
    tweetIndex: number,
    options: { aspectRatio?: string, videoStyle?: string } = {}
  ) => {
    tweetPreviewRefs.current[tweetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
    setTweets(prevTweets => prevTweets.map((t, i) => i === tweetIndex ? { ...t, isLoadingMedia: true, media: null } : t));
    setIsLoading(true);
    
    try {
        if (type === 'image') {
            const steps = ['Componiendo prompt', 'Generando píxeles', 'Renderizando imagen', '¡Listo!'];
            setGenerationStatus({ title: 'Generando Imagen...', steps, currentStep: 0, error: null });
            const base64DataArray = await generateImage(mediaPrompt, options.aspectRatio);
            if (base64DataArray && base64DataArray.length > 0) {
                setTweets(prevTweets => prevTweets.map((t, i) => i === tweetIndex ? { ...t, media: { type, url: `data:image/jpeg;base64,${base64DataArray[0]}` } } : t));
            } else {
                throw new Error("La IA no devolvió ninguna imagen.");
            }
        } else { // Video generation is Gemini-only
            const videoSteps = ['Iniciando', 'Procesando IA', 'Generando fotogramas', 'Finalizando video', '¡Listo!'];
            setGenerationStatus({ title: 'Generando Video...', steps: videoSteps, currentStep: 0, error: null });

            const onProgress = (message: string) => {
              setGenerationStatus(prev => {
                  if (!prev) return null;
                  let currentStep = prev.currentStep;
                  if (message.includes('🤖')) currentStep = 1;
                  else if (message.includes('⏳')) currentStep = 2;
                  else if (message.includes('✅')) currentStep = 3;
                  else if (message.includes('🎉')) currentStep = 4;
                  return { ...prev, currentStep };
              });
            };
            const mediaUrl = await generateVideo(mediaPrompt, options.videoStyle, onProgress);
            setTweets(prevTweets => prevTweets.map((t, i) => i === tweetIndex ? { ...t, media: { type, url: mediaUrl } } : t));
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setGenerationStatus(prev => prev ? { ...prev, error: message } : null);
    } finally {
        setIsLoading(false);
        setTweets(prev => prev.map((t, i) => i === tweetIndex ? { ...t, isLoadingMedia: false } : t));
        setTimeout(() => setGenerationStatus(null), 5000);
        setTimeout(() => tweetPreviewRefs.current[tweetIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mediaTargetIndex === null) return;
    const tweetIndex = mediaTargetIndex;
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaUrl = URL.createObjectURL(file);
    const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
    
    setTweets(prev => prev.map((t, i) => i === tweetIndex ? { ...t, media: { type: mediaType, url: mediaUrl } } : t));
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
        const filePart = await fileToBase64(file);
        const summary = await summarizeFileContent(filePart);
        setPrompt(summary);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ocurrió un error desconocido.";
        setPrompt(`Error: No se pudo leer o resumir el archivo. Detalles: ${message}`);
      } finally {
        setIsSummarizingFile(false);
      }
    }
  };

  const handleRemoveMedia = (tweetIndex: number) => {
    setTweets(prev => prev.map((t, i) => i === tweetIndex ? { ...t, media: null } : t));
  };
  
  // --- HANDLERS FOR NEW MODES ---
  const handleFetchLink = async () => {
      if (!linkUrl) return;
      setIsFetchingLink(true);
      try {
        const summary = await summarizeUrl(linkUrl);
        setPrompt(summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        setPrompt(`Error al resumir la URL: ${message}`);
      }
      setIsFetchingLink(false);
  };
  
  const executeWebSearch = async (query: string) => {
    if (!query) return;
    setIsSearchLoading(true);
    setSearchError(null);
    setWebSearchResults([]);
    try {
      const results = await searchWeb(query);
      if (results.length === 0) {
        setSearchError("No se encontraron resultados para su búsqueda.");
      }
      setWebSearchResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Ocurrió un error desconocido durante la búsqueda.");
    } finally {
      setIsSearchLoading(false);
    }
  };
  
  const handleSearchResultClick = (result: { title: string; uri: string; summary: string }) => {
    setPrompt(`Crea un tuit o hilo inspirado en el siguiente artículo: "${result.summary}"`);
    setLinkUrl(result.uri);
    setCreateMode(CreateMode.Link);
    setWebSearchResults([]);
    setSearchQuery('');
    setSearchSources([{web: {uri: result.uri, title: result.title}}]);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    executeWebSearch(searchQuery);
  };
  
  const handleFetchTrends = async () => {
    setIsTrendsLoading(true);
    setTrendsError(null);
    setTrendsSources([]);
    try {
      const results = await getTrendingTopics();
      setTrends(results.trends);
      setTrendsSources(results.sources);
    } catch (err) {
      setTrendsError(err instanceof Error ? err.message : "No se pudieron obtener las tendencias.");
    } finally {
      setIsTrendsLoading(false);
    }
  };
  
  const handleTrendClick = (topic: string) => {
    setSearchQuery(topic);
    executeWebSearch(topic);
  };

  const togglePopover = (popoverName: string) => {
    setActivePopover(activePopover === popoverName ? null : popoverName);
  };

  const handleProofread = async () => {
      setIsProofreading(true);
      setProofreadSuggestions([]);
      try {
          const originalContent = tweets.map(t => t.content);
          const suggestions = await proofreadThread(originalContent);
          if (suggestions.length > 0) {
            setProofreadSuggestions(suggestions);
          }
      } catch(e) {
          // In a real app, show a toast notification with the error.
          console.error(e);
      } finally {
          setIsProofreading(false);
      }
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
  
  // --- RENDER FUNCTIONS ---
  
  const handleModeChange = (mode: CreateMode) => {
      if (createMode !== mode) {
          setCreateMode(mode);
          setProofreadSuggestions([]);
          if (searchSources.length > 0) {
              setSearchSources([]);
          }
      }
  };

  const ModeButton: React.FC<{ mode: CreateMode; label: string; icon: React.ReactNode }> = ({ mode, label, icon }) => (
     <button
      onClick={() => handleModeChange(mode)}
      className={`flex-1 p-2.5 flex items-center justify-center gap-2 rounded-lg transition-colors text-sm font-semibold ${ createMode === mode ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary' }`}
    >
      {icon} {label}
    </button>
  );
  
  const renderCreationModePanel = () => {
      switch(createMode) {
          case CreateMode.Link:
              return (
                  <div className="my-4 animate-fade-in">
                      <label htmlFor="linkUrl" className="text-sm font-semibold text-text-primary mb-2">Introduce una URL para resumir</label>
                      <div className="flex gap-2">
                          <input id="linkUrl" type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/article" className="flex-grow bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition" />
                          <button onClick={handleFetchLink} disabled={isFetchingLink || !linkUrl} className="ai-button bg-success/80 hover:bg-success text-white px-4">{isFetchingLink ? '...' : 'Obtener'}</button>
                      </div>
                  </div>
              );
          case CreateMode.File:
              return (
                  <div className="my-4 animate-fade-in">
                      <label className="text-sm font-semibold text-text-primary mb-2 block">Sube un Archivo de Contexto</label>
                      <input type="file" id="context-file-upload" className="hidden" ref={contextFileInputRef} onChange={handleContextFileSelect} accept=".txt,.md,.pdf,.doc,.docx" />
                      {!uploadedFile ? (
                          <button onClick={() => contextFileInputRef.current?.click()} className="w-full cursor-pointer flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border-primary rounded-lg text-text-primary hover:border-accent-primary hover:text-accent-primary transition">
                             <UploadIcon />
                             <span>Selecciona un archivo (.txt, .pdf, .docx)</span>
                          </button>
                      ) : (
                          <div className="bg-bg-primary p-3 rounded-lg flex items-center justify-between border border-border-primary">
                              <div className="flex items-center gap-2 overflow-hidden">
                                  <PaperclipIcon className="h-5 w-5 flex-shrink-0" />
                                  <span className="font-mono text-sm truncate" title={uploadedFile.name}>{uploadedFile.name}</span>
                                  {isSummarizingFile && <LoaderIcon className="h-4 w-4 text-accent-primary ml-2" />}
                              </div>
                              <button onClick={() => { setUploadedFile(null); setPrompt(''); }} className="p-1 text-text-secondary hover:text-text-primary rounded-full"><TrashIcon /></button>
                          </div>
                      )}
                  </div>
              );
          case CreateMode.WebSearch:
              return (
                <div className="my-4 animate-fade-in">
                    {isSearchLoading ? (
                        <div className="text-center p-8 bg-bg-secondary rounded-lg border border-border-primary">
                            <LoaderIcon className="h-10 w-10 mx-auto text-accent-primary" />
                            <p className="mt-4 text-lg font-bold text-text-primary">
                                Buscando en la web: <span className="text-accent-primary">"{searchQuery}"</span>
                            </p>
                            <p className="mt-2 text-text-secondary h-5 transition-opacity">
                                {searchStepMessage}
                            </p>
                        </div>
                    ) : (
                        <>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar un tema para escribir..." className="flex-grow bg-bg-secondary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition" />
                                <button type="submit" disabled={!searchQuery} className="ai-button bg-accent-primary text-white px-4">
                                    <SearchIcon className="h-5 w-5"/>
                                </button>
                            </form>
                            
                            {webSearchResults.length > 0 ? (
                                <div className="mt-6 border-t border-border-primary pt-4 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                    <h3 className="font-bold text-text-primary text-lg mb-2">Resultados de la Búsqueda</h3>
                                    {webSearchResults.map((result, index) => (
                                        <button 
                                            key={index} 
                                            onClick={() => handleSearchResultClick(result)}
                                            className="w-full text-left p-3 bg-bg-primary border border-border-primary rounded-lg hover:border-accent-primary transition-colors"
                                        >
                                            <p className="font-semibold text-accent-primary line-clamp-2" title={result.title}>{result.title}</p>
                                            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{result.summary}</p>
                                            <p className="text-xs text-text-secondary/70 mt-2 truncate">{result.uri}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 border-t border-border-primary pt-4 text-center">
                                    {isTrendsLoading ? <LoaderIcon className="mx-auto" /> : trends.length === 0 && !searchError && (
                                      <button onClick={handleFetchTrends} disabled={isTrendsLoading} className="text-sm text-accent-secondary hover:underline disabled:opacity-50">o descubre temas en tendencia</button>
                                    )}
                                    {trendsError && <p className="text-xs text-danger mt-2">{trendsError}</p>}
                                    {trends.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-left">
                                            {trends.map(t => (
                                              <button key={t.topic} onClick={() => handleTrendClick(t.topic)} disabled={isTrendsLoading} className="p-2 bg-bg-primary rounded-lg border border-border-primary hover:border-accent-primary transition disabled:opacity-50">
                                                  <p className="font-bold text-sm text-accent-primary">{t.topic}</p>
                                                  <p className="text-xs text-text-secondary">{t.description}</p>
                                              </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {searchError && <p className="text-sm text-danger mt-2 text-center">{searchError}</p>}
                        </>
                    )}
                </div>
              );
          case CreateMode.Proofread:
              return (
                  <div className="my-4 animate-fade-in">
                      <p className="text-sm text-center text-text-secondary mb-4">
                          Edita tus tuits en el panel de vista previa de la derecha, luego haz clic aquí para obtener sugerencias de la IA.
                      </p>
                      <button onClick={handleProofread} disabled={isProofreading || tweets.every(t => t.content.length === 0)} className="ai-button bg-success/80 hover:bg-success text-white w-full">
                        <CheckIcon /> {isProofreading ? 'Revisando...' : 'Corregir Ortografía y Gramática'}
                      </button>
                      {isProofreading && <p className="text-center text-sm text-text-secondary mt-2 animate-pulse">Buscando errores...</p>}
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
                                   if (!isCorrected) return null;

                                   return (
                                       <div key={tweet.id} className="bg-bg-primary p-3 rounded-lg border border-border-primary">
                                           <p className="text-xs font-bold text-text-secondary mb-2">Tuit {index + 1}</p>
                                           <p className="text-sm text-red-400 line-through mb-1">{original}</p>
                                           <p className="text-sm text-success mb-2">{suggestion}</p>
                                           <div className="text-right">
                                               <button onClick={() => handleAcceptSuggestion(index)} className="text-xs text-accent-primary hover:underline">Aceptar Sugerencia</button>
                                           </div>
                                       </div>
                                   )
                               })}
                           </div>
                      )}
                  </div>
              );
          case CreateMode.Text:
          default:
              return null;
      }
  };
  
  const renderCreationView = () => {
    return (
        <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
            <header className="w-full max-w-7xl flex justify-center items-center px-4">
                <div className="flex items-center justify-center gap-3">
                    <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary tracking-wide">
                        TwixAi Studio
                    </h1>
                    <LogoIcon className="h-8 w-8"/>
                </div>
            </header>

            <div className="w-full max-w-3xl bg-bg-secondary border border-border-primary rounded-2xl p-1.5 shadow-xl">
                <div className="flex items-center gap-1 p-2">
                   <ModeButton mode={CreateMode.Text} label="Desde Texto" icon={<TextIcon/>}/>
                   <ModeButton mode={CreateMode.Link} label="Desde Enlace" icon={<LinkIcon/>}/>
                   <ModeButton mode={CreateMode.File} label="Desde Archivo" icon={<PaperclipIcon/>}/>
                   <ModeButton mode={CreateMode.WebSearch} label="Búsqueda Web" icon={<SearchIcon/>}/>
                   <ModeButton mode={CreateMode.Proofread} label="Corregir" icon={<CheckIcon />} />
                </div>
                
                <div className="bg-bg-primary rounded-xl p-4">
                    {renderCreationModePanel()}
                    {createMode !== CreateMode.Proofread && (
                      <div className="relative">
                          <TextIcon className="absolute left-4 top-4 h-5 w-5 text-text-secondary pointer-events-none"/>
                          <textarea 
                              value={prompt}
                              onChange={e => setPrompt(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleGenerate('tweet'))}
                              placeholder={createMode === CreateMode.WebSearch ? 'Tu tema de búsqueda se convertirá en el prompt...' : '¿Qué vamos a crear hoy?'}
                              className="w-full bg-transparent focus:outline-none text-text-primary placeholder:text-text-secondary resize-none min-h-[6rem] pt-3 px-12 text-lg"
                              rows={3}
                              disabled={createMode === CreateMode.WebSearch}
                          />
                          <button className="absolute right-3 top-4 p-2 hover:bg-border-primary rounded-full transition-colors">
                              <MicrophoneIcon className="h-5 w-5 text-text-secondary" />
                          </button>
                      </div>
                    )}
                     {searchSources.length > 0 && (
                        <div className="mt-4 border-t border-border-primary pt-4 animate-fade-in">
                            <h4 className="text-sm font-semibold text-text-secondary mb-2">Fuentes de la Búsqueda Web</h4>
                            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {searchSources.map((source, index) => (
                                    <li key={index}>
                                        <a 
                                            href={source.web.uri} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="block p-2 bg-bg-secondary rounded-lg border border-transparent hover:border-accent-primary transition-colors"
                                        >
                                            <p className="text-sm font-medium text-accent-primary truncate" title={source.web.title}>
                                                {source.web.title || 'Fuente sin título'}
                                            </p>
                                            <p className="text-xs text-text-secondary truncate" title={source.web.uri}>
                                                {source.web.uri}
                                            </p>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
                <PopoverChip 
                    name="audience" 
                    icon={<UserCircleIcon className="h-5 w-5"/>} 
                    label="Audiencia"
                    activePopover={activePopover}
                    togglePopover={togglePopover}
                    popoverRef={popoverRef}
                >
                    <label htmlFor="audience" className="text-sm font-semibold text-text-primary mb-2 block">Público Objetivo</label>
                    <textarea id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ej: Desarrolladores..." rows={3} className="w-full bg-bg-primary border border-border-primary rounded-lg p-2 focus:outline-none"/>
                </PopoverChip>
                <PopoverChip 
                    name="tone" 
                    icon={<AtomIcon className="h-5 w-5"/>} 
                    label="Tono"
                    activePopover={activePopover}
                    togglePopover={togglePopover}
                    popoverRef={popoverRef}
                >
                     <label htmlFor="tone" className="text-sm font-semibold text-text-primary mb-2 block">Tono</label>
                     <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full bg-bg-primary border border-border-primary rounded-lg p-2 focus:outline-none">
                        <option value="default">Neutral y Claro</option>
                        <option value="authority">Autoridad</option>
                        <option value="storytelling">Narrativo</option>
                        <option value="analytical">Analítico</option>
                        <option value="conversational">Conversacional</option>
                        <option value="inspirational">Inspirador</option>
                    </select>
                </PopoverChip>
                 <PopoverChip 
                    name="format" 
                    icon={<ListIcon className="h-5 w-5"/>} 
                    label="Formato"
                    activePopover={activePopover}
                    togglePopover={togglePopover}
                    popoverRef={popoverRef}
                 >
                     <label htmlFor="format" className="text-sm font-semibold text-text-primary mb-2 block">Formato</label>
                     <select id="format" value={format} onChange={(e) => setFormat(e.target.value)} className="w-full bg-bg-primary border border-border-primary rounded-lg p-2 focus:outline-none">
                        <option value="default">Estándar</option>
                        <option value="announcement">Anuncio</option>
                        <option value="listicle">Listado</option>
                        <option value="how_to">Guía Práctica</option>
                        <option value="question">Pregunta Abierta</option>
                        <option value="quick_tip">Consejo Rápido</option>
                        <option value="support_statement">Respaldo/Contexto</option>
                    </select>
                </PopoverChip>
                 <button onClick={() => setIsBrandVoiceModalOpen(true)} className="chip-button">
                    <SparklesIcon className="h-5 w-5 text-accent-secondary"/>
                    <span>Voz de Marca</span>
                </button>
            </div>
        </div>
    );
  };
  
 return (
    <div className="w-full">
        {generationStatus ? (
            <div className="flex items-center justify-center my-16">
                <div className="w-full max-w-2xl">
                     <GenerationStatus title={generationStatus.title} steps={generationStatus.steps} currentStepIndex={generationStatus.currentStep} error={generationStatus.error} />
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                {/* Left Column: Creation Panel & Chat */}
                <div className="flex flex-col gap-8">
                    {renderCreationView()}
                    {chatMessages.length > 0 && (
                       <div className="lg:sticky lg:top-28 max-h-[calc(100vh-8rem)]">
                           <ChatHistory messages={chatMessages} onSendMessage={handleSendRefinement} isLoading={isChatLoading} />
                      </div>
                    )}
                </div>

                {/* Right Column: Preview Panel */}
                <div className="lg:sticky lg:top-28 h-fit max-h-[calc(100vh-8rem)]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-text-primary">Vista Previa</h3>
                        <button 
                            onClick={handleStartNew} 
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors bg-bg-secondary border border-border-primary text-text-secondary hover:bg-border-primary hover:text-text-primary"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Nueva Creación
                        </button>
                    </div>
                    <div className="overflow-y-auto pr-2 max-h-[calc(100vh-12rem)]">
                        <div className="space-y-4">
                          {tweets.map((tweet, index) => (
                              <div key={tweet.id} ref={el => { tweetPreviewRefs.current[index] = el; }}>
                                  <TweetPreview
                                      tweet={{
                                        id: tweet.id,
                                        content: tweet.content,
                                        author: DEFAULT_USER,
                                        media: tweet.media || undefined,
                                        stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 },
                                        postedAt: new Date(),
                                      }}
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
                          ))}
                        </div>
                        {tweets.length > 0 && (
                          <button onClick={addTweetToThread} className="mt-4 text-accent-primary font-semibold hover:underline self-start">
                              + Añadir al Hilo
                          </button>
                      )}
                    </div>
                </div>
            </div>
        )}
        
        <BrandVoiceModal 
          isOpen={isBrandVoiceModalOpen}
          onClose={() => setIsBrandVoiceModalOpen(false)}
          onSave={handleSaveBrandVoice}
        />

        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
        <input type="file" id="context-file-upload-hidden" ref={contextFileInputRef} onChange={handleContextFileSelect} className="hidden" accept=".txt,.md,.pdf,.doc,.docx" />


        {isMediaPromptModalOpen && (
            <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 w-full max-w-lg relative shadow-2xl shadow-black/50">
                    <h2 className="text-xl font-bold mb-4">Generar {mediaGenerationTarget?.type === 'image' ? 'Imagen' : 'Video'}</h2>
                    <textarea
                        value={mediaPrompt}
                        onChange={(e) => setMediaPrompt(e.target.value)}
                        placeholder="Introduce un prompt para el medio..."
                        className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition"
                        rows={4}
                    />
                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={closeMediaPromptModal} className="ai-button bg-bg-primary hover:bg-border-primary/50 text-text-primary px-6">Cancelar</button>
                        <button onClick={handleConfirmMediaGeneration} disabled={!mediaPrompt} className="ai-button bg-accent-primary hover:opacity-90 text-white px-6">Generar</button>
                    </div>
                </div>
            </div>
        )}

        <style>{`
            .top-gen-button {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.625rem 1.25rem;
                border-radius: 9999px;
                font-weight: bold;
                transition: all 0.2s;
                background-color: #3772FF;
                color: #20063B;
                box-shadow: 0 4px 15px rgba(55, 114, 255, 0.3);
            }
            .top-gen-button:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(55, 114, 255, 0.4);
            }
            .top-gen-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .chip-button {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 9999px;
                font-weight: 600;
                transition: all 0.2s;
                background-color: #2a0e4f;
                color: #E9FFF9;
                border: 1px solid #403255;
            }
            .chip-button:hover {
                background-color: #403255;
            }
            .ai-button {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              padding: 0.75rem;
              border-radius: 9999px;
              font-weight: bold;
              transition: all 0.2s;
            }
            .ai-button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .animate-fade-in-up {
              animation: fadeInUp 0.3s ease-in-out;
            }
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
              animation: fadeIn 0.5s ease-out forwards;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .line-clamp-2 {
                overflow: hidden;
                display: -webkit-box;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
            }
        `}</style>
    </div>
  );
});