const envUrl = import.meta.env.VITE_API_URL || '/api';
// Ensure we always have /api at the end, handling cases where the env var misses it
export const API_BASE_URL = envUrl.endsWith('/api') 
  ? envUrl 
  : `${envUrl.replace(/\/+$/, '')}/api`;
export const API_URL = API_BASE_URL;
