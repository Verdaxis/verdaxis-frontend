import { RiskProfile } from "../../types";
import { getCachedData, setCachedData } from "./cache";
import { API_URL } from "../config";
import { getAccessToken } from "../authToken";

const callAiProxy = async (message: string): Promise<string | null> => {
    try {
        const token = getAccessToken();
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: token
                ? {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                }
                : {
                    'Content-Type': 'application/json',
                },
            body: JSON.stringify({ message, history: [] }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.response || null;
    } catch {
        return null;
    }
};

export const analyzeRisk = async (buyerName: string, profile: RiskProfile) => {
    const cacheKey = `risk_analysis_${buyerName.replace(/\s/g, '_')}_${profile.creditScore}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const prompt = `Analyze credit risk for "${buyerName}". Profile: Score ${profile.creditScore}/100, KYB ${profile.kybStatus}. Output a concise 3-sentence risk memo. Use markdown.`;
    const result = await callAiProxy(prompt);

    if (result) {
        setCachedData(cacheKey, result);
        return result;
    }
    return "AI Risk Assessment temporarily unavailable.";
};
