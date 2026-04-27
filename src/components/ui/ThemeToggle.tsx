"use client";

import { useState, useEffect } from "react";

// Synced from agendapadelpt — uses same localStorage key and theme mechanism
type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "agendapadel-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  const isDark = resolved === "dark";
  // Set data-theme attribute (CSS variable overrides)
  document.documentElement.setAttribute("data-theme", resolved);
  // Set dark class (Tailwind dark: utilities)
  document.documentElement.classList.toggle("dark", isDark);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
    setTheme(saved);
    applyTheme(saved);
    setMounted(true);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleChange = (next: Theme) => {
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  if (!mounted) return null;

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: "light", label: "Claro", icon: "☀️" },
    { value: "dark", label: "Escuro", icon: "🌙" },
    { value: "system", label: "Sistema", icon: "💻" },
  ];

  return (
    <div
      className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1"
      role="radiogroup"
      aria-label="Tema do site"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          role="radio"
          aria-checked={theme === opt.value}
          aria-label={`Tema: ${opt.label}`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            theme === opt.value
              ? "bg-[#A3E635] text-[#111827] shadow-sm"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-200 dark:hover:bg-slate-700"
          }`}
        >
          <span>{opt.icon}</span>
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
