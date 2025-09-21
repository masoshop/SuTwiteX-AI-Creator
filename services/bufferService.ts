
import type { BufferProfile, EditableTweet } from '../types';

const API_BASE = 'https://api.bufferapp.com/1';

const urlToBlob = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch media from ${url}`);
    }
    return response.blob();
}

export const getProfiles = async (accessToken: string): Promise<BufferProfile[]> => {
    try {
        const response = await fetch(`${API_BASE}/profiles.json?access_token=${accessToken}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching Buffer profiles:", error);
        throw error;
    }
};

export const createPost = async (
    accessToken: string,
    text: string,
    profileIds: string[],
    media: EditableTweet['media']
): Promise<any> => {
    try {
        const formData = new FormData();
        formData.append('access_token', accessToken);
        formData.append('text', text);
        profileIds.forEach(id => formData.append('profile_ids[]', id));

        if (media?.url && media.type === 'image') {
            const blob = await urlToBlob(media.url);
            formData.append('media[photo]', blob);
        }

        const response = await fetch(`${API_BASE}/updates/create.json`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();

    } catch (error) {
        console.error("Error creating Buffer post:", error);
        throw error;
    }
};
