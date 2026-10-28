import React, { lazy } from 'react';

const CHUNK_RELOAD_FLAG = 'verdaxis_chunk_reloaded';

// After a deploy, bookmarked deep links can reference stale chunk URLs;
// reload once to pick up the new manifest instead of stranding the user
// on the ErrorBoundary. The sessionStorage flag guards against loops.
export function retryImport<T>(load: () => Promise<T>): Promise<T> {
  return load().then((module) => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    return module;
  }).catch((error: unknown) => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(CHUNK_RELOAD_FLAG) !== 'true') {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, 'true');
      window.location.reload();
      return new Promise<T>(() => {});
    }
    throw error;
  });
}

export function lazyWithRetry<P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>) {
  return lazy(() => retryImport(load));
}
