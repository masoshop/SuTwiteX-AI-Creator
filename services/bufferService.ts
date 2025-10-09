import type { BufferProfile, EditableTweet } from '../types';

// ============================================================================
// Mock Buffer Service
// ============================================================================
// This service simulates fetching data from and posting to the Buffer API.
// A mock is used because the official Buffer API does not support CORS
// (Cross-Origin Resource Sharing), which means it cannot be called directly
// from a browser-based application like this one.
// This mock provides a seamless user experience without real API calls.
// ============================================================================

const mockProfiles: BufferProfile[] = [
  {
    id: '5f9d7a9b8c7d6a5c1e3b0f1a',
    avatar: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z'/%3E%3C/svg%3E`,
    formatted_username: 'AI Content Page (Facebook)',
    service: 'facebook'
  },
  {
    id: '5f9d7a9b8c7d6a5c1e3b0f1b',
    avatar: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'%3E%3Cg%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'%3E%3C/path%3E%3C/g%3E%3C/svg%3E`,
    formatted_username: 'SuTwiteX AI (X)',
    service: 'twitter'
  },
    {
    id: '5f9d7a9b8c7d6a5c1e3b0f1c',
    avatar: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'/%3E%3Crect x='2' y='9' width='4' height='12'/%3E%3Ccircle cx='4' cy='4' r='2'/%3E%3C/svg%3E`,
    formatted_username: 'AI Content Solutions (LinkedIn)',
    service: 'linkedin'
  }
];

export const getProfiles = async (accessToken: string): Promise<BufferProfile[]> => {
    console.log(`Mocking getProfiles for token: ${accessToken}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    if (!accessToken || accessToken.toLowerCase().includes('invalid')) {
        throw new Error("The access token provided is invalid.");
    }
    
    return mockProfiles;
};

export const createPost = async (
    accessToken: string,
    text: string,
    profileIds: string[],
    media: EditableTweet['media']
): Promise<any> => {
    console.log(`Mocking createPost for token: ${accessToken}`, { text, profileIds, media });
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

    if (!accessToken || accessToken.toLowerCase().includes('invalid')) {
        throw new Error("The access token provided is invalid.");
    }

    if (profileIds.length === 0) {
        throw new Error("You must select at least one profile to post to.");
    }

    return {
        success: true,
        buffer_count: profileIds.length,
        buffer_percentage: 10,
        updates: profileIds.map(id => ({
            id: `update_${Date.now()}_${id}`,
            profile_id: id,
            text: text,
            media: media,
            status: "buffer"
        }))
    };
};
