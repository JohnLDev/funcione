import * as z from 'zod';

export function normalizePromptText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createBoundedPromptTextSchema(maxLength: number) {
  return z
    .string()
    .transform(normalizePromptText)
    .pipe(z.string().min(1).max(maxLength));
}

export function delimitUserText(label: string, value: string): string {
  const safeValue = value.replaceAll(']]>', ']]]]><![CDATA[>');

  return `<${label}><![CDATA[${safeValue}]]></${label}>`;
}
