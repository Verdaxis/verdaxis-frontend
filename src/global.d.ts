declare global {
    interface Window {
        /** Stamped at build time in index.tsx; used for cache-busting checks. */
        __BUILD_VERSION__: string;
    }
}

export {};
