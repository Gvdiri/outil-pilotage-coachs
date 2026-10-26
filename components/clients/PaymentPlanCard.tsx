"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addPayment,
  cancelLastPayment,
  deletePayment,
  markPaymentPaid,
  recordPlannedPayment,
  unmarkPaymentPaid,
} from "@/lib/actions/clients";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import { formatDate, formatEUR, todayISO } from "@/lib/dates";
import { installmentAmount, planState } from "@/lib/paiements";
import {
  PAYMENT_STATUS_META,
  effectivePaymentStatus,
  type Client,
  type Payment,
  type PaymentStatus,
} from "@/lib/types";

// Section Paiements de la fiche client : plan intelligent (progression,
// prochaine échéance, encaissement en 1 clic) + historique complet.
export function PaymentPlanCard({
  client,
  payments,
  onConfigure,
}: {
  client: Client;
  payments: Payment[];
  onConfigure: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [manualOpen, setManualOpen] = useState(false);

  const today = todayISO();
  const plan = planState(client, payments, today);
  const amount = installmentAmount(client);

  function record() {
    startTransition(async () => {
      const res = await recordPlannedPayment(client.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(`Paiement de ${amount !== null ? formatEUR(amount) : ""} encaissé ✓`);
        router.refresh();
      }
    });
  }

  function cancelLast() {
    if (!window.confirm("Annuler le dernier paiement encaissé ?")) return;
    startTransition(async () => {
      const res = await cancelLastPayment(client.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Dernier paiement annulé");
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">💶 Paiements</h2>
        <button
          onClick={onConfigure}
          className="text-xs font-medium text-primary hover:underline"
        >
          {plan.kind === "aucun" ? "Configurer le plan" : "Modifier le plan"}
        </button>
      </div>

      {plan.kind === "aucun" ? (
        <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center">
          <p className="text-sm text-muted">
            Aucun plan configuré. Renseigne le <strong>prix total</strong> et le{" "}
            <strong>nombre de fois</strong> : le montant des échéances, les
            relances et l&apos;arrêt automatique se gèrent ensuite tout seuls.
          </p>
          <div className="mt-3">
            <PrimaryButton type="button" onClick={onConfigure}>
              Configurer le plan de paiement
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-background/50 p-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span>
              <span className="text-muted">Prix : </span>
              <strong className="glow-number">{formatEUR(client.price_total!)}</strong>
              <span className="text-muted">
                {" "}
                en {client.installments} fois
                {amount !== null && client.installments! > 1
                  ? ` (${formatEUR(amount)}/échéance)`
                  : ""}
              </span>
            </span>
            <span>
              <span className="text-muted">Payées : </span>
              <strong>
                {plan.paid}/{plan.total}
              </strong>
            </span>
            {plan.kind === "solde" ? (
              <StatusBadge tone="green" label="✓ Soldé — plus de relance" />
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-muted">Prochaine échéance : </span>
                <strong className={plan.kind === "en_retard" ? "text-danger" : ""}>
                  {plan.nextDue ? formatDate(plan.nextDue) : "—"}
                </strong>
                {plan.kind === "en_retard" ? (
                  <StatusBadge tone="red" label="En retard — à relancer" size="xs" />
                ) : null}
              </span>
            )}
          </div>

          {/* Barre de progression des échéances */}
          <div className="mt-2.5 flex gap-1">
            {Array.from({ length: plan.total }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  backgroundColor:
                    i < plan.paid ? "var(--tone-green-fg)" : "var(--border)",
                }}
              />
            ))}
          </div>

          {plan.kind !== "solde" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={record}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--tone-green-fg)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                ✓ Enregistrer le paiement
                {amount !== null ? ` (${formatEUR(amount)})` : ""}
              </button>
              {plan.paid > 0 ? (
                <button
                  onClick={cancelLast}
                  disabled={isPending}
                  className="text-xs text-muted underline-offset-2 hover:underline"
                >
                  Annuler le dernier
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* Historique */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Historique
        </p>
        <button
          onClick={() => setManualOpen(true)}
          className="text-xs text-muted underline-offset-2 hover:underline"
        >
          + paiement manuel
        </button>
      </div>
      {payments.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Aucun paiement enregistré.</p>
      ) : (
        <div className="mt-1 flex flex-col divide-y divide-border/60">
          {[...payments].reverse().map((p) => {
            const status = effectivePaymentStatus(p, today);
            const meta = PAYMENT_STATUS_META[status];
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-20 font-semibold">{formatEUR(Number(p.amount))}</span>
                <StatusBadge tone={meta.tone} label={meta.label} size="xs" />
                <span className="text-xs text-muted">
                  {status === "paye" && p.paid_date
                    ? `payé le ${formatDate(p.paid_date)}`
                    : p.due_date
                      ? `échéance ${formatDate(p.due_date)}`
                      : ""}
                </span>
                {p.notes ? <span className="text-xs text-muted">· {p.notes}</span> : null}
                <span className="ml-auto flex items-center gap-1.5">
                  {status !== "paye" ? (
                    <button
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await markPaymentPaid(p.id, client.id);
                          if (res.error) toast(`Erreur : ${res.error}`, "error");
                          else {
                            toast("Paiement marqué payé ✓");
                            router.refresh();
                          }
                        })
                      }
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-[var(--tone-green-fg)] transition-colors hover:bg-[var(--tone-green-bg)]"
                    >
                      Marquer payé
                    </button>
                  ) : (
                    // Annuler un "payé" fait par erreur → repasse en attente
                    // sans supprimer l'échéance (suivi de retard cohérent).
                    <button
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await unmarkPaymentPaid(p.id, client.id);
                          if (res.error) toast(`Erreur : ${res.error}`, "error");
                          else {
                            toast("Paiement repassé en attente");
                            router.refresh();
                          }
                        })
                      }
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-background"
                      title="Annuler ce paiement (le repasse en attente)"
                    >
                      ↩ Annuler
                    </button>
                  )}
                  <button
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm("Supprimer ce paiement ?")) return;
                      startTransition(async () => {
                        const res = await deletePayment(p.id, client.id);
                        if (res.error) toast(`Erreur : ${res.error}`, "error");
                        else {
                          toast("Paiement supprimé");
                          router.refresh();
                        }
                      });
                    }}
                    className="rounded-md p-1 text-muted transition-colors hover:text-danger"
                    title="Supprimer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {manualOpen ? (
        <ManualPaymentModal
          clientId={client.id}
          onClose={() => setManualOpen(false)}
        />
      ) : null}
    </section>
  );
}

// Paiement hors plan (acompte, cash, montant exceptionnel…)
function ManualPaymentModal({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("paye");
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!(value > 0)) {
      toast("Le montant doit être supérieur à 0.", "error");
      return;
    }
    startTransition(async () => {
      const res = await addPayment(clientId, {
        amount: value,
        status,
        due_date: dueDate || null,
        paid_date: status === "paye" ? paidDate || null : null,
        notes: notes.trim() || null,
      });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Paiement ajouté");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <FormModal open title="Paiement manuel" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-muted">
          Pour un montant hors plan (acompte, cash, geste commercial…). Les
          paiements du plan s&apos;enregistrent avec le bouton vert de la fiche.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (€)" required>
            <input required inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="450" />
          </Field>
          <Field label="Statut">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              <option value="paye">Payé</option>
              <option value="en_attente">En attente</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Échéance">
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          {status === "paye" ? (
            <Field label="Date de paiement">
              <input type="date" className={inputClass} value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
            </Field>
          ) : (
            <div />
          )}
        </div>
        <Field label="Note">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex : acompte" />
        </Field>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton disabled={isPending}>
            {isPending ? "Ajout…" : "Ajouter"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
