import { GoogleGenAI } from "@google/genai";

export const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;