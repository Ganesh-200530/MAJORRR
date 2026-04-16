export const THEMES = {
  dark: {
    name: 'Dark',
    backgroundStart: '#0B0D0E',
    backgroundEnd: '#0B0D0E',
    primary: '#1A1D20',
    onPrimary: '#f3f4f6',
    surface: '#151719',
    surfaceBorder: 'rgba(255, 255, 255, 0.05)',
    text: '#e5e7eb',
    textSecondary: '#9ca3af',
    accent: '#f87171',
    glassWrapper: {
      backgroundColor: '#151719',
      borderColor: 'rgba(255, 255, 255, 0.05)',
    }
  },
  forest: {
    name: 'Forest',
    backgroundStart: '#0B1A12',
    backgroundEnd: '#0B1A12',
    primary: '#1A2F22',
    onPrimary: '#f3f4f6',
    surface: '#15251C',
    surfaceBorder: 'rgba(255, 255, 255, 0.05)',
    text: '#e5e7eb',
    textSecondary: '#a5b4ac',
    accent: '#f87171',
    glassWrapper: {
      backgroundColor: '#15251C',
      borderColor: 'rgba(255, 255, 255, 0.05)',
    }
  },
  ocean: {
    name: 'Ocean',
    backgroundStart: '#05141A',
    backgroundEnd: '#0A2540',
    primary: '#123A5A',
    onPrimary: '#f3f4f6',
    surface: '#0d284a',
    surfaceBorder: 'rgba(255, 255, 255, 0.05)',
    text: '#e5e7eb',
    textSecondary: '#b0c4de',
    accent: '#f87171',
    glassWrapper: {
      backgroundColor: '#0d284a',
      borderColor: 'rgba(255, 255, 255, 0.05)',
    }
  }
};

export let theme = THEMES.dark;
export const setTheme = (themeName: keyof typeof THEMES) => {
  theme = THEMES[themeName];
};
