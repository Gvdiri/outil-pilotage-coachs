"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDoc, deleteDoc, updateDoc } from "@/lib/actions/docs";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import {
  DOC_TYPES,
  DOC_TYPE_META,
  type Doc,
  type DocType,
} from "@/lib/types";

export function DocFormModal({
  doc,
  onClose,
  onSaved,
}: {
  doc?: Doc;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(doc?.title ?? "");
  const [type, setType] = useState<DocType>(doc?.type ?? "sop");
  const [tags, setTags] = useState(doc?.tags ?? "");
  const [content, setContent] = useState(doc?.content ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      title: title.trim(),
      type,
      tags: tags.trim() || null,
      content,
    };
    startTransition(async () => {
      const res = doc ? await updateDoc(doc.id, input) : await createDoc(input);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(doc ? "Document mis à jour" : "Document créé");
        onClose();
        if (res.id && onSaved) onSaved(res.id);
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!doc) return;
    if (!window.confirm(`Supprimer « ${doc.title} » ?`)) return;
    startTransition(async () => {
      const res = await deleteDoc(doc.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Document supprimé");
        onClose();
        router.push("/docs");
        router.refresh();
      }
    });
  }

  return (
    <FormModal
      open
      wide
      title={doc ? "Modifier le document" : "Nouveau document"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Titre" required>
            <input
              required
              autoFocus={!doc}
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : SOP — Prospection quotidienne"
            />
          </Field>
          <Field label="Type">
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as DocType)}>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_TYPE_META[t].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Tags (séparés par des virgules)">
          <input
            className={inputClass}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="prospection, closing, instagram"
          />
        </Field>
        <Field label="Contenu (markdown supporté : # titres, **gras**, listes…)" required>
          <textarea
            required
            rows={14}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Field>
        <div className="flex items-center justify-end gap-2">
          {doc ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="mr-auto text-sm font-medium text-danger hover:underline"
            >
              Supprimer
            </button>
          ) : null}
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton disabled={isPending || !title.trim()}>
            {isPending ? "Enregistrement…" : doc ? "Enregistrer" : "Créer"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
