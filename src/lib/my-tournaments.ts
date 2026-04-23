export interface SavedTournament {
  slug: string;
  name: string;
  adminToken: string;
  createdAt: string;
}

const KEY = "padel_my_tournaments";

export function getSavedTournaments(): SavedTournament[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveTournament(t: SavedTournament) {
  if (typeof window === "undefined") return;
  const existing = getSavedTournaments().filter((x) => x.slug !== t.slug);
  localStorage.setItem(KEY, JSON.stringify([t, ...existing]));
}

export function removeTournament(slug: string) {
  if (typeof window === "undefined") return;
  const existing = getSavedTournaments().filter((x) => x.slug !== slug);
  localStorage.setItem(KEY, JSON.stringify(existing));
}
