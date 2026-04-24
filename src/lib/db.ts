import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isMySQL =
  DATABASE_URL.startsWith("mysql://") ||
  DATABASE_URL.startsWith("mariadb://");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  if (isMySQL) {
    return new PrismaClient();
  }
  const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbPath }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
