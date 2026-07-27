export function canRegisterServiceWorker() {
  return import.meta.env.PROD && 'serviceWorker' in navigator;
}

export function clearDevelopmentServiceWorkers() {
  if (
    import.meta.env.PROD ||
    !('serviceWorker' in navigator) ||
    typeof navigator.serviceWorker.getRegistrations !== 'function'
  ) {
    return;
  }

  const clearRegistrations = () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(
          registrations.map((registration) => registration.unregister()),
        ),
      )
      .catch((error: unknown) => {
        console.warn('Development service worker cleanup failed.', error);
      });
  };

  if (document.readyState === 'complete') {
    clearRegistrations();
    return;
  }

  window.addEventListener('load', clearRegistrations, { once: true });
}

export function registerServiceWorker() {
  clearDevelopmentServiceWorkers();

  if (!canRegisterServiceWorker()) {
    return;
  }

  const register = () => {
    void navigator.serviceWorker
      .register('/sw.js', {
        scope: '/',
        type: 'classic',
      })
      .catch((error: unknown) => {
        console.warn('Service worker registration failed.', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }

  window.addEventListener('load', register, { once: true });
}
