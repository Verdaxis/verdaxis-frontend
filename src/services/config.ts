const configuredUrl = import.meta.env.VITE_API_URL?.trim();
if (!configuredUrl && !import.meta.env.DEV) {
  throw new Error('VITE_API_URL is required for release builds');
}

export const API_BASE_URL = configuredUrl || '/api';

export const API_URL = API_BASE_URL;
