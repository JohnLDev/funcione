import { useEffect } from 'react';
import { adsConfig } from './ads-config.js';

export const adsenseScriptElementId = 'google-adsense-script';

export function getAdSenseScriptSrc(clientId: string) {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
}

export function AdSenseScript() {
  useEffect(() => {
    if (!adsConfig.enabled || !adsConfig.clientId || adsConfig.testMode) {
      return;
    }

    if (document.getElementById(adsenseScriptElementId)) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.id = adsenseScriptElementId;
    script.src = getAdSenseScriptSrc(adsConfig.clientId);
    document.head.append(script);
  }, []);

  return null;
}
