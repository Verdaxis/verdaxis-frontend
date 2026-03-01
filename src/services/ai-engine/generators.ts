import { Port, RiskProfile, MarketWatchItem } from "../../types";
import { getCachedData, setCachedData } from "./cache";
import { API_URL } from "../config";

// All AI generation now goes through the backend proxy.
// These functions provide mock fallback data for immediate UI rendering.

const MOCK_ARBITRAGE_FALLBACK = {
    originId: 'sg-sin',
    destinationId: 'nl-rtm',
    spread: 25.50,
    narrative: "Strong arbitrage opportunity detected. **Singapore** supply glut has widened the spread against **Rotterdam**, creating a profitable window for spot methanol cargoes."
};

const MOCK_NARRATIVE_FALLBACK = (portName: string) =>
    `Market activity in **${portName}** is elevated due to seasonal restocking. Spot prices are stabilizing as local inventories reach healthy levels.`;

const MOCK_MARKET_DATA: MarketWatchItem[] = [
    { pair: 'VLSFO-Methanol Spread', val: '$142.50', change: '+2.3%', up: true },
    { pair: 'EUA Carbon', val: '€68.40', change: '-0.8%', up: false },
    { pair: 'Brent Crude', val: '$74.85', change: '+0.5%', up: true },
    { pair: 'LNG (RTM)', val: '$12.60', change: '+1.1%', up: true },
];

// Helper for backend AI proxy calls
const callAiProxy = async (message: string): Promise<string | null> => {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
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

export const generateMarketNarrative = async (port: Port) => {
    const cacheKey = `market_narrative_${port.id}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const prompt = `Generate a 2-sentence financial market narrative for ${port.name}. Context: Methanol supply is ${port.methanolSupply}, Price is $${port.priceMethanol}/mt with a trend of ${port.priceTrend}%. Use markdown for emphasis.`;
    const result = await callAiProxy(prompt);
    
    if (result) {
        setCachedData(cacheKey, result);
        return result;
    }
    return MOCK_NARRATIVE_FALLBACK(port.name);
};

export const generateArbitrageInsight = async (ports: Port[]) => {
    const cacheKey = 'global_arbitrage_insight_v7';
    const cached = getCachedData(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* ignore */ }
    }

    const priceContext = ports.slice(0, 10).map(p => `${p.name} (ID: ${p.id}): $${p.priceMethanol}`).join(', ');
    const prompt = `Analyze these Methanol prices: ${priceContext}. Identify the largest price spread. Return JSON: {"originId": "...", "destinationId": "...", "spread": number, "narrative": "2 sentences"}`;
    const result = await callAiProxy(prompt);

    if (result) {
        try {
            const cleanJson = result.replace(/```json|```/g, '').trim();
            const jsonMatch = cleanJson.match(/\{.*\}/s);
            const data = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
            setCachedData(cacheKey, JSON.stringify(data));
            return data;
        } catch { /* fall through */ }
    }
    return MOCK_ARBITRAGE_FALLBACK;
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

export interface MarketDataResult {
    items: MarketWatchItem[];
    isDemo: boolean;
}

export const fetchLiveMarketData = async (): Promise<MarketDataResult | null> => {
    // Market data uses demo data with AI enrichment when available
    return { items: MOCK_MARKET_DATA, isDemo: true };
};

export const performWebSearch = async (query: string) => {
    const cacheKey = `web_search_${query.replace(/\s/g, '_')}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const result = await callAiProxy(`Search request: "${query}". Provide a detailed summary focusing on facts and figures.`);
    if (result) {
        setCachedData(cacheKey, result);
        return result;
    }
    return "Search temporarily unavailable.";
};
