
import React, { useState, useRef, useEffect } from 'react';
import { generateImage, generateVideo, generatePromptIdeas, optimizePromptOrContent } from '../services/geminiService';
import SearchIcon from './icons/SearchIcon';
import SparklesIcon from './icons/SparklesIcon';
import UploadIcon from './icons/UploadIcon';
import DownloadIcon from './icons/DownloadIcon';
import LoaderIcon from './icons/LoaderIcon';
import TrashIcon from './icons/TrashIcon';
import RefreshIcon from './icons/RefreshIcon';
import CameraIcon from './icons/CameraIcon';
import type { Asset } from '../types';

type CategoryId = 'social' | 'thumbnail' | 'banner' | 'poster' | 'edit' | 'mix' | 'video';

interface CategoryConfig {
  id: CategoryId;
  label: string;
  renderPreview: () => React.ReactNode;
  defaultRatio: string;
  description: string;
}

const CATEGORIES: CategoryConfig[] = [
  { 
    id: 'social', 
    label: 'Redes', 
    renderPreview: () => (
        <div className="w-10 h-10 bg-current rounded border-2 border-current opacity-90"></div>
    ),
    defaultRatio: '1:1', 
    description: 'Ideal para Instagram y Facebook (1:1)' 
  },
  { 
    id: 'thumbnail', 
    label: 'Miniatura', 
    renderPreview: () => (
        <div className="w-14 h-8 bg-current rounded border-2 border-current opacity-90"></div>
    ),
    defaultRatio: '16:9', 
    description: 'Perfecto para YouTube (16:9)' 
  },
  { 
    id: 'banner', 
    label: 'Banner', 
    renderPreview: () => (
        <div className="w-16 h-4 bg-current rounded border-2 border-current opacity-90"></div>
    ),
    defaultRatio: '16:9', 
    description: 'Cabeceras de perfil (Panorámico)' 
  },
  { 
    id: 'poster', 
    label: 'Cartel', 
    renderPreview: () => (
        <div className="w-8 h-14 bg-current rounded border-2 border-current opacity-90"></div>
    ),
    defaultRatio: '9:16', 
    description: 'Stories, TikTok y Reels (9:16)' 
  },
  { 
    id: 'edit', 
    label: 'Edición', 
    renderPreview: () => (
        <div className="w-10 h-10 border-2 border-dashed border-current rounded flex items-center justify-center">
             <div className="w-2 h-2 bg-current rounded-full"></div>
        </div>
    ),
    defaultRatio: '1:1', 
    description: 'Modifica una imagen existente' 
  },
  { 
    id: 'mix', 
    label: 'Mezcla', 
    renderPreview: () => (
        <div className="relative w-10 h-10">
            <div className="absolute top-0 left-0 w-7 h-7 border-2 border-current bg-current opacity-40 rounded z-0"></div>
            <div className="absolute bottom-0 right-0 w-7 h-7 border-2 border-current bg-current opacity-80 rounded z-10"></div>
        </div>
    ),
    defaultRatio: '1:1', 
    description: 'Fusiona múltiples imágenes en una' 
  },
  { 
    id: 'video', 
    label: 'Video', 
    renderPreview: () => (
        <div className="w-12 h-8 bg-current rounded border-2 border-current opacity-90 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-bg-secondary border-b-[4px] border-b-transparent ml-1"></div>
        </div>
    ),
    defaultRatio: '16:9', 
    description: 'Genera clips de video cinematográficos (Beta)' 
  },
];

const EDIT_PRESETS = [
    { label: "Filtro Retro", prompt: "Añade un filtro retro cinematográfico de los años 70, con colores cálidos y grano de película." },
    { label: "Mantener Colores", prompt: "Realiza un ajuste de nitidez y detalle pero bloquea absolutamente todos los colores originales para que no cambien ni un ápice." },
    { label: "Eliminar Fondo", prompt: "Elimina completamente el fondo y deja solo el sujeto principal sobre un fondo blanco puro de estudio." },
    { label: "Estilo Cyberpunk", prompt: "Añade luces de neón azules y púrpuras, atmósfera futurista y lluvia nocturna a la escena." },
    { label: "Blanco y Negro", prompt: "Convierte a un estilo de fotografía en blanco y negro artístico de alto contraste y gran detalle." },
];

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export const MultimediaCreator: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('social');
  const [prompt, setPrompt] = useState('');
  const [preserveSubject, setPreserveSubject] = useState(true);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ideas, setIdeas] = useState<{ prompt: string; category: string }[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  useEffect(() => {
    const category = CATEGORIES.find(c => c.id === activeCategory);
    if (category) {
      setAspectRatio(category.defaultRatio);
    }
    setGeneratedImage(null);
    setGenerationError(null);
    setUploadedFiles([]);
    setFilePreviews([]);
    setPrompt('');
  }, [activeCategory]);
  
  useEffect(() => {
    let active = true;
    let url: string | null = null;
    
    if (generatedImage) {
        const createBlob = async () => {
            try {
                let blob: Blob;
                if (generatedImage.startsWith('data:')) {
                    const parts = generatedImage.split(',');
                    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
                    const bstr = atob(parts[1]);
                    let n = bstr.length;
                    const u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    blob = new Blob([u8arr], { type: mime });
                } else {
                    const res = await fetch(generatedImage);
                    blob = await res.blob();
                }
                
                if (!active) return;
                
                const blobUrl = URL.createObjectURL(blob);
                url = blobUrl;
                setDownloadUrl(blobUrl);
            } catch (err) {
                if (active) {
                    console.error("Error creating blob url", err);
                    setDownloadUrl(null);
                }
            }
        };
        createBlob();
    } else {
        setDownloadUrl(null);
    }
    
    return () => {
        active = false;
        if (url) URL.revokeObjectURL(url);
    }
  }, [generatedImage]);

  const handleGenerate = async (overridePrompt?: string) => {
    const finalPrompt = overridePrompt || prompt;

    if (activeCategory === 'mix' && uploadedFiles.length < 2) {
        setGenerationError("Para la Mezcla, necesitas subir al menos 2 imágenes.");
        return;
    }
    if (activeCategory === 'edit' && uploadedFiles.length === 0) {
        setGenerationError("Para editar, debes subir una imagen.");
        return;
    }

    setIsGenerating(true);
    setGenerationStep('Preparando archivos...');
    setGenerationError(null);
    setGeneratedImage(null);

    try {
      const referenceImages: { data: string; mimeType: string }[] = [];
      
      if (uploadedFiles.length > 0) {
          setGenerationStep('Procesando imágenes...');
          const filePromises = uploadedFiles.map(file => {
              return new Promise<{ data: string; mimeType: string }>((resolve) => {
                  const reader = new FileReader();
                  reader.readAsDataURL(file);
                  reader.onload = () => {
                      const base64 = (reader.result as string).split(',')[1];
                      resolve({ data: base64, mimeType: file.type });
                  };
              });
          });
          const results = await Promise.all(filePromises);
          referenceImages.push(...results);
      }

      setGenerationStep('Generando con IA (esto puede tardar unos segundos)...');
      
      if (activeCategory === 'video') {
          const videoUrl = await generateVideo(finalPrompt || `Crea un video cinematográfico de alta calidad.`, aspectRatio, (msg) => setGenerationStep(msg));
          setGeneratedImage(videoUrl);
      } else {
          const { images } = await generateImage(
              finalPrompt || `Crea una imagen de alta calidad.`, 
              aspectRatio, 
              referenceImages,
              preserveSubject
          );
          
          if (images && images.length > 0) {
            const img = images[0];
            setGeneratedImage(`data:${img.mimeType};base64,${img.data}`);
          } else {
            throw new Error("No se generó ninguna imagen.");
          }
      }
      
      setGenerationStep('Finalizando...');

    } catch (error) {
      console.error(error);
      setGenerationError(error instanceof Error ? error.message : "Error desconocido al generar imagen.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToEdit = async () => {
      if (!generatedImage) return;
      
      try {
          let blob: Blob;
          if (generatedImage.startsWith('data:')) {
              const parts = generatedImage.split(',');
              const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
              const bstr = atob(parts[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                  u8arr[n] = bstr.charCodeAt(n);
              }
              blob = new Blob([u8arr], { type: mime });
          } else {
              const response = await fetch(generatedImage);
              blob = await response.blob();
          }
          
          const file = new File([blob], `edit-${Date.now()}.jpg`, { type: blob.type });
          
          setActiveCategory('edit');
          setUploadedFiles([file]);
          setFilePreviews([generatedImage]);
          setGeneratedImage(null);
          setPrompt('');
      } catch (e) {
          console.error("Error sending image to edit", e);
      }
  };

  const handleIdeaGeneration = async () => {
    setIsLoadingIdeas(true);
    try {
      const currentLabel = CATEGORIES.find(c => c.id === activeCategory)?.label || "General";
      const newIdeas = await generatePromptIdeas(currentLabel);
      setIdeas(newIdeas);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingIdeas(false);
    }
  };

  const handleUseIdea = async (ideaPrompt: string, category: string) => {
    setPrompt("Optimizando...");
    try {
        const enhanced = await optimizePromptOrContent(ideaPrompt, category);
        setPrompt(enhanced);
    } catch {
        setPrompt(ideaPrompt);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        if (activeCategory === 'edit') {
            const file = files[0];
            setUploadedFiles([file]);
            setFilePreviews([URL.createObjectURL(file)]);
        } else {
            const newFiles = Array.from(files) as File[];
            setUploadedFiles(prev => [...prev, ...newFiles]);
            const newPreviews = newFiles.map(f => URL.createObjectURL(f));
            setFilePreviews(prev => [...prev, ...newPreviews]);
        }
    }
    if (e.target) e.target.value = ''; 
  };

  const removeFile = (index: number) => {
      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
      setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Multimedia Studio</h1>
        <p className="text-text-secondary">Crea visuales hiperrealistas o edita tus imágenes existentes con IA.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8 max-w-5xl mx-auto px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 h-36 shadow-sm hover:shadow-md ${
              activeCategory === cat.id
                ? 'bg-white border-accent-primary text-accent-primary scale-105 z-10'
                : 'bg-bg-secondary border-transparent text-text-secondary hover:bg-white hover:text-text-primary'
            }`}
          >
            <div className={`transform transition-transform duration-300 ${activeCategory === cat.id ? 'scale-110' : ''}`}>
                {cat.renderPreview()}
            </div>
            <span className="text-sm font-bold">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4">
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-accent-primary"/> 
                {CATEGORIES.find(c => c.id === activeCategory)?.label}
            </h2>
            
            <p className="text-sm text-text-secondary mb-6 pb-4 border-b border-border-primary">
               {CATEGORIES.find(c => c.id === activeCategory)?.description}
            </p>

            <div className="mb-6 animate-fade-in">
                <label className="block text-sm font-bold text-text-secondary mb-2">
                    {activeCategory === 'mix' ? 'Imágenes para Mezclar (Mín. 2)' : activeCategory === 'edit' ? 'Imagen a Editar (Mín. 1)' : 'Imagen de Referencia'}
                </label>
                
                {filePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        {filePreviews.map((src, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border-primary group">
                                <img src={src} alt="preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeFile(index)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TrashIcon className="w-3 h-3"/>
                                </button>
                            </div>
                        ))}
                        {(activeCategory === 'mix' || (activeCategory !== 'edit' && filePreviews.length < 4)) && (
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-border-primary flex items-center justify-center hover:bg-bg-primary text-text-secondary hover:text-accent-primary transition-colors">
                                <UploadIcon className="w-6 h-6"/>
                            </button>
                        )}
                    </div>
                )}

                {filePreviews.length === 0 && (
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full group border-2 border-dashed border-border-primary hover:border-accent-primary rounded-xl p-6 text-center cursor-pointer transition-all duration-300 hover:bg-bg-primary"
                >
                    <div className="flex flex-col items-center gap-2 text-text-secondary group-hover:text-accent-primary">
                        <UploadIcon className="w-6 h-6"/>
                        <span className="text-xs font-bold uppercase tracking-wide">Subir Imagen</span>
                    </div>
                </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple={activeCategory !== 'edit'} />
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-bold text-text-secondary">
                    {activeCategory === 'edit' ? '¿Qué quieres cambiar?' : 'Descripción del diseño'}
                </label>
                <button type="button" onClick={handleIdeaGeneration} disabled={isLoadingIdeas} className="text-xs flex items-center gap-1 text-accent-primary hover:text-accent-secondary font-bold transition-colors disabled:opacity-50">
                    <SparklesIcon className="w-3 h-3"/> {isLoadingIdeas ? 'Pensando...' : 'Sugerir Idea'}
                </button>
              </div>
              {activeCategory === 'video' && (
                <div className="mb-4 p-3 bg-accent-primary/5 border border-accent-primary/20 rounded-xl flex items-start gap-3 animate-fade-in">
                    <div className="p-1.5 bg-accent-primary/10 rounded-lg">
                        <SparklesIcon className="w-3.5 h-3.5 text-accent-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-0.5">Nota de API</p>
                        <p className="text-[10px] text-text-secondary leading-tight">
                            La generación de video requiere una <strong>API Key de pago</strong>. Si usas una cuenta gratuita, esta función puede fallar.
                        </p>
                    </div>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeCategory === 'edit' ? "Ej: Añade un filtro retro, elimina a la persona en el fondo..." : "Ej: Un paisaje futurista..."}
                className="w-full bg-bg-primary border border-border-primary rounded-xl p-4 focus:ring-2 focus:ring-accent-primary focus:outline-none transition min-h-[120px] overflow-hidden resize-none text-text-primary placeholder:text-slate-500"
              />

              {ideas.length > 0 && (
                <div className="mt-4 animate-fade-in">
                  <p className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">Sugerencias de la IA:</p>
                  <div className="space-y-2">
                    {ideas.map((idea, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleUseIdea(idea.prompt, idea.category)}
                        className="w-full text-left text-xs p-3 rounded-lg bg-bg-primary border border-border-primary hover:border-accent-primary transition-all hover:bg-white group"
                      >
                        <span className="text-text-secondary group-hover:text-text-primary line-clamp-2">{idea.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {activeCategory === 'edit' && (
                <div className="mt-4 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="preserveSubject" 
                    checked={preserveSubject} 
                    onChange={(e) => setPreserveSubject(e.target.checked)}
                    className="w-4 h-4 accent-accent-primary"
                  />
                  <label htmlFor="preserveSubject" className="text-xs font-bold text-text-secondary cursor-pointer">
                    Preservar cara y cuerpo (Consistencia)
                  </label>
                </div>
              )}
              
              {activeCategory === 'edit' && uploadedFiles.length > 0 && (
                  <div className="mt-4">
                      <p className="text-xs font-bold text-text-secondary mb-2">Acciones Rápidas:</p>
                      <div className="flex flex-wrap gap-2">
                          {EDIT_PRESETS.map((preset, i) => (
                              <button 
                                key={i} 
                                type="button"
                                onClick={() => handleGenerate(preset.prompt)}
                                disabled={isGenerating}
                                className="text-[10px] bg-bg-primary border border-border-primary hover:border-accent-primary text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-full transition-all"
                              >
                                  {preset.label}
                              </button>
                          ))}
                      </div>
                  </div>
              )}
            </div>

            <div className="mb-8">
                <label className="block text-sm font-bold text-text-secondary mb-3">Relación de Aspecto</label>
                <div className="grid grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                    <button key={ratio} type="button" onClick={() => setAspectRatio(ratio)} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 ${aspectRatio === ratio ? 'bg-accent-primary/10 border-accent-primary text-accent-primary ring-1 ring-accent-primary' : 'border-border-primary text-text-secondary hover:bg-bg-primary hover:border-text-secondary'}`}>
                        <span className="text-[10px] font-bold mb-1.5">{ratio}</span>
                        <div className={`border-2 rounded-sm ${aspectRatio === ratio ? 'border-accent-primary bg-accent-primary' : 'border-current'}`} style={{ width: ratio === '16:9' ? '24px' : ratio === '9:16' ? '14px' : ratio === '4:3' ? '20px' : ratio === '3:4' ? '16px' : '18px', height: ratio === '16:9' ? '14px' : ratio === '9:16' ? '24px' : ratio === '4:3' ? '16px' : ratio === '3:4' ? '20px' : '18px', }}></div>
                    </button>
                    ))}
                </div>
            </div>

            <button type="button" onClick={() => handleGenerate()} disabled={isGenerating || (!prompt && activeCategory !== 'edit' && activeCategory !== 'mix') || (activeCategory === 'edit' && uploadedFiles.length === 0) || (activeCategory === 'mix' && uploadedFiles.length < 2)} className="w-full py-4 bg-accent-primary text-white rounded-xl font-bold hover:bg-accent-secondary transition-all shadow-lg shadow-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0">
              {isGenerating ? <LoaderIcon className="w-5 h-5"/> : <SparklesIcon className="w-5 h-5"/>}
              {isGenerating ? 'Procesando...' : activeCategory === 'edit' ? 'Aplicar Edición' : 'Generar Diseño'}
            </button>
            
            {generationError && <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-lg flex items-start gap-2"><span className="font-bold">Error:</span> {generationError}</div>}
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 min-h-[500px] flex flex-col items-center justify-center relative shadow-lg overflow-hidden">
            {isGenerating ? (
                <div className="text-center animate-pulse">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-accent-primary/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-accent-primary rounded-full border-t-transparent animate-spin"></div>
                        <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-accent-primary animate-bounce"/>
                    </div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">IA en acción...</h3>
                    <p className="text-sm text-text-secondary">{generationStep}</p>
                </div>
            ) : generatedImage ? (
                <div className="relative w-full h-full flex flex-col items-center animate-fade-in group">
                    <div className="relative rounded-lg shadow-2xl overflow-hidden border border-border-primary bg-bg-primary">
                        {activeCategory === 'video' ? (
                            <video src={generatedImage} controls className="max-h-[600px] w-full" />
                        ) : (
                            <img src={generatedImage} alt="Generada por IA" className="max-h-[600px] w-full object-contain" />
                        )}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <button type="button" onClick={() => handleGenerate()} className="p-3 bg-white/90 backdrop-blur text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform">
                                <RefreshIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6 w-full max-w-md justify-center">
                        <button type="button" onClick={handleSendToEdit} className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg-primary text-text-primary border border-border-primary rounded-xl font-bold hover:bg-bg-secondary transition-colors">
                            <RefreshIcon className="w-4 h-4" /> Seguir Editando
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                if (!downloadUrl) return;
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = `twixai-${activeCategory}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}
                            disabled={!downloadUrl}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 bg-accent-primary text-white rounded-xl font-bold hover:bg-accent-secondary transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <DownloadIcon className="w-5 h-5"/> Descargar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-text-secondary max-w-xs">
                    <div className="w-20 h-20 bg-bg-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-border-primary">
                        <CameraIcon className="w-8 h-8 opacity-50"/>
                    </div>
                    <p className="font-medium">Tu creación aparecerá aquí.</p>
                </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
