"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, deleteTask, updateTask } from "@/lib/actions/tasks";
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
import { formatDateShort, isOverdue } from "@/lib/dates";
import {
  ASSIGNEE_LABELS,
  ASSIGNEE_TONES,
  TASK_PRIORITIES,
  TASK_PRIORITY_META,
  TASK_STATUSES,
  TASK_STATUS_META,
  type Assignee,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

const COLUMNS: KanbanColumn<TaskStatus>[] = TASK_STATUSES.map((s) => ({
  key: s,
  label: TASK_STATUS_META[s].label,
  tone: TASK_STATUS_META[s].tone,
}));

export function TasksView({
  initialTasks,
  openCreate = false,
  prefillTitle = "",
}: {
  initialTasks: Task[];
  openCreate?: boolean;
  prefillTitle?: string;
}) {
  const router = useRouter();
  const toast = useToast();

  // État local pour les déplacements optimistes (drag & drop instantané),
  // resynchronisé quand le serveur renvoie des données fraîches.
  const [tasks, setTasks] = useState(initialTasks);
  const [prevInitial, setPrevInitial] = useState(initialTasks);
  if (prevInitial !== initialTasks) {
    setPrevInitial(initialTasks);
    setTasks(initialTasks);
  }

  const [assigneeFilter, setAssigneeFilter] = useState<Assignee | "tous">("tous");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "tous">("tous");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(openCreate);

  const filtered = useMemo(() => {
    let list = tasks;
    if (assigneeFilter !== "tous") list = list.filter((t) => t.assignee === assigneeFilter);
    if (priorityFilter !== "tous") list = list.filter((t) => t.priority === priorityFilter);
    return list;
  }, [tasks, assigneeFilter, priorityFilter]);

  const lateCount = tasks.filter(
    (t) => isOverdue(t.due_date) && t.status !== "termine",
  ).length;

  function onMove(task: Task, to: TaskStatus) {
    const previous = tasks;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status: to } : t)));
    updateTask(task.id, { status: to }).then((res) => {
      if (res.error) {
        setTasks(previous);
        toast(`Erreur : ${res.error}`, "error");
      } else {
        toast(`« ${task.title} » → ${TASK_STATUS_META[to].label}`);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Tâches"
        subtitle={
          lateCount > 0
            ? `⚠️ ${lateCount} tâche${lateCount > 1 ? "s" : ""} en retard`
            : "Tout est sous contrôle"
        }
        action={
          <PrimaryButton type="button" onClick={() => setCreating(true)}>
            + Tâche
          </PrimaryButton>
        }
      />

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          <FilterChip
            active={assigneeFilter === "tous"}
            onClick={() => setAssigneeFilter("tous")}
            label="Tous"
          />
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
        <div className="h-4 w-px bg-border" />
        <div className="kanban-scroll flex gap-1.5 overflow-x-auto">
          {TASK_PRIORITIES.map((p) => (
            <FilterChip
              key={p}
              active={priorityFilter === p}
              onClick={() => setPriorityFilter(priorityFilter === p ? "tous" : p)}
              label={TASK_PRIORITY_META[p].label}
            />
          ))}
        </div>
      </div>

      <KanbanBoard
        columns={COLUMNS}
        items={filtered}
        getColumn={(t) => t.status}
        onMove={onMove}
        renderCard={(task) => <TaskCard task={task} onClick={() => setEditing(task)} />}
      />

      <p className="text-xs text-muted lg:hidden">
        💡 Touche une carte pour changer son statut.
      </p>

      {creating ? (
        <TaskFormModal
          prefillTitle={prefillTitle}
          onClose={() => {
            setCreating(false);
            // Nettoie les paramètres de pré-remplissage venus d'une réunion
            if (openCreate) router.replace("/taches");
          }}
        />
      ) : null}
      {editing ? (
        <TaskFormModal task={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const late = isOverdue(task.due_date) && task.status !== "termine";
  const prio = TASK_PRIORITY_META[task.priority];
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow"
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={prio.tone} label={prio.label} size="xs" />
        {task.due_date ? (
          <span
            className={`text-[11px] ${late ? "font-bold text-danger" : "text-muted"}`}
          >
            {late ? "⚠ " : "📅 "}
            {formatDateShort(task.due_date)}
          </span>
        ) : null}
        <span className="ml-auto">
          <AssigneeChip
            tone={ASSIGNEE_TONES[task.assignee]}
            name={ASSIGNEE_LABELS[task.assignee]}
          />
        </span>
      </div>
    </button>
  );
}

function TaskFormModal({
  task,
  prefillTitle = "",
  onClose,
}: {
  task?: Task;
  prefillTitle?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(task?.title ?? prefillTitle);
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignee, setAssignee] = useState<Assignee>(task?.assignee ?? "alex");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "moyenne");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "a_faire");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      title: title.trim(),
      description: description.trim() || null,
      assignee,
      priority,
      status,
      due_date: dueDate || null,
    };
    startTransition(async () => {
      const res = task
        ? await updateTask(task.id, input)
        : await createTask(input);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(task ? "Tâche mise à jour" : "Tâche créée");
        onClose();
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!task) return;
    if (!window.confirm(`Supprimer la tâche « ${task.title} » ?`)) return;
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Tâche supprimée");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <FormModal
      open
      title={task ? "Modifier la tâche" : "Nouvelle tâche"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Titre" required>
          <input
            required
            autoFocus={!task}
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : relancer les prospects chauds"
          />
        </Field>
        <Field label="Description">
          <textarea rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assigné" required>
            <select className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee)}>
              <option value="alex">Alex</option>
              <option value="sam">Sam</option>
            </select>
          </Field>
          <Field label="Priorité">
            <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_META[p].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Statut">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date limite">
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2">
          {task ? (
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
            {isPending ? "Enregistrement…" : task ? "Enregistrer" : "Créer"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
