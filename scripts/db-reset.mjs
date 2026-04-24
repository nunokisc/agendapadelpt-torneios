import { rmSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const isMySQL =
  DATABASE_URL.startsWith("mysql://") ||
  DATABASE_URL.startsWith("mariadb://");

function run(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

if (isMySQL) {
  console.log("Resetting MySQL/MariaDB database...");
  // prisma migrate reset drops all tables and re-runs migrations
  run("npx prisma migrate reset --force");
} else {
  console.log("Resetting SQLite database...");
  const dbPath = resolve(root, "prisma/dev.db");
  rmSync(dbPath, { force: true });
  rmSync(dbPath + "-shm", { force: true });
  rmSync(dbPath + "-wal", { force: true });
  run("node scripts/setup-db.mjs");
}

run("npm run db:seed");
