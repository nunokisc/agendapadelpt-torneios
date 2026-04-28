"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// Read the resolved theme to update logo colours — works with both data-theme attr and dark class
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      const cls = document.documentElement.classList.contains("dark");
      setDark(attr === "dark" || cls);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

const navLinks = [
  { href: "/torneios", label: "Torneios" },
  { href: "/", label: "Novo Torneio" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const dark = useTheme();

  const logoColors = dark
    ? { agenda: "#ffffff", padel: "#A3E635", pt: "#B0B0B0" }
    : { agenda: "#1F3D2B", padel: "#A3E635", pt: "#8A8A8A" };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Agenda Padel Torneios"
            className="flex items-center gap-2.5 select-none"
          >
            <Image
              src="/raquete_logo.png"
              alt="Agenda Padel"
              height={38}
              width={38}
              className="h-8 w-8 sm:h-[38px] sm:w-[38px] flex-shrink-0"
              priority
            />
            <span className="flex items-baseline font-bold tracking-tight leading-none text-xl sm:text-[1.55rem]">
              <span style={{ color: logoColors.agenda }}>agenda</span>
              <span style={{ color: logoColors.padel }}>padel</span>
              <span style={{ color: logoColors.pt }} className="font-semibold">.pt</span>
            </span>
            <span className="hidden sm:inline-flex items-center ml-1 px-2 py-0.5 rounded-full bg-[#0E7C66]/10 text-[#0E7C66] text-xs font-semibold tracking-wide uppercase">
              Torneios
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-[#0E7C66]/10 text-[#0E7C66]"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://agendapadel.pt"
              className="ml-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 transition-colors flex items-center gap-1"
            >
              ← agendapadel.pt
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              className="p-2 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            id="mobile-menu"
            role="navigation"
            aria-label="Menu principal"
            className="md:hidden py-3 pb-4 border-t border-gray-100 dark:border-slate-700 space-y-1"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-[#0E7C66]/10 text-[#0E7C66]"
                    : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://agendapadel.pt"
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              ← agendapadel.pt
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
