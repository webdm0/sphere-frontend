const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const isAbsoluteHttpUrl = (value: string) =>
  ABSOLUTE_HTTP_URL_PATTERN.test(value);

export const buildApiUrl = (baseUrl: string, path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = trimTrailingSlash(baseUrl);

  if (isAbsoluteHttpUrl(normalizedBase)) {
    return new URL(normalizedPath, `${normalizedBase}/`).toString();
  }

  return `${normalizedBase}${normalizedPath}`;
};

export const resolveServerApiOrigin = (
  backendUrl: string | undefined,
  publicApiUrl: string | undefined
) => {
  const normalizedBackendUrl = backendUrl?.trim();
  if (normalizedBackendUrl) {
    return trimTrailingSlash(normalizedBackendUrl);
  }

  const normalizedPublicApiUrl = publicApiUrl?.trim();
  if (normalizedPublicApiUrl && isAbsoluteHttpUrl(normalizedPublicApiUrl)) {
    return trimTrailingSlash(normalizedPublicApiUrl);
  }

  return null;
};
