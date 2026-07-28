import { useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const VERSION_URL = '/version.json';

function isTextInputLike(element) {
  if (!element) return false;
  const tagName = element.tagName?.toUpperCase();
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function isNumberInput(element) {
  return element?.tagName?.toUpperCase() === 'INPUT' && element.type === 'number';
}

export function useAppVersionCheck() {
  const loadedVersionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadVersion = async () => {
      try {
        const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!response.ok) {
          return;
        }

        const nextVersion = await response.json();
        if (cancelled) {
          return;
        }

        const version = nextVersion?.version;
        if (!version) {
          return;
        }

        if (!loadedVersionRef.current) {
          loadedVersionRef.current = version;
          return;
        }

        if (version !== loadedVersionRef.current) {
          const activeElement = document.activeElement;
          const shouldSkipReload = isTextInputLike(activeElement) || isNumberInput(activeElement);
          if (shouldSkipReload) {
            return;
          }

          window.location.reload();
        }
      } catch (error) {
        console.warn('Version check failed:', error);
      }
    };

    loadVersion();

    const intervalId = window.setInterval(() => {
      loadVersion();
    }, CHECK_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
