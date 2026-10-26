import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { COLORS, dateFR, eur } from "./helpers";
import { planState, installmentAmount } from "@/lib/paiements";
import { actionRate, churnRisk, RISK_META, toPoints } from "@/lib/suivi";
import { clientInsights } from "@/lib/insights";
import { labelForKey, type FormFieldDef } from "@/lib/forms";
import type {
  Client,
  FollowupResponse,
  OnboardingResponse,
  Payment,
} from "@/lib/types";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: COLORS.text, fontFamily: "Helvetica" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  brand: { fontSize: 9, color: COLORS.muted, marginBottom: 2 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 8, marginBottom: 14 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, color: COLORS.primary },
  objective: { backgroundColor: COLORS.bg, borderLeftWidth: 3, borderLeftColor: COLORS.primary, padding: 10, marginBottom: 12 },
  objectiveLabel: { fontSize: 8, color: COLORS.muted, marginBottom: 2 },
  objectiveText: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", marginBottom: 4 },
  cardRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  card: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 4, padding: 8 },
  cardLabel: { fontSize: 8, color: COLORS.muted },
  cardValue: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 2 },
  kv: { flexDirection: "row", marginBottom: 3 },
  k: { width: 130, color: COLORS.muted },
  v: { flex: 1 },
  insight: { marginBottom: 3, paddingLeft: 8 },
  histRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 4 },
  histWeek: { width: 90, fontFamily: "Helvetica-Bold" },
  histCell: { flex: 1 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: COLORS.muted, textAlign: "center", borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 },
  chartBar: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  chartLabel: { width: 60, fontSize: 8, color: COLORS.muted },
  chartTrack: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 2 },
  chartFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 2 },
  chartVal: { width: 30, fontSize: 8, textAlign: "right", marginLeft: 4 },
});

function toneColor(tone: string): string {
  return tone === "red" ? COLORS.red : tone === "amber" ? COLORS.amber : tone === "green" ? COLORS.green : COLORS.text;
}

export function ClientReport({
  client,
  payments,
  onboarding,
  followups,
  onboardingFields,
  today,
}: {
  client: Client;
  payments: Payment[];
  onboarding: OnboardingResponse | null;
  followups: FollowupResponse[];
  onboardingFields: FormFieldDef[];
  followupFields: FormFieldDef[];
  today: string;
}) {
  const plan = planState(client, payments, today);
  const points = toPoints(followups);
  const rate = actionRate(points, today);
  const risk = churnRisk(followups, today);
  const insights = clientInsights({ client, payments, followups, today });
  const objectif = onboarding?.answers.objectif;
  const sats = points.filter((p) => p.satisfaction !== null);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>CoachOS — Bilan client</Text>
            <Text style={s.h1}>{client.name}</Text>
          </View>
          <Text style={{ color: COLORS.muted }}>Édité le {dateFR(today)}</Text>
        </View>

        {objectif ? (
          <View style={s.objective}>
            <Text style={s.objectiveLabel}>OBJECTIF DU CLIENT</Text>
            <Text style={s.objectiveText}>{objectif}</Text>
          </View>
        ) : null}

        {/* Indicateurs clés */}
        <View style={s.cardRow}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Statut</Text>
            <Text style={s.cardValue}>{client.status === "actif" ? "Actif" : client.status === "pause" ? "En pause" : "Terminé"}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Passage à l'action (4 sem.)</Text>
            <Text style={s.cardValue}>{rate !== null ? `${rate}%` : "-"}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Satisfaction récente</Text>
            <Text style={s.cardValue}>{sats.length ? `${sats[sats.length - 1].satisfaction}/5` : "-"}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Risque</Text>
            <Text style={[s.cardValue, { color: toneColor(RISK_META[risk.level].tone) }]}>
              {RISK_META[risk.level].label.replace("Risque ", "")}
            </Text>
          </View>
        </View>

        {/* Analyse */}
        {insights.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Analyse automatique</Text>
            {insights.map((i, idx) => (
              <Text key={idx} style={[s.insight, { color: toneColor(i.tone) }]}>
                • {i.text.replace(/[^\x00-\x7Fàâäéèêëïîôöùûüçœ°'’.,%/()\-+ ]/g, "").trim()}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Paiement */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Paiement</Text>
          {plan.kind === "aucun" ? (
            <Text style={{ color: COLORS.muted }}>Aucun plan de paiement configuré.</Text>
          ) : (
            <>
              <View style={s.kv}><Text style={s.k}>Prix total</Text><Text style={s.v}>{eur(client.price_total ?? 0)} en {client.installments} fois</Text></View>
              <View style={s.kv}><Text style={s.k}>Montant par échéance</Text><Text style={s.v}>{eur(installmentAmount(client) ?? 0)}</Text></View>
              <View style={s.kv}><Text style={s.k}>Échéances payées</Text><Text style={s.v}>{plan.kind === "solde" ? `${plan.total}/${plan.total} (soldé)` : `${plan.paid}/${plan.total}`}</Text></View>
              {plan.kind !== "solde" ? (
                <View style={s.kv}><Text style={s.k}>Prochaine échéance</Text><Text style={[s.v, plan.kind === "en_retard" ? { color: COLORS.red } : {}]}>{dateFR(plan.nextDue)}{plan.kind === "en_retard" ? " (en retard)" : ""}</Text></View>
              ) : null}
            </>
          )}
        </View>

        {/* Courbe satisfaction */}
        {sats.length >= 2 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Évolution de la satisfaction (/5)</Text>
            {points.filter((p) => p.satisfaction !== null).slice(-8).map((p, idx) => (
              <View key={idx} style={s.chartBar}>
                <Text style={s.chartLabel}>{dateFR(p.period).slice(0, 5)}</Text>
                <View style={s.chartTrack}>
                  <View style={[s.chartFill, { width: `${(p.satisfaction! / 5) * 100}%` }]} />
                </View>
                <Text style={s.chartVal}>{p.satisfaction}/5</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Onboarding */}
        {onboarding ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Questionnaire d'onboarding</Text>
            {Object.entries(onboarding.answers).filter(([, v]) => v !== "").map(([k, v]) => (
              <View key={k} style={s.kv}>
                <Text style={s.k}>{labelForKey(onboardingFields, k)}</Text>
                <Text style={s.v}>{String(v)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Historique des retours */}
        {followups.length ? (
          <View style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>Derniers retours hebdo</Text>
            {[...followups].slice(0, 6).map((f) => (
              <View key={f.id} style={s.histRow}>
                <Text style={s.histWeek}>Sem. {dateFR(f.period).slice(0, 5)}</Text>
                <Text style={s.histCell}>
                  {f.answers.actions_faites === "Oui" ? "Actions faites. " : f.answers.actions_faites === "Non" ? "Pas d'action. " : ""}
                  Forme {f.answers.forme ?? "-"}/10, satisf. {f.answers.satisfaction ?? "-"}/5
                  {f.answers.blocages ? `. Blocage : ${f.answers.blocages}` : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={s.footer} fixed>
          CoachOS — document interne confidentiel. Ne pas transmettre au client sans relecture.
        </Text>
      </Page>
    </Document>
  );
}
