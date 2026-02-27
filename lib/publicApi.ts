import axios from 'axios';
import { API_URL } from '@/config/api.config';

// Public API instance for pages that allow unauthenticated access
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available (optional authentication)
publicApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors without redirecting on 401
publicApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suppress aborted request errors during navigation
    if (error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
      return Promise.reject(error);
    }
    
    // Don't redirect on 401 - let the component handle it
    return Promise.reject(error);
  }
);

export default publicApi;
