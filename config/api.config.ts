// API Configuration
// Check if we're in browser and on production domain
const isProduction = typeof window !== 'undefined' 
  ? window.location.hostname.includes('onrender.com')
  : process.env.NODE_ENV === 'production';

export const API_CONFIG = {
  // API Base URL
  API_URL: isProduction
    ? 'https://tarpai-back.onrender.com'
    : 'http://localhost:3000',
  
  // WebSocket URL
  WS_URL: isProduction
    ? 'https://tarpai-back.onrender.com'
    : 'http://localhost:3000',
};

// Export individual values for convenience
export const API_URL = API_CONFIG.API_URL;
export const WS_URL = API_CONFIG.WS_URL;
