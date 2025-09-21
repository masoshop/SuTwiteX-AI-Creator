
import type { AnalyticsDataPoint } from '../types';

// ============================================================================
// Mock Data Service
// ============================================================================
// This service simulates fetching data for a given X user.
// In a real-world application with a backend, this would make authenticated
// calls to the X API. However, due to browser security (CORS) and the
// complexity of X API scraping, we generate dynamic mock data instead.
// This gives users an interactive experience of searching for any user
// and seeing plausible analytics in return.
// ============================================================================


/**
 * Generates dynamic, plausible-looking analytics data for a given username.
 * @param username The X username to generate data for.
 * @returns A promise that resolves to the analytics data.
 */
export const getAnalyticsData = async (username: string): Promise<{ follows: AnalyticsDataPoint[], posts: AnalyticsDataPoint[] }> => {
    console.log(`Generating mock analytics data for user: ${username}`);
    
    // Simulate network delay for a realistic feel
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    const follows: AnalyticsDataPoint[] = [];
    const posts: AnalyticsDataPoint[] = [];

    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Generate a random net change in followers for the day
        follows.push({
            date: dayLabel,
            value: Math.floor(Math.random() * 400) - 100 // e.g., -100 to +300
        });
        
        // Generate a random number of posts and replies
        posts.push({
            date: dayLabel,
            Posts: Math.floor(Math.random() * 5),
            Respuestas: Math.floor(Math.random() * 20),
        });
    }

    return { follows, posts };
};
