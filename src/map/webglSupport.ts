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
