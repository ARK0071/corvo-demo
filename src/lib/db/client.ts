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

  function createPrismaClient() {
    const host = process.env.RDS_HOST || "localhost";
    const sslMode = process.env.RDS_SSL_MODE || "require";
    // SSH tunnels to RDS listen on localhost without TLS on the local hop
    const useSsl =
      sslMode !== "disable" && host !== "localhost" && host !== "127.0.0.1";

    const pool =
      globalForPrisma.pool ??
      new pg.Pool({
        host,
        port: parseInt(process.env.RDS_PORT || "5432"),
        database: process.env.RDS_DATABASE || "postgres",
        user: process.env.RDS_USER || "postgres",
        password: process.env.RDS_PASSWORD,
        max: 10,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      });

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
