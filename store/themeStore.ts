import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'background' | 'light' | 'dark';
  setTheme: (theme: 'background' | 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'background',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'dark' ? 'light' : state.theme === 'light' ? 'background' : 'dark'
      })),
    }),
    {
      name: 'theme-storage',
    }
  )
);
