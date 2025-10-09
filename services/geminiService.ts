import { GoogleGenAI, Type, GenerateContentResponse, GenerateImagesResponse, GenerateVideosOperation, Chat, Modality } from "@google/genai";
import type { Source, Tweet, BrandVoiceProfile, TrendingTopic } from "../types";

const GEMINI_API_KEY = process.env.API_KEY;

// Helper to get a Gemini client instance
const getGeminiClient = () => {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured in the environment.");
    }
    return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
};

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
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
            const isRetryable = errorMessage.includes("xhr error") || 
                                errorMessage.includes("rpc failed") || 
                                errorMessage.includes("500") ||
                                errorMessage.includes("429") || // Explicitly retry on 429
                                errorMessage.includes("rate-limited") || // Explicitly retry on rate limit messages
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
    console.error(`Error al generar ${context} con Gemini:`, error);
    let friendlyMessage = `No se pudo generar ${context} debido a un problema inesperado.`;

    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes("api key") || errorMessage.includes("clave api") || errorMessage.includes("authentication")) {
            friendlyMessage = `Error de Clave API: La clave API de Gemini proporcionada parece ser inválida. Por favor, contacta al desarrollador.`;
        } else if (errorMessage.includes("permission denied") || errorMessage.includes("403")) {
            friendlyMessage = `Error de Permiso: Tu clave API de Gemini no tiene permiso para usar la búsqueda web. Por favor, contacta al desarrollador para habilitar las APIs necesarias en el proyecto de Google Cloud.`;
        } else if (errorMessage.includes("unexpected end of json input") || error.name === 'SyntaxError') {
            friendlyMessage = `Error de API (Gemini): La IA devolvió una respuesta inválida o incompleta. Esto puede ocurrir bajo alta demanda. Por favor, inténtalo de nuevo.`;
        } else if (errorMessage.includes("at capacity")) {
            friendlyMessage = `El modelo de IA está experimentando una alta demanda en este momento. Por favor, inténtalo de nuevo en unos momentos.`;
        } else if (errorMessage.includes("resource_exhausted") || errorMessage.includes("quota")) {
            friendlyMessage = `Se ha excedido la cuota de la API para Gemini. Por favor, revisa tu plan y detalles de facturación en su sitio web.`;
        } else if (errorMessage.includes("usage guidelines") || errorMessage.includes("safety policy")) {
            friendlyMessage = `La solicitud no pudo ser enviada debido a restricciones de seguridad. Por favor, intenta reformular tu petición.`;
        } else if (errorMessage.includes("xhr error") || errorMessage.includes("rpc failed") || errorMessage.includes("500")) {
             friendlyMessage = `Ocurrió un error de red al comunicarse con la IA. Esto podría ser un problema temporal. Por favor, inténtalo de nuevo. (Detalles: ${error.message})`;
        } else {
             friendlyMessage = `Ocurrió un error inesperado: ${error.message}`;
        }
    } else {
        friendlyMessage = `Ocurrió un error desconocido: ${String(error)}`;
    }
    
    throw new Error(friendlyMessage);
}

export const summarizeFileContent = async (file: FilePart): Promise<string> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        text: "Resume los puntos clave de este documento en un párrafo conciso, adecuado como punto de partida para crear una publicación en redes sociales. Céntrate en la información más importante."
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
        handleGenerationError(error, 'resumen');
    }
};

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
        if (format === 'question') formatExample = "Plantea una pregunta abierta y que invite a la reflexión para iniciar una conversación. Termina con una llamada a la acción clara para que gente responda.";
        if (format === 'quick_tip') formatExample = "Ofrece un consejo práctico, útil y fácil de implementar. Ve directo al grano y enfócate en el valor inmediato para el lector.";
        if (format === 'support_statement') formatExample = "Crea un tuit que respalde o proporcione contexto adicional a una afirmación, dato o pieza de contenido existente. Puede incluir una cita, un enlace a una fuente, o una explicación más profunda. Ideal para añadir credibilidad o detalle.";
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

**BÚSQUEDA WEB (REGLA FUNDAMENTAL)**: Si el prompt del usuario requiere información actual (noticias de última hora, eventos recientes, datos en tiempo real, información sobre personas o empresas específicas), DEBES realizar una búsqueda web para obtener la información más precisa y actualizada ANTES de formular tu respuesta. Basa tu contenido en hechos verificables de la búsqueda.
${brandVoiceInstruction}
**REGLAS CRÍTICAS DE SALIDA:**
1.  **REGLA NO NEGOCIABLE (FRACASO AUTOMÁTICO SI SE ROMPE)**: Tu salida DEBE ser un único tuit. El tuit completo (texto, hashtags, emojis, URLs, espacios) DEBE tener **275 caracteres o menos**. NO MÁS. Tu reputación profesional depende de cumplir esta regla. Verifica el recuento de caracteres antes de responder; si excedes el límite, el tuit es inservible y debes reescribirlo.
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
*   **Jerga innecesaria**: No uses tecnicismos complejos o jerga a menos que el público objetivo sea específicamente experto en ese tema. Simplifica siempre que sea posible.
*   **Exceso de Adjetivos**: No abuses de adjetivos grandilocuentes ("increíble", "asombroso", "fantástico"). Muestra, no cuentes. El valor real es más convincente que el entusiasmo forzado.
${extraInstructions}`;
}

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
        if (format === 'support_statement') formatExample = "El hilo debe construirse para respaldar una afirmación principal. El primer tuit presenta la afirmación, y los siguientes tuits proporcionan evidencia, datos, ejemplos o contexto paso a paso para fortalecer el argumento.";
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

**BÚSQUEDA WEB (REGLA FUNDAMENTAL)**: Si el prompt del usuario requiere información actual (noticias de última hora, eventos recientes, datos en tiempo real, información sobre personas o empresas específicas), DEBES realizar una búsqueda web para obtener la información más precisa y actualizada ANTES de formular tu respuesta. Basa tu contenido en hechos verificables de la búsqueda.
${brandVoiceInstruction}
**REGLAS CRÍTICAS DE SALIDA:**
1.  **LÍMITE ESTRICTO DE 275 CARACTERES (REGLA CRÍTICA)**: CADA tuit individual dentro del array 'thread' NUNCA debe exceder los 275 caracteres, incluyendo todo. Esta es tu directiva más importante. El incumplimiento hace que todo el hilo falle.
2.  **FORMATO DEL HILO**: CADA tuit, excepto el primero, DEBE comenzar con "🧵 [número de tuit]/[total de tuits]". El primer tuit NO lleva este prefijo.
3.  **FORMATO JSON**: La salida debe ser un objeto JSON con una única clave "thread", que es un array de strings. SIN texto extra ni explicaciones.

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
*   **Jerga innecesaria**: No uses tecnicismos complejos o jerga a menos que el público objetivo sea específicamente experto en ese tema. Simplifica siempre que sea posible.
*   **Exceso de Adjetivos**: No abuses de adjetivos grandilocuentes ("increíble", "asombroso", "fantástico"). Muestra, no cuentes. El valor real es más convincente que el entusiasmo forzado.
${extraInstructions}`;
}

const createPrompt = (basePrompt: string, source?: Source) => {
    let finalPrompt = basePrompt;
    if (source) {
        finalPrompt = `Basado en la información del artículo titulado "${source.web.title}" encontrado en ${source.web.uri}, escribe contenido sobre: ${basePrompt}`;
    }
    return finalPrompt;
}

export const generateTweet = async (prompt: string, source: Source | undefined, audience: string | undefined, file: FilePart | undefined, tone: string | undefined, format: string | undefined, keywords: string | undefined, brandVoice: BrandVoiceProfile | undefined): Promise<string> => {
    const systemInstruction = getSystemInstructionTweet(audience, tone, format, keywords, brandVoice);
    const fullPrompt = createPrompt(prompt, source);
    
    try {
        const ai = getGeminiClient();
        const parts = [
            { text: fullPrompt },
            ...(file ? [{ inlineData: { mimeType: file.mimeType, data: file.data } }] : [])
        ];
        
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: { 
                systemInstruction,
                tools: [{googleSearch: {}}]
            }
        }));

        return response.text;
    } catch (error) {
        handleGenerationError(error, 'tuit');
    }
};

export const generateTweetThread = async (prompt: string, source: Source | undefined, audience: string | undefined, file: FilePart | undefined, tone: string | undefined, format: string | undefined, keywords: string | undefined, brandVoice: BrandVoiceProfile | undefined, useWebSearch?: boolean): Promise<string[]> => {
    const systemInstruction = getSystemInstructionThread(audience, tone, format, keywords, brandVoice);
    const fullPrompt = createPrompt(prompt, source);

    try {
        const ai = getGeminiClient();
        const parts = [
            { text: fullPrompt },
            ...(file ? [{ inlineData: { mimeType: file.mimeType, data: file.data } }] : [])
        ];
        
        const config: any = {
            systemInstruction,
        };

        if (useWebSearch) {
            config.tools = [{googleSearch: {}}];
        } else {
            config.responseMimeType = 'application/json';
            config.responseSchema = {
                type: Type.OBJECT,
                properties: {
                    thread: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING
                        }
                    }
                },
                required: ['thread']
            };
        }

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: config
        }));

        let jsonStr = response.text.trim();
        
        // Robust JSON cleaning
        if (jsonStr.includes('```json')) {
            jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.startsWith('```') && jsonStr.endsWith('```')) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        const result = JSON.parse(jsonStr);
        return result.thread || [];
    } catch (error) {
        handleGenerationError(error, 'hilo');
    }
};

export const proofreadThread = async (thread: string[]): Promise<string[]> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{
                    text: `Revisa y corrige cualquier error de ortografía o gramática en el siguiente array de tuits. Devuelve el resultado como un objeto JSON con una clave "corrected_thread" que es un array de strings. No cambies el significado ni el tono. Si un tuit es correcto, devélvelo tal cual.
                    
                    Hilo Original: ${JSON.stringify(thread)}`
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
        handleGenerationError(error, 'corrección');
    }
};

export const createChatSession = (systemInstruction: string, isJson: boolean, history?: any[]): Chat => {
    const ai = getGeminiClient();
    const config: any = { 
        systemInstruction,
    };

    if (isJson) {
         config.responseMimeType = 'application/json';
         config.responseSchema = {
            type: Type.OBJECT,
            properties: {
                thread: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING
                    }
                }
            },
            required: ['thread']
        };
    } else {
        config.tools = [{googleSearch: {}}];
    }
    
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config,
        history,
    });
};

export const summarizeUrl = async (url: string): Promise<string> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Usando tu herramienta de búsqueda web, por favor accede y proporciona un resumen conciso y atractivo del contenido de esta URL, adecuado para crear una publicación en redes sociales. Céntrate en los puntos principales y en cualquier información sorprendente o crítica. URL: ${url}` }] },
            config: {
                tools: [{ googleSearch: {} }]
            }
        }));
        
        const summary = response.text;

        // Check for model refusal which might not be thrown as a network error.
        // Also check for Spanish refusal messages.
        const lowerCaseSummary = summary.toLowerCase();
        if (
            !summary || 
            lowerCaseSummary.includes("i cannot") || 
            lowerCaseSummary.includes("i am unable") ||
            lowerCaseSummary.includes("no puedo") ||
            lowerCaseSummary.includes("soy incapaz") ||
            lowerCaseSummary.includes("unable to access")
        ) {
            // Throw a specific error that handleGenerationError can catch and format nicely.
            throw new Error("El modelo de IA informó que no pudo acceder al contenido de la URL proporcionada. Asegúrate de que sea un enlace público y directo, y vuelve a intentarlo.");
        }

        return summary;
    } catch (error) {
        handleGenerationError(error, 'resumen de URL');
    }
};

export const summarizeWebSearch = async (query: string): Promise<{ summary: string, sources: Source[] }> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Proporciona un resumen conciso y atractivo del tema: "${query}". El resumen debe ser adecuado para crear una publicación en redes sociales, centrándose en los puntos principales y en cualquier información sorprendente o crítica. Basa tu respuesta *únicamente* en los resultados de la Búsqueda de Google.` }] },
            config: {
                tools: [{ googleSearch: {} }]
            }
        }));

        const summary = response.text;
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: Source[] = (groundingChunks || []).map((chunk: any) => ({
            web: {
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Fuente Desconocida',
            }
        })).filter(source => source.web.uri);

        if (!summary) {
            throw new Error("La IA devolvió un resumen vacío. Esto podría deberse a la falta de resultados de búsqueda para el tema.");
        }

        return { summary, sources };
    } catch (error) {
        return handleGenerationError(error, 'resumen de búsqueda web');
    }
};

export const searchWeb = async (query: string): Promise<{ title: string; uri: string; summary: string }[]> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Basado en una Búsqueda de Google para "${query}", proporciona una lista de las 10 páginas web más relevantes e inspiradoras. Para cada página, dame su título, URI y un resumen muy corto de una frase sobre su contenido relevante para la consulta. Tu respuesta DEBE ser un único objeto JSON válido con una clave "results", que es un array de objetos. Cada objeto debe tener las claves "title", "uri" y "summary".` }] },
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));

        let jsonStr = response.text.trim();
        // Robust JSON cleaning
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }

        try {
            const parsed = JSON.parse(jsonStr);
            return parsed.results || [];
        } catch (parseError) {
            // Check if the non-JSON response is a model refusal, which causes the JSON parse to fail.
            const lowerCaseResponse = jsonStr.toLowerCase();
            if (
                lowerCaseResponse.includes("i am unable") ||
                lowerCaseResponse.includes("i cannot") ||
                lowerCaseResponse.includes("i'm unable") ||
                lowerCaseResponse.includes("no se encontraron") || // Spanish for "not found"
                lowerCaseResponse.includes("no puedo") // Spanish for "I cannot"
            ) {
                throw new Error("La IA no pudo procesar esta búsqueda. Esto puede ocurrir con temas sensibles o si no se encuentran resultados relevantes. Por favor, prueba con una consulta diferente.");
            }
            // If it's another type of invalid JSON, re-throw the original error to be caught by the generic handler.
            throw parseError;
        }

    } catch (error) {
        return handleGenerationError(error, 'búsqueda web');
    }
};

export const generateImage = async (prompt: string, aspectRatio: string = '1:1'): Promise<string[]> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateImagesResponse>(() => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `Enfócate en crear una pieza de arte digital o fotografía visualmente atractiva y de alta calidad basada en la siguiente descripción. CRÍTICO: NO incluyas texto, letras o números en la imagen. La imagen debe ser puramente visual. Prompt: ${prompt}`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio,
            },
        }));

        const images = response.generatedImages.map(img => img.image.imageBytes).filter((bytes): bytes is string => !!bytes);

        if (images.length === 0) {
            throw new Error("La IA no devolvió ninguna imagen.");
        }
        return images;
    } catch (error) {
        handleGenerationError(error, 'imagen');
    }
};

export const editImage = async (
    base64ImageData: string,
    mimeType: string,
    prompt: string,
): Promise<{ text: string, image: { data: string, mimeType: string } | null }> => {
    try {
        const ai = getGeminiClient();
        
        // Al hacer la instrucción más directa y especificar el resultado,
        // reducimos la posibilidad de que el modelo responda con texto en lugar de una imagen.
        const finalPrompt = `Edita la imagen basándote en la siguiente instrucción. Tu única salida debe ser la imagen modificada. No incluyas ningún texto en tu respuesta.

Instrucción: "${prompt}"`;

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: finalPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        }));

        let editedText = '';
        let editedImage: { data: string, mimeType: string } | null = null;

        const parts = response.candidates?.[0]?.content?.parts;

        if (parts && Array.isArray(parts)) {
            for (const part of parts) {
                if (part.text) {
                    editedText = part.text;
                } else if (part.inlineData) {
                    editedImage = {
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType,
                    };
                }
            }
        }
        
        if (!editedImage) {
            const refusalMessage = editedText 
                ? `La IA no devolvió una imagen y respondió con el siguiente texto: "${editedText}"`
                : "La IA no devolvió una imagen editada. Esto puede ocurrir si la solicitud infringe las políticas de seguridad o si la instrucción no es clara.";
            throw new Error(refusalMessage);
        }

        return { text: editedText, image: editedImage };
    } catch (error) {
        handleGenerationError(error, 'edición de imagen');
    }
};


export const generateVideo = async (
    prompt: string,
    style?: string, 
    onProgress?: (message: string) => void,
    image?: { data: string; mimeType: string }
): Promise<string> => {
    try {
        if (!GEMINI_API_KEY) throw new Error("La clave API de Gemini no está definida en el código.");
        
        const ai = getGeminiClient();
        onProgress?.('🚀 Iniciando la generación de video...');

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
        onProgress?.('🤖 La IA está procesando la solicitud...');

        while (!operation.done) {
            onProgress?.('⏳ Generando fotogramas, esto puede tardar unos minutos...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
            operation = await withRetry<GenerateVideosOperation>(() => ai.operations.getVideosOperation({ operation: operation }));
        }
        
        if (operation.error) {
            throw new Error(`La generación de video falló: ${operation.error.message}`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("La generación de video se completó, pero no se encontró ningún enlace de descarga.");
        }
        
        onProgress?.('✅ Finalizando el video...');
        
        const response = await fetch(`${downloadLink}&key=${GEMINI_API_KEY}`);
        if (!response.ok) {
            throw new Error(`No se pudo descargar el video: ${response.statusText}`);
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        onProgress?.('🎉 ¡El video está listo!');
        return objectUrl;

    } catch (error) {
        const message = error instanceof Error ? error.message : "Ocurrió un error desconocido durante la generación del video.";
        onProgress?.(`Error: ${message}`);
        throw new Error(message);
    }
};

export const searchXPosts = async (query: string): Promise<{ tweets: Tweet[], sources: Source[] }> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Usando la Búsqueda de Google, encuentra tuits recientes, populares y relevantes en X (anteriormente Twitter) sobre "${query}". Sintetiza una lista de 5 tuits realistas que reflejen con precisión la conversación actual basándose *únicamente* en los resultados de la búsqueda. CRÍTICO: No inventes contenido, estadísticas o detalles de usuario. Los tuits deben ser una síntesis plausible de la información encontrada. Para detalles de usuario como 'avatarUrl', usa un marcador de posición genérico si no hay uno real disponible en el contexto de la búsqueda. Tu respuesta debe ser un único objeto JSON válido con una clave "tweets" que es un array de objetos de tuit. Cada objeto de tuit debe tener un objeto 'author' con las propiedades 'name', 'handle', 'avatarUrl' y 'verified' (booleano), y un objeto 'stats' con 'likes', 'retweets', 'impressions' y 'replies'. No incluyas ningún otro texto, formato markdown o explicaciones.` }] },
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));

        const jsonStr = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        const result = JSON.parse(jsonStr);
        
        const DEFAULT_AVATAR_URL = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23657786'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E`;
        const tweets = (result.tweets || []).map((t: any, index: number): Tweet => {
            // This provides a robust mapping from a potentially flat or incomplete AI response
            // to the strictly-typed Tweet interface, preventing runtime errors.
            const authorData = t.author || {};
            return {
                id: t.id || `search-tweet-${index}`,
                content: t.content || '[Sin contenido]',
                author: {
                    name: authorData.name || t.name || 'Usuario Desconocido',
                    handle: authorData.handle || t.handle || '@unknown',
                    avatarUrl: authorData.avatarUrl || t.avatarUrl || DEFAULT_AVATAR_URL,
                    verified: typeof authorData.verified === 'boolean' ? authorData.verified : (typeof t.verified === 'boolean' ? t.verified : false),
                },
                media: t.media,
                stats: t.stats || { likes: 0, retweets: 0, impressions: 0, replies: 0 },
                postedAt: new Date(),
            };
        });
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: Source[] = (groundingChunks || []).map((chunk: any) => ({
            web: {
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Fuente Desconocida',
            }
        })).filter(source => source.web.uri);

        return { tweets, sources };

    } catch (error) {
        return handleGenerationError(error, 'búsqueda de posts en X');
    }
};

export const getTrendingTopics = async (): Promise<{ trends: TrendingTopic[], sources: Source[] }> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: `Usando la Búsqueda de Google, identifica los 5 temas o hashtags más populares en X (anteriormente Twitter) en Estados Unidos en este momento. Para cada tendencia, proporciona una explicación concisa de una frase sobre por qué es tendencia. CRÍTICO: Tu respuesta debe ser un único objeto JSON válido con una clave "trends" que es un array de objetos de tendencia (cada uno con las claves 'topic' y 'description'). No inventes contenido. No incluyas ningún otro texto, formato markdown o explicaciones.` }] },
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));

        const jsonStr = response.text.trim().replace(/^```json\n?/, '').replace(/```$/, '');
        const result = JSON.parse(jsonStr);
        const trends = result.trends || [];
        
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: Source[] = (groundingChunks || []).map((chunk: any) => ({
            web: {
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Fuente Desconocida',
            }
        })).filter(source => source.web.uri);

        return { trends, sources };
    } catch (error) {
        return handleGenerationError(error, 'temas en tendencia');
    }
};

export const regenerateTweet = async (originalTweet: string): Promise<string> => {
    try {
        const ai = getGeminiClient();
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Eres un editor experto de redes sociales. Toma el siguiente tuit y reescríbelo para que sea más atractivo, impactante u ofrezca una perspectiva diferente, manteniendo el mensaje central.
            Tuit Original: "${originalTweet}"
            Nuevo Tuit:`,
             config: {}
        }));
        return response.text;
    } catch (error) {
        handleGenerationError(error, 'regeneración de tuit');
    }
};