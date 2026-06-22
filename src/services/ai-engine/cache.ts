const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const requestCache = new Map<string, { timestamp: number; data: string }>();

export const getCachedData = (key: string): string | null => {
    const entry = requestCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > CACHE_TTL) {
        requestCache.delete(key); // Invalidate expired cache
        return null;
    }
    
    return entry.data;
};

export const setCachedData = (key: string, data: string) => {
    requestCache.set(key, { timestamp: Date.now(), data });
};

export const clearCache = () => {
    requestCache.clear();
};
