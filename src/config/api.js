/**
 * Centralized Storelistener API configuration
 * Resolves production backend URL from Vite environment variables
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://storelisnter-backend-main.vercel.app').replace(/\/$/, '');
export const BACKEND_URL = API_BASE_URL;

export default API_BASE_URL;
