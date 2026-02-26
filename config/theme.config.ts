// Global theme configuration
// Centralized color management for the entire application

export const THEME_COLORS = {
  // Light mode colors
  light: {
    background: '#e6e6e6',
    backgroundOverlay: 'rgba(230, 230, 230, 0.8)',
    text: '#000000',
    textSecondary: '#666666',
  },
  
  // Dark mode colors
  dark: {
    background: '#000000',
    backgroundOverlay: 'rgba(0, 0, 0, 0.8)',
    text: '#ffffff',
    textSecondary: '#999999',
  },
  
  // Background mode (custom image with overlay)
  background: {
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayBlur: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

// Helper function to get background style based on theme
export const getBackgroundStyle = (
  theme: 'light' | 'dark' | 'background',
  customBackground?: string
) => {
  if (theme === 'dark') {
    return {
      background: THEME_COLORS.dark.background,
    };
  }
  
  if (theme === 'light') {
    return {
      background: THEME_COLORS.light.background,
    };
  }
  
  // Background mode with custom image
  return {
    background: customBackground
      ? `linear-gradient(${THEME_COLORS.background.overlay}, ${THEME_COLORS.background.overlay}), url(${customBackground})`
      : 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed',
  };
};

// Helper function to get text color class based on theme
export const getTextColorClass = (theme: 'light' | 'dark' | 'background') => {
  return theme === 'dark' ? 'text-white' : 'text-black';
};

// Helper function to get overlay background style for headers/modals
export const getOverlayBackgroundStyle = (theme: 'light' | 'dark' | 'background') => {
  if (theme === 'dark') {
    return {
      backgroundColor: THEME_COLORS.dark.backgroundOverlay,
    };
  }
  
  if (theme === 'light') {
    return {
      backgroundColor: THEME_COLORS.light.backgroundOverlay,
    };
  }
  
  return {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  };
};
