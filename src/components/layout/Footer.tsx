import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";

// Footer — Synced from agendapadelpt
export default function Footer() {
  return (
    <footer className="bg-[#111827] text-gray-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top row: brand + nav links */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          {/* Brand */}
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2 select-none mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/raquete_logo.png" alt="Agenda Padel" className="h-7 w-auto flex-shrink-0" />
              <span className="flex items-baseline font-bold tracking-tight leading-none text-lg">
                <span style={{ color: "#ffffff" }}>agenda</span>
                <span style={{ color: "#A3E635" }}>padel</span>
                <span style={{ color: "#B0B0B0" }} className="font-semibold">.pt</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0E7C66]/20 text-[#A3E635] text-xs font-semibold tracking-wide uppercase">
                Torneios
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              Cria e gere torneios de padel com brackets visuais, round robin e eliminação. Uma extensão de{" "}
              <a
                href="https://agendapadel.pt"
                className="text-[#A3E635] hover:text-white transition-colors underline-offset-2 hover:underline"
              >
                agendapadel.pt
              </a>
              .
            </p>
          </div>
          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-8 text-sm">
            <nav className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Torneios</p>
              <Link href="/torneios" className="hover:text-white transition-colors">Ver Torneios</Link>
              <Link href="/" className="hover:text-white transition-colors">Novo Torneio</Link>
            </nav>
            <nav className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Plataforma</p>
              <a href="https://agendapadel.pt" className="hover:text-white transition-colors">AgendaPadel.pt</a>
            </nav>
          </div>
        </div>
        {/* Bottom row: copyright + theme toggle */}
        <div className="border-t border-gray-700 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} AgendaPadel.pt — Todos os direitos reservados.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
