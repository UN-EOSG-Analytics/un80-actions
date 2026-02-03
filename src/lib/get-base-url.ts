export function getBaseUrl() {
  const baseUrl = process.env.BASE_URL;
  
  if (!baseUrl) {
    throw new Error("BASE_URL environment variable is required");
  }
  
  return baseUrl;
}
