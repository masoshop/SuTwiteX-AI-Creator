
import React, { useState, useRef, useEffect } from 'react';
import { regenerateTweet, generateImage, generateVideo, generateCreativeMediaPrompt, generateTweetThread, generateTweet, analyzeVideo } from '../services/geminiService';
import type { XUserProfile, EditableTweet, BrandVoiceProfile } from '../types';
import TweetPreview from './TweetPreview';
import GenerationStatus from './GenerationStatus';
import BrandVoiceModal from './BrandVoiceModal';
import SimpleGenerator from './SimpleGenerator';
import LogoIcon from './icons/LogoIcon';
import PlusIcon from './icons/PlusIcon';
import SparklesIcon from './icons/SparklesIcon';
import LoaderIcon from './icons/LoaderIcon';
import SearchIcon from './icons/SearchIcon';
import VideoIcon from './icons/VideoIcon';

const DEFAULT_USER: XUserProfile = {
  id: 'user-cryptomaso',
  name: 'cryptomaso',
  handle: '@cryptomaso',
  avatarUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23657786'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E`,
  verified: true
};

const Dashboard: React.FC = () => {
  const [tweets, setTweets] = useState<EditableTweet[]>([]);
  const [generationStatus, setGenerationStatus] = useState<{ title: string; steps: string[]; currentStep: number; error: string | null; } | null>(null);
  const [brandVoiceProfile, setBrandVoiceProfile] = useState<BrandVoiceProfile | null>(null);
  const [isBrandVoiceModalOpen, setIsBrandVoiceModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaPrompt, setMediaPrompt] = useState('');
  const [mediaTarget, setMediaTarget] = useState<{index: number, type: 'image' | 'video'} | null>(null);
  const [isVideoAnalysisModalOpen, setIsVideoAnalysisModalOpen] = useState(false);
  const [videoAnalysisPrompt, setVideoAnalysisPrompt] = useState('');
  const [videoFile, setVideoFile] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
        const savedVoice = localStorage.getItem('twixai-brand-voice');
        if (savedVoice) setBrandVoiceProfile(JSON.parse(savedVoice));
        
        const savedTweets = localStorage.getItem('twixai-tweets');
        if (savedTweets) {
            const parsed = JSON.parse(savedTweets);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setTweets(parsed);
            } else {
                setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
            }
        } else {
            setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
        }
    } catch (e) {
        console.error("Failed to initialize Dashboard session:", e);
        setTweets([{ id: `tweet-0`, content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
    }
  }, []);

  useEffect(() => {
    if (tweets.length > 0) {
        localStorage.setItem('twixai-tweets', JSON.stringify(tweets));
    }
  }, [tweets]);

  const handleQuickAction = async (type: 'tweet' | 'thread' | 'video', text: string) => {
    if (!text.trim() && type !== 'video') return;
    
    if (type === 'video') {
        videoInputRef.current?.click();
        return;
    }

    setIsGenerating(true);
    setGenerationStatus({ 
        title: type === 'thread' ? 'Generando Hilo' : 'Generando Tuit', 
        steps: ['Analizando idea...', 'Escribiendo contenido...', 'Finalizando...'], 
        currentStep: 0, 
        error: null 
    });
    
    try {
        setGenerationStatus(prev => prev ? { ...prev, currentStep: 1 } : null);
        let newTweets: EditableTweet[] = [];

        if (type === 'thread') {
            const { thread } = await generateTweetThread(text, brandVoiceProfile || undefined);
            newTweets = thread.map((content, i) => ({
                id: `tweet-${Date.now()}-${i}`,
                content,
                media: null,
                isLoadingMedia: false,
                isCopied: false,
                isRegenerating: false,
            }));
        } else {
            const tweet = await generateTweet(text, brandVoiceProfile || undefined);
            newTweets = [{
                id: `tweet-${Date.now()}`,
                content: tweet,
                media: null,
                isLoadingMedia: false,
                isCopied: false,
                isRegenerating: false,
            }];
        }

        setTweets(prev => {
            // Remove the initial empty tweet if it's the only one
            const filteredPrev = prev.filter(t => t.content.trim() !== '' || t.media !== null);
            return [...newTweets, ...filteredPrev];
        });

        setGenerationStatus(prev => prev ? { ...prev, currentStep: 2 } : null);
    } catch (e) {
        console.error("Generation failed:", e);
        setGenerationStatus(prev => prev ? { ...prev, error: e instanceof Error ? e.message : "Error de API" } : null);
    } finally {
        setIsGenerating(false);
        setTimeout(() => setGenerationStatus(null), 3000);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            setVideoFile({ data: base64, mimeType: file.type, name: file.name });
            setIsVideoAnalysisModalOpen(true);
        };
        reader.readAsDataURL(file);
    }
  };

  const confirmVideoAnalysis = async () => {
    if (!videoFile || !videoAnalysisPrompt.trim()) return;
    setIsVideoAnalysisModalOpen(false);
    setIsGenerating(true);
    try {
        const analysis = await analyzeVideo(videoAnalysisPrompt, videoFile.data, videoFile.mimeType);
        setTweets(prev => {
            const filteredPrev = prev.filter(t => t.content.trim() !== '' || t.media !== null);
            return [{
                id: `tweet-${Date.now()}`,
                content: analysis,
                media: null,
                isLoadingMedia: false,
                isCopied: false,
                isRegenerating: false,
            }, ...filteredPrev];
        });
    } catch (e) {
        console.error("Video analysis failed:", e);
    } finally {
        setIsGenerating(false);
        setVideoFile(null);
        setVideoAnalysisPrompt('');
    }
  };

  const handleGenerateMedia = async (type: 'image' | 'video', index: number) => {
    setMediaTarget({ index, type });
    setMediaPrompt('');
    setIsMediaModalOpen(true);
    const creative = await generateCreativeMediaPrompt(tweets[index].content, type);
    setMediaPrompt(creative);
  };

  const confirmMedia = async () => {
    if (!mediaTarget) return;
    const { index, type } = mediaTarget;
    setIsMediaModalOpen(false);
    setTweets(prev => prev.map((t, i) => i === index ? { ...t, isLoadingMedia: true } : t));
    
    try {
        if (type === 'image') {
            const { images } = await generateImage(mediaPrompt);
            if (images && images.length > 0) {
                const img = images[0];
                console.log(`[Gemini API] Image generated successfully. Size: ${img.data.length} chars, Mime: ${img.mimeType}`);
                setTweets(prev => prev.map((t, i) => i === index ? { ...t, media: { type: 'image', url: `data:${img.mimeType};base64,${img.data}` } } : t));
            }
        } else {
            const url = await generateVideo(mediaPrompt);
            setTweets(prev => prev.map((t, i) => i === index ? { ...t, media: { type: 'video', url } } : t));
        }
    } catch (e) {
        console.error("Multimedia failed:", e);
    } finally {
        setTweets(prev => prev.map((t, i) => i === index ? { ...t, isLoadingMedia: false } : t));
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in px-4 py-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
            <header className="flex justify-between items-center py-1">
                <div className="flex items-center gap-2">
                    <LogoIcon className="h-6 w-6 text-accent-primary"/>
                    <h1 className="text-base font-black italic tracking-tighter uppercase">TwixAI Studio</h1>
                </div>
                <button type="button" onClick={() => setIsBrandVoiceModalOpen(true)} className="p-1.5 bg-bg-secondary rounded-lg border border-border-primary hover:border-accent-primary transition-all active:scale-95 shadow-sm">
                    <SparklesIcon className="h-3.5 w-3.5 text-accent-primary"/>
                </button>
            </header>
            <SimpleGenerator onGenerate={(text, mode) => handleQuickAction(mode, text)} onGenerateVideo={(text) => handleQuickAction('video', text)} isLoading={isGenerating} />
        </div>

        <div className="lg:sticky lg:top-2 h-fit max-h-[94vh] overflow-y-auto no-scrollbar space-y-2 pb-10">
            <div className="flex justify-between items-center sticky top-0 bg-bg-primary/80 backdrop-blur-md py-1 z-10">
                <h2 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
                    Preview
                </h2>
                <div className="flex items-center gap-3">
                    {tweets.length > 1 && (
                        <button 
                            type="button" 
                            onClick={() => {
                                const allContent = tweets.map(t => t.content).join('\n\n');
                                navigator.clipboard.writeText(allContent);
                            }}
                            className="text-[9px] font-bold text-accent-primary uppercase tracking-widest hover:text-white transition-colors"
                        >
                            Copiar Todo
                        </button>
                    )}
                    <button type="button" onClick={() => {
                        setTweets([{ id: 'tweet-0', content: '', media: null, isLoadingMedia: false, isCopied: false, isRegenerating: false }]);
                        localStorage.removeItem('twixai-tweets');
                    }} className="text-[9px] font-bold text-text-secondary uppercase tracking-widest hover:text-accent-primary transition-colors">
                        + Limpiar
                    </button>
                </div>
            </div>
            {tweets.map((t, i) => (
                <TweetPreview 
                    key={t.id} 
                    tweet={{ id: t.id, content: t.content, author: DEFAULT_USER, media: t.media || undefined, public_metrics: { like_count: 0, retweet_count: 0, impression_count: 0, reply_count: 0, quote_count: 0 }, created_at: new Date().toISOString() }}
                    editableTweet={t}
                    onTweetChange={(v) => { 
                        setTweets(prev => prev.map((tweet, idx) => idx === i ? { ...tweet, content: v } : tweet));
                    }}
                    onCopy={() => {
                        navigator.clipboard.writeText(t.content);
                        setTweets(prev => prev.map((tweet, idx) => idx === i ? { ...tweet, isCopied: true } : tweet));
                        setTimeout(() => {
                            setTweets(prev => prev.map((tweet, idx) => idx === i ? { ...tweet, isCopied: false } : tweet));
                        }, 2000);
                    }}
                    onRegenerate={async () => { 
                        setTweets(prev => prev.map((tweet, idx) => idx === i ? { ...tweet, isRegenerating: true } : tweet));
                        try {
                            const r = await regenerateTweet(t.content); 
                            setTweets(prev => prev.map((tweet, idx) => idx === i ? { ...tweet, content: r } : tweet));
                        } catch (e) {
                            console.error("Regeneration failed:", e);
                        } finally {
                            setTweets(prev => prev.map((tweet, idx) => idx === i ? { ...tweet, isRegenerating: false } : tweet));
                        }
                    }}
                    onDeleteTweet={() => setTweets(prev => prev.filter((_, idx) => idx !== i))}
                    onGenerateMedia={(type) => handleGenerateMedia(type as any, i)}
                    onRemoveMedia={() => { 
                        setTweets(prev => prev.map((tweet, idx) => idx === i ? { ...tweet, media: null } : tweet));
                    }}
                />
            ))}
        </div>
    </div>

        {generationStatus && <GenerationStatus {...generationStatus} currentStepIndex={generationStatus.currentStep} />}
        {isMediaModalOpen && (
            <div className="fixed inset-0 bg-bg-primary/95 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                <div className="bg-bg-secondary border border-border-primary p-8 rounded-3xl w-full max-w-lg shadow-2xl ring-1 ring-white/10">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3 uppercase italic tracking-tighter">
                        <SparklesIcon className="h-6 w-6 text-accent-primary" />
                        IA Visual
                    </h2>
                    <p className="text-text-secondary text-sm mb-6">Describe lo que quieres ver. La IA creará una pieza única para tu tuit.</p>
                    
                    <textarea 
                        value={mediaPrompt} 
                        onChange={(e) => setMediaPrompt(e.target.value)} 
                        placeholder="Describe la imagen o video..."
                        className="w-full bg-bg-primary border border-border-primary rounded-2xl p-4 mb-6 min-h-[150px] text-sm focus:ring-2 focus:ring-accent-primary focus:outline-none transition" 
                    />

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsMediaModalOpen(false)} className="px-6 py-2 rounded-full font-bold bg-bg-primary border border-border-primary hover:bg-border-primary/50 transition-colors">Cancelar</button>
                        <button 
                            type="button"
                            onClick={confirmMedia} 
                            disabled={!mediaPrompt.trim()}
                            className="px-8 py-2 rounded-full font-bold bg-accent-primary text-bg-primary hover:opacity-90 transition-opacity shadow-glow-primary disabled:opacity-30"
                        >
                            Crear {mediaTarget?.type === 'image' ? 'Imagen' : 'Video'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        <BrandVoiceModal isOpen={isBrandVoiceModalOpen} onClose={() => setIsBrandVoiceModalOpen(false)} onSave={(p) => { setBrandVoiceProfile(p); localStorage.setItem('twixai-brand-voice', JSON.stringify(p)); }} />
        
        <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />
        
        {isVideoAnalysisModalOpen && (
            <div className="fixed inset-0 bg-bg-primary/95 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                <div className="bg-bg-secondary border border-border-primary p-8 rounded-2xl w-full max-w-lg shadow-2xl">
                    <h3 className="text-xl font-black mb-4 uppercase">Análisis de Video</h3>
                    <p className="text-sm text-text-secondary mb-4">Video: {videoFile?.name}</p>
                    <textarea 
                        placeholder="¿Qué quieres saber sobre este video?" 
                        className="w-full bg-bg-primary border border-border-primary rounded-xl p-4 mb-6 min-h-[100px]"
                        value={videoAnalysisPrompt}
                        onChange={(e) => setVideoAnalysisPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                confirmVideoAnalysis();
                            }
                        }}
                    />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsVideoAnalysisModalOpen(false)} className="px-6 py-2 rounded-full font-bold bg-bg-primary border border-border-primary">Cancelar</button>
                        <button type="button" onClick={confirmVideoAnalysis} className="px-8 py-2 rounded-full font-bold bg-accent-primary text-bg-primary">Analizar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Dashboard;
