import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local" });

// Remove schema=corvo from DATABASE_URL if present, to use public schema
function getDbUrl(): string {
  const url = process.env.DATABASE_URL || "";
  // Replace schema=corvo with schema=public, or append schema=public
  if (url.includes("schema=corvo")) {
    return url.replace("schema=corvo", "schema=public");
  }
  if (url.includes("?")) {
    return url.includes("schema=") ? url : url + "&schema=public";
  }
  return url + "?schema=public";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDbUrl(),
  },
});
