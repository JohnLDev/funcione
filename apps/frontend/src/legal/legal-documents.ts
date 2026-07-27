import privacyEnUS from './documents/en-US/privacy.md?raw';
import termsEnUS from './documents/en-US/terms.md?raw';
import privacyPtBR from './documents/pt-BR/privacy.md?raw';
import termsPtBR from './documents/pt-BR/terms.md?raw';

export type LegalDocumentType = 'privacy' | 'terms';
export type LegalLanguage = 'en-US' | 'pt-BR';

export type LegalDocument = {
  body: string;
  title: string;
  updatedAt: string;
};

const documents: Record<LegalLanguage, Record<LegalDocumentType, string>> = {
  'en-US': {
    privacy: privacyEnUS,
    terms: termsEnUS,
  },
  'pt-BR': {
    privacy: privacyPtBR,
    terms: termsPtBR,
  },
};

function resolveLanguage(language?: string): LegalLanguage {
  return language === 'en-US' ? 'en-US' : 'pt-BR';
}

function parseLegalDocument(source: string): LegalDocument {
  const lines = source.trim().split(/\r?\n/);
  const title = lines[0]?.replace(/^#\s+/, '').trim() || 'Document';
  const updatedAt = lines[2]?.trim() || '';
  const body = lines.slice(4).join('\n').trim();

  return {
    body,
    title,
    updatedAt,
  };
}

export function getLegalDocument(
  documentType: LegalDocumentType,
  language?: string,
): LegalDocument {
  return parseLegalDocument(documents[resolveLanguage(language)][documentType]);
}
