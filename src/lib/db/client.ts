import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// PrismaClient singleton pattern for Next.js
// Prevents multiple instances during hot reloading in development

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  // Use individual connection params to avoid URL encoding issues
  const pool =
    globalForPrisma.pool ??
    new pg.Pool({
      host: process.env.RDS_HOST || "localhost",
      port: parseInt(process.env.RDS_PORT || "5432"),
      database: process.env.RDS_DATABASE || "postgres",
      user: process.env.RDS_USER || "postgres",
      password: process.env.RDS_PASSWORD,
      max: 10,
      ssl: {
        rejectUnauthorized: false, // Allow self-signed certs (common for RDS)
      },
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
