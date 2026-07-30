import { useEffect, useState } from 'react';
import { adsConfig, type AdsConfig, type AdsSlotKey } from './ads-config.js';

export type AdsEligibilityOptions = {
  isDesktop?: boolean;
  slot: AdsSlotKey;
  suppress?: boolean;
};

export function shouldShowAds(
  config: AdsConfig,
  { isDesktop, slot, suppress = false }: AdsEligibilityOptions,
) {
  if (suppress || !config.enabled || !config.clientId) {
    return false;
  }

  if (!config.slots[slot]?.id) {
    return false;
  }

  if (slot === 'desktopSidebar' && isDesktop === false) {
    return false;
  }

  return true;
}

function getInitialMediaQueryMatch(query: string) {
  return typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getInitialMediaQueryMatch(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();
    mediaQuery.addEventListener('change', updateMatches);

    return () => mediaQuery.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

export function useAdsEligibility({
  slot,
  suppress,
}: Pick<AdsEligibilityOptions, 'slot' | 'suppress'>) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return shouldShowAds(adsConfig, {
    isDesktop,
    slot,
    suppress,
  });
}
