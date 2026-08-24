'use client';

import { useState, useEffect } from 'react';

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);

    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const standalone = isDisplayStandalone || isIosStandalone;
      
      setIsStandalone(standalone);

      if (standalone) {
        document.documentElement.classList.add('is-standalone', 'is-pwa');
      } else {
        document.documentElement.classList.remove('is-standalone', 'is-pwa');
      }
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkStandalone();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(handleChange);
    }

    // Register Service Worker in production/modern browsers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if ((mediaQuery as any).removeListener) {
        (mediaQuery as any).removeListener(handleChange);
      }
    };
  }, []);

  return { isStandalone, isMounted };
}
