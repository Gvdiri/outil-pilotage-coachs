"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createContent,
  deleteContent,
  updateContent,
} from "@/lib/actions/content";
import { KanbanBoard, type KanbanColumn } from "@/components/KanbanBoard";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, AssigneeChip } from "@/components/StatusBadge";
import { FilterChip } from "@/components/FilterChip";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import { formatDateShort, todayISO } from "@/lib/dates";
import {
  ASSIGNEE_LABELS,
  ASSIGNEE_TONES,
  CONTENT_PLATFORMS,
  CONTENT_PLATFORM_META,
  CONTENT_STAGES,
  CONTENT_STAGE_META,
  type Assignee,
  type ContentItem,
  type ContentPlatform,
  type ContentStage,
} from "@/lib/types";

const COLUMNS: KanbanColumn<ContentStage>[] = CONTENT_STAGES.map((s) => ({
  key: s,
  label: CONTENT_STAGE_META[s].label,
  tone: CONTENT_STAGE_META[s].tone,
}));

export function ContentView({ initialItems }: { initialItems: ContentItem[] }) {
  const router = useRouter();
  const toast = useToast();

  // État local pour les déplacements optimistes, resynchronisé quand le
  // serveur renvoie des données fraîches.
  const [items, setItems] = useState(initialItems);
  const [prevInitial, setPrevInitial] = useState(initialItems);
  if (prevInitial !== initialItems) {
    setPrevInitial(initialItems);
    setItems(initialItems);
  }

  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "tous">("tous");
  const [assigneeFilter, setAssigneeFilter] = useState<Assignee | "tous">("tous");
  const [creating, setCreating] = useState(false);
  // Édition — targetStage force l'étape dans la modale (règles Programmé/Publié)
  const [editing, setEditing] = useState<{
    item: ContentItem;
    targetStage?: ContentStage;
  } | null>(null);

  const filtered = useMemo(() => {
    let list = items;
    if (platformFilter !== "tous") list = list.filter((i) => i.platform === platformFilter);
    if (assigneeFilter !== "tous") list = list.filter((i) => i.assignee === assigneeFilter);
    return list;
  }, [items, platformFilter, assigneeFilter]);

  function onMove(item: ContentItem, to: ContentStage) {
    // Règle : "Programmé" exige une date -> ouvrir la modale pour la saisir
    if (to === "programme" && !item.scheduled_date) {
      toast("Ajoute une date de programmation pour ce contenu", "error");
      setEditing({ item, targetStage: to });
      return;
    }
    // Règle : "Publié" propose la date de publication + le lien
    if (to === "publie") {
      setEditing({ item, targetStage: to });
      return;
    }
    const previous = items;
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, stage: to } : i)),
    );
    updateContent(item.id, { stage: to }).then((res) => {
      if (res.error) {
        setItems(previous);
        toast(`Erreur : ${res.error}`, "error");
      } else {
        toast(`« ${item.title} » → ${CONTENT_STAGE_META[to].label}`);
        router.refresh();
      }
    });
  }

  const scheduledSoon = items.filter(
    (i) => i.stage === "programme" && i.scheduled_date,
  ).length;

  return (
    <div>
      <PageHeader
        title="Pipeline contenu"
        subtitle={
          scheduledSoon > 0
            ? `${scheduledSoon} contenu${scheduledSoon > 1 ? "s" : ""} programmé${scheduledSoon > 1 ? "s" : ""}`
            : "De l'idée à la publication"
        }
        action={
          <PrimaryButton type="button" onClick={() => setCreating(true)}>
            + Contenu
          </PrimaryButton>
        }
      />

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {CONTENT_PLATFORMS.map((p) => (
            <FilterChip
              key={p}
              active={platformFilter === p}
              onClick={() => setPlatformFilter(platformFilter === p ? "tous" : p)}
              label={CONTENT_PLATFORM_META[p].label}
            />
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-1.5">
          <FilterChip
            active={assigneeFilter === "alex"}
            onClick={() => setAssigneeFilter(assigneeFilter === "alex" ? "tous" : "alex")}
            label="Alex"
          />
          <FilterChip
            active={assigneeFilter === "sam"}
            onClick={() => setAssigneeFilter(assigneeFilter === "sam" ? "tous" : "sam")}
            label="Sam"
          />
        </div>
      </div>

      <KanbanBoard
        columns={COLUMNS}
        items={filtered}
        getColumn={(i) => i.stage}
        onMove={onMove}
        renderCard={(item) => (
          <ContentCard item={item} onClick={() => setEditing({ item })} />
        )}
      />

      <p className="text-xs text-muted lg:hidden">
        💡 Touche une carte pour changer son étape.
      </p>

      {creating ? <ContentFormModal onClose={() => setCreating(false)} /> : null}
      {editing ? (
        <ContentFormModal
          item={editing.item}
          targetStage={editing.targetStage}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function ContentCard({
  item,
  onClick,
}: {
  item: ContentItem;
  onClick: () => void;
}) {
  const platform = CONTENT_PLATFORM_META[item.platform];
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow"
    >
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={platform.tone} label={platform.label} size="xs" />
        {item.stage === "programme" && item.scheduled_date ? (
          <span className="text-[11px] font-medium text-[var(--tone-amber-fg)]">
            📅 {formatDateShort(item.scheduled_date)}
          </span>
        ) : null}
        {item.stage === "publie" && item.published_date ? (
          <span className="text-[11px] text-muted">
            ✓ {formatDateShort(item.published_date)}
          </span>
        ) : null}
        {item.assignee ? (
          <span className="ml-auto">
            <AssigneeChip
              tone={ASSIGNEE_TONES[item.assignee]}
              name={ASSIGNEE_LABELS[item.assignee]}
            />
          </span>
        ) : null}
      </div>
    </button>
  );
}

function ContentFormModal({
  item,
  targetStage,
  onClose,
}: {
  item?: ContentItem;
  targetStage?: ContentStage;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const initialStage = targetStage ?? item?.stage ?? "idee";
  const [title, setTitle] = useState(item?.title ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [platform, setPlatform] = useState<ContentPlatform>(item?.platform ?? "instagram");
  const [stage, setStage] = useState<ContentStage>(initialStage);
  const [assignee, setAssignee] = useState<Assignee | "">(item?.assignee ?? "sam");
  const [scheduledDate, setScheduledDate] = useState(item?.scheduled_date ?? "");
  const [publishedDate, setPublishedDate] = useState(
    item?.published_date ?? (targetStage === "publie" ? todayISO() : ""),
  );
  const [link, setLink] = useState(item?.link ?? "");

  const needsScheduledDate = stage === "programme";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsScheduledDate && !scheduledDate) {
      toast("La date de programmation est requise pour un contenu programmé.", "error");
      return;
    }
    const input = {
      title: title.trim(),
      notes: notes.trim() || null,
      platform,
      stage,
      assignee: assignee || null,
      scheduled_date: scheduledDate || null,
      published_date: publishedDate || null,
      link: link.trim() || null,
    };
    startTransition(async () => {
      const res = item
        ? await updateContent(item.id, input)
        : await createContent(input);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(item ? "Contenu mis à jour" : "Contenu ajouté au pipeline");
        onClose();
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!item) return;
    if (!window.confirm(`Supprimer « ${item.title} » ?`)) return;
    startTransition(async () => {
      const res = await deleteContent(item.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Contenu supprimé");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <FormModal
      open
      title={item ? "Modifier le contenu" : "Nouveau contenu"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Titre / idée" required>
          <input
            required
            autoFocus={!item}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : 5 erreurs au muscle-up"
          />
        </Field>
        <Field label="Notes / script">
          <textarea
            rows={4}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Angle, script, notes de production…"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plateforme">
            <select className={inputClass} value={platform} onChange={(e) => setPlatform(e.target.value as ContentPlatform)}>
              {CONTENT_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {CONTENT_PLATFORM_META[p].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Étape">
            <select className={inputClass} value={stage} onChange={(e) => setStage(e.target.value as ContentStage)}>
              {CONTENT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {CONTENT_STAGE_META[s].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigné">
            <select className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee | "")}>
              <option value="">Non assigné</option>
              <option value="alex">Alex</option>
              <option value="sam">Sam</option>
            </select>
          </Field>
          <Field label="Date programmée" required={needsScheduledDate}>
            <input
              type="date"
              required={needsScheduledDate}
              className={inputClass}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </Field>
        </div>
        {stage === "publie" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de publication">
              <input type="date" className={inputClass} value={publishedDate} onChange={(e) => setPublishedDate(e.target.value)} />
            </Field>
            <Field label="Lien du post">
              <input
                type="url"
                className={inputClass}
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          {item ? (
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
            {isPending ? "Enregistrement…" : item ? "Enregistrer" : "Créer"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
