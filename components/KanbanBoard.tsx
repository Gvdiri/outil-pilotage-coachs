"use client";

import { useState } from "react";
import type { BadgeTone } from "@/lib/types";

// Kanban générique (socle) : colonnes + drag & drop natif, réutilisé par les
// modules Tâches (4 colonnes) et Contenu (6 étapes).
// Sur mobile : défilement horizontal (chaque colonne garde sa largeur).

export interface KanbanColumn<S extends string> {
  key: S;
  label: string;
  tone: BadgeTone;
}

export function KanbanBoard<T extends { id: string }, S extends string>({
  columns,
  items,
  getColumn,
  onMove,
  renderCard,
}: {
  columns: KanbanColumn<S>[];
  items: T[];
  getColumn: (item: T) => S;
  onMove: (item: T, to: S) => void;
  renderCard: (item: T) => React.ReactNode;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<S | null>(null);

  return (
    <div className="kanban-scroll flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colItems = items.filter((i) => getColumn(i) === col.key);
        const isOver = overCol === col.key;
        return (
          <div
            key={col.key}
            className={`flex w-[272px] shrink-0 flex-col rounded-xl border bg-background/60 transition-colors ${
              isOver ? "border-primary bg-primary-soft" : "border-border"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setOverCol(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              const id = e.dataTransfer.getData("text/plain") || dragId;
              const item = items.find((i) => i.id === id);
              if (item && getColumn(item) !== col.key) onMove(item, col.key);
              setDragId(null);
            }}
          >
            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: `var(--tone-${col.tone}-fg)` }}
              />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                {colItems.length}
              </span>
            </div>
            <div className="flex min-h-24 flex-col gap-2 px-2 pb-2">
              {colItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(item.id);
                    e.dataTransfer.setData("text/plain", item.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={`cursor-grab active:cursor-grabbing ${
                    dragId === item.id ? "opacity-40" : ""
                  }`}
                >
                  {renderCard(item)}
                </div>
              ))}
              {colItems.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-muted/70">
                  Rien ici
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
