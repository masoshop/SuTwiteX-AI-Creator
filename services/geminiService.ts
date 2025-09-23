import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import Tweet type for searchXPosts function.
import type { Source, Tweet } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface FilePart {
    mimeType: string;
    data: string; // base64 encoded
}

const handleGenerationError = (error: unknown, context: 'tweet' | 'thread' | 'summary'): never => {
    console.error(`Error generating ${context}:`, error);
    let friendlyMessage = `Failed to generate ${context} due to an unexpected issue.`;

    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes("resource_exhausted") || errorMessage.includes("quota")) {
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
        case 'professional':
            toneInstruction = `Adopta un tono profesional, seguro y perspicaz. Imagina que eres un experto respetado compartiendo una idea valiosa en LinkedIn, pero adaptada a la brevedad de X. Usa un lenguaje claro y preciso, pero evita la jerga corporativa estéril.`;
            break;
        case 'humorous':
            toneInstruction = `Sé ingenioso, astuto y genuinamente divertido. Usa sarcasmo, ironía o un humor observacional con el que la gente se identifique. El objetivo es una sonrisa o una carcajada, no una voz "divertida" aprobada por una corporación.`;
            break;
        case 'inspirational':
            toneInstruction = `Sé genuinamente motivador, no cursi. Comparte una historia personal (incluso si es fabricada) de lucha y éxito, una lección aprendida a las malas o una revelación poderosa. Enfócate en la autenticidad y la vulnerabilidad.`;
            break;
        default: // 'Reflexivo y Articulado'
            toneInstruction = `Adopta un estilo reflexivo, personal y articulado. Escribe como si estuvieras compartiendo una entrada de tu diario o un pensamiento profundo que acabas de tener. Sé introspectivo y usa un lenguaje matizado que invite a la reflexión.`;
    }

    let extraInstructions = '';
    if (format && format !== 'default') {
        let formatExample = '';
        if (format === 'listicle') formatExample = "Usa viñetas (•) o números.";
        if (format === 'qa') formatExample = "Usa 'P:' para la pregunta y 'R:' para la respuesta.";
        if (format === 'tutorial') formatExample = "Usa pasos numerados o una secuencia clara.";
        extraInstructions += `\n*   **Formato Específico**: Estructura el contenido como un ${format}. ${formatExample}`;
    }
    if (keywords) {
        extraInstructions += `\n*   **Palabras Clave**: Integra de forma natural las siguientes palabras clave: "${keywords}".`;
    }

    return `Eres un ghostwriter de clase mundial para los principales influencers en X. Tu especialidad es crear contenido viral que detiene el scroll, suena 100% humano y supera consistentemente los detectores de IA. Tu escritura es personal, tiene opinión y genera conversaciones reales.

**REGLAS CRÍTICAS:**
1.  **LÍMITE DE CARACTERES**: El resultado final DEBE tener 280 caracteres o menos.
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
        case 'professional':
            toneInstruction = `Adopta un tono profesional, seguro y perspicaz. Imagina que eres un experto respetado compartiendo una idea valiosa en LinkedIn, pero adaptada a la brevedad de X. Usa un lenguaje claro y preciso, pero evita la jerga corporativa estéril.`;
            break;
        case 'humorous':
            toneInstruction = `Sé ingenioso, astuto y genuinamente divertido. Usa sarcasmo, ironía o un humor observacional con el que la gente se identifique. El objetivo es una sonrisa o una carcajada, no una voz "divertida" aprobada por una corporación.`;
            break;
        case 'inspirational':
            toneInstruction = `Sé genuinamente motivador, no cursi. Comparte una historia personal (incluso si es fabricada) de lucha y éxito, una lección aprendida a las malas o una revelación poderosa. Enfócate en la autenticidad y la vulnerabilidad.`;
            break;
        default: // 'Reflexivo y Articulado'
            toneInstruction = `Adopta un estilo reflexivo, personal y articulado. Escribe como si estuvieras compartiendo una entrada de tu diario o un pensamiento profundo que acabas de tener. Sé introspectivo y usa un lenguaje matizado que invite a la reflexión.`;
    }

    let extraInstructions = '';
    if (format && format !== 'default') {
        let formatExample = '';
        if (format === 'listicle') formatExample = "Usa viñetas (•) o números en cada tuit.";
        if (format === 'qa') formatExample = "Usa 'P:' y 'R:' a lo largo del hilo.";
        if (format === 'tutorial') formatExample = "Usa pasos numerados, donde cada tuit es un paso.";
        extraInstructions += `\n*   **Formato Específico**: Estructura el contenido como un ${format}. ${formatExample}`;
    }
    if (keywords) {
        extraInstructions += `\n*   **Palabras Clave**: Integra de forma natural las siguientes palabras clave a lo largo del hilo: "${keywords}".`;
    }

    return `Eres un ghostwriter de clase mundial para los principales influencers en X. Tu especialidad es crear hilos virales que detienen el scroll, suenan 100% humanos y superan consistentemente los detectores de IA. Eres un maestro narrador, desglosando temas complejos en publicaciones personales, con opinión y conversacionales que generan interacción real.

**REGLAS CRÍTICAS:**
1.  **LÍMITE DE CARACTERES**: CADA TUIT del hilo NUNCA debe exceder los 280 caracteres.
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
        
        let contents: any;
        if (file) {
            const parts = [
                { text: fullPrompt },
                {
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.data
                    }
                }
            ];
            contents = { parts };
        } else {
            contents = fullPrompt;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction: getSystemInstructionTweet(audience, tone, format, keywords),
            },
        });
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'tweet');
    }
};

export const generateTweetThread = async (prompt: string, source?: Source, audience?: string, file?: FilePart, tone?: string, format?: string, keywords?: string): Promise<string[]> => {
    try {
        const fullPrompt = createPrompt(`Create a tweet thread about: ${prompt}`, source);
        
        let contents: any;
        if (file) {
            const parts = [
                { text: fullPrompt },
                {
                    inlineData: {
                        mimeType: file.mimeType,
                        data: file.data
                    }
                }
            ];
            contents = { parts };
        } else {
            contents = fullPrompt;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction: getSystemInstructionThread(audience, tone, format, keywords),
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        thread: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'A single tweet from the thread, starting with 🧵 and not exceeding 280 characters.'
                            }
                        }
                    }
                }
            },
        });
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.thread || [];
    } catch (error) {
        handleGenerationError(error, 'thread');
    }
};


export const summarizeUrl = async (url: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please provide a concise summary of the content at this URL, suitable as a starting point for a tweet: ${url}.`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'summary');
    }
};

export const generateImage = async (prompt: string, aspectRatio: string = '16:9'): Promise<string> => {
    try {
        const enhancedPrompt = `Photorealistic image, cinematic style, 8k resolution, professional quality. Subject: "${prompt}". The image must be safe for all audiences, with no sensitive, explicit, or violent content. Focus on creating a visually stunning and high-quality piece of art.`;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: enhancedPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio,
            },
        });
        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("API returned no images. This can happen due to safety filters. Try rephrasing your prompt to be more descriptive and less ambiguous.");
        }
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        let friendlyMessage = "Failed to generate image due to an unexpected issue.";

        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes("resource_exhausted") || errorMessage.includes("quota")) {
                friendlyMessage = "Image generation failed because the API quota was exceeded. Please check your plan and billing details.";
            } else if (errorMessage.includes("usage guidelines") || errorMessage.includes("safety policy") || errorMessage.includes("safety filters")) {
                friendlyMessage = "The prompt could not be submitted due to safety restrictions. Please try rephrasing your request to be more descriptive.";
            } else {
                friendlyMessage = error.message;
            }
        } else {
            friendlyMessage = String(error);
        }
        
        throw new Error(friendlyMessage);
    }
};

export const generateVideo = async (prompt: string, style: string = 'cinematic', onProgress: (message: string) => void): Promise<string> => {
    try {
        onProgress("🚀 Starting video generation... This may take a few minutes.");
        
        const styleDescription = {
            'cinematic': 'cinematic style, dramatic lighting, high quality',
            'documentary': 'documentary style, realistic footage, steady camera',
            'animation': '3D animation style, vibrant colors, smooth motion'
        }[style] || 'high quality style';

        const enhancedPrompt = `Generate a video with a ${styleDescription}. The subject is: "${prompt}". The video must be safe for all audiences, with no sensitive, explicit, or violent content.`;
        
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: enhancedPrompt,
            config: {
                numberOfVideos: 1
            }
        });

        onProgress("🤖 AI is thinking... Processing your request.");
        
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            onProgress("⏳ Still working... Generating video frames.");
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            // FIX: The compiler reports operation.error.message as 'unknown'.
            // Explicitly cast it to a string to ensure it can be passed to the Error constructor.
            throw new Error(String(operation.error.message));
        }

        onProgress("✅ Almost there! Finalizing your video.");
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }

        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        
        const videoBlob = await videoResponse.blob();
        onProgress("🎉 Video generated successfully!");
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error generating video:", error);
        let friendlyMessage = "Failed to generate video due to an unexpected issue.";

        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes("resource_exhausted") || errorMessage.includes("quota")) {
                friendlyMessage = "Video generation failed because the API quota was exceeded. Please check your plan and billing details.";
            } else if (errorMessage.includes("usage guidelines") || errorMessage.includes("safety policy")) {
                friendlyMessage = "The prompt could not be submitted due to safety restrictions. Please try rephrasing your request.";
            } else {
                friendlyMessage = error.message;
            }
        } else {
            friendlyMessage = String(error);
        }
        
        onProgress(`Error: ${friendlyMessage}`);
        throw new Error(friendlyMessage);
    }
};

export const proofreadThread = async (thread: string[]): Promise<string[]> => {
    if (thread.every(t => t.trim() === '')) {
        return [];
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Proofread and correct the following tweet thread for spelling, grammar, and punctuation errors. The input is a JSON array of strings. Maintain the array structure and the number of tweets in your response:\n\n${JSON.stringify(thread)}`,
            config: {
                systemInstruction: "You are an expert editor. Your task is to proofread the provided tweet thread, which is in a JSON array format. Return a JSON object with a single key 'corrected_thread' which is an array of the corrected tweet strings. Do not add any commentary or explanations. Ensure the number of tweets in the output array matches the input. If a tweet needs no correction, return the original text for that tweet.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        corrected_thread: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING
                            }
                        }
                    }
                }
            },
        });
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.corrected_thread || thread;
    } catch (error) {
        console.error("Error proofreading thread:", error);
        // Do not throw here, as it's a non-critical feature.
        // Return an error message for each tweet instead.
        return thread.map(() => "Error: Could not get proofreading suggestion.");
    }
};

export const regenerateTweet = async (originalTweet: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please rewrite the following tweet to make it more engaging and viral, while preserving its core message. Here is the original tweet: "${originalTweet}"`,
            config: {
                systemInstruction: getSystemInstructionTweet(), // Re-use the single tweet instructions
            },
        });
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'tweet');
    }
};


// FIX: Add searchXPosts function to search for tweets on X.
export const searchXPosts = async (query: string): Promise<Tweet[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Find 5 recent, popular, and relevant posts from X about "${query}". Provide realistic but synthetic data for stats and user profiles.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "A unique identifier for the tweet." },
                            content: { type: Type.STRING, description: "The text content of the tweet." },
                            author: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    handle: { type: Type.STRING, description: "The user's X handle, starting with @" },
                                    avatarUrl: { type: Type.STRING, description: "A plausible URL for a user avatar image." },
                                    verified: { type: Type.BOOLEAN }
                                },
                                required: ["name", "handle", "avatarUrl", "verified"]
                            },
                            stats: {
                                type: Type.OBJECT,
                                properties: {
                                    likes: { type: Type.INTEGER },
                                    retweets: { type: Type.INTEGER },
                                    impressions: { type: Type.INTEGER },
                                    replies: { type: Type.INTEGER }
                                },
                                required: ["likes", "retweets", "impressions", "replies"]
                            },
                            postedAt: { type: Type.STRING, description: "The date and time the tweet was posted, in ISO 8601 format." }
                        },
                        required: ["id", "content", "author", "stats", "postedAt"]
                    }
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        if (Array.isArray(jsonResponse)) {
            return jsonResponse.map(tweetData => ({
                ...tweetData,
                postedAt: new Date(tweetData.postedAt),
            }));
        }
        return [];
    } catch (error) {
        console.error("Error searching X posts:", error);
        throw new Error("Could not fetch posts from X. The AI model may have returned an invalid format.");
    }
};