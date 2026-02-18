import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Background {
  _id: string;
  url: string;
  thumbnail?: string;
  name: string;
  isActive: boolean;
  type: 'admin' | 'user';
}

export function useBackground() {
  const [background, setBackground] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchBackground = async () => {
      try {
        // Check if user has a selected background in localStorage
        const selectedBg = localStorage.getItem('selectedBackground');
        
        if (selectedBg) {
          // Use the selected background
          if (isMounted) {
            setBackground(selectedBg);
            setLoading(false);
          }
          return;
        }

        // Otherwise, fetch from API and use the first one
        const response = await api.get('/appearance/backgrounds', {
          timeout: 5000, // 5 second timeout
        });
        
        if (isMounted) {
          const backgrounds = response.data.backgrounds;
          if (backgrounds && backgrounds.length > 0) {
            // Use thumbnail if available for faster loading, otherwise use main URL
            setBackground(backgrounds[0].thumbnail || backgrounds[0].url);
          }
        }
      } catch (error) {
        console.error('Failed to fetch background:', error);
        // Set a default dark background on error
        if (isMounted) {
          setBackground('');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBackground();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  return { background, loading };
}
