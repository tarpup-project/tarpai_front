// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  // API Base URL
  API_URL: isDevelopment 
    ? 'http://localhost:3000' 
    : 'https://tarpai-back.onrender.com',
  
  // WebSocket URL
  WS_URL: isDevelopment 
    ? 'http://localhost:3000' 
    : 'https://tarpai-back.onrender.com',
};

// Export individual values for convenience
export const API_URL = API_CONFIG.API_URL;
export const WS_URL = API_CONFIG.WS_URL;
