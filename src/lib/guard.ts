export function isValidRequest(req: Request, allowedOrigins?: string[]): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const defaults = [siteUrl, appUrl].filter(Boolean) as string[];

  const origins = allowedOrigins?.length ? allowedOrigins : defaults;

  return origins.includes(origin);
}
