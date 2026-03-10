import { useState } from 'react';
import { getColorForLetter } from '@/utils/avatarColors';

interface LinkIconProps {
  url: string;
  title: string;
}

export default function LinkIcon({ url, title }: LinkIconProps) {
  const [showLetter, setShowLetter] = useState(false);
  const [triedDirect, setTriedDirect] = useState(false);
  const [triedGoogle, setTriedGoogle] = useState(false);
  
  let hostname = '';
  let fullUrl = '';
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
    fullUrl = urlObj.origin;
  } catch (e) {
    hostname = 'example.com';
    fullUrl = url;
  }
  
  const firstLetter = title.charAt(0).toUpperCase();
  const letterColor = getColorForLetter(firstLetter);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    
    // If we're loading from Google and the image is very small (20x20 or less),
    // it's likely the default globe icon or a generic placeholder
    if (triedGoogle && img.naturalWidth <= 20 && img.naturalHeight <= 20) {
      setShowLetter(true);
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    
    if (!triedDirect) {
      // First error: we tried direct, now try Google
      setTriedDirect(true);
      setTriedGoogle(true);
      target.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
    } else {
      // Second error: Google also failed, show letter
      setShowLetter(true);
    }
  };

  if (showLetter) {
    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${letterColor.bg}`}>
        <span className={`text-lg font-bold ${letterColor.text}`}>
          {firstLetter}
        </span>
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100">
      <img 
        src={`${fullUrl}/favicon.ico`}
        alt={title}
        className="w-6 h-6 object-contain"
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
