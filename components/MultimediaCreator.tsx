import React, { useState, useRef } from 'react';
import { generateImage, editImage, searchWeb } from '../services/geminiService';
import SearchIcon from './icons/SearchIcon';
import SparklesIcon from './icons/SparklesIcon';
import UploadIcon from './icons/UploadIcon';
import DownloadIcon from './icons/DownloadIcon';
import LoaderIcon from './icons/LoaderIcon';
import TrashIcon from './icons/TrashIcon';

// --- Local Icon Components for the new design ---
const EditAiIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M17.5 2.5L14.375 5.625M17.5 2.5L11.875 8.125M17.5 2.5C18.4728 3.47279 19.0001 4.73365 19.0001 6.05C19.0001 7.36635 18.4728 8.62721 17.5 9.6M2.5 17.5L8.125 11.875M2.5 17.5L5.625 14.375M2.5 17.5C1.52721 16.5272 0.999939 15.2664 0.999939 13.95C0.999939 12.6336 1.52721 11.3728 2.5 10.4M12.5 2.5L17.1991 7.19914C17.6592 7.65924 17.6592 8.39076 17.1991 8.85086L8.85086 17.1991C8.39076 17.6592 7.65924 17.6592 7.19914 17.1991L2.5 12.5L12.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DesignFromScratchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M10 3.33331H3.33333C2.89131 3.33331 2.5 3.72462 2.5 4.16665V15.8333C2.5 16.2753 2.89131 16.6666 3.33333 16.6666H15C15.442 16.6666 15.8333 16.2753 15.8333 15.8333V8.33331M10 3.33331L13.3333 0.833313L17.5 4.99998L14.1667 7.49998L10 3.33331ZM15.8333 8.33331L12.5 5.83331" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CategoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M9.5 2.5L6.5 8L4.5 5L2 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 2.5H9.5V5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

const BackIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.18-3.182l-3.182-3.182a8.25 8.25 0 00-11.664 0l-3.18 3.183" />
    </svg>
);

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
      resolve({ data, mimeType });
    };
    reader.onerror = error => reject(error);
  });
};

// --- Data ---
const categories = [
    { name: 'Publicaciones para Redes Sociales', icon: CategoryIcon, image: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Invitaciones', icon: CategoryIcon, image: 'https://images.pexels.com/photos/103567/pexels-photo-103567.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Banners', icon: CategoryIcon, image: 'https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Carteles', icon: CategoryIcon, image: 'https://images.pexels.com/photos/541216/pexels-photo-541216.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Logotipos', icon: CategoryIcon, image: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=300' },
    { name: 'Fondos de Pantalla', icon: CategoryIcon, image: 'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=300' },
];

const categoryPrompts: { [key: string]: string } = {
    'Publicaciones para Redes Sociales': 'Una imagen para una publicación en [PLATAFORMA: X, Facebook, Instagram, etc.] sobre [TEMA]. Elige el formato adecuado: 16:9 para posts anchos (X, Facebook), 9:16 para historias/reels, 1:1 para carrusel/posts cuadrados (Instagram, Facebook).',
    'Invitaciones': 'Una tarjeta de invitación digital elegante para [EVENTO, EJ: un webinar de IA]. Diseño moderno, con tipografía clara y espacio para los detalles clave.',
    'Banners': 'Un banner profesional para [PLATAFORMA: X, Facebook, WhatsApp, web] sobre [TEMA]. El diseño debe ser impactante y seguir las mejores prácticas para la plataforma especificada.',
    'Carteles': 'Un póster digital para anunciar [NOTICIA/LANZAMIENTO]. Estilo audaz, con una imagen central potente y texto mínimo pero impactante.',
    'Logotipos': 'Un logo de diseño profesional para [MI MARCA/PROYECTO]. Estilo [DESCRIBE EL ESTILO: minimalista, moderno, corporativo], memorable y que funcione bien como foto de perfil.',
    'Fondos de Pantalla': 'Un fondo de pantalla 4K de alta calidad sobre [TEMA, EJ: un paisaje de neón ciberpunk]. Estilo cinematográfico, rico en detalles, para un monitor de ordenador (16:9) o un teléfono móvil (9:16).',
};

const categoryAspectRatios: { [key: string]: string[] } = {
    'Publicaciones para Redes Sociales': ['16:9', '9:16', '1:1'],
    'Invitaciones': ['16:9', '9:16'],
    'Banners': ['16:9', '1:1'],
    'Carteles': ['16:9', '9:16'],
    'Logotipos': ['1:1'],
    'Fondos de Pantalla': ['16:9', '9:16'],
};


// --- Contextual Style Suggestions ---
const photoEditingSuggestions = [
    { name: 'Mejora Sutil', prompt: 'Realiza una mejora sutil en la imagen, ajustando el brillo, contraste y saturación para que se vea más vibrante y profesional, sin alterar la composición.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg> },
    { name: 'Estilo "Golden Hour"', prompt: 'Aplica una cálida y suave iluminación de \'hora dorada\' (golden hour) a toda la imagen, realzando los tonos dorados y anaranjados.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
    { name: 'Look Futurista', prompt: 'Añade superposiciones holográficas y de neón sutiles a la imagen para darle un toque futurista y ciberpunk.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
    { name: 'Fondo Dramático', prompt: 'Reemplaza el fondo de la imagen con un cielo dramático y nublado al atardecer, asegurándote de que la iluminación sobre el sujeto principal coincida con el nuevo fondo.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 14.5A5.5 5.5 0 0 1 8 9a5.5 5.5 0 0 1 8 0 5.5 5.5 0 0 1 5.5 5.5Z"></path><polyline points="12 4 12 2"></polyline><polyline points="19.07 6.93 20.5 5.5"></polyline><polyline points="4.93 6.93 3.5 5.5"></polyline></svg> },
    { name: 'Eliminar Objeto', prompt: 'Elimina el objeto que más distrae en el fondo de la imagen y rellena el espacio de forma realista.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg> },
];

const logoStyleSuggestions = [
    { name: 'Minimalista Moderno', prompt: 'Un logo de estilo minimalista moderno, usando una sola línea continua o una forma geométrica simple y tipografía sans-serif limpia.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16"/></svg> },
    { name: 'Gradiente Vibrante', prompt: 'Un logo que utiliza un gradiente de color vibrante (ej: azul a púrpura) para crear un aspecto dinámico y tecnológico.', svg: <svg viewBox="0 0 24 24"><defs><linearGradient id="grad-logo" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3A8DFF" /><stop offset="100%" stopColor="#DD2A7B" /></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#grad-logo)"/></svg> },
    { name: 'Estilo \'Negative Space\'', prompt: 'Un logo inteligente que utiliza el espacio negativo para revelar una segunda imagen o letra.', svg: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10V2z"/></svg> },
    { name: '3D y Neón', prompt: 'Un logo con un efecto 3D sutil y un brillo de neón, dándole un aspecto moderno y llamativo.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" filter="url(#neon)"/><defs><filter id="neon"><feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#DD2A7B"/></filter></defs></svg> },
];

const iconStyleSuggestions = [
    { name: 'Icono iOS Moderno', prompt: 'Un icono de aplicación estilo iOS, con un gradiente suave, esquinas redondeadas y una sombra interior sutil.', svg: <svg viewBox="0 0 24 24"><defs><linearGradient id="grad-ios" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3A8DFF" /><stop offset="100%" stopColor="#DD2A7B" /></linearGradient></defs><rect x="4" y="4" width="16" height="16" rx="4" fill="url(#grad-ios)"/></svg> },
    { name: 'Glifo de Línea Fina', prompt: 'Un icono de glifo simple, creado con una sola línea fina y constante. Minimalista y elegante.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/></svg> },
    { name: 'Ilustración Isométrica', prompt: 'Una mini ilustración isométrica 3D del concepto, con una paleta de colores limitada y sombras definidas.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l10 6-10 6-10-6z"/><path d="M2 8v8l10 6 10-6V8"/><path d="M12 22V14"/></svg> },
    { name: 'Glassmorphism', prompt: 'Un icono que utiliza el efecto de \'glassmorphism\', con un fondo borroso, transparencia y un borde sutil para simular vidrio.', svg: <svg viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/><circle cx="12" cy="12" r="6" fill="rgba(255,255,255,0.3)"/></svg> },
];

const imageStyleSuggestions = [
    { name: 'Fotografía Cinematográfica', prompt: 'Una imagen fotorrealista con una estética cinematográfica, formato 16:9, colores graduados (teal and orange) y poca profundidad de campo.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="10" rx="1"></rect></svg> },
    { name: 'Render 3D Hiperrealista', prompt: 'Un render 3D hiperrealista del objeto/escena, con texturas detalladas e iluminación de estudio.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> },
    { name: 'Ilustración "Claymorphism"', prompt: 'Una adorable ilustración 3D con una textura suave y redondeada que simula arcilla o plástico (claymorphism).', svg: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#F8C8DC" stroke="#A0687C" strokeWidth="1.5"/></svg> },
    { name: 'Arte Abstracto con Tinta', prompt: 'Una pieza de arte abstracto que simula tinta de alcohol fluyendo, con colores vibrantes y detalles dorados.', svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 4.5c-2.3 2.3-3.8 5.2-3.8 8.5s1.5 6.2 3.8 8.5M2.5 4.5c2.3 2.3 3.8 5.2 3.8 8.5s-1.5 6.2-3.8 8.5"/></svg> },
];

export const MultimediaCreator: React.FC = () => {
    type View = 'home' | 'generate' | 'edit';
    const [view, setView] = useState<View>('home');

    // Shared state
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [availableAspectRatios, setAvailableAspectRatios] = useState<string[]>(['1:1', '16:9', '9:16', '4:3', '3:4']);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editing state
    const [originalImage, setOriginalImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
    const [editHistory, setEditHistory] = useState<string[]>([]);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    // Generation with reference state
    const [referenceImage, setReferenceImage] = useState<{ data: string; mimeType: string; url: string } | null>(null);
    const referenceUploadInputRef = useRef<HTMLInputElement>(null);

    // Web search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ title: string; uri: string; summary: string; image?: string }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    
    // Suggestion feedback state
    const [toastMessage, setToastMessage] = useState<string | null>(null);


    const handleGenerate = async (p = prompt, ar = aspectRatio) => {
        if (!p) return;
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            let imageUrl: string;
            
            let finalPrompt = p;
            let apiAspectRatio = ar;
            
            if (referenceImage) {
                const referencePrompt = `${finalPrompt}. \n\nCRITICAL INSTRUCTION: Create a new image with a ${apiAspectRatio} aspect ratio that incorporates the provided reference image. Do not simply crop or resize the reference image; use it as part of a larger composition.`;
                const result = await editImage(referenceImage.data, referenceImage.mimeType, referencePrompt);
                if (result.image) {
                    imageUrl = `data:${result.image.mimeType};base64,${result.image.data}`;
                } else {
                    throw new Error(result.text || "La IA no devolvió una imagen editada a partir de la referencia.");
                }
            } else {
                const images = await generateImage(finalPrompt, apiAspectRatio);
                if (images.length > 0) {
                    imageUrl = `data:image/jpeg;base64,${images[0]}`;
                } else {
                    throw new Error("La IA no devolvió ninguna imagen.");
                }
            }
            
            setGeneratedImage(imageUrl);
            setEditHistory([imageUrl]);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEdit = async (editPrompt: string) => {
        const currentImage = editHistory[editHistory.length - 1];
        if (!currentImage || !editPrompt) return;

        setIsLoading(true);
        setError(null);

        const parts = currentImage.split(',');
        const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const base64Data = parts[1];

        try {
            const result = await editImage(base64Data, mimeType, editPrompt);
            if (result.image) {
                const newImageUrl = `data:${result.image.mimeType};base64,${result.image.data}`;
                setGeneratedImage(newImageUrl);
                setEditHistory(prev => [...prev, newImageUrl]);
            } else {
                throw new Error(result.text || 'La IA no devolvió una imagen editada.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido durante la edición.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsSearching(true);
        setSearchError(null);
        setSearchResults([]);
        try {
            const results = await searchWeb(searchQuery + " image inspiration");
            setSearchResults(results);
        } catch (err) {
            setSearchError(err instanceof Error ? err.message : "No se pudieron obtener resultados.");
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { data, mimeType } = await fileToBase64(file);
            const dataUrl = `data:${mimeType};base64,${data}`;
            setOriginalImage({ data, mimeType, url: dataUrl });
            setGeneratedImage(dataUrl);
            setEditHistory([dataUrl]);
            setPrompt('');
            setReferenceImage(null);
            setView('edit');
        } catch (err) {
            setError("No se pudo cargar el archivo.");
        }
    };

    const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { data, mimeType } = await fileToBase64(file);
            const dataUrl = `data:${mimeType};base64,${data}`;
            setReferenceImage({ data, mimeType, url: dataUrl });
        } catch (err) {
            setError("No se pudo cargar el archivo de referencia.");
        }
    };
    
    const resetToGenerator = (category: string) => {
        setPrompt(categoryPrompts[category] || '');
        const newAspectRatios = categoryAspectRatios[category] || ['1:1'];
        setAvailableAspectRatios(newAspectRatios);
        setAspectRatio(newAspectRatios[0]);
        setActiveCategory(category);
        setGeneratedImage(null);
        setEditHistory([]);
        setError(null);
        setReferenceImage(null);
        setView('generate');
    };
    
    const handleUndo = () => {
        if (editHistory.length > 1) {
            const newHistory = editHistory.slice(0, -1);
            setEditHistory(newHistory);
            setGeneratedImage(newHistory[newHistory.length - 1]);
        }
    };

    const handleSuggestionClick = (suggestionPrompt: string) => {
        const lowerSuggestion = suggestionPrompt.toLowerCase();
        // Evita añadir prompts de estilo duplicados
        if (prompt.toLowerCase().includes(lowerSuggestion)) {
            setToastMessage("Estilo ya añadido al prompt");
            setTimeout(() => setToastMessage(null), 2000);
            return;
        }
        
        // Añade el estilo
        const newPrompt = prompt.trim() ? `${prompt.trim()}, ${suggestionPrompt}` : suggestionPrompt;
        setPrompt(newPrompt);
    };

    const handleEditSuggestionClick = (suggestionPrompt: string) => {
        // Para editar, reemplaza el prompt actual con la sugerencia,
        // ya que son comandos completos. El usuario luego hará clic en "Aplicar Edición".
        setPrompt(suggestionPrompt);
    };

    const renderSuggestions = (suggestions: { name: string; prompt: string; svg: React.ReactNode }[], handler: (prompt: string) => void) => (
        <div className="mt-4">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Sugerencias de Estilo</h3>
            <div className="flex flex-wrap gap-2">
                {suggestions.map(s => (
                    <button key={s.name} onClick={() => handler(s.prompt)} className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border-primary rounded-full text-sm font-semibold text-text-primary hover:bg-border-primary/50 transition-colors">
                        <span className="h-4 w-4">{s.svg}</span>
                        {s.name}
                    </button>
                ))}
            </div>
        </div>
    );
    
    const getActiveSuggestions = () => {
        if (view === 'edit') return photoEditingSuggestions;
        if (activeCategory === 'Logotipos') return logoStyleSuggestions;
        if (activeCategory === 'Iconos') return iconStyleSuggestions;
        return imageStyleSuggestions;
    };

    const renderEditor = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
                 <div>
                    <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary mb-4">
                        <BackIcon className="h-5 w-5" /> Volver a Inicio
                    </button>
                    <h2 className="text-2xl font-bold text-text-primary">Editar con IA</h2>
                    <p className="text-text-secondary mt-1">Transforma tu imagen con simples comandos.</p>
                </div>
                
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: añadir un fondo de bosque mágico"
                    className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition min-h-[100px]"
                />
                 <button onClick={() => handleEdit(prompt)} disabled={isLoading || !prompt} className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-200 bg-accent-primary text-white shadow-md hover:shadow-lg disabled:opacity-50">
                    <EditAiIcon className="h-5 w-5" /> {isLoading ? 'Editando...' : 'Aplicar Edición'}
                </button>
                {renderSuggestions(photoEditingSuggestions, handleEditSuggestionClick)}
                 <div className="flex gap-2">
                    <button onClick={handleUndo} disabled={editHistory.length <= 1} className="flex-1 text-sm text-center py-2 bg-bg-secondary border border-border-primary rounded-full font-semibold hover:bg-border-primary/50 disabled:opacity-50">Deshacer</button>
                    <button onClick={() => {uploadInputRef.current?.click()}} className="flex-1 text-sm text-center py-2 bg-bg-secondary border border-border-primary rounded-full font-semibold hover:bg-border-primary/50">Cambiar Imagen</button>
                </div>
            </div>
            <div className="md:col-span-2">
                <div className="sticky top-28">
                    {generatedImage ? (
                        <div className="relative group">
                            <img src={generatedImage} alt="Generated asset" className="w-full rounded-lg shadow-lg border border-border-primary" />
                             <a href={generatedImage} download="twixai-generated-image.png" className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <DownloadIcon className="h-5 w-5"/>
                             </a>
                        </div>
                    ) : (
                        <div className="w-full aspect-square bg-bg-primary rounded-lg flex items-center justify-center border-2 border-dashed border-border-primary">
                            <p className="text-text-secondary">Tu imagen aparecerá aquí.</p>
                        </div>
                    )}
                    {error && <p className="text-danger text-center mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
    
    const renderGenerator = () => (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
                 <div>
                    <button onClick={() => setView('home')} className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary mb-4">
                        <BackIcon className="h-5 w-5" /> Volver a Inicio
                    </button>
                    <h2 className="text-2xl font-bold text-text-primary">Generador de Medios</h2>
                    <p className="text-text-secondary mt-1">Crea cualquier imagen que puedas imaginar.</p>
                </div>
                
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: un astronauta montando a caballo en Marte"
                    className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:outline-none transition min-h-[100px]"
                />
                <div>
                    <label className="text-sm font-semibold text-text-secondary mb-2 block">
                        Imagen de Referencia (Opcional)
                    </label>
                    {referenceImage ? (
                        <div className="relative group">
                            <img src={referenceImage.url} alt="Reference" className="w-full rounded-lg border border-border-primary" />
                            <button 
                                onClick={() => setReferenceImage(null)}
                                className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Eliminar imagen de referencia"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => referenceUploadInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border-primary rounded-lg text-text-primary hover:border-accent-primary hover:text-accent-primary transition"
                        >
                            <UploadIcon />
                            <span>Subir Imagen</span>
                        </button>
                    )}
                </div>
                <div>
                    <label className="text-sm font-semibold text-text-secondary mb-2 block">Relación de Aspecto</label>
                    <div className="flex flex-wrap gap-2">
                        {availableAspectRatios.map(ar => (
                            <button key={ar} onClick={() => setAspectRatio(ar)} className={`p-2 rounded-lg border-2 min-w-[4rem] ${aspectRatio === ar ? 'border-accent-primary bg-accent-primary/10' : 'border-border-primary hover:border-text-secondary'}`}>
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>
                 <button onClick={() => handleGenerate()} disabled={isLoading || !prompt} className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-200 bg-accent-primary text-white shadow-md hover:shadow-lg disabled:opacity-50">
                    <SparklesIcon className="h-5 w-5" /> {isLoading ? 'Generando...' : 'Generar'}
                </button>
                
                {renderSuggestions(getActiveSuggestions(), handleSuggestionClick)}
            </div>
            <div className="md:col-span-2">
                <div className="sticky top-28">
                    {isLoading ? (
                         <div className="w-full aspect-square bg-bg-primary rounded-lg flex flex-col items-center justify-center border border-border-primary">
                            <LoaderIcon className="h-10 w-10 text-accent-primary" />
                            <p className="mt-4 text-text-secondary animate-pulse">La IA está creando...</p>
                        </div>
                    ) : generatedImage ? (
                        <div className="relative group">
                            <img src={generatedImage} alt="Generated asset" className="w-full rounded-lg shadow-lg border border-border-primary" />
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleGenerate()} className="bg-black/60 text-white p-2 rounded-full"><RefreshIcon className="h-5 w-5"/></button>
                                <a href={generatedImage} download="twixai-generated-image.png" className="bg-black/60 text-white p-2 rounded-full"><DownloadIcon className="h-5 w-5"/></a>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full aspect-square bg-bg-primary rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-border-primary">
                           <div className="text-center">
                                <SparklesIcon className="h-10 w-10 text-border-primary mx-auto mb-2"/>
                                <p className="text-text-secondary">Tu imagen aparecerá aquí.</p>
                           </div>
                        </div>
                    )}
                    {error && <p className="text-danger text-center mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
    
    const renderHome = () => (
         <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-text-primary">Estudio Multimedia</h1>
            <p className="text-lg text-text-secondary mt-2 max-w-2xl mx-auto">
                Crea activos visuales para tus redes sociales con el poder de la IA, desde cero o editando tus propias imágenes.
            </p>
            
             <div className="mt-10">
                <h2 className="text-2xl font-bold text-text-primary mb-2">¿Buscas inspiración?</h2>
                <p className="text-text-secondary mb-6">Empieza con estas categorías populares o busca inspiración en la web.</p>
                 <form onSubmit={handleSearch} className="max-w-lg mx-auto flex gap-2 mb-8">
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar inspiración en la web..." className="w-full bg-bg-secondary border border-border-primary rounded-full p-3 pl-5 focus:ring-2 focus:ring-accent-primary focus:outline-none transition"/>
                    <button type="submit" disabled={isSearching} className="px-5 py-3 bg-accent-primary text-white rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                        {isSearching ? <LoaderIcon className="h-5 w-5"/> : <SearchIcon />}
                    </button>
                </form>
                {searchError && <p className="text-sm text-danger">{searchError}</p>}
                {searchResults.length > 0 && (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
                        {searchResults.map(res => (
                            <button key={res.uri} onClick={() => {setPrompt(res.summary); setView('generate');}} className="bg-bg-secondary p-3 rounded-lg border border-border-primary hover:border-accent-primary transition-colors">
                                <p className="font-bold text-sm line-clamp-2">{res.title}</p>
                                <p className="text-xs text-text-secondary line-clamp-3 mt-1">{res.summary}</p>
                            </button>
                        ))}
                    </div>
                )}


                <div className="flex items-center justify-between mt-12 mb-6">
                    <h3 className="text-xl font-bold text-text-primary text-left">Elige un Punto de Partida</h3>
                    <button className="flex items-center gap-1 text-sm font-semibold text-accent-primary hover:underline">
                        Ver todo <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button 
                        onClick={() => uploadInputRef.current?.click()} 
                        className="group relative rounded-lg border-2 border-dashed border-border-primary hover:border-accent-primary transition-colors flex flex-col items-center justify-center p-4 h-32"
                    >
                        <UploadIcon className="h-8 w-8 text-text-secondary group-hover:text-accent-primary transition-colors" />
                        <h4 className="text-text-primary font-bold text-sm mt-2 text-center">Editar Imagen Propia</h4>
                    </button>
                    {categories.map(cat => (
                        <button key={cat.name} onClick={() => resetToGenerator(cat.name)} className="group relative rounded-lg overflow-hidden border border-border-primary hover:border-accent-primary transition-colors">
                            <img src={cat.image} alt={cat.name} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"/>
                            <div className="absolute bottom-0 left-0 p-3 text-left">
                                <cat.icon className="h-4 w-4 text-white/80 mb-1" />
                                <h4 className="text-white font-bold text-sm">{cat.name}</h4>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            {view === 'home' && renderHome()}
            {view === 'generate' && renderGenerator()}
            {view === 'edit' && renderEditor()}
            
            {toastMessage && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in-up">
                    {toastMessage}
                </div>
            )}

            <input
                type="file"
                ref={uploadInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*"
            />
            <input
                type="file"
                ref={referenceUploadInputRef}
                onChange={handleReferenceUpload}
                className="hidden"
                accept="image/*"
            />
            <style>{`
                .animate-fade-in-up {
                  animation: fadeInUp 0.3s ease-in-out;
                }
                @keyframes fadeInUp {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};