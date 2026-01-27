import { GoogleGenAI } from "@google/genai";

export const apiKey = process.env.API_KEY || '';
export const ai = new GoogleGenAI({ apiKey });