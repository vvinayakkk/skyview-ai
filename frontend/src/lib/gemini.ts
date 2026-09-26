
import { GoogleGenerativeAI } from "@google/generative-ai";

// For local development, user needs to set this in their environment
// In a real app, this should be handled by a secure backend
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export async function getGeminiResponse(prompt: string, contextData?: any) {
    try {
        console.log(`SkyView AI: Dispatching atmospheric query to backend...`);

        // Use the local FastAPI backend instead of direct client-side Gemini
        const backendUrl = import.meta.env.VITE_API_URL || '';

        const response = await fetch(`${backendUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: prompt,
                user_id: 'voice_assistant_web',
                context: contextData // Optional: Pass extra context if needed
            }),
        });

        if (!response.ok) {
            throw new Error(`Cloud connection failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.response) {
            console.log(`SkyView AI: Successfully received consultation response`);
            return data.response;
        }

        return "I processed your request, but the atmosphere remains silent. Please try again.";
    } catch (error: any) {
        console.error('SkyView AI consultation error:', error);
        return "The cognitive link to SkyView Intelligence has been disrupted. Please check if your backend server is active on port 8000.";
    }
}
