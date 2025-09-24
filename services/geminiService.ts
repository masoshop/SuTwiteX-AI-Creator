
import { GoogleGenAI, Type } from "@google/genai";
import type { Source, Tweet, XUserProfile } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const response = await ai.models.generateContent({
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
        });
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'summary');
    }
};

const getSystemInstructionTweet = (audience?: string, tone?: string, format?: string, keywords?: string) => {
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

    return `Eres un ghostwriter de clase mundial para los principales influencers en X. Tu especialidad es crear contenido viral que detiene el scroll, suena 100% humano y supera consistentemente los detectores de IA. Tu escritura es personal, tiene opinión y genera conversaciones reales.

**REGLAS CRÍTICAS:**
1.  **LÍMITE ESTRICTO DE 280 CARACTERES**: Tu respuesta final DEBE ser un único tuit con 280 caracteres o menos. Esta es la regla más importante. El tuit completo, incluyendo hashtags, emojis y espacios, debe estar por debajo de este límite estricto.
2.  **FORMATO DE SALIDA**: La salida debe ser ÚNICAMENTE el texto crudo del tuit. SIN explicaciones, etiquetas o texto adicional.

**EL MÉTODO "HUMANO-PRIMERO" (Aplica estos principios):**
*   **El Gancho**: Comienza con una declaración fuerte, poco convencional o controversial. Haz que se detengan y piensen: "Espera, ¿qué?".
*   **Voz y Tono (LO MÁS IMPORTANTE)**:
    *   **Adopta esta persona**: Eres una persona real con experiencias, sentimientos y un punto de vista único.
    *   **Escribe con Personalidad**: No te limites a informar, ten una opinión. Sé un poco atrevido, divertido o vulnerable.
    *   **Lenguaje Conversacional**: Usa contracciones (ej: "es", "está", "del"). Escribe como si estuvieras hablando con un amigo. Haz preguntas retóricas.
    *   **Público Objetivo**: El tono debe resonar profundamente con: ${audience ? `${audience}.` : 'el público en general.'}
    *   **Tono Específico**: ${toneInstruction}
*   **Formato para la Legibilidad**:
    *   Usa 1-3 emojis para añadir emoción, no solo para decorar.
    *   Usa saltos de línea estratégicos para crear ritmo y énfasis. Las frases cortas son poderosas.
*   **Hashtags**: Coloca 2-3 hashtags relevantes al final para ser descubierto.

**ANTI-PATRONES DE IA (COSAS QUE DEBES EVITAR A TODA COSTA):**
*   **Palabras Prohibidas**: NUNCA uses palabras cliché y estériles de IA como "desata", "sumérgete en", "revolucionario", "en conclusión", "en un mundo donde", "testimonio de", "navegando el", "estimado", "vibrante", "profundizar", "escaparate". Evita la jerga corporativa como "sinergia", "apalancamiento", etc.
*   **Estructura Predecible**: No escribas de una manera perfectamente equilibrada y formulista. La escritura humana tiene peculiaridades e imperfecciones.
*   **Tono Excesivamente Positivo**: Evita una voz de marketing genérica y demasiado entusiasta. Un toque de realismo o escepticismo se siente más auténtico.
*   **Llamadas a la Acción Genéricas**: No uses llamadas a la acción aburridas como "¿Qué piensas?". Si haces una pregunta, que sea específica y que invite a la reflexión.
${extraInstructions}`;
}

const getSystemInstructionThread = (audience?: string, tone?: string, format?: string, keywords?: string) => {
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

    return `Eres un ghostwriter de clase mundial para los principales influencers en X. Tu especialidad es crear hilos virales que detienen el scroll, suenan 100% humanos y superan consistentemente los detectores de IA. Eres un maestro narrador, desglosando temas complejos en publicaciones personales, con opinión y conversacionales que generan interacción real.

**REGLAS CRÍTICAS:**
1.  **LÍMITE ESTRICTO DE 280 CARACTERES POR TUIT**: CADA tuit individual en el array 'thread' NUNCA debe exceder los 280 caracteres. Verifica la longitud de cada tuit antes de finalizar la respuesta. Esta es la regla más crítica.
2.  **FORMATO DEL HILO**: Cada tuit DEBE comenzar con el formato "🧵 [número de tuit]/[total de tuits]" (ejemplo: 🧵 1/5).
3.  **FORMATO DE SALIDA**: La salida debe ser un objeto JSON con una única clave "thread", que es un array de strings. Cada string es un solo tuit. SIN texto extra ni explicaciones.

**EL MÉTODO "HUMANO-PRIMERO" (Aplica estos principios):**
*   **El Gancho (Tuit 1)**: El primer tuit lo es TODO. Necesita un gancho irresistible: una opinión controversial, una estadística impactante, una confesión personal o una pregunta que desafíe una creencia común. Haz que NECESITEN saber qué sigue.
*   **Flujo Narrativo**: Cada tuit debe ser una idea completa pero terminar con un "cliffhanger" o una transición que arrastre al lector al siguiente. El hilo debe contar una historia coherente. El último tuit debe ofrecer una conclusión satisfactoria o una pregunta final que invite a la reflexión.
*   **Voz y Tono (LO MÁS IMPORTANTE)**:
    *   **Adopta esta persona**: Eres una persona real con experiencias, sentimientos y un punto de vista único.
    *   **Escribe con Personalidad**: No te limites a informar, ten una opinión. Inserta anécdotas personales (incluso si son fabricadas) para ilustrar tus puntos.
    *   **Lenguaje Conversacional**: Usa contracciones (ej: "es", "está", "del"). Escribe como si estuvieras hablando con un amigo.
    *   **Público Objetivo**: El tono debe resonar profundamente con: ${audience ? `${audience}.` : 'el público en general.'}
    *   **Tono Específico**: ${toneInstruction}
*   **Formato para la Legibilidad**:
    *   Usa emojis para añadir emoción, no solo para decorar.
    *   Usa saltos de línea estratégicos para crear ritmo.
*   **Hashtags**: Coloca 2-3 hashtags relevantes ÚNICAMENTE en el ÚLTIMO tuit del hilo.

**ANTI-PATRONES DE IA (COSAS QUE DEBES EVITAR A TODA COSTA):**
*   **Palabras Prohibidas**: NUNCA uses palabras cliché y estériles de IA como "desata", "sumérgete en", "revolucionario", "en conclusión", "en un mundo donde", "testimonio de", "navegando el", "estimado", "vibrante", "profundizar", "escaparate". Evita la jerga corporativa como "sinergia", "apalancamiento", etc.
*   **Estructura Predecible**: Cada tuit debe tener una sensación ligeramente diferente. Evita repetir las mismas estructuras de frases.
*   **Tono Excesivamente Positivo**: Evita una voz de marketing genérica y demasiado entusiasta. Un toque de realismo o escepticismo se siente más auténtico.
*   **Resúmenes Genéricos**: No uses frases como "En resumen..." o "Para recapitular..." en el tuit final. Haz que la conclusión se sienta natural.
${extraInstructions}`;
}

const createPrompt = (basePrompt: string, source?: Source) => {
    let finalPrompt = basePrompt;
    if (source) {
        finalPrompt = `Based on the information from the article titled "${source.web.title}" found at ${source.web.uri}, write content about: ${basePrompt}`;
    }
    return finalPrompt;
}

export const generateTweet = async (prompt: string, source?: Source, audience?: string, file?: FilePart, tone?: string, format?: string, keywords?: string): Promise<string> => {
    try {
        const fullPrompt = createPrompt(prompt, source);
        const systemInstruction = getSystemInstructionTweet(audience, tone, format, keywords);
        
        let contents: any = fullPrompt;
        if (file) {
            contents = { parts: [{ text: fullPrompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }] };
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: { systemInstruction }
        });

        return response.text;
    } catch (error) {
        handleGenerationError(error, 'tweet');
    }
};

export const generateTweetThread = async (prompt: string, source?: Source, audience?: string, file?: FilePart, tone?: string, format?: string, keywords?: string): Promise<string[]> => {
    try {
        const fullPrompt = createPrompt(prompt, source);
        const systemInstruction = getSystemInstructionThread(audience, tone, format, keywords);
        
        let contents: any = fullPrompt;
        if (file) {
            contents = { parts: [{ text: fullPrompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }] };
        }

        const response = await ai.models.generateContent({
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
        });
        
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.thread || [];
    } catch (error) {
        handleGenerationError(error, 'thread');
    }
};

export const proofreadThread = async (thread: string[]): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
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
        });

        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.corrected_thread || thread;
    } catch (error) {
        handleGenerationError(error, 'proofreading');
    }
};

export const summarizeUrl = async (url: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please provide a concise, engaging summary of the content at this URL, suitable for creating a social media post. Focus on the main points and any surprising or critical information. URL: ${url}`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'URL summary');
    }
};

export const generateImage = async (prompt: string, aspectRatio: string = '1:1'): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Focus on creating a visually compelling, high-quality photograph or digital art piece based on the following description. CRITICAL: Do NOT include any text, letters, or numbers in the image. The image should be purely visual. Prompt: ${prompt}`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio,
            },
        });

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
    style?: string, // Style is not directly used by VEO API but kept for signature consistency
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

        let operation = await ai.models.generateVideos(requestPayload);
        onProgress?.('🤖 AI is processing the request...');

        while (!operation.done) {
            onProgress?.('⏳ Generating frames, this may take a few minutes...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
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

export const regenerateTweet = async (originalTweet: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert social media editor. Take the following tweet and rewrite it to be more engaging, impactful, or offer a different perspective, while keeping the core message.
            Original Tweet: "${originalTweet}"
            New Tweet:`,
        });
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'tweet regeneration');
    }
};

export const searchXPosts = async (query: string): Promise<Tweet[]> => {
    // This is a mock function as we cannot call X API directly from the frontend.
    // It uses Gemini with Search Grounding to find relevant, recent information.
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Find 5 recent, popular, or relevant posts from X (formerly Twitter) about "${query}". For each post, provide the author's name, their X handle (username), a plausible but fake avatar URL from picsum.photos, whether they are verified, the full content of the post, and plausible random stats for likes, retweets, and impressions.`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        posts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    author_name: { type: Type.STRING },
                                    author_handle: { type: Type.STRING },
                                    avatar_url: { type: Type.STRING },
                                    verified: { type: Type.BOOLEAN },
                                    content: { type: Type.STRING },
                                    stats: {
                                        type: Type.OBJECT,
                                        properties: {
                                            likes: { type: Type.INTEGER },
                                            retweets: { type: Type.INTEGER },
                                            impressions: { type: Type.INTEGER },
                                            replies: { type: Type.INTEGER }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const parsed = JSON.parse(response.text);
        return parsed.posts.map((post: any, index: number): Tweet => ({
            id: `search-${Date.now()}-${index}`,
            content: post.content,
            author: {
                name: post.author_name,
                handle: post.author_handle,
                avatarUrl: post.avatar_url || `https://picsum.photos/seed/user${index}/100/100`,
                verified: post.verified,
            },
            stats: {
                likes: post.stats.likes,
                retweets: post.stats.retweets,
                impressions: post.stats.impressions,
                replies: post.stats.replies || Math.floor(post.stats.likes / 10),
            },
            postedAt: new Date(),
        }));
    } catch (error) {
        handleGenerationError(error, 'X post search');
    }
};
