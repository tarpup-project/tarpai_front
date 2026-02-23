// API Configuration
// Use environment variables if available, otherwise detect based on hostname
const getApiUrl = () => {
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Check if we're in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If on localhost or 127.0.0.1, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // If on production domain, use production backend
    if (hostname.includes('onrender.com')) {
      return 'https://tarpai-back.onrender.com';
    }
  }
  
  // Default for server-side rendering
  return 'http://localhost:3000';
};

const getWsUrl = () => {
  // If NEXT_PUBLIC_WS_URL is set, use it
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  
  // Check if we're in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If on localhost or 127.0.0.1, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    // If on production domain, use production backend
    if (hostname.includes('onrender.com')) {
      return 'https://tarpai-back.onrender.com';
    }
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

// Log the configuration in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    hostname: window.location.hostname,
    API_URL: API_CONFIG.API_URL,
    WS_URL: API_CONFIG.WS_URL,
  });
}
