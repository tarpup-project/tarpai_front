// API Configuration
const isDevelopment = process.env.NODE_ENV === 'development';

export const API_CONFIG = {
  // API Base URL
  API_URL: isDevelopment 
    ? 'http://localhost:3000' 
    : process.env.NEXT_PUBLIC_API_URL || 'https://your-backend-app.onrender.com',
  
  // WebSocket URL
  WS_URL: isDevelopment 
    ? 'http://localhost:3000' 
    : process.env.NEXT_PUBLIC_WS_URL || 'https://your-backend-app.onrender.com',
};

// Export individual values for convenience
export const API_URL = API_CONFIG.API_URL;
export const WS_URL = API_CONFIG.WS_URL;
