import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/lib/utils.js';

const footerLinks = [
  { labelKey: 'footer.about', to: '/sobre' },
  { labelKey: 'footer.faq', to: '/perguntas-frequentes' },
  { labelKey: 'footer.trainingGuide', to: '/treino-personalizado' },
  { labelKey: 'footer.terms', to: '/terms' },
  { labelKey: 'footer.privacy', to: '/privacy' },
] as const;

export function PublicFooter({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <footer
      aria-label={t('footer.label')}
      className={cn(
        'mt-8 flex flex-col gap-3 border-t border-border/70 pb-1 pt-4 text-xs font-bold text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      role="contentinfo"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {footerLinks.map((link) => (
          <Link
            className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={link.to}
            to={link.to}
          >
            {t(link.labelKey)}
          </Link>
        ))}
      </div>
      <img
        alt={t('brand.milexLogoAlt')}
        className="h-8 w-fit object-contain brightness-75 contrast-125 drop-shadow-[0_14px_30px_rgba(0,89,255,0.2)] dark:brightness-100 dark:contrast-100"
        data-testid="footer-milex-logo"
        src="/brand/milex-logo-transparent.png"
      />
    </footer>
  );
}
