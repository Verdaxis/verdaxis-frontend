
import { Type } from "@google/genai";
import { Port, RiskProfile, MarketWatchItem } from "../../types";
import { ai, apiKey } from "./config";
import { getCachedData, setCachedData } from "./cache";

// Robust Mock Data for Fallbacks
const MOCK_ARBITRAGE_FALLBACK = {
    originId: 'sg-sin',
    destinationId: 'nl-rtm',
    spread: 25.50,
    narrative: "Strong arbitrage opportunity detected. **Singapore** supply glut has widened the spread against **Rotterdam**, creating a profitable window for spot methanol cargoes."
};

const MOCK_NARRATIVE_FALLBACK = (portName: string) =>
    `Market activity in **${portName}** is elevated due to seasonal restocking. Spot prices are stabilizing as local inventories reach healthy levels.`;

export const generateMarketNarrative = async (port: Port) => {
    // Immediate fallback if no API key is configured
    if (!apiKey) return MOCK_NARRATIVE_FALLBACK(port.name);

    const cacheKey = `market_narrative_${port.id}`;
    const cachedResponse = getCachedData(cacheKey);
    if (cachedResponse) return cachedResponse;

    try {
        const prompt = `Generate a 2-sentence financial market narrative for ${port.name}.
        Context: Methanol supply is ${port.methanolSupply}, Price is $${port.priceMethanol}/mt with a trend of ${port.priceTrend}%.
        Explain why the price is moving based on plausible maritime news (e.g., production outages, congestion, seasonal demand).
        Use markdown for emphasis (e.g. **strong demand**). Do not use LaTeX formatting.`;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
        });

        const text = response.text;

        if (!text) {
            return MOCK_NARRATIVE_FALLBACK(port.name);
        }

        setCachedData(cacheKey, text);
        return text;
    } catch (error) {
        console.warn("AI Narrative Generation Failed, using fallback:", error);
        return MOCK_NARRATIVE_FALLBACK(port.name);
    }
};

export const generateArbitrageInsight = async (ports: Port[]) => {
    // Immediate fallback if no API key is configured
    if (!apiKey) return MOCK_ARBITRAGE_FALLBACK;

    const cacheKey = 'global_arbitrage_insight_v6'; 
    const cachedResponse = getCachedData(cacheKey);
    if (cachedResponse) {
        try {
             return JSON.parse(cachedResponse);
        } catch (e) {
             console.warn("Cached arbitrage data corrupted");
        }
    }

    try {
        const priceContext = ports.slice(0, 10).map(p => `${p.name} (ID: ${p.id}): $${p.priceMethanol}`).join(', ');

        const prompt = `Analyze these Methanol prices: ${priceContext}.
        Identify the largest price spread between two ports. 
        Return a JSON object explaining the arbitrage opportunity. 
        Do not use LaTeX or special escape characters in the narrative string.`;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        originId: { 
                            type: Type.STRING,
                            description: "The ID of the port with lower price."
                        },
                        destinationId: { 
                            type: Type.STRING,
                            description: "The ID of the port with higher price."
                        },
                        spread: { 
                            type: Type.NUMBER,
                            description: "The numerical price difference per MT."
                        },
                        narrative: { 
                            type: Type.STRING,
                            description: "A 2-sentence analysis of the arbitrage opportunity."
                        }
                    },
                    required: ["originId", "destinationId", "spread", "narrative"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");

        const cleanJson = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);

        setCachedData(cacheKey, JSON.stringify(data));
        return data;

    } catch (error) {
        console.error("AI Arbitrage Generation Failed:", error);
        return MOCK_ARBITRAGE_FALLBACK;
    }
};

export const analyzeRisk = async (buyerName: string, profile: RiskProfile) => {
    if (!apiKey) return "AI Risk Assessment unavailable (Missing API Key).";

    const cacheKey = `risk_analysis_${buyerName.replace(/\s/g, '_')}_${profile.creditScore}`;
    const cachedResponse = getCachedData(cacheKey);
    if (cachedResponse) return cachedResponse;

    try {
        const prompt = `Analyze credit risk for "${buyerName}".
        Profile: Score ${profile.creditScore}/100, KYB ${profile.kybStatus}.
        Output a concise 3-sentence risk memo. Use markdown for emphasis.`;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
        });

        const text = response.text || "Unable to generate risk memo.";
        setCachedData(cacheKey, text);
        return text;
    } catch (error) {
        return "Error generating risk memo.";
    }
};

export const fetchLiveMarketData = async (): Promise<MarketWatchItem[] | null> => {
    if (!apiKey) return null;

    const cacheKey = 'live_market_watch_v3'; 
    const cachedResponse = getCachedData(cacheKey);
    if (cachedResponse) {
        try {
            return JSON.parse(cachedResponse);
        } catch (e) {
            // ignore
        }
    }

    try {
        const prompt = `Get the latest market price and today's percentage change for:
        1. VLSFO-Methanol Spread (estimate)
        2. EU Carbon Permits (EUA)
        3. Brent Crude Oil
        4. LNG (Japan/Korea Marker)

        Return a JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            pair: { type: Type.STRING },
                            val: { type: Type.STRING },
                            change: { type: Type.STRING },
                            up: { type: Type.BOOLEAN }
                        },
                        required: ["pair", "val", "change", "up"]
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return null;

        const cleanJson = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);

        if (Array.isArray(data)) {
            setCachedData(cacheKey, JSON.stringify(data));
            return data;
        }
        return null;
    } catch (error) {
        console.warn("Live Market Data Fetch Failed", error);
        return null;
    }
};

export const performWebSearch = async (query: string) => {
    if (!apiKey) return "Search unavailable (Missing API Key).";
    
    const cacheKey = `web_search_${query.replace(/\s/g, '_')}`;
    const cachedResponse = getCachedData(cacheKey);
    if (cachedResponse) return cachedResponse;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Search request: "${query}". Provide a detailed summary of the search results focusing on facts and figures.`,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const text = response.text || "No results found.";
        setCachedData(cacheKey, text);
        return text;
    } catch (error) {
        console.warn("Web search failed:", error);
        return "Error performing web search.";
    }
};
