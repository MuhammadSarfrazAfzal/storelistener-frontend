/**
 * Centralized Storelistener API configuration
 * Resolves production backend URL from Vite environment variables
 */
const rawEnvUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

// Enforce active Render backend if the environment variable is empty, undefined,
// or still contains the deprecated/dead Vercel backend URL.
let targetUrl = rawEnvUrl;
if (!targetUrl || targetUrl.includes('storelistener-backend.vercel.app')) {
  targetUrl = 'https://storelistener.onrender.com';
}

export const API_BASE_URL = targetUrl.replace(/\/$/, '');
export const BACKEND_URL = API_BASE_URL;

/**
 * Standardized Socket.IO client options
 */
export const DEFAULT_SOCKET_OPTIONS = {
  path: '/socket.io/',
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
  timeout: 10000,
};

export default API_BASE_URL;
