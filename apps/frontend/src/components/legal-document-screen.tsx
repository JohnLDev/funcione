import { ArrowLeft, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '@/auth/use-auth.js';
import {
  getLegalDocument,
  type LegalDocumentType,
} from '@/legal/legal-documents.js';
import { Button } from './ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { ProductLogo } from './product-logo.js';
import { SettingsMenu } from './settings-menu.js';

function LegalMarkdown({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="grid gap-5 text-sm leading-7 text-muted-foreground sm:text-base">
      {blocks.map((block) => {
        if (block.startsWith('## ')) {
          return (
            <h2
              className="pt-2 text-xl font-black leading-tight text-foreground"
              key={block}
            >
              {block.replace(/^##\s+/, '')}
            </h2>
          );
        }

        if (block.startsWith('- ')) {
          return (
            <ul className="grid gap-2 pl-5" key={block}>
              {block.split('\n').map((item) => (
                <li className="list-disc" key={item}>
                  {item.replace(/^-\s+/, '')}
                </li>
              ))}
            </ul>
          );
        }

        return <p key={block}>{block}</p>;
      })}
    </div>
  );
}

export function LegalDocumentScreen({
  documentType,
}: {
  documentType: LegalDocumentType;
}) {
  const { i18n, t } = useTranslation();
  const { profileState, session } = useAuth();
  const document = getLegalDocument(documentType, i18n.resolvedLanguage);
  const backTo = session
    ? profileState?.completed
      ? '/dashboard'
      : '/complete-profile'
    : '/login';
  const backLabel = session ? t('legal.backToApp') : t('legal.backToLogin');

  return (
    <div className="min-h-dvh overflow-x-hidden px-4 py-4 sm:px-6 md:px-8">
      <main className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col">
        <header className="flex items-center justify-between gap-3">
          <Link
            aria-label={t('brand.logoAlt')}
            className="flex min-w-0 items-center gap-3"
            to={backTo}
          >
            <ProductLogo className="h-12 w-28" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">{t('brand.byline')}</p>
              <p className="truncate text-2xl font-black leading-none">
                {t('brand.name')}
              </p>
            </div>
          </Link>
          <SettingsMenu />
        </header>

        <Card className="mt-6 rounded-[2rem] border-primary/25 bg-card/92 shadow-xl backdrop-blur-sm">
          <CardHeader className="gap-4 p-5 sm:p-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FileText aria-hidden="true" size={22} />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-bold text-primary">{document.updatedAt}</p>
              <CardTitle className="text-3xl font-black leading-tight sm:text-4xl">
                {document.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 p-5 pt-0 sm:p-6 sm:pt-0">
            <LegalMarkdown body={document.body} />
            <Button asChild className="w-full sm:w-fit" variant="outline">
              <Link to={backTo}>
                <ArrowLeft aria-hidden="true" size={18} />
                {backLabel}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <footer
          aria-label={t('footer.label')}
          className="mt-8 flex flex-col gap-3 border-t border-border/70 pb-1 pt-4 text-xs font-bold text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
          role="contentinfo"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to="/terms"
            >
              {t('footer.terms')}
            </Link>
            <Link
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to="/privacy"
            >
              {t('footer.privacy')}
            </Link>
            <Link
              className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to="/treino-personalizado"
            >
              {t('footer.trainingGuide')}
            </Link>
          </div>
          <img
            alt={t('brand.milexLogoAlt')}
            className="h-8 w-fit object-contain brightness-75 contrast-125 drop-shadow-[0_14px_30px_rgba(0,89,255,0.2)] dark:brightness-100 dark:contrast-100"
            src="/brand/milex-logo-transparent.png"
          />
        </footer>
      </main>
    </div>
  );
}
