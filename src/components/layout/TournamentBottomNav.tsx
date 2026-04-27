"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconBracket() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="6" height="4" rx="1" /><rect x="16" y="3" width="6" height="4" rx="1" />
      <rect x="9" y="10" width="6" height="4" rx="1" /><rect x="9" y="17" width="6" height="4" rx="1" />
      <path strokeLinecap="round" d="M5 7v3.5a.5.5 0 00.5.5H9M19 7v3.5a.5.5 0 01-.5.5H15" />
      <path strokeLinecap="round" d="M12 14v3" />
    </svg>
  );
}

function IconPerson() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconStats() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  slug: string;
}

export default function TournamentBottomNav({ slug }: Props) {
  const pathname = usePathname();
  const base = `/tournament/${slug}`;

  const items = [
    { href: base, label: "Bracket", icon: <IconBracket />, match: (p: string) => p === base },
    { href: `${base}/minha-dupla`, label: "Os meus jogos", icon: <IconPerson />, match: (p: string) => p.startsWith(`${base}/minha-dupla`) },
    { href: `${base}/stats`, label: "Estatísticas", icon: <IconStats />, match: (p: string) => p.startsWith(`${base}/stats`) },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex safe-bottom">
      {items.map(({ href, label, icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              active
                ? "text-[#0E7C66] dark:text-[#A3E635]"
                : "text-slate-400 dark:text-slate-500"
            }`}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
