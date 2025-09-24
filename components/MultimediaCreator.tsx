
import React, { useState, useCallback, useRef } from 'react';
import { generateImage, generateVideo } from '../services/geminiService';
import GenerationStatus from './GenerationStatus';
import CameraIcon from './icons/CameraIcon';
import VideoIcon from './icons/VideoIcon';
import DownloadIcon from './icons/DownloadIcon';
import UploadIcon from './icons/UploadIcon';
import SparklesIcon from './icons/SparklesIcon';
import LoaderIcon from './icons/LoaderIcon';
import TrashIcon from './icons/TrashIcon';


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
};

const MultimediaCreator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generationStatus, setGenerationStatus] = useState<{ title: string; steps: string[]; currentStep: number; error: string | null; } | null>(null);
    const [media, setMedia] = useState<{
        type: 'image' | 'video';
        url: string;
        base64Data?: string;
        mimeType?: string;
    } | null>(null);

    const [videoStyle, setVideoStyle] = useState<'cinematic' | 'documentary' | 'animation'>('cinematic');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetStateForGeneration = () => {
        setIsLoading(true);
        // Don't clear media immediately, so animation can use the source image
        setGenerationStatus(null);
    };
    
    const onProgress = (message: string) => {
      setGenerationStatus(prevStatus => {
          const videoSteps = ['Starting up', 'AI processing', 'Generating frames', 'Finalizing video', 'Done!'];
          if (!prevStatus) return { title: 'Generating Video...', steps: videoSteps, currentStep: 0, error: null };
          
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
          return { ...prevStatus, steps: videoSteps, title: 'Generating Video...', currentStep, error };
      });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;

        try {
            const base64Data = await fileToBase64(file);
            const objectUrl = URL.createObjectURL(file);
            setMedia({ type: 'image', url: objectUrl, base64Data, mimeType: file.type });
            setGenerationStatus(null);
        } catch (e) {
            const error = e instanceof Error ? e.message : 'Unknown error';
            setGenerationStatus({ title: "Error", steps: [], currentStep: 0, error: `Failed to read file: ${error}` });
        }
        if (event.target) event.target.value = '';
    };

    const handleGenerateImage = useCallback(async () => {
        resetStateForGeneration();
        setMedia(null); // Clear previous media when generating a new one
        try {
            const steps = ['Composing prompt', 'Generating pixels', 'Rendering image', 'Done!'];
            setGenerationStatus({ title: 'Generating Image...', steps, currentStep: 0, error: null });

            const base64Data = await generateImage(prompt, '16:9');
            
            setGenerationStatus(prev => prev ? { ...prev, currentStep: 2 } : null);
            const imageUrl = `data:image/jpeg;base64,${base64Data}`;
            setMedia({ type: 'image', url: imageUrl, base64Data, mimeType: 'image/jpeg' });
            setGenerationStatus(prev => prev ? { ...prev, currentStep: 3 } : null);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setGenerationStatus(prev => prev ? { ...prev, error: message, currentStep: prev.steps.length } : null);
        } finally {
            setIsLoading(false);
            setTimeout(() => setGenerationStatus(null), 7000);
        }
    }, [prompt]);
    
    const generateVideoAction = useCallback(async (image?: { data: string; mimeType: string }) => {
        resetStateForGeneration();
        try {
            const mediaUrl = await generateVideo(prompt, videoStyle, onProgress, image);
            setMedia({ type: 'video', url: mediaUrl });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setGenerationStatus(prev => prev ? { ...prev, error: message, currentStep: prev.steps.length } : null);
        } finally {
            setIsLoading(false);
            setTimeout(() => setGenerationStatus(null), 7000);
        }
    }, [prompt, videoStyle]);

    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold mb-2 text-accent-primary">Multimedia Creator</h1>
            <p className="text-text-secondary mb-8">Generate stunning images and videos with AI from a simple text prompt.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-bg-secondary p-6 rounded-xl border border-border-primary shadow-sm space-y-4">
                    <div>
                        <label htmlFor="prompt" className="text-sm font-semibold text-text-primary mb-2">Describe the media you want to create</label>
                        <textarea 
                            id="prompt" 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)} 
                            placeholder="e.g., A futuristic cityscape at sunset..." 
                            className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-blue focus:outline-none transition" 
                            rows={4} 
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-text-primary mb-2 block">Video Style (for video generation)</label>
                        <div className="flex gap-2">
                             {(['cinematic', 'documentary', 'animation'] as const).map(style => (
                                <button key={style} onClick={() => setVideoStyle(style)} className={`flex-1 p-2 rounded-lg border-2 capitalize transition-colors ${videoStyle === style ? 'border-accent-primary bg-accent-primary/10' : 'border-border-primary hover:border-text-secondary'}`}>
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border-primary space-y-3">
                        <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="ai-button w-full bg-success/80 hover:bg-success">
                            <UploadIcon /> Upload Image
                        </button>
                        <button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} className="ai-button w-full">
                            <CameraIcon /> {isLoading ? 'Generating...' : 'Generate New Image'}
                        </button>
                        <button onClick={() => generateVideoAction()} disabled={isLoading || !prompt.trim()} className="ai-button w-full">
                            <VideoIcon /> {isLoading ? 'Generating...' : 'Generate Video from Text'}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center p-8 bg-bg-secondary border border-border-primary rounded-xl h-full flex flex-col justify-center">
                            {media && media.type === 'image' && generationStatus?.title.includes('Video') && (
                                <img src={media.url} alt="Source for animation" className="w-full h-auto object-contain max-h-40 mb-4 rounded-lg opacity-50" />
                            )}
                            {generationStatus ? (
                                <GenerationStatus title={generationStatus.title} steps={generationStatus.steps} currentStepIndex={generationStatus.currentStep} error={generationStatus.error} />
                            ) : (
                                <>
                                    <LoaderIcon className="h-8 w-8 mx-auto text-accent-primary" />
                                    <p className="mt-2 text-text-secondary">AI is working its magic...</p>
                                </>
                            )}
                        </div>
                    ) : media ? (
                        <div className="bg-bg-secondary border border-border-primary rounded-xl p-4 animate-fade-in">
                            <h2 className="text-xl font-bold mb-4">Preview</h2>
                            <div className="relative group rounded-lg overflow-hidden border border-border-primary">
                                {media.type === 'image' ? (
                                    <img src={media.url} alt={prompt} className="w-full h-auto object-contain" />
                                ) : (
                                    <video src={media.url} controls autoPlay className="w-full h-auto" />
                                )}
                                <a href={media.url} download={`sutwitex-media.${media.type === 'image' ? 'jpeg' : 'mp4'}`} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80" title="Download">
                                    <DownloadIcon className="h-5 w-5" />
                                </a>
                                <button onClick={() => setMedia(null)} className="absolute top-2 left-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80" title="Remove Media">
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                            {media.type === 'image' && (
                                <button onClick={() => generateVideoAction({ data: media.base64Data!, mimeType: media.mimeType! })} disabled={isLoading || !prompt.trim()} className="ai-button w-full mt-4 bg-accent-secondary hover:bg-emerald-600">
                                    <SparklesIcon /> {isLoading ? 'Animating...' : 'Animate this Image'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-bg-secondary border border-dashed border-border-primary rounded-xl h-full flex flex-col justify-center items-center">
                             <CameraIcon className="h-10 w-10 text-border-primary mb-2" />
                            <p className="text-text-secondary">Your generated media will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
            
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

             <style>{`
              .ai-button { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 9999px; font-weight: bold; transition: all 0.2s; background-color: #3B82F6; color: white; text-align: center; white-space: nowrap; }
              .ai-button:hover:not(:disabled) { opacity: 0.9; }
              .ai-button:disabled { opacity: 0.5; cursor: not-allowed; }
              .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; translateY(0); } }
            `}</style>
        </div>
    );
}

export default MultimediaCreator;
