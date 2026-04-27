"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface LinkShareProps {
  slug: string;
  adminToken: string;
}

export default function LinkShare({ slug, adminToken }: LinkShareProps) {
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/tournament/${slug}`;
  const adminUrl = `${origin}/tournament/${slug}?token=${adminToken}`;

  useEffect(() => {
    QRCode.toDataURL(publicUrl, { width: 200, margin: 2, color: { dark: "#1e293b", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [publicUrl]);

  function copy(text: string, setDone: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    });
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${slug}.png`;
    a.click();
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Partilhar</CardTitle>
          <button
            onClick={() => setShowQr((v) => !v)}
            className="text-xs text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path strokeLinecap="round" d="M14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z" />
            </svg>
            QR Code
          </button>
        </div>
      </CardHeader>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
            Link público (leitura)
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={publicUrl}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            />
            <Button variant="secondary" size="sm" onClick={() => copy(publicUrl, setCopiedPublic)}>
              {copiedPublic ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
            Link admin (guardar em segredo)
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={adminUrl}
              className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-600 dark:border-amber-900 dark:bg-amber-950/20 dark:text-slate-400"
            />
            <Button variant="secondary" size="sm" onClick={() => copy(adminUrl, setCopiedAdmin)}>
              {copiedAdmin ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Guarda este link — quem tiver o token pode editar o torneio.
          </p>
        </div>

        {showQr && qrDataUrl && (
          <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 rounded-lg border border-slate-200 dark:border-slate-700" />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">QR Code público</p>
              <p className="text-xs text-slate-400 mt-0.5">Aponta para a vista pública do torneio.</p>
              <button
                onClick={downloadQr}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descarregar PNG
              </button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
