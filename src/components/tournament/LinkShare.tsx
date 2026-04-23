"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface LinkShareProps {
  slug: string;
  adminToken: string;
}

export default function LinkShare({ slug, adminToken }: LinkShareProps) {
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/tournament/${slug}`;
  const adminUrl = `${origin}/tournament/${slug}?token=${adminToken}`;

  function copy(text: string, setDone: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    });
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Partilhar</CardTitle>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(publicUrl, setCopiedPublic)}
            >
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copy(adminUrl, setCopiedAdmin)}
            >
              {copiedAdmin ? "Copiado!" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Guarda este link — quem tiver o token pode editar o torneio.
          </p>
        </div>
      </div>
    </Card>
  );
}
