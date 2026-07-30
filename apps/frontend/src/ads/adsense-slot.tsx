import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.js';
import { adsConfig, type AdsSlotKey } from './ads-config.js';
import { useAdsEligibility } from './use-ads-eligibility.js';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export type AdSenseSlotProps = {
  className?: string;
  slot: AdsSlotKey;
  suppress?: boolean;
};

const minHeightBySlot: Record<AdsSlotKey, string> = {
  desktopSidebar: 'min-h-64',
  preFooter: 'min-h-32 sm:min-h-36',
  trainingPreparation: 'min-h-32',
};

export function AdSenseSlot({
  className,
  slot,
  suppress,
}: AdSenseSlotProps) {
  const { t } = useTranslation();
  const slotConfig = adsConfig.slots[slot];
  const shouldRender = useAdsEligibility({ slot, suppress });
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const ins = insRef.current;

    if (!shouldRender || adsConfig.testMode || !ins) {
      return;
    }

    if (ins.dataset.adsensePushed === 'true') {
      return;
    }

    ins.dataset.adsensePushed = 'true';
    window.adsbygoogle = window.adsbygoogle ?? [];
    window.adsbygoogle.push({});
  }, [shouldRender, slotConfig.id]);

  if (!shouldRender) {
    return null;
  }

  const sharedProps = {
    'aria-label': t('ads.label'),
    'data-ad-client': adsConfig.clientId,
    'data-ad-slot': slotConfig.id,
    'data-testid': slotConfig.testId,
  };

  if (adsConfig.testMode) {
    return (
      <div
        {...sharedProps}
        className={cn(
          'grid place-items-center rounded-2xl border border-dashed border-border bg-secondary/60 p-3 text-xs font-bold text-muted-foreground',
          minHeightBySlot[slot],
          className,
        )}
      >
        {t('ads.label')}
      </div>
    );
  }

  return (
    <ins
      {...sharedProps}
      className={cn(
        'adsbygoogle block min-w-0',
        minHeightBySlot[slot],
        className,
      )}
      data-ad-format={slotConfig.format}
      data-full-width-responsive={
        slotConfig.fullWidthResponsive ? 'true' : undefined
      }
      ref={insRef}
      style={{ display: 'block' }}
    />
  );
}
