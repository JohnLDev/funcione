import { AdSenseSlot } from './adsense-slot.js';

export function PreFooterAd({ suppress = false }: { suppress?: boolean }) {
  return (
    <div className="mt-4">
      <AdSenseSlot slot="preFooter" suppress={suppress} />
    </div>
  );
}

export function DesktopSidebarAd({ suppress = false }: { suppress?: boolean }) {
  return (
    <AdSenseSlot
      className="hidden lg:grid"
      slot="desktopSidebar"
      suppress={suppress}
    />
  );
}
