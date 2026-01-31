export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const API_URL = API_BASE_URL; // VITE_API_URL should include /api/v1 if needed, or we append it here if base is root
