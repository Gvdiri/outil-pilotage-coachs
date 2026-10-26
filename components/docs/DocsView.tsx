"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/FilterChip";
import { inputClass, PrimaryButton } from "@/components/FormModal";
import { DocFormModal } from "@/components/docs/DocFormModal";
import { parseTags } from "@/lib/markdown";
import { formatDate } from "@/lib/dates";
import {
  DOC_TYPES,
  DOC_TYPE_META,
  type Doc,
  type DocType,
} from "@/lib/types";

export function DocsView({ initialDocs }: { initialDocs: Doc[] }) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<DocType | "tous">("tous");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const d of initialDocs) parseTags(d.tags).forEach((t) => set.add(t));
    return [...set].sort();
  }, [initialDocs]);

  const docs = useMemo(() => {
    let list = initialDocs;
    if (typeFilter !== "tous") list = list.filter((d) => d.type === typeFilter);
    if (tagFilter) list = list.filter((d) => parseTags(d.tags).includes(tagFilter));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.content.toLowerCase().includes(q) ||
          (d.tags ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [initialDocs, typeFilter, tagFilter, search]);

  return (
    <div>
      <PageHeader
        title="Documentation"
        subtitle="SOP, scripts, ressources et modèles réutilisables"
        action={
          <PrimaryButton type="button" onClick={() => setCreating(true)}>
            + Document
          </PrimaryButton>
        }
      />

      {/* Recherche + filtres */}
      <div className="mb-4 flex flex-col gap-2.5">
        <input
          className={`${inputClass} max-w-md`}
          placeholder="🔍 Rechercher dans les titres, contenus, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={typeFilter === "tous"}
            onClick={() => setTypeFilter("tous")}
            label={`Tous (${initialDocs.length})`}
          />
          {DOC_TYPES.map((t) => {
            const count = initialDocs.filter((d) => d.type === t).length;
            return (
              <FilterChip
                key={t}
                active={typeFilter === t}
                onClick={() => setTypeFilter(typeFilter === t ? "tous" : t)}
                label={`${DOC_TYPE_META[t].label} (${count})`}
              />
            );
          })}
          {allTags.length > 0 ? <div className="h-4 w-px bg-border" /> : null}
          {allTags.map((tag) => (
            <FilterChip
              key={tag}
              active={tagFilter === tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              label={`#${tag}`}
            />
          ))}
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Aucun document trouvé"
          hint="Crée ton premier document, ou ajuste la recherche et les filtres."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => {
            const meta = DOC_TYPE_META[d.type];
            return (
              <Link
                key={d.id}
                href={`/docs/${d.id}`}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{d.title}</p>
                  <StatusBadge tone={meta.tone} label={meta.label} size="xs" />
                </div>
                <p className="line-clamp-2 text-xs text-muted">
                  {d.content.replace(/[#>*`-]/g, "").slice(0, 160)}
                </p>
                <div className="mt-auto flex items-center gap-1.5 pt-1">
                  {parseTags(d.tags).map((t) => (
                    <span key={t} className="text-[11px] text-primary">
                      #{t}
                    </span>
                  ))}
                  <span className="ml-auto text-[11px] text-muted">
                    {formatDate(d.updated_at.slice(0, 10))}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {creating ? (
        <DocFormModal
          onClose={() => setCreating(false)}
          onSaved={(id) => router.push(`/docs/${id}`)}
        />
      ) : null}
    </div>
  );
}
