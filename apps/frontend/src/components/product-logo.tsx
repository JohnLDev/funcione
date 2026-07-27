import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils.js';

export function ProductLogo({
  className,
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <img
      alt={decorative ? '' : t('brand.logoAlt')}
      aria-hidden={decorative ? 'true' : undefined}
      className={cn(
        'shrink-0 object-contain brightness-75 drop-shadow-[0_18px_42px_rgba(0,89,255,0.26)] dark:brightness-100',
        className,
      )}
      src="/brand/funcione-logo-transparent.png"
    />
  );
}
