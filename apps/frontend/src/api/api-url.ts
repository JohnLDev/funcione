export type ApiPath = `/api/${string}`;

export type ApiUrlOptions = {
  apiBaseUrl?: string;
};

function getDefaultApiBaseUrl(): string | undefined {
  return import.meta.env?.VITE_API_BASE_URL;
}

export function toApiUrl(path: ApiPath, options: ApiUrlOptions = {}): string {
  const apiBaseUrl = (options.apiBaseUrl ?? getDefaultApiBaseUrl())
    ?.trim()
    .replace(/\/+$/, '');

  if (!apiBaseUrl) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
}
