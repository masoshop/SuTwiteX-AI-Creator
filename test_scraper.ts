
import { scrapeXProfile } from './services/geminiService';

async function test() {
    console.log("Testing scraper...");
    try {
        const data = await scrapeXProfile('FilosofIAfree');
        console.log("Data received:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
