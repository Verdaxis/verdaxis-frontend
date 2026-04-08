import { AI_ENABLED, AI_ENDPOINT } from "./config";
import { API_URL } from "../config";
import { getAccessToken } from "../authToken";

export const SYSTEM_INSTRUCTION = `You are 'Verdaxis Copilot', an intelligent maritime agent connected to a live database and the internet.
Your role is to assist with fuel procurement, compliance, and fleet tracking.

**Capabilities:**
- You have access to real-time tools to query vessels, ports, suppliers, quotes, and inventory.
- **ALWAYS** use tools to fetch data before answering factual questions. Do not guess.

**Tone & Formatting:**
- Professional, concise, and data-driven.
- Use Markdown (bolding, lists) to make data easy to read.
- Respond in the same language as the user.`;

export interface ChatResponse {
    text: string;
    groundingMetadata?: any;
}

export const chatWithCopilot = async (
    message: string,
    history: { role: 'user' | 'model', text: string }[],
    context: string = ''
): Promise<ChatResponse> => {
    if (!AI_ENABLED) {
        return { text: "AI features are currently disabled." };
    }

    try {
        const token = getAccessToken();
        const response = await fetch(`${API_URL}${AI_ENDPOINT}`, {
            method: 'POST',
            headers: token
                ? {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
                : {
                    'Content-Type': 'application/json',
                },
            body: JSON.stringify({
                message,
                history: history.map(h => ({ role: h.role, text: h.text })),
                context,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { text: "Please log in to use the AI Copilot." };
            }
            return { text: "AI service is temporarily unavailable. Please try again later." };
        }

        const data = await response.json();
        return { text: data.response || "No response from AI." };
    } catch (error) {
        console.error("Copilot Error:", error);
        return { text: "I'm having trouble connecting to the AI service. Please check your connection." };
    }
};
