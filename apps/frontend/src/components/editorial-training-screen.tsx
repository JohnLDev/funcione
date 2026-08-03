import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  LibraryBig,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PreFooterAd } from '@/ads/ad-placements.js';
import { Button } from './ui/button.js';
import { ProductLogo } from './product-logo.js';
import { PublicFooter } from './public-footer.js';
import { SettingsMenu } from './settings-menu.js';

const sections = ['personalization', 'routine', 'safety', 'consistency'] as const;
const highlights = ['frequency', 'equipment', 'recovery'] as const;

const highlightIcons = {
  equipment: Dumbbell,
  frequency: Timer,
  recovery: ShieldCheck,
} as const;

const publicContentLinks = [
  { labelKey: 'about', to: '/sobre' },
  { labelKey: 'routine', to: '/guias/rotina-de-treino-personalizada' },
  { labelKey: 'location', to: '/guias/treino-em-casa-academia-quadra' },
  { labelKey: 'safety', to: '/guias/seguranca-recuperacao-lesoes' },
  { labelKey: 'faq', to: '/perguntas-frequentes' },
] as const;

export function EditorialTrainingScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh overflow-x-hidden px-4 py-4 sm:px-6 md:px-8">
      <main className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between gap-3">
          <Link
            aria-label={t('brand.logoAlt')}
            className="flex min-w-0 items-center gap-3"
            to="/treino-personalizado"
          >
            <ProductLogo className="h-12 w-28" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">{t('brand.byline')}</p>
              <p className="truncate text-2xl font-black leading-none">
                {t('brand.name')}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <SettingsMenu />
            <Button asChild className="hidden sm:inline-flex" variant="outline">
              <Link to="/login">{t('editorialTraining.signIn')}</Link>
            </Button>
          </div>
        </header>

        <article className="mt-8 grid gap-8">
          <section className="grid gap-5">
            <p className="text-sm font-bold text-primary">
              {t('editorialTraining.eyebrow')}
            </p>
            <div className="grid gap-4 md:max-w-3xl">
              <h1 className="text-4xl font-black leading-tight text-foreground sm:text-5xl">
                {t('editorialTraining.title')}
              </h1>
              <p className="text-base font-semibold leading-8 text-muted-foreground sm:text-lg">
                {t('editorialTraining.subtitle')}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="w-full sm:w-fit">
                <Link to="/login">
                  {t('editorialTraining.primaryCta')}
                  <ArrowRight aria-hidden size={18} />
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-fit" variant="outline">
                <Link to="/privacy">{t('footer.privacy')}</Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {highlights.map((highlight) => {
              const Icon = highlightIcons[highlight];

              return (
                <div
                  className="min-w-0 rounded-2xl border border-border bg-card/78 p-4"
                  key={highlight}
                >
                  <Icon aria-hidden className="text-primary" size={22} />
                  <h2 className="mt-3 text-lg font-black leading-tight">
                    {t(`editorialTraining.highlights.${highlight}.title`)}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                    {t(`editorialTraining.highlights.${highlight}.body`)}
                  </p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-5 rounded-[2rem] border border-primary/20 bg-card/86 p-5 sm:p-6">
            {sections.map((section) => (
              <div className="grid gap-2" key={section}>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    aria-hidden
                    className="mt-1 shrink-0 text-primary"
                    size={19}
                  />
                  <div className="min-w-0">
                    <h2 className="text-xl font-black leading-tight text-foreground">
                      {t(`editorialTraining.sections.${section}.title`)}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-7 text-muted-foreground sm:text-base">
                      {t(`editorialTraining.sections.${section}.body`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-3 border-t border-border/70 pt-6">
            <h2 className="text-2xl font-black leading-tight text-foreground">
              {t('editorialTraining.reviewTitle')}
            </h2>
            <p className="text-sm font-semibold leading-7 text-muted-foreground sm:text-base">
              {t('editorialTraining.reviewBody')}
            </p>
          </section>

          <section className="grid gap-4 border-t border-border/70 pt-6">
            <div className="grid gap-2 md:max-w-3xl">
              <h2 className="text-2xl font-black leading-tight text-foreground">
                {t('publicContent.readMoreTitle')}
              </h2>
              <p className="text-sm font-semibold leading-7 text-muted-foreground sm:text-base">
                {t('publicContent.readMoreBody')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {publicContentLinks.map((link) => (
                <Link
                  className="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card/78 p-4 text-sm font-black text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={link.to}
                  to={link.to}
                >
                  <LibraryBig
                    aria-hidden
                    className="shrink-0 text-primary"
                    size={20}
                  />
                  <span className="min-w-0">
                    {t(`publicContent.links.${link.labelKey}`)}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <PreFooterAd />
        </article>

        <PublicFooter />
      </main>
    </div>
  );
}
