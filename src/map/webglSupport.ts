/**
 * Mapbox GL draws only with WebGL2. When the browser cannot create a WebGL
 * context (hardware acceleration off, the GPU disabled after crashes, or a
 * remote desktop without a GPU), the Map constructor throws
 * "Failed to initialize WebGL". That is a browser setting the user can fix,
 * not an application fault, so the map shows the fix instead of the generic
 * error screen. Any other error keeps reaching the error boundary.
 */
export function isWebGLUnavailableError(error: unknown): boolean {
    return error instanceof Error && /webgl/i.test(error.message);
}

/** The browsers whose graphics settings the map's help names. */
export type BrowserFamily = 'chrome' | 'edge' | 'firefox' | 'safari' | 'other';

/**
 * The browser family from a user-agent string, for choosing which settings
 * path to show. Edge and Opera carry "Chrome/" too, so they are checked first.
 */
export function browserFamily(userAgent: string): BrowserFamily {
    if (/\bEdg(e|A|iOS)?\//.test(userAgent)) return 'edge';
    if (/\b(OPR|Opera)\//.test(userAgent)) return 'other';
    if (/\b(Firefox|FxiOS)\//.test(userAgent)) return 'firefox';
    if (/\b(Chrome|CriOS|Chromium)\//.test(userAgent)) return 'chrome';
    if (/\bSafari\//.test(userAgent) && /\bVersion\//.test(userAgent)) return 'safari';
    return 'other';
}
