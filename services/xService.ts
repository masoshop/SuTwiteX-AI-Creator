
import type { Tweet, XUserProfile } from '../types';

// ============================================================================
// Real X API Service
// ============================================================================
// This service makes live calls to the X v2 API.
// NOTE: To bypass browser CORS limitations, API calls are made to a relative
// path (e.g., /x-api/2/users/by/username/...) which is handled by
// the Vite proxy during development. For production, a similar proxy is needed.
// ============================================================================

const makeXApiRequest = async (endpoint: string, token: string) => {
    // The request is made to a relative path, assuming a proxy is in place.
    const response = await fetch(endpoint, {
        headers: {
            'Authorization': `Bearer ${token}`,
        }
    });

    if (!response.ok) {
        // Try to parse the error response from X API
        try {
            const errorData = await response.json();
            let errorMessage = `Error de la API de X (${response.status}): ${errorData.title || 'Error desconocido'}.`;
            if (errorData.detail) {
                errorMessage += ` Detalles: ${errorData.detail}`;
            }
             if (response.status === 401) {
                errorMessage = "No autorizado (401). Tu token Bearer de la API de X parece ser inválido o ha expirado.";
            } else if (response.status === 403) {
                errorMessage = "Prohibido (403). No tienes los permisos necesarios para acceder a este recurso. Revisa el nivel de acceso de tu proyecto en el Portal de Desarrolladores de X.";
            } else if (response.status === 404) {
                 errorMessage = `No encontrado (404). Asegúrate de que el nombre de usuario de X sea correcto y de que el recurso solicitado exista.`;
            } else if (response.status === 429) {
                errorMessage = "Límite de peticiones de la API excedido. Por favor, espera un momento antes de volver a intentarlo.";
            }
            throw new Error(errorMessage);
        } catch (e) {
            // If the error response is not JSON or another error occurs, throw a generic error
            if (e instanceof Error) {
                 throw e; // Re-throw the parsed error
            }
            throw new Error(`Error de la API de X: Se recibió una respuesta inesperada con estado ${response.status}.`);
        }
    }
    return response.json();
}

/**
 * Verifies the Bearer Token and fetches the user's public profile by their username.
 * Includes public metrics like follower count.
 * @param token The X API v2 Bearer Token.
 * @param username The user's X handle.
 * @returns A promise that resolves to the user's profile.
 */
export const verifyTokenAndGetUser = async (token: string, username: string): Promise<XUserProfile> => {
    if (!token) throw new Error("El token Bearer no puede estar vacío.");
    if (!username) throw new Error("El nombre de usuario de X no puede estar vacío.");

    const endpoint = `/x-api/2/users/by/username/${username}?user.fields=profile_image_url,verified,public_metrics`;
    const { data } = await makeXApiRequest(endpoint, token);
    
    if (!data) {
        throw new Error(`No se pudo encontrar al usuario de X con el nombre de usuario: ${username}`);
    }

    return {
        id: data.id,
        name: data.name,
        handle: `@${data.username}`,
        avatarUrl: data.profile_image_url.replace('_normal', '_400x400'), // Get a higher resolution image
        verified: data.verified,
        public_metrics: data.public_metrics,
    };
}

/**
 * Fetches recent tweets for a given user ID, based on the official X tutorial.
 * @param token The X API v2 Bearer Token.
 * @param userId The ID of the X user.
 * @returns A promise that resolves to an array of the user's recent tweets.
 */
export const getRecentTweets = async (token: string, userId: string): Promise<Tweet[]> => {
     if (!token) throw new Error("El token Bearer no puede estar vacío.");
     if (!userId) throw new Error("El ID de usuario es requerido para obtener los tuits.");

    // This endpoint structure is based on the tutorial provided by the user.
    const endpoint = `/x-api/2/users/${userId}/tweets?expansions=author_id&tweet.fields=created_at,public_metrics&user.fields=profile_image_url,verified&max_results=10`;
    const response = await makeXApiRequest(endpoint, token);

    const tweetsData = response.data || [];
    const usersData = response.includes?.users || [];
    
    const usersMap = new Map(usersData.map((user: any) => [user.id, user]));

    if (!tweetsData || tweetsData.length === 0) {
        return [];
    }
    
    return tweetsData.map((tweet: any): Tweet => {
        // FIX: Cast authorData to 'any' to resolve 'property does not exist on type unknown' errors.
        // The 'expansions=author_id' query parameter ensures the author data is included and available in the usersMap.
        const authorData: any = usersMap.get(tweet.author_id);
        const authorProfile: XUserProfile = {
             id: authorData.id,
             name: authorData.name,
             handle: `@${authorData.username}`,
             avatarUrl: authorData.profile_image_url.replace('_normal', '_200x200'),
             verified: authorData.verified
        };

        return {
            id: tweet.id,
            content: tweet.text,
            author: authorProfile,
            public_metrics: {
                retweet_count: tweet.public_metrics?.retweet_count || 0,
                reply_count: tweet.public_metrics?.reply_count || 0,
                like_count: tweet.public_metrics?.like_count || 0,
                quote_count: tweet.public_metrics?.quote_count || 0,
                impression_count: tweet.public_metrics?.impression_count || 0, 
            },
            created_at: tweet.created_at,
        };
    });
}
