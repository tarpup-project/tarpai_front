import axios from 'axios';
import { API_URL } from '@/config/api.config';
import { useAuthStore } from '@/store/authStore';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suppress aborted request errors during navigation
    if (error.code === 'ERR_CANCELED' || error.name === 'AbortError') {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      // Check if user has a token
      const hasToken = !!localStorage.getItem('token');
      
      if (hasToken) {
        // Token exists but is invalid - clear it and redirect
        localStorage.removeItem('token');
        useAuthStore.getState().logout();
      }
      
      // Always redirect to login on 401
      // Profile pages should use publicApi instead of this api instance
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;