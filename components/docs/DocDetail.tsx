"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { PrimaryButton } from "@/components/FormModal";
import { DocFormModal } from "@/components/docs/DocFormModal";
import { parseTags, renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/dates";
import { DOC_TYPE_META, type Doc } from "@/lib/types";

export function DocDetail({ doc }: { doc: Doc }) {
  const [editOpen, setEditOpen] = useState(false);
  const meta = DOC_TYPE_META[doc.type];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/docs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        ← Documentation
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold lg:text-2xl">{doc.title}</h1>
          <StatusBadge tone={meta.tone} label={meta.label} />
        </div>
        <PrimaryButton type="button" onClick={() => setEditOpen(true)}>
          Modifier
        </PrimaryButton>
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs text-muted">
        {parseTags(doc.tags).map((t) => (
          <span key={t} className="text-primary">
            #{t}
          </span>
        ))}
        <span className="ml-auto">
          Mis à jour le {formatDate(doc.updated_at.slice(0, 10))}
        </span>
      </div>

      <article
        className="prose-doc rounded-xl border border-border bg-surface p-6 text-sm"
        // Contenu échappé puis rendu par notre mini-markdown : pas d'injection possible
        dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
      />

      {editOpen ? (
        <DocFormModal doc={doc} onClose={() => setEditOpen(false)} />
      ) : null}
    </div>
  );
}
