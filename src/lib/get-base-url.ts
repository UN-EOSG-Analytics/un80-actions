/**
 * Get the base URL for the application.
 * Works across all environments: localhost, Vercel preview, Vercel production, custom domains.
 *
 * Priority:
 * 1. BASE_URL env var (explicit override, useful for custom domains)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel production domain)
 * 3. VERCEL_URL (Vercel preview/branch deployments)
 * 4. localhost:3000 (local development fallback)
 *
 * @see https://vercel.com/docs/projects/environment-variables/system-environment-variables
 */
export function getBaseUrl(): string {
  // 1. Explicit BASE_URL takes highest priority (custom domains, manual override)
  if (process.env.BASE_URL) {
    return normalizeUrl(process.env.BASE_URL);
  }

  // 2. Vercel production URL (automatically set by Vercel)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // 3. Vercel deployment URL (preview branches, PR deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 4. Local development fallback
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

/**
 * Normalize URL to ensure consistent format.
 * Removes trailing slashes and ensures protocol is present.
 */
function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add https:// if no protocol specified
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }

  // Remove trailing slash
  return normalized.replace(/\/$/, "");
}

/**
 * Check if we're running in a Vercel environment.
 */
export function isVercel(): boolean {
  return !!process.env.VERCEL;
}

/**
 * Get the current environment type.
 * Returns 'production', 'preview', or 'development'.
 */
export function getEnvironment(): "production" | "preview" | "development" {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "development";
}
