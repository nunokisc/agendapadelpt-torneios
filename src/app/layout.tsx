import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ToastProvider from "@/components/ui/ToastProvider";
import PwaRegister from "@/components/layout/PwaRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://torneios.agendapadel.pt"),
  icons: {
    icon: "/favicon-32x32.png",
  },
  title: {
    default: "Torneios — AgendaPadel.pt",
    template: "%s | Torneios — AgendaPadel.pt",
  },
  description: "Cria e gere torneios de padel com brackets visuais, round robin e eliminação. Uma extensão de AgendaPadel.pt.",
  keywords: ["padel", "torneios padel", "brackets padel", "padel portugal", "agenda padel"],
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://torneios.agendapadel.pt",
    siteName: "Torneios — AgendaPadel.pt",
    title: "Torneios de Padel — AgendaPadel.pt",
    description: "Cria e gere torneios de padel com brackets visuais, round robin e eliminação.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Torneios — AgendaPadel.pt", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0E7C66",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: apply saved theme before page renders — Synced from agendapadelpt */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('agendapadel-theme')||'system';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.setAttribute('data-theme',r);document.documentElement.classList.toggle('dark',r==='dark');}catch(e){}})();`,
          }}
        />
        {/* SW update reload — runs before React so it works even when React crashes.
            When a new SW takes over (skipWaiting + claim), controllerchange fires and
            we reload to get fresh HTML with the correct content-hash chunk filenames. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker'in navigator){navigator.serviceWorker.addEventListener('controllerchange',function(){window.location.reload();});}`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-inter antialiased min-h-screen flex flex-col`}>
        <ToastProvider>
          <PwaRegister />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
