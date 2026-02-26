import { useThemeStore } from '@/store/themeStore';

export const useTheme = () => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const isBackground = theme === 'background';

  return {
    theme,
    isDark,
    isBackground,
    // Background colors
    bg: {
      primary: isDark ? 'bg-black' : 'bg-white',
      secondary: isDark ? 'bg-gray-900' : 'bg-gray-50',
      card: isDark ? 'bg-black/40' : 'bg-white',
      cardHover: isDark ? 'hover:bg-black/60' : 'hover:bg-gray-50',
      modal: isDark ? 'bg-black/80' : 'bg-white',
      overlay: isDark ? 'bg-black/30' : 'bg-white/90',
      input: isDark ? 'bg-black/40' : 'bg-gray-100',
      button: isDark ? 'bg-white/10' : 'bg-gray-200',
      buttonHover: isDark ? 'hover:bg-white/20' : 'hover:bg-gray-300',
    },
    // Text colors
    text: {
      primary: isDark ? 'text-white' : 'text-black',
      secondary: isDark ? 'text-gray-400' : 'text-gray-600',
      tertiary: isDark ? 'text-gray-500' : 'text-gray-500',
      inverse: isDark ? 'text-black' : 'text-white',
    },
    // Border colors
    border: {
      primary: isDark ? 'border-white/10' : 'border-gray-200',
      secondary: isDark ? 'border-white/20' : 'border-gray-300',
      focus: 'border-blue-500',
    },
    // Spinner
    spinner: isDark ? 'border-white' : 'border-black',
  };
};
