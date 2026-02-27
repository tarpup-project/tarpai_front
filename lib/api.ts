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
      // Check if we're on a profile page - don't redirect, let the component handle it
      const currentPath = window.location.pathname;
      const isProfilePage = currentPath.startsWith('/profile/') || 
                           (currentPath.match(/^\/[^\/]+$/) && 
                            currentPath !== '/' && 
                            currentPath !== '/login' && 
                            currentPath !== '/signup' &&
                            currentPath !== '/dashboard' &&
                            currentPath !== '/chats' &&
                            currentPath !== '/status' &&
                            currentPath !== '/appearance');
      
      console.log('401 Interceptor - currentPath:', currentPath);
      console.log('401 Interceptor - isProfilePage:', isProfilePage);
      
      // Always clear the token and user data on 401
      localStorage.removeItem('token');
      useAuthStore.getState().logout();
      
      if (!isProfilePage) {
        console.log('401 Interceptor - Redirecting to /login');
        window.location.href = '/login';
      } else {
        console.log('401 Interceptor - On profile page, not redirecting');
      }
    }
    return Promise.reject(error);
  }
);

export default api;