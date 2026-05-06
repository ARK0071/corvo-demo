/**
 * Origin validation for mutating requests.
 * NextAuth already handles CSRF for its own routes via tokens,
 * but this adds defense-in-depth for all other POST/PUT/DELETE routes.
 */
export function validateOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();

  // Safe methods don't need origin validation
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

  const origin = request.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.AUTH0_BASE_URL, // backward compat
    "http://localhost:3000",
  ].filter(Boolean);

  // No origin header on mutating request = possible cross-site
  if (!origin) return false;

  return allowedOrigins.some((allowed) => origin === allowed);
}
