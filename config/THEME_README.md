# Theme Configuration Guide

This document explains how to manage colors and themes across the entire application from a single location.

## 📁 Files to Edit

### 1. **CSS Variables** (Recommended for quick changes)
**File:** `client/app/globals.css`

Edit the CSS variables at the top of the file:

```css
:root {
  /* Light Mode Colors */
  --light-background: #e6e6e6;           /* Main background color in light mode */
  --light-background-overlay: rgba(230, 230, 230, 0.8);  /* Semi-transparent overlay */
  --light-text: #000000;                 /* Primary text color */
  --light-text-secondary: #666666;       /* Secondary text color */
  
  /* Dark Mode Colors */
  --dark-background: #000000;            /* Main background color in dark mode */
  --dark-background-overlay: rgba(0, 0, 0, 0.8);  /* Semi-transparent overlay */
  --dark-text: #ffffff;                  /* Primary text color */
  --dark-text-secondary: #999999;        /* Secondary text color */
  
  /* Background Mode (Custom Image) Colors */
  --background-overlay: rgba(0, 0, 0, 0.4);      /* Overlay on custom backgrounds */
  --background-overlay-blur: rgba(0, 0, 0, 0.3); /* Blur overlay */
}
```

### 2. **TypeScript Configuration** (For programmatic access)
**File:** `client/config/theme.config.ts`

Edit the `THEME_COLORS` object:

```typescript
export const THEME_COLORS = {
  light: {
    background: '#e6e6e6',
    backgroundOverlay: 'rgba(230, 230, 230, 0.8)',
    text: '#000000',
    textSecondary: '#666666',
  },
  dark: {
    background: '#000000',
    backgroundOverlay: 'rgba(0, 0, 0, 0.8)',
    text: '#ffffff',
    textSecondary: '#999999',
  },
  background: {
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayBlur: 'rgba(0, 0, 0, 0.3)',
  },
};
```

## 🎨 How to Change Colors

### Change Light Mode Background
1. Open `client/app/globals.css`
2. Find `--light-background: #e6e6e6;`
3. Change `#e6e6e6` to your desired color (e.g., `#f0f0f0`)
4. Also update `client/config/theme.config.ts` line with `background: '#e6e6e6'`

### Change Dark Mode Background
1. Open `client/app/globals.css`
2. Find `--dark-background: #000000;`
3. Change `#000000` to your desired color (e.g., `#1a1a1a`)
4. Also update `client/config/theme.config.ts` line with `background: '#000000'`

### Change Text Colors
Edit the `--light-text` and `--dark-text` variables in `globals.css`

## 🔧 Using Theme Helpers in Components

Import the helper functions from `theme.config.ts`:

```typescript
import { getBackgroundStyle, getTextColorClass, getOverlayBackgroundStyle } from '@/config/theme.config';

// In your component:
<div 
  className={getTextColorClass(theme)}
  style={getBackgroundStyle(theme, background)}
>
  Your content
</div>
```

## 📋 Current Theme Modes

1. **Light Mode** - Uses `--light-background` (#e6e6e6)
2. **Dark Mode** - Uses `--dark-background` (#000000)
3. **Background Mode** - Uses custom uploaded image with overlay

## 🚀 Quick Color Changes

To change the light mode background from #e6e6e6 to another color:

1. **globals.css**: Change `--light-background: #e6e6e6;` to your color
2. **theme.config.ts**: Change `background: '#e6e6e6'` to your color

That's it! The changes will apply across all pages automatically.

## 📝 Notes

- Keep CSS variables and TypeScript config in sync
- Use hex colors for solid colors: `#e6e6e6`
- Use rgba for transparent colors: `rgba(230, 230, 230, 0.8)`
- Test changes in all three theme modes (light, dark, background)
