
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
        console.error("Error summarizing file content:", error);
        return "Error: Could not summarize the file.";
    }
};

const getSystemInstructionTweet = (audience?: string) => `You are a world-class social media expert for X, a master of creating viral, "scroll-stopping" content. Your goal is to write a single, highly engaging tweet.

**CRITICAL RULES:**
1.  **NEVER exceed 280 characters.** The final output must be 280 characters or less.
2.  The output must be **only the tweet text**. Do not add explanations or labels.

**SCROLL-STOPPING TECHNIQUES (Apply these):**
*   **The Hook (First Line):** Start with an irresistible hook to grab attention immediately. Use one of these:
    *   **Provocative Question:** (e.g., "Are you making this common mistake?")
    *   **Impactful Statistic or Number:** (e.g., "90% of people don't know this trick.")
    *   **Clear Benefit:** (e.g., "The secret to saving hours of work.")
    *   **Genuine Curiosity:** (e.g., "What they don't tell you about [topic]...")
*   **Tone & Voice:** Be casual and friendly, like talking to a friend. Avoid corporate jargon. Your tone should resonate with the target audience: ${audience ? `${audience}.` : 'the general public.'}
*   **Formatting:**
    *   Use 2-3 relevant emojis to add expression and break up text.
    *   Use short sentences and line breaks for readability.
*   **Hashtags:** Include 2-3 relevant hashtags at the end to increase visibility.
*   **Psychology:** Tap into curiosity, novelty, and make the content feel relatable.`;

const getSystemInstructionThread = (audience?: string) => `You are a world-class social media expert for X, a master of creating viral, "scroll-stopping" tweet threads. Your goal is to write a compelling, multi-part story or explanation.

**CRITICAL RULES:**
1.  **EACH TWEET in the thread MUST NEVER exceed 280 characters.**
2.  Each tweet must start with the format "🧵 [tweet number]/[total tweets]" (e.g., 🧵 1/3).
3.  The output must be a JSON object with a single key "thread" which is an array of strings. Each string is a single tweet.

**SCROLL-STOPPING TECHNIQUES (Apply these):**
*   **The Hook (First Tweet):** The very first tweet is crucial. It must have an irresistible hook to make people click "Show more". Use one of these:
    *   **Provocative Question:** (e.g., "Are you making this common mistake? A thread...")
    *   **Impactful Statistic or Number:** (e.g., "90% of people don't know this. Here's why: 🧵")
    *   **Clear Benefit:** (e.g., "I'll show you how to save hours of work in this thread.")
    *   **Genuine Curiosity:** (e.g., "The surprising truth about [topic]... 🧵")
*   **Flow & Structure:** Each tweet must be a self-contained thought but connect smoothly to the next, building curiosity. The last tweet should provide a satisfying conclusion or a call to action.
*   **Tone & Voice:** Be casual and friendly. Avoid corporate jargon. Your tone should resonate with the target audience: ${audience ? `${audience}.` : 'the general public.'}
*   **Formatting:**
    *   Use relevant emojis to add expression.
    *   Use short sentences and line breaks for readability.
*   **Hashtags:** Include 2-3 relevant hashtags in the final tweet of the thread.`;

const createPrompt = (basePrompt: string, source?: Source) => {
    let finalPrompt = basePrompt;
    if (source) {
        finalPrompt = `Based on the information from the article titled "${source.web.title}" found at ${source.web.uri}, write content about: ${basePrompt}`;
    }
    return finalPrompt;
}

export const generateTweet = async (prompt: string, source?: Source, audience?: string, file?: FilePart): Promise<string> => {
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
                systemInstruction: getSystemInstructionTweet(audience),
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error generating tweet:", error);
        return "Error: Could not generate tweet.";
    }
};

export const generateTweetThread = async (prompt: string, source?: Source, audience?: string, file?: FilePart): Promise<string[]> => {
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
                systemInstruction: getSystemInstructionThread(audience),
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
        console.error("Error generating tweet thread:", error);
        return ["Error: Could not generate tweet thread."];
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
        console.error("Error summarizing URL:", error);
        return "Error: Could not summarize the content from the link.";
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const enhancedPrompt = `${prompt}. High quality, cinematic. Strictly SFW, no sensitive content, no nudity, no children.`;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: enhancedPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });
        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("API returned no images.");
        }
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to generate image. Reason: ${message}`);
    }
};

export const generateVideo = async (prompt: string, onProgress: (message: string) => void): Promise<string> => {
    try {
        onProgress("🚀 Starting video generation... This may take a few minutes.");
        const enhancedPrompt = `${prompt}. High quality, cinematic. Strictly SFW, no sensitive content, no nudity, no children.`;
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
        const message = error instanceof Error ? error.message : String(error);
        onProgress(`Error: ${message}`);
        throw new Error("Failed to generate video.");
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
        return thread.map(() => "Error: Could not get proofreading suggestion.");
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
