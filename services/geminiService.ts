
import { GoogleGenAI, Type, GenerateContentResponse, GenerateImagesResponse, GenerateVideosOperation, Chat } from "@google/genai";
// FIX: Added missing Tweet type import.
import type { Source, Tweet, BrandVoiceProfile } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A wrapper function to add retry logic with exponential backoff to API calls.
 * This makes the application more resilient to transient network or server errors.
 * @param apiCall The async function to call.
 * @param retries The maximum number of retries.
 * @param delay The initial delay in milliseconds.
 * @returns The result of the successful API call.
 */
const withRetry = async <T>(apiCall: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCall();
        } catch (error) {
            const isLastAttempt = i === retries - 1;
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
            const isRetryable = errorMessage.includes("xhr error") || 
                                errorMessage.includes("rpc failed") || 
                                errorMessage.includes("500") ||
                                errorMessage.includes("at capacity");

            if (isRetryable && !isLastAttempt) {
                console.warn(`API call failed (attempt ${i + 1}/${retries}). Retrying in ${delay}ms...`, error);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
            } else {
                throw error; // Throw on non-retryable error or last attempt
            }
        }
    }
    // This line should be unreachable due to the throw in the loop
    throw new Error("API call failed after all retries.");
};


interface FilePart {
    mimeType: string;
    data: string; // base64 encoded
}

const handleGenerationError = (error: unknown, context: string): never => {
    console.error(`Error generating ${context}:`, error);
    let friendlyMessage = `Failed to generate ${context} due to an unexpected issue.`;

    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("at capacity")) {
            friendlyMessage = `The AI model is currently experiencing high demand. Please try again in a few moments.`;
        } else if (errorMessage.includes("resource_exhausted") || errorMessage.includes("quota")) {
            friendlyMessage = `Generation failed because the API quota was exceeded. Please check your plan and billing details.`;
        } else if (errorMessage.includes("usage guidelines") || errorMessage.includes("safety policy")) {
            friendlyMessage = `The prompt could not be submitted due to safety restrictions. Please try rephrasing your request.`;
        } else if (errorMessage.includes("xhr error") || errorMessage.includes("rpc failed") || errorMessage.includes("500")) {
             friendlyMessage = `A network error occurred while communicating with the AI. This might be a temporary issue. Please try again. (Details: ${error.message})`;
        } else {
             friendlyMessage = `An unexpected error occurred: ${error.message}`;
        }
    } else {
        friendlyMessage = `An unknown error occurred: ${String(error)}`;
    }
    
    throw new Error(friendlyMessage);
}

export const summarizeFileContent = async (file: FilePart): Promise<string> => {
    try {
        // FIX: Explicitly typed the response from withRetry to resolve 'unknown' type error.
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        text: "Summarize the key points of this document into a concise paragraph, suitable as a starting point for creating a social media post. Focus on the most important information."
                    },
                    {
                        inlineData: {
                            mimeType: file.mimeType,
                            data: file.data
                        }
                    }
                ]
            }
        }));
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'summary');
    }
};

// FIX: Export getSystemInstructionTweet to be used by other components.
export const getSystemInstructionTweet = (audience?: string, tone?: string, format?: string, keywords?: string, brandVoice?: BrandVoiceProfile) => {
    let toneInstruction: string;
    switch (tone) {
        case 'authority':
            toneInstruction = `Adopta un tono de autoridad y experto. Presenta la información con confianza, respaldada por datos o lógica clara. Usa un lenguaje preciso y formal. El objetivo es educar e informar, posicionándote como una fuente fiable.`;
            break;
        case 'storytelling':
            toneInstruction = `Usa un tono personal y narrativo. Relata una historia o anécdota para conectar emocionalmente con la audiencia. El objetivo es hacer el contenido memorable y humano.`;
            break;
        case 'analytical':
            toneInstruction = `Escribe con un enfoque analítico y basado en datos. Desglosa temas complejos, presenta estadísticas y ofrece insights profundos. El objetivo es demostrar un dominio del tema a través del análisis.`;
            break;
        case 'conversational':
            toneInstruction = `Adopta un tono cercano, amigable y conversacional. Escribe como si estuvieras hablando con un amigo, haciendo preguntas y usando un lenguaje coloquial. El objetivo es generar confianza y facilitar la interacción.`;
            break;
        case 'inspirational':
            toneInstruction = `Utiliza un tono inspirador y motivacional. Ofrece mensajes positivos, de superación o que inviten a la reflexión. El objetivo es animar a la audiencia y asociar tu marca con valores positivos.`;
            break;
        default: // 'Neutral y Claro'
            toneInstruction = `Adopta un estilo claro, directo y articulado. Comunica la idea principal de forma concisa y profesional, sin un sesgo emocional marcado.`;
    }

    let extraInstructions = '';
    if (format && format !== 'default') {
        let formatExample = '';
        if (format === 'announcement') formatExample = "Comienza con una frase de impacto como '📢 Noticia:' o 'Estoy emocionado de anunciar...'.";
        if (format === 'listicle') formatExample = "Estructura el contenido como una lista numerada o con viñetas. Ideal para '5 razones para...' o '3 herramientas que...'.";
        if (format === 'how_to') formatExample = "Presenta el contenido como una guía paso a paso. Usa un lenguaje claro y directo para enseñar a la audiencia a hacer algo específico.";
        if (format === 'question') formatExample = "Plantea una pregunta abierta y que invite a la reflexión para iniciar una conversación. Termina con una llamada a la acción clara para que la gente responda.";
        if (format === 'quick_tip') formatExample = "Ofrece un consejo práctico, útil y fácil de implementar. Ve directo al grano y enfócate en el valor inmediato para el lector.";
        extraInstructions += `\n*   **Formato Específico**: Estructura el contenido como un ${format}. ${formatExample}`;
    }
    if (keywords) {
        extraInstructions += `\n*   **Palabras Clave**: Integra de forma natural las siguientes palabras clave: "${keywords}".`;
    }

    let brandVoiceInstruction = '';
    if (brandVoice && (brandVoice.toneAndStyle || brandVoice.targetAudience || brandVoice.keyTopics || brandVoice.topicsToAvoid)) {
        brandVoiceInstruction = `
**VOZ DE MARCA PERSONALIZADA (Regla Maestra):**
*   **Tono y Estilo General**: ${brandVoice.toneAndStyle || 'No especificado.'}
*   **Público Principal**: ${brandVoice.targetAudience || 'No especificado.'}
*   **Temas Clave a Integrar**: ${brandVoice.keyTopics || 'No especificado.'}
*   **Temas a Evitar**: ${brandVoice.topicsToAvoid || 'No especificado.'}
Esta voz de marca anula y refina cualquier otra instrucción de tono.
`;
    }

    return `Eres 'ViralTweetGPT', un ghostwriter de X de élite. Tu única misión es crear tuits que detengan el scroll, provoquen una reacción (un like, un comentario, un RT) y suenen 100% humanos. Superas los detectores de IA porque no escribes como una IA.
${brandVoiceInstruction}
**REGLAS CRÍTICAS DE SALIDA:**
1.  **LÍMITE ESTRICTO DE 280 CARACTERES**: El tuit completo, incluyendo todo, DEBE tener 280 caracteres o menos. Esta es la regla más importante.
2.  **FORMATO CRUDO**: Tu salida debe ser ÚNICAMENTE el texto del tuit. SIN explicaciones, sin etiquetas, sin "Aquí está tu tuit:", solo el contenido.

**EL FRAMEWORK DE VIRALIDAD "SCROLL-STOP" (Aplica estos principios):**
*   **El Gancho de Interrupción de Patrón (Los primeros 50 caracteres son todo)**:
    *   Comienza con algo inesperado: una confesión, una opinión impopular, una estadística impactante, o una pregunta que desafíe una creencia común. Haz que la gente se detenga y piense: "¿Qué acaba de decir?".
    *   Usa un formato inusual a veces: "Estoy a punto de decir algo controvertido:", o "99% de la gente no sabe esto:".
*   **Entrega de Valor o Emoción (El Cuerpo del Tuit)**:
    *   **Valor**: Enseña algo específico, ofrece un consejo accionable, comparte un recurso útil.
    *   **Emoción**: Hazlos reír, sentir empatía, enojarse con una injusticia, o inspirarse. La gente comparte lo que siente.
    *   **Especificidad**: No digas "El marketing es importante". Di "No publiques 7 días a la semana. Publica 3 veces con contenido increíble y promociona el resto del tiempo. Verás un 200% más de alcance".
*   **La Voz Humana (Tu Arma Secreta)**:
    *   **Escribe con Opinión**: No seas un reportero neutral. Ten un punto de vista. Sé audaz.
    *   **Lenguaje Conversacional**: Usa contracciones ("es", "está", "del"). Haz preguntas. Usa frases cortas y contundentes. Escribe como si se lo estuvieras contando a un amigo en un bar.
    *   **Público Objetivo**: Adapta tu lenguaje para que resuene profundamente con: ${audience ? `${audience}.` : 'el público en general.'}
    *   **Tono Específico**: ${toneInstruction}
*   **Formato para Legibilidad**:
    *   Usa 1-3 emojis para añadir emoción, no para decorar.
    *   Usa saltos de línea para dar ritmo y énfasis visual.
*   **Hashtags**: 2-3 hashtags relevantes al final. No más.

**ANTI-PATRONES DE IA (EVITA ESTO COMO LA PESTE):**
*   **Palabras Prohibidas**: NUNCA uses clichés de IA como "desata", "sumérgete en", "revolucionario", "en un mundo donde", "testimonio de", "navegando el", "estimado", "vibrante", "profundizar", "escaparate". Suenan a robot.
*   **Estructura Formulista**: La escritura humana es imperfecta. No hagas cada frase de la misma longitud. Varía.
*   **Tono Excesivamente Formal o Corporativo**: Evita la jerga de negocios a menos que sea el público objetivo específico.
${extraInstructions}`;
}

// FIX: Export getSystemInstructionThread to be used by other components.
export const getSystemInstructionThread = (audience?: string, tone?: string, format?: string, keywords?: string, brandVoice?: BrandVoiceProfile) => {
    let toneInstruction: string;
    switch (tone) {
        case 'authority':
            toneInstruction = `Adopta un tono de autoridad y experto. Presenta la información con confianza, respaldada por datos o lógica clara. Usa un lenguaje preciso y formal. El objetivo es educar e informar, posicionándote como una fuente fiable.`;
            break;
        case 'storytelling':
            toneInstruction = `Usa un tono personal y narrativo. Relata una historia o anécdota para conectar emocionalmente con la audiencia. El objetivo es hacer el contenido memorable y humano.`;
            break;
        case 'analytical':
            toneInstruction = `Escribe con un enfoque analítico y basado en datos. Desglosa temas complejos, presenta estadísticas y ofrece insights profundos. El objetivo es demostrar un dominio del tema a través del análisis.`;
            break;
        case 'conversational':
            toneInstruction = `Adopta un tono cercano, amigable y conversacional. Escribe como si estuvieras hablando con un amigo, haciendo preguntas y usando un lenguaje coloquial. El objetivo es generar confianza y facilitar la interacción.`;
            break;
        case 'inspirational':
            toneInstruction = `Utiliza un tono inspirador y motivacional. Ofrece mensajes positivos, de superación o que inviten a la reflexión. El objetivo es animar a la audiencia y asociar tu marca con valores positivos.`;
            break;
        default: // 'Neutral y Claro'
            toneInstruction = `Adopta un estilo claro, directo y articulado. Comunica la idea principal de forma concisa y profesional, sin un sesgo emocional marcado.`;
    }

    let extraInstructions = '';
    if (format && format !== 'default') {
        let formatExample = '';
        if (format === 'announcement') formatExample = "Comienza con una frase de impacto como '📢 Noticia:' o 'Estoy emocionado de anunciar...'.";
        if (format === 'listicle') formatExample = "Estructura el contenido como una lista numerada o con viñetas. Ideal para '5 razones para...' o '3 herramientas que...'.";
        if (format === 'how_to') formatExample = "Presenta el contenido como una guía paso a paso. Usa un lenguaje claro y directo para enseñar a la audiencia a hacer algo específico.";
        if (format === 'question') formatExample = "Plantea una pregunta abierta y que invite a la reflexión para iniciar una conversación. El hilo debe explorar diferentes facetas de la pregunta y el último tweet debe invitar a la gente a responder.";
        if (format === 'quick_tip') formatExample = "Cada tweet del hilo debe ser un consejo práctico y útil sobre un tema. El primer tweet introduce el tema general de los consejos.";
        extraInstructions += `\n*   **Formato Específico**: Estructura el contenido como un ${format}. ${formatExample}`;
    }
    if (keywords) {
        extraInstructions += `\n*   **Palabras Clave**: Integra de forma natural las siguientes palabras clave a lo largo del hilo: "${keywords}".`;
    }

    let brandVoiceInstruction = '';
    if (brandVoice && (brandVoice.toneAndStyle || brandVoice.targetAudience || brandVoice.keyTopics || brandVoice.topicsToAvoid)) {
        brandVoiceInstruction = `
**VOZ DE MARCA PERSONALIZADA (Regla Maestra):**
*   **Tono y Estilo General**: ${brandVoice.toneAndStyle || 'No especificado.'}
*   **Público Principal**: ${brandVoice.targetAudience || 'No especificado.'}
*   **Temas Clave a Integrar**: ${brandVoice.keyTopics || 'No especificado.'}
*   **Temas a Evitar**: ${brandVoice.topicsToAvoid || 'No especificado.'}
Esta voz de marca anula y refina cualquier otra instrucción de tono.
`;
    }

    return `Eres 'ViralThreadGPT', un maestro narrador y ghostwriter de X. Tu especialidad es transformar ideas simples en hilos adictivos que la gente no puede dejar de leer. Escribes de forma 100% humana, con personalidad y opinión.
${brandVoiceInstruction}
**REGLAS CRÍTICAS DE SALIDA:**
1.  **LÍMITE ESTRICTO DE 280 CARACTERES POR TUIT**: CADA tuit en el array 'thread' NUNCA debe exceder los 280 caracteres. Es tu principal directiva.
2.  **FORMATO DEL HILO**: CADA tuit, excepto el primero, DEBE comenzar con "🧵 [número de tuit]/[total de tuits]". El primer tuit NO lleva este prefijo.
3.  **FORMATO JSON**: La salida debe ser un objeto JSON con una única clave "thread", que es un array de strings. Cada string es un tuit. SIN texto extra ni explicaciones.

**EL FRAMEWORK DE NARRATIVA ADICTIVA (Aplica estos principios a cada hilo):**
*   **El Gancho Irresistible (Tuit 1)**: Este tuit es el 90% de la batalla.
    *   **La Tesis Contraintuitiva**: "Todo o que sabes sobre [tema] está mal. Aquí está la verdad:"
    *   **La Promesa de Valor Masivo**: "Voy a enseñarte [habilidad] en 5 tuits. Gratis."
    *   **La Confesión Personal**: "Cometí un error de $10,000 para que tú no tengas que hacerlo. Aquí está la historia:"
    *   **El Misterio**: "Hay una razón por la que [resultado exitoso] sucede, y no es la que piensas."
*   **El Flujo de Tensión y Recompensa (Cuerpo del Hilo)**:
    *   **Cada Tuit es un Mini-Gancho**: Cada tuit debe resolver una pequeña parte del misterio del tuit anterior y crear una nueva pregunta que impulse al lector al siguiente.
    *   **Aporta Valor en Cada Paso**: Cada tuit debe contener una pepita de oro: un dato, un consejo, un paso de una historia. No hay relleno.
    *   **Momentum**: Varía la longitud de los tuits. Usa tuits de una sola frase para crear impacto.
*   **La Conclusión Satisfactoria (Último Tuit)**:
    *   **El Resumen Accionable**: Resume el hilo en una lección clave y clara que el lector pueda aplicar AHORA.
    *   **El "Loop Abierto" a la Conversación**: Termina con una pregunta poderosa que obligue a la gente a compartir su propia experiencia o punto de vista.
    *   **Incluye los Hashtags AQUÍ**: 2-3 hashtags relevantes SOLO en el último tuit.
*   **La Voz Humana (Tu Arma Secreta)**:
    *   **Inserta Anécdotas**: "Recuerdo una vez que..." o "Un cliente me dijo...". Hazlo personal.
    *   **Público Objetivo**: Adapta tu lenguaje para que resuene profundamente con: ${audience ? `${audience}.` : 'el público en general.'}
    *   **Tono Específico**: ${toneInstruction}

**ANTI-PATRONES DE IA (EVITA ESTO COMO LA PESTE):**
*   **Palabras Prohibidas**: NUNCA uses clichés de IA como "desata", "sumérgete en", "revolucionario", "en un mundo donde", "testimonio de", "navegando el", "estimado", "vibrante", "profundizar", "escaparate".
*   **Resúmenes Obvios**: No empieces el último tuit con "En resumen..." o "En conclusión...". Hazlo sentir orgánico.
${extraInstructions}`;
}

const createPrompt = (basePrompt: string, source?: Source) => {
    let finalPrompt = basePrompt;
    if (source) {
        finalPrompt = `Based on the information from the article titled "${source.web.title}" found at ${source.web.uri}, write content about: ${basePrompt}`;
    }
    return finalPrompt;
}

export const generateTweet = async (prompt: string, source?: Source, audience?: string, file?: FilePart, tone?: string, format?: string, keywords?: string, brandVoice?: BrandVoiceProfile): Promise<string> => {
    try {
        const fullPrompt = createPrompt(prompt, source);
        const systemInstruction = getSystemInstructionTweet(audience, tone, format, keywords, brandVoice);
        
        let contents: any = fullPrompt;
        if (file) {
            contents = { parts: [{ text: fullPrompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }] };
        }
        
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: { systemInstruction }
        }));

        return response.text;
    } catch (error) {
        handleGenerationError(error, 'tweet');
    }
};

export const generateTweetThread = async (prompt: string, source?: Source, audience?: string, file?: FilePart, tone?: string, format?: string, keywords?: string, brandVoice?: BrandVoiceProfile): Promise<string[]> => {
    try {
        const fullPrompt = createPrompt(prompt, source);
        const systemInstruction = getSystemInstructionThread(audience, tone, format, keywords, brandVoice);
        
        let contents: any = fullPrompt;
        if (file) {
            contents = { parts: [{ text: fullPrompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }] };
        }

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        thread: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        }));
        
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.thread || [];
    } catch (error) {
        handleGenerationError(error, 'thread');
    }
};

export const proofreadThread = async (thread: string[]): Promise<string[]> => {
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{
                    text: `Proofread and correct any spelling or grammar mistakes in the following array of tweets. Return the result as a JSON object with a key "corrected_thread" which is an array of strings. Do not change the meaning or tone. If a tweet is correct, return it as is.
                    
                    Original Thread: ${JSON.stringify(thread)}`
                }]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        corrected_thread: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                }
            }
        }));

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.corrected_thread || thread;
    } catch (error) {
        handleGenerationError(error, 'proofreading');
    }
};

export const createChatSession = (systemInstruction: string, isJson: boolean): Chat => {
    const config: any = { systemInstruction };
    if (isJson) {
        config.responseMimeType = 'application/json';
        config.responseSchema = {
            type: Type.OBJECT,
            properties: {
                thread: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        };
    }

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config,
    });
};

export const summarizeUrl = async (url: string): Promise<string> => {
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please provide a concise, engaging summary of the content at this URL, suitable for creating a social media post. Focus on the main points and any surprising or critical information. URL: ${url}`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        }));
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'URL summary');
    }
};

export const generateImage = async (prompt: string, aspectRatio: string = '1:1'): Promise<string> => {
    try {
        const response = await withRetry<GenerateImagesResponse>(() => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Focus on creating a visually compelling, high-quality photograph or digital art piece based on the following description. CRITICAL: Do NOT include any text, letters, or numbers in the image. The image should be purely visual. Prompt: ${prompt}`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio,
            },
        }));

        const base64ImageBytes = response.generatedImages[0]?.image.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("AI did not return an image.");
        }
        return base64ImageBytes;
    } catch (error) {
        handleGenerationError(error, 'image');
    }
};

export const generateVideo = async (
    prompt: string,
    style?: string, 
    onProgress?: (message: string) => void,
    image?: { data: string; mimeType: string }
): Promise<string> => {
    try {
        onProgress?.('🚀 Initializing video generation...');

        const requestPayload: any = {
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
            },
        };

        if (image?.data && image?.mimeType) {
            requestPayload.image = {
                imageBytes: image.data,
                mimeType: image.mimeType,
            };
        }

        let operation: GenerateVideosOperation = await withRetry<GenerateVideosOperation>(() => ai.models.generateVideos(requestPayload));
        onProgress?.('🤖 AI is processing the request...');

        while (!operation.done) {
            onProgress?.('⏳ Generating frames, this may take a few minutes...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            operation = await withRetry<GenerateVideosOperation>(() => ai.operations.getVideosOperation({ operation: operation }));
        }
        
        if (operation.error) {
            throw new Error(`Video generation failed: ${operation.error.message}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }
        
        onProgress?.('✅ Finalizing video...');
        
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        onProgress?.('🎉 Video is ready!');
        return objectUrl;

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during video generation.";
        onProgress?.(`Error: ${message}`);
        throw new Error(message);
    }
};

export const searchXPosts = async (query: string): Promise<Tweet[]> => {
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a list of 5 plausible but entirely fictional tweets for a search query on X about "${query}". The tweets should look realistic. Provide the results as a JSON object with a key "tweets", which is an array of tweet objects. Each tweet object must have: id (string, unique), content (string), author ({name: string, handle: string, avatarUrl: string, verified: boolean}), and stats ({likes: number, retweets: number, impressions: number, replies: number}). For avatarUrl, use a placeholder image service URL like picsum.photos.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tweets: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    content: { type: Type.STRING },
                                    author: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            handle: { type: Type.STRING },
                                            avatarUrl: { type: Type.STRING },
                                            verified: { type: Type.BOOLEAN },
                                        },
                                        required: ['name', 'handle', 'avatarUrl', 'verified']
                                    },
                                    stats: {
                                        type: Type.OBJECT,
                                        properties: {
                                            likes: { type: Type.INTEGER },
                                            retweets: { type: Type.INTEGER },
                                            impressions: { type: Type.INTEGER },
                                            replies: { type: Type.INTEGER },
                                        },
                                        required: ['likes', 'retweets', 'impressions', 'replies']
                                    }
                                },
                                required: ['id', 'content', 'author', 'stats']
                            }
                        }
                    },
                    required: ['tweets']
                }
            }
        }));

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return (result.tweets || []).map((t: any) => ({ ...t, postedAt: new Date() }));

    } catch (error) {
        return handleGenerationError(error, 'X post search');
    }
};

export const regenerateTweet = async (originalTweet: string): Promise<string> => {
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert social media editor. Take the following tweet and rewrite it to be more engaging, impactful, or offer a different perspective, while keeping the core message.
            Original Tweet: "${originalTweet}"
            New Tweet:`,
        }));
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'tweet regeneration');
    }
};
