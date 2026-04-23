import { prisma } from "./db";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlug(name) || "torneio";
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.tournament.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${suffix++}`;
  }
}
