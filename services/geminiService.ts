
import { GoogleGenAI, Type, GenerateContentResponse, Chat, Modality, ThinkingLevel } from "@google/genai";
import type { Source, BrandVoiceProfile } from "../types";

const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("⚠️ No se encontró la API Key de Gemini. Por favor, configúrala en el menú de ajustes.");
    }
    return new GoogleGenAI({ apiKey });
};

export const withRetry = async <T>(apiCall: () => Promise<T>, name = "API Call", timeout = 180000, retries = 2): Promise<T> => {
    let lastError: any = null;
    for (let i = 0; i <= retries; i++) {
        const start = Date.now();
        let timeoutId: any;
        try {
            console.log(`[Gemini API] ${name} - Intento ${i + 1} de ${retries + 1}...`);
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(`Timeout en ${name} (${timeout/1000}s)`)), timeout);
            });
            const result = await Promise.race([apiCall(), timeoutPromise]);
            if (timeoutId) clearTimeout(timeoutId);
            console.log(`[Gemini API] ${name} - Éxito en ${Date.now() - start}ms`);
            return result as T;
        } catch (error) {
            if (timeoutId) clearTimeout(timeoutId);
            lastError = error;
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Gemini API] ${name} - Intento ${i + 1} falló tras ${Date.now() - start}ms:`, errorMessage);
            
            // Don't retry on fatal errors
            if (errorMessage.includes("403") || errorMessage.includes("404") || errorMessage.includes("permission denied") || errorMessage.includes("API Key")) {
                 throw error;
            }
            
            if (i < retries) {
                const waitTime = Math.pow(2, i) * 1000;
                console.log(`[Gemini API] Reintentando en ${waitTime}ms... (Total transcurrido: ${Date.now() - start}ms)`);
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw lastError || new Error(`${name} falló tras ${retries + 1} intentos.`);
};

export const withRetryStream = async function* (apiCall: () => Promise<any>, name = "Stream Call", timeout = 90000) {
    try {
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout en ${name}`)), timeout)
        );
        const responseStream = await Promise.race([apiCall(), timeoutPromise]);
        for await (const chunk of responseStream) {
            yield chunk;
        }
    } catch (error) {
        throw error;
    }
};

export const getSystemInstructionTweet = (brandVoice?: BrandVoiceProfile) => {
    const brandVoiceInstruction = brandVoice ? `VOZ DE MARCA: ${brandVoice.toneAndStyle}.` : '';

    return `Eres un experto en estrategia de contenido y redes sociales para X (Twitter). 
    
    TU ESTILO: 
    - Directo, profesional y persuasivo. 
    - Escribes contenido de alto valor y densidad.
    - Experto en psicología de la atención y algoritmos de X.
    
    TU MISIÓN: Convertir ideas en contenido viral que genere autoridad y engagement masivo.
    
    REGLAS DE IDIOMA:
    - Usa un ESPAÑOL NEUTRO y profesional.
    - Evita regionalismos.
    
    REGLAS DE CONTENIDO:
    1. SOLO EL CONTENIDO: Responde ÚNICAMENTE con el texto del tuit o del hilo. Sin preámbulos.
    2. LONGITUD: Máximo 260 caracteres por tuit.
    3. FORMATO DE HILO: Si el usuario pide un hilo, genera 5 tuits. Cada uno DEBE empezar con "🧵1/5", "🧵2/5", etc.
    4. HASHTAGS: Máximo 2 por tuit.
    5. ESTRUCTURA DE GANCHO (HOOK): Los primeros 80 caracteres son fundamentales.
    
    ${brandVoiceInstruction}`;
};

export const generateTweet = async (prompt: string, config?: BrandVoiceProfile | Source): Promise<string> => {
    const ai = getGeminiClient();
    const brandVoice = (config && 'toneAndStyle' in config) ? config as BrandVoiceProfile : undefined;
    
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: { parts: [{ text: `Escribe un tuit estratégico y profesional sobre: ${prompt}. LÍMITE DE CARACTERES: Máximo 260. Responde SOLO con el texto del tuit.` }] },
        config: { 
            systemInstruction: getSystemInstructionTweet(brandVoice)
        }
    }), "Generate Tweet");
    return (response.text || '').trim();
};

export const generateTweetThread = async (prompt: string, config?: BrandVoiceProfile | Source): Promise<{ thread: string[], viralPotential: string }> => {
    const ai = getGeminiClient();
    const brandVoice = (config && 'toneAndStyle' in config) ? config as BrandVoiceProfile : undefined;
    
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: { parts: [{ text: `Crea un hilo estratégico de exactamente 5 tuits sobre: ${prompt}. LÍMITE DE CARACTERES POR TUIT: Máximo 260. Cada tuit DEBE empezar con "🧵N/5". Responde ÚNICAMENTE con el JSON: {"thread": ["🧵1/5 ...", ...], "viralPotential": ""}` }] },
        config: { 
            systemInstruction: getSystemInstructionTweet(brandVoice),
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: { 
                    thread: { type: Type.ARRAY, items: { type: Type.STRING } },
                    viralPotential: { type: Type.STRING }
                },
                required: ["thread", "viralPotential"]
            }
        }
    }), "Generate Thread");
    
    try {
        const result = JSON.parse(response.text || '{}');
        return {
            thread: Array.isArray(result.thread) ? result.thread.slice(0, 5) : [],
            viralPotential: result.viralPotential || ""
        };
    } catch {
        const text = response.text || '';
        const parts = text.split(/(?=🧵\d\/5|\d\/5)/g).map((t: string) => t.trim()).filter((t: string) => t.length > 5);
        return {
            thread: parts.length >= 5 ? parts.slice(0, 5) : [text],
            viralPotential: ""
        };
    }
};

export const regenerateTweet = async (tweetContent: string): Promise<string> => {
    const ai = getGeminiClient();
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `Reescribe este tuit manteniendo el mismo formato (si tiene 🧵N/5, mantenlo): "${tweetContent}". MÁXIMO 270 CARACTERES.` }] },
        config: { 
            systemInstruction: getSystemInstructionTweet(),
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
    }), "Regenerate Tweet");
    return (response.text || '').trim();
};

export const generateCreativeMediaPrompt = async (content: string, type: 'image' | 'video'): Promise<string> => {
    const ai = getGeminiClient();
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: `Crea un prompt visual para ${type} basado en: "${content}". Solo el prompt.` }] },
    }), "Generate Media Prompt");
    return (response.text || content).trim();
};

export const generateImage = async (prompt: string, aspectRatio: string = '1:1', referenceImages?: { data: string; mimeType: string }[], preserveSubject: boolean = true): Promise<{ images: { data: string; mimeType: string }[] }> => {
    const ai = getGeminiClient();
    
    const parts: any[] = [];
    const textQualityInstructions = `
        INSTRUCCIONES CRÍTICAS DE TEXTO Y ORTOGRAFÍA:
        - Si el prompt incluye texto, este DEBE escribirse con ORTOGRAFÍA PERFECTA.
        - El texto debe ser nítido, legible y estar integrado en la escena.
        - REVISA CADA LETRA: No permitas errores tipográficos, letras duplicadas o símbolos extraños.
        - Si el texto es en español, respeta tildes y gramática.
        - La tipografía debe ser moderna y profesional.
    `;

    if (referenceImages && referenceImages.length > 0) {
        referenceImages.forEach(img => parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } }));
        
        const preservationText = preserveSubject 
            ? "MANTÉN LA IDENTIDAD: No cambies el rostro ni los rasgos de la persona. Debe ser la misma persona. MANTÉN LOS COLORES: No cambies la paleta de colores ni la iluminación original."
            : "";
            
        parts.push({ text: `INSTRUCCIONES DE REALISMO EXTREMO:
            - La imagen DEBE parecer una fotografía real, NO una generación por IA.
            - TEXTURA DE PIEL: Debe ser natural, con poros visibles, imperfecciones leves y sin efecto de suavizado plástico o sintético.
            - ILUMINACIÓN: Usa luz natural de estudio o exterior, evita brillos artificiales exagerados.
            - CALIDAD: Estilo de fotografía profesional (DSLR, 85mm), enfoque nítido en el sujeto.
            - EVITA: El aspecto "glossy", piel de porcelana, o estética de videojuego.
            ${textQualityInstructions}
            
            TAREA DE EDICIÓN: ${prompt}. ${preservationText} Genera una fotografía editada hiperrealista.` });
    } else {
        parts.push({ text: `FOTOGRAFÍA HIPERREALISTA: ${prompt}. 
            Instrucciones de calidad:
            - Estilo: Fotografía profesional de alta resolución (RAW).
            - Piel: Textura humana real, poros, vello fino, sin suavizado artificial.
            - Iluminación: Natural y orgánica.
            - Evita: Look plástico, estético de IA genérica, o piel sintética.
            ${textQualityInstructions}` });
    }
    
    // Use gemini-2.5-flash-image which is the standard free-tier friendly image model
    const model = 'gemini-2.5-flash-image';
    
    try {
        console.log(`[Gemini API] Generating image with model: ${model}, prompt: ${prompt.substring(0, 50)}...`);
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: model,
            contents: { parts },
            config: { 
                imageConfig: { 
                    aspectRatio: aspectRatio as any
                } 
            }
        }), "Generate Image", 120000, 2);
        
        console.log(`[Gemini API] Generate Image response received. Candidates: ${response.candidates?.length || 0}`);
        
        const images: { data: string; mimeType: string }[] = [];
        let responseText = '';
        
        if (response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            console.log(`[Gemini API] First candidate parts: ${candidate.content?.parts?.length || 0}`);
            candidate.content?.parts?.forEach((p: any, idx: number) => { 
                if (p.inlineData?.data) {
                    const mimeType = p.inlineData.mimeType || 'image/png';
                    console.log(`[Gemini API] Part ${idx} contains image data (${p.inlineData.data.length} chars, ${mimeType})`);
                    images.push({ data: p.inlineData.data, mimeType }); 
                }
                if (p.text) {
                    console.log(`[Gemini API] Part ${idx} contains text: ${p.text.substring(0, 50)}...`);
                    responseText += p.text;
                }
            });
        }
        
        if (images.length === 0) {
            console.warn(`[Gemini API] No images found in response. Text: ${responseText}`);
            if (responseText) {
                throw new Error(`La IA no generó una imagen, respondió: ${responseText.substring(0, 150)}...`);
            }
            throw new Error("La API no devolvió ninguna imagen. Puede que el prompt haya sido filtrado o sea demasiado complejo.");
        }
        
        return { images };
    } catch (error) {
        console.error(`[Gemini API] Error generating image with ${model}:`, error);
        throw error;
    }
};

export const generateVideo = async (prompt: string, aspectRatio: string = '16:9', onProgress?: (msg: string) => void): Promise<string> => {
    const ai = getGeminiClient();
    onProgress?.('🤖 Procesando...');
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config: { numberOfVideos: 1, aspectRatio: aspectRatio as any, resolution: '720p' }
        });
        while (!operation.done) {
            await new Promise(r => setTimeout(r, 10000));
            operation = await ai.operations.getVideosOperation({operation});
            onProgress?.('⏳ Renderizando...');
        }
        const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error("No se pudo obtener la URL del video.");
        
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
        
        // Use withRetry for the fetch call as well
        const res = await withRetry(async () => {
            const response = await fetch(uri, {
                method: 'GET',
                headers: {
                    'x-goog-api-key': apiKey,
                },
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al descargar el video (${response.status}): ${errorText || response.statusText}`);
            }
            return response;
        }, "Download Video", 60000, 3);
        
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Error generating video:", error);
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("permission denied") || msg.includes("403")) {
            throw new Error("La generación de video requiere una API Key con permisos especiales (Plan de Pago).");
        }
        throw error;
    }
};

export const createContentChatSession = (brandVoice?: BrandVoiceProfile): Chat => {
    const ai = getGeminiClient();
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { 
            systemInstruction: getSystemInstructionTweet(brandVoice)
        }
    });
};

export const createChatSession = () => {
    const ai = getGeminiClient();
    const currentDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    return ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { 
            systemInstruction: `Eres un asistente de IA experto en estrategia de contenido y redes sociales. La fecha actual es ${currentDate}. Ayuda al usuario a planificar, redactar y optimizar su presencia en X (Twitter).`
        }
    });
};

export const analyzeVideo = async (prompt: string, videoData: string, mimeType: string): Promise<string> => {
    const ai = getGeminiClient();
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
            parts: [
                { inlineData: { data: videoData, mimeType } },
                { text: prompt }
            ]
        }
    }), "Analyze Video");
    return response.text || '';
};

export const scrapeXProfile = async (handle: string): Promise<{ profile: any; tweets: any[]; sources: any[] }> => {
    const cleanHandle = handle.replace('@', '').split('/').pop() || handle;
    const currentDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    
    let profileData: any = { handle: cleanHandle };
    let sources: any[] = [];

    // Step 1: Try to get profile data from vxtwitter API (Robust for metrics)
    try {
        const vxRes = await fetch(`https://api.vxtwitter.com/${cleanHandle}`);
        if (vxRes.ok) {
            const vxData = await vxRes.json();
            profileData = {
                name: vxData.name,
                handle: vxData.screen_name,
                followers: vxData.followers_count,
                following: vxData.following_count,
                bio: vxData.description,
                tweetCount: vxData.tweet_count
            };
            sources.push({ web: { uri: `https://api.vxtwitter.com/${cleanHandle}`, title: "vxtwitter API (Profile Metrics)" } });
        }
    } catch (e) {
        console.warn("vxtwitter API failed, falling back to search", e);
    }

    // Step 2: Use Gemini 3 Flash with Search for Tweets and missing profile data
    const ai = getGeminiClient();
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { 
            parts: [{ 
                text: `MISIÓN DE INTELIGENCIA DE DATOS: Necesito los tweets más recientes y métricas de alcance del perfil @${cleanHandle}.
                
                DATOS ACTUALES CONOCIDOS: ${JSON.stringify(profileData)}
                
                ESTRATEGIA DE BÚSQUEDA:
                1. Busca los textos literales de los últimos 5 tweets publicados por @${cleanHandle} en X.com o Nitter.
                2. Encuentra métricas de engagement (likes, RTs, impresiones) para estos tweets específicos.
                3. Si falta algún dato del perfil (bio, seguidores), complétalo.
                
                FECHA DE REFERENCIA: ${currentDate}.
                
                Responde únicamente en JSON válido.` 
            }] 
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    profile: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            handle: { type: Type.STRING },
                            followers: { type: Type.NUMBER },
                            following: { type: Type.NUMBER },
                            bio: { type: Type.STRING }
                        }
                    },
                    tweets: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                content: { type: Type.STRING },
                                date: { type: Type.STRING },
                                likes: { type: Type.NUMBER },
                                reposts: { type: Type.NUMBER },
                                impressions: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
        }
    }), "Scrape Profile");
    
    const searchSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    sources = [...sources, ...searchSources];
    
    try {
        const searchData = JSON.parse(response.text || '{}');
        return { 
            profile: { ...profileData, ...searchData.profile }, 
            tweets: searchData.tweets || [], 
            sources 
        };
    } catch (e) {
        console.error("Failed to parse search data", e);
        return { profile: profileData, tweets: [], sources };
    }
};

export const getFriendlyErrorMessage = (error: any, action: string): string => {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("403")) return `⚠️ Error 403: API Key sin permisos o cuota excedida. (Nota: Video requiere plan de pago).`;
    if (msg.includes("Timeout")) return `⚠️ Tiempo de espera agotado: La IA está bajo mucha carga o el prompt es muy complejo. Por favor, reintenta en unos momentos.`;
    if (msg.includes("429")) return `⚠️ Error 429: Demasiadas solicitudes. Espera un momento antes de reintentar.`;
    if (msg.includes("max tokens")) return `⚠️ Error: El contenido es demasiado largo para procesarlo de una vez. Intenta con algo más breve.`;
    return `⚠️ Error al ${action}: ${msg}`;
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || '';
};

export const generatePromptIdeas = async (cat: string) => {
    const ai = getGeminiClient();
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: `Genera 3 ideas estratégicas y breves para la categoría: ${cat}. 
            REGLAS:
            - Si la categoría es "Redes", genera TEXTO real para un tuit de alto valor, no descripciones de imágenes.
            - Usa un tono profesional, experto y directo.
            - Usa ESPAÑOL NEUTRO y elegante.
            - Responde SOLO con el JSON: [{"prompt": "...", "category": "${cat}"}, ...]` }] },
            config: { 
                systemInstruction: getSystemInstructionTweet(),
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            prompt: { type: Type.STRING },
                            category: { type: Type.STRING }
                        },
                        required: ["prompt", "category"]
                    }
                }
            }
        }), "Generate Ideas");
        return JSON.parse(response.text || '[]');
    } catch (e) {
        console.error("Error generating ideas:", e);
        return [];
    }
};

export const optimizePromptOrContent = async (content: string, cat: string) => {
    const ai = getGeminiClient();
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: `Optimiza este contenido para la categoría ${cat}: "${content}". 
            REGLAS:
            - Si es "Redes", redacta un tuit de alto impacto en ESPAÑOL NEUTRO y profesional.
            - LÍMITE DE CARACTERES: Máximo 260.
            - Asegúrate de mencionar el problema específico y cómo esta IA lo resuelve de forma eficiente.
            - Si es otra categoría, optimiza el prompt de imagen para que sea descriptivo, profesional y evite el aspecto de IA sintética.
            - IMPORTANTE: Si el usuario quiere incluir texto en la imagen, asegúrate de que el prompt especifique que el texto debe ser perfectamente legible, con ortografía impecable y tipografía profesional.
            - Responde SOLO con el texto optimizado.` }] },
        }), "Optimize Content");
        return (response.text || content).trim();
    } catch {
        return content;
    }
};

export const summarizeUrl = async (url: string) => {
    const ai = getGeminiClient();
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Resume el contenido de esta URL: ${url}`,
        }), "Summarize URL");
        return response.text || "No se pudo resumir la URL.";
    } catch (e) {
        console.error("Error summarizing URL:", e);
        return "Error al resumir la URL.";
    }
};
