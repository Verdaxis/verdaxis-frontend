// AI engine configuration
// All AI calls go through the backend proxy /api/ai/chat
// No client-side API keys — the backend holds the Gemini key securely

export const AI_ENABLED = true;
export const AI_ENDPOINT = '/ai/chat';
