// API Configuration
// Use environment variables if available, otherwise use defaults based on hostname
const getApiUrl = () => {
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Otherwise, check hostname in browser
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('onrender.com') 
      ? 'https://tarpai-back.onrender.com'
      : 'http://localhost:3000';
  }
  
  // Default for server-side rendering
  return 'http://localhost:3000';
};

const getWsUrl = () => {
  // If NEXT_PUBLIC_WS_URL is set, use it
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  // Otherwise, check hostname in browser
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('onrender.com') 
      ? 'https://tarpai-back.onrender.com'
      : 'http://localhost:3000';
  }
  
  // Default for server-side rendering
  return 'http://localhost:3000';
};

export const API_CONFIG = {
  API_URL: getApiUrl(),
  WS_URL: getWsUrl(),
};

// Export individual values for convenience
export const API_URL = API_CONFIG.API_URL;
export const WS_URL = API_CONFIG.WS_URL;
