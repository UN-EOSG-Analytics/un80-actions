export function getBaseUrl() {
  // Client-side
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Vercel (server-side)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Fallback for local development
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
}
