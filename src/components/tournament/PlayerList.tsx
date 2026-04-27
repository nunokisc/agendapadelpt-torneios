"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { parseBulkText } from "@/lib/bulk-import";
import type { Player } from "@/types";

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortablePlayer({
  player,
  index,
  onRemove,
  onToggleCheckin,
  disabled,
}: {
  player: Player;
  index: number;
  onRemove: () => void;
  onToggleCheckin: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: player.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasPlayers = player.player1Name && player.player2Name;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 group ${
        !player.checkedIn ? "opacity-50" : ""
      }`}
    >
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
          tabIndex={-1}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
        </button>
      )}

      {!disabled && (
        <button
          onClick={onToggleCheckin}
          title={player.checkedIn ? "Marcar como ausente" : "Confirmar presença"}
          className={`shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            player.checkedIn
              ? "bg-[#0E7C66] border-[#0E7C66] text-white"
              : "border-slate-300 dark:border-slate-600 text-transparent"
          }`}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      )}

      <span className="text-sm font-mono text-slate-400 w-5 text-right shrink-0">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {player.name}
        </p>
        {hasPlayers && player.name !== `${player.player1Name} / ${player.player2Name}` && (
          <p className="text-xs text-slate-400 truncate">
            {player.player1Name} / {player.player2Name}
          </p>
        )}
      </div>

      {!disabled && (
        <button
          onClick={onRemove}
          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 shrink-0"
          title="Remover"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PlayerListProps {
  players: Player[];
  slug: string;
  token: string;
  categoryId: string | null;
  onUpdate: () => void;
  disabled?: boolean;
}

export default function PlayerList({
  players,
  slug,
  token,
  categoryId,
  onUpdate,
  disabled = false,
}: PlayerListProps) {
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [teamName, setTeamName] = useState("");
  const [showTeamName, setShowTeamName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk import state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const saveOrder = useCallback(
    async (ordered: Player[]) => {
      await fetch(`/api/tournament/${slug}/players?token=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: ordered.map((p, i) => ({ id: p.id, seed: i + 1 })),
        }),
      });
    },
    [slug, token]
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = players.findIndex((p) => p.id === active.id);
    const newIndex = players.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(players, oldIndex, newIndex);

    await saveOrder(reordered);
    onUpdate();
  }

  async function handleShuffle() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    await saveOrder(shuffled);
    onUpdate();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!player1.trim() || !player2.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        player1: player1.trim(),
        player2: player2.trim(),
      };
      if (teamName.trim()) body.teamName = teamName.trim();
      if (categoryId) body.categoryId = categoryId;

      const res = await fetch(`/api/tournament/${slug}/players?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao adicionar dupla");
      }
      setPlayer1("");
      setPlayer2("");
      setTeamName("");
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkImport() {
    const teams = parseBulkText(bulkText);
    if (teams.length === 0) { setError("Nenhuma dupla válida encontrada."); return; }

    setError(null);
    setBulkLoading(true);
    try {
      const res = await fetch(`/api/tournament/${slug}/players?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams, ...(categoryId ? { categoryId } : {}) }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao importar duplas");
      }
      setBulkText("");
      setShowBulk(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleToggleCheckin(player: Player) {
    try {
      await fetch(`/api/tournament/${slug}/players?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: player.id, checkedIn: !player.checkedIn }),
      });
      onUpdate();
    } catch {
      // silent fail — UI will revert on next refresh
    }
  }

  async function handleCheckInAll(checkedIn: boolean) {
    try {
      await Promise.all(
        players
          .filter((p) => p.checkedIn !== checkedIn)
          .map((p) =>
            fetch(`/api/tournament/${slug}/players?token=${token}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ playerId: p.id, checkedIn }),
            })
          )
      );
      onUpdate();
    } catch {
      // silent fail
    }
  }

  async function removePlayer(playerId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/tournament/${slug}/players?token=${token}&playerId=${playerId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao remover dupla");
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  const canAdd = player1.trim().length > 0 && player2.trim().length > 0;
  const checkedInCount = players.filter((p) => p.checkedIn).length;
  const bulkPreview = parseBulkText(bulkText);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Duplas ({players.length})</CardTitle>
            {!disabled && players.length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                {checkedInCount}/{players.length} confirmadas · Arrasta para seeds
              </p>
            )}
            {!disabled && players.length === 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                Arrasta para definir seeds. Seed 1 = cabeça de série.
              </p>
            )}
          </div>
          {!disabled && players.length > 1 && (
            <div className="flex items-center gap-2">
              {checkedInCount < players.length ? (
                <button
                  onClick={() => handleCheckInAll(true)}
                  className="text-xs text-[#0E7C66] hover:text-[#0E7C66] dark:text-[#A3E635] transition-colors"
                  title="Confirmar todas as duplas"
                >
                  ✓ Todas
                </button>
              ) : (
                <button
                  onClick={() => handleCheckInAll(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  title="Desmarcar todas"
                >
                  ✗ Nenhuma
                </button>
              )}
              <button
                onClick={handleShuffle}
                className="text-xs text-slate-400 hover:text-[#0E7C66] transition-colors flex items-center gap-1"
                title="Seeds aleatórios"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16M4 20h4l12-12V4h-4L4 16v4z" />
                </svg>
                Shuffle
              </button>
            </div>
          )}
        </div>
      </CardHeader>

      {!disabled && (
        <>
          {showBulk ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-slate-500">
                Uma dupla por linha: <span className="font-mono">João / Maria</span> ou nomes alternados (um por linha).
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"João Silva / Maria Santos\nPedro Costa / Ana Lima\n\nou alternado:\nJoão Silva\nMaria Santos"}
                rows={6}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7C66] resize-none font-mono"
              />
              {bulkText.trim() && (
                <p className="text-xs text-[#0E7C66] dark:text-[#A3E635]">
                  {bulkPreview.length} dupla{bulkPreview.length !== 1 ? "s" : ""} detectada{bulkPreview.length !== 1 ? "s" : ""}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  loading={bulkLoading}
                  disabled={bulkPreview.length === 0}
                  onClick={handleBulkImport}
                  className="flex-1"
                >
                  Importar {bulkPreview.length > 0 ? `${bulkPreview.length} duplas` : ""}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setShowBulk(false); setBulkText(""); setError(null); }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAdd} className="mb-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Jogador 1"
                  value={player1}
                  onChange={(e) => setPlayer1(e.target.value)}
                  disabled={loading}
                />
                <Input
                  placeholder="Jogador 2"
                  value={player2}
                  onChange={(e) => setPlayer2(e.target.value)}
                  disabled={loading}
                />
              </div>

              {showTeamName ? (
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Nome da dupla (opcional)"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => { setShowTeamName(false); setTeamName(""); }}
                    className="text-slate-400 hover:text-slate-600 text-xs shrink-0"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTeamName(true)}
                  className="text-xs text-slate-400 hover:text-[#0E7C66] transition-colors"
                >
                  + Adicionar nome de dupla
                </button>
              )}

              <Button
                type="submit"
                loading={loading}
                disabled={!canAdd}
                className="w-full"
              >
                Adicionar dupla
              </Button>
            </form>
          )}

          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => { setShowBulk((v) => !v); setError(null); }}
              className="text-xs text-slate-400 hover:text-[#0E7C66] transition-colors"
            >
              {showBulk ? "← Adicionar individualmente" : "Importar lista em massa"}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
          )}
        </>
      )}

      {players.length === 0 ? (
        <p className="text-center py-6 text-sm text-slate-400">
          Nenhuma dupla adicionada ainda.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={players.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-0.5">
              {players.map((player, idx) => (
                <SortablePlayer
                  key={player.id}
                  player={player}
                  index={idx}
                  onRemove={() => removePlayer(player.id)}
                  onToggleCheckin={() => handleToggleCheckin(player)}
                  disabled={disabled}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
}
