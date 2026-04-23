import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, "../prisma/dev.db");

console.log("DB path:", dbPath);

const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

try {
  const count = await prisma.tournament.count();
  console.log("Tournament count:", count);

  const t = await prisma.tournament.create({
    data: {
      slug: "test-1",
      adminToken: "abc123",
      name: "Test",
      format: "single_elimination",
    }
  });
  console.log("Created:", t.id);

  await prisma.tournament.delete({ where: { id: t.id } });
  console.log("Cleaned up.");
} catch (err) {
  console.error("Error:", err);
}

await prisma.$disconnect();
