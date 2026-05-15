// Prisma client - requires generated prisma client and pg module.
// Falls back to a null export when dependencies are unavailable (e.g., local dev without DB).

let prisma: any = null;

try {
  const { PrismaClient } = require("@/generated/prisma");
  const { PrismaPg } = require("@prisma/adapter-pg");
  const pg = require("pg");

  const globalForPrisma = globalThis as unknown as {
    prisma: any;
    pool: any;
  };

  // Keep in sync with prisma.config.ts getDbUrl(): shared/auth tables live in `public`.
  function normalizeDatabaseUrl(url: string): string {
    if (url.includes("schema=corvo")) {
      return url.replace("schema=corvo", "schema=public");
    }
    if (url.includes("?")) {
      return url.includes("schema=") ? url : `${url}&schema=public`;
    }
    return `${url}?schema=public`;
  }

  function createPrismaClient() {
    const fromUrl = process.env.DATABASE_URL?.trim();
    const pool =
      globalForPrisma.pool ??
      (fromUrl
        ? new pg.Pool({
            connectionString: normalizeDatabaseUrl(fromUrl),
            max: 10,
          })
        : new pg.Pool({
            host: process.env.RDS_HOST || "localhost",
            port: parseInt(process.env.RDS_PORT || "5432"),
            database: process.env.RDS_DATABASE || "postgres",
            user: process.env.RDS_USER || "postgres",
            password: process.env.RDS_PASSWORD,
            max: 10,
            ssl: {
              rejectUnauthorized: false,
            },
          }));

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.pool = pool;
    }

    const adapter = new PrismaPg(pool);

    return new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  }

  prisma = globalForPrisma.prisma ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
} catch {
  // Prisma/pg not available — DB features will be disabled
  console.warn("[db] Prisma client unavailable — database features disabled");
}

export { prisma };
export default prisma;
