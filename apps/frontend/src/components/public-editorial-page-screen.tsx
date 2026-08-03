import { ArrowRight, CheckCircle2, LibraryBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PreFooterAd } from '@/ads/ad-placements.js';
import {
  getPublicEditorialPage,
  type PublicEditorialPageId,
} from '@/content/public-editorial-pages.js';
import { Button } from './ui/button.js';
import { ProductLogo } from './product-logo.js';
import { PublicFooter } from './public-footer.js';
import { SettingsMenu } from './settings-menu.js';

export function PublicEditorialPageScreen({
  pageId,
}: {
  pageId: PublicEditorialPageId;
}) {
  const { i18n, t } = useTranslation();
  const page = getPublicEditorialPage(pageId, i18n.resolvedLanguage);

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
            <p className="text-sm font-bold text-primary">{page.eyebrow}</p>
            <div className="grid gap-4 md:max-w-3xl">
              <h1 className="text-4xl font-black leading-tight text-foreground sm:text-5xl">
                {page.title}
              </h1>
              <p className="text-base font-semibold leading-8 text-muted-foreground sm:text-lg">
                {page.subtitle}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="w-full sm:w-fit">
                <Link to="/login">
                  {page.primaryCtaLabel}
                  <ArrowRight aria-hidden size={18} />
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-fit" variant="outline">
                <Link to="/treino-personalizado">{t('footer.trainingGuide')}</Link>
              </Button>
            </div>
          </section>

          <div className="grid gap-6" data-testid="public-editorial-content">
            {page.sections.map((section) => (
              <section
                className="grid gap-3 border-t border-border/70 pt-6"
                key={section.title}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    aria-hidden
                    className="mt-1 shrink-0 text-primary"
                    size={19}
                  />
                  <div className="min-w-0">
                    <h2 className="text-2xl font-black leading-tight text-foreground">
                      {section.title}
                    </h2>
                    <div className="mt-3 grid gap-3 text-sm font-semibold leading-7 text-muted-foreground sm:text-base">
                      {section.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                      {section.bullets ? (
                        <ul className="grid gap-2 pl-5">
                          {section.bullets.map((bullet) => (
                            <li className="list-disc" key={bullet}>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            <section className="grid gap-3 border-t border-border/70 pt-6">
              <h2 className="text-2xl font-black leading-tight text-foreground">
                {t('publicContent.relatedTitle')}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {page.relatedLinks.map((link) => (
                  <Link
                    className="flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card/78 p-4 text-sm font-black text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    key={`${link.path}-${link.label}`}
                    to={link.path}
                  >
                    <LibraryBig
                      aria-hidden
                      className="shrink-0 text-primary"
                      size={20}
                    />
                    <span className="min-w-0">{link.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <PreFooterAd />
        </article>

        <PublicFooter />
      </main>
    </div>
  );
}
