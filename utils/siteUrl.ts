const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeSiteUrl = (value: string | undefined) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  try {
    return trimTrailingSlash(new URL(withProtocol).toString());
  } catch {
    return null;
  }
};

export const getSiteUrl = () => {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSiteUrl(candidate);
    if (normalized) return normalized;
  }

  return "http://localhost:3000";
};
