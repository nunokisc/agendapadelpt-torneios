"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import type { Tournament, MatchFormat } from "@/types";
import { FORMAT_LABELS as MATCH_FORMAT_LABELS } from "@/lib/scoring";
import { saveTournament } from "@/lib/my-tournaments";

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Eliminação Simples",
  double_elimination: "Eliminação Dupla",
  round_robin: "Round Robin",
  groups_knockout: "Grupos + Eliminação",
  fpp_auto: "Regulamento FPP",
};

const STATUS_VARIANT: Record<string, "default" | "info" | "success"> = {
  draft: "default",
  in_progress: "info",
  completed: "success",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em progresso",
  completed: "Concluído",
};

interface TournamentHeaderProps {
  tournament: Tournament;
  isAdmin: boolean;
  onUpdate?: () => void;
}

export default function TournamentHeader({ tournament, isAdmin, onUpdate }: TournamentHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const token = tournament.adminToken;

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showClone, setShowClone] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(tournament.name);
  const [editDesc, setEditDesc] = useState(tournament.description ?? "");
  const [editIsPublic, setEditIsPublic] = useState(tournament.isPublic);
  const [editRegOpen, setEditRegOpen] = useState(tournament.registrationOpen);
  const [editCourtCount, setEditCourtCount] = useState(tournament.courtCount ?? "");
  const [saving, setSaving] = useState(false);

  // Clone state
  const [cloneName, setCloneName] = useState(`${tournament.name} (cópia)`);
  const [cloning, setCloning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/tournament/${tournament.slug}?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
          isPublic: editIsPublic,
          registrationOpen: editRegOpen,
          courtCount: editCourtCount !== "" ? Number(editCourtCount) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast("Torneio actualizado!");
      setShowEdit(false);
      onUpdate?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tournament/${tournament.slug}?token=${token}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast("Torneio eliminado.");
      router.push("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao eliminar");
      setDeleting(false);
    }
  }

  async function handleClone(e: React.FormEvent) {
    e.preventDefault();
    setCloning(true);
    try {
      const res = await fetch(`/api/tournament/${tournament.slug}/clone?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cloneName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      saveTournament({ slug: data.tournament.slug, name: data.tournament.name, adminToken: data.tournament.adminToken, createdAt: new Date().toISOString() });
      toast("Torneio clonado! A abrir...");
      setShowClone(false);
      router.push(data.adminUrl);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao clonar");
    } finally {
      setCloning(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={STATUS_VARIANT[tournament.status]}>
                {STATUS_LABEL[tournament.status]}
              </Badge>
              <Badge>{FORMAT_LABELS[tournament.format]}</Badge>
              {isAdmin && <Badge variant="warning">Admin</Badge>}
              {tournament.isPublic && <Badge variant="info">Público</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {tournament.name}
            </h1>
            {tournament.description && (
              <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
                {tournament.description}
              </p>
            )}
            {tournament.courtCount && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {tournament.courtCount} campo{tournament.courtCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right text-sm text-slate-500 dark:text-slate-400">
              <p className="font-mono font-bold text-slate-700 dark:text-slate-300">{tournament.matchFormat}</p>
              <p className="text-xs max-w-48 text-right">
                {MATCH_FORMAT_LABELS[tournament.matchFormat as MatchFormat] ?? tournament.matchFormat}
              </p>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setEditName(tournament.name); setEditDesc(tournament.description ?? ""); setEditIsPublic(tournament.isPublic); setEditRegOpen(tournament.registrationOpen); setEditCourtCount(tournament.courtCount ?? ""); setShowEdit(true); }}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => { setCloneName(`${tournament.name} (cópia)`); setShowClone(true); }}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Clonar
                </button>
                <button
                  onClick={() => setShowDelete(true)}
                  className="text-xs px-2.5 py-1 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar torneio">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Nome"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descrição</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={2}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
          <Input
            label="Número de campos"
            type="number"
            min={1}
            max={20}
            value={editCourtCount}
            onChange={(e) => setEditCourtCount(e.target.value)}
            placeholder="Ex: 4"
          />
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editIsPublic}
                onChange={(e) => setEditIsPublic(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Torneio público (aparece no directório)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={editRegOpen}
                onChange={(e) => setEditRegOpen(e.target.checked)}
                className="h-4 w-4 rounded accent-emerald-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Inscrições abertas (duplas podem inscrever-se)
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Eliminar torneio">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tens a certeza que queres eliminar <strong>{tournament.name}</strong>? Esta acção é irreversível — todas as duplas, jogos e resultados serão apagados.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              loading={deleting}
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clone modal */}
      <Modal open={showClone} onClose={() => setShowClone(false)} title="Clonar torneio">
        <form onSubmit={handleClone} className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cria um novo torneio em rascunho com as mesmas duplas e configurações.
          </p>
          <Input
            label="Nome do novo torneio"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={() => setShowClone(false)}>Cancelar</Button>
            <Button type="submit" loading={cloning}>Clonar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
