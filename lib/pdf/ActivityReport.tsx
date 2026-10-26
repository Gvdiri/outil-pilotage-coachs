import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { COLORS, dateFR, eur } from "./helpers";
import { planState, revenueByMonth, monthLabel } from "@/lib/paiements";
import { churnRisk, globalWeeklyStats } from "@/lib/suivi";
import { currentMonthBounds, addDaysISO } from "@/lib/dates";
import type { Client, FollowupResponse, Payment, Prospect } from "@/lib/types";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: COLORS.text, fontFamily: "Helvetica" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  brand: { fontSize: 9, color: COLORS.muted, marginBottom: 2 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 8, marginBottom: 14 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, color: COLORS.primary },
  cardRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  card: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 4, padding: 8 },
  cardLabel: { fontSize: 8, color: COLORS.muted },
  cardValue: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 2 },
  kv: { flexDirection: "row", marginBottom: 3 },
  k: { width: 200, color: COLORS.muted },
  v: { flex: 1 },
  chartBar: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  chartLabel: { width: 50, fontSize: 8, color: COLORS.muted },
  chartTrack: { flex: 1, height: 10, backgroundColor: COLORS.border, borderRadius: 2 },
  chartFill: { height: 10, backgroundColor: COLORS.primary, borderRadius: 2 },
  chartVal: { width: 60, fontSize: 8, textAlign: "right", marginLeft: 4 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: COLORS.muted, textAlign: "center", borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 },
});

export function ActivityReport({
  clients,
  prospects,
  payments,
  followups,
  today,
}: {
  clients: Client[];
  prospects: Prospect[];
  payments: Payment[];
  followups: FollowupResponse[];
  today: string;
}) {
  const active = clients.filter((c) => c.status === "actif");
  const { start, end } = currentMonthBounds();
  const caMonth = payments.filter((p) => p.status === "paye" && p.paid_date && p.paid_date >= start && p.paid_date <= end).reduce((a, p) => a + Number(p.amount), 0);
  const ca90 = payments.filter((p) => p.status === "paye" && p.paid_date && p.paid_date >= addDaysISO(today, -90)).reduce((a, p) => a + Number(p.amount), 0);
  const histo = revenueByMonth(payments, today, 6);
  const maxHisto = Math.max(...histo.map((h) => h.total), 1);

  const won = prospects.filter((p) => p.status === "gagne").length;
  const lost = prospects.filter((p) => p.status === "perdu").length;
  const decided = won + lost;
  const convRate = decided > 0 ? Math.round((won / decided) * 100) : null;
  const pipeline = prospects.filter((p) => !["gagne", "perdu"].includes(p.status)).length;

  // Objections agrégées
  const reasons = new Map<string, number>();
  for (const p of prospects) {
    if (p.status === "perdu" && p.lost_reason) {
      const r = p.lost_reason.trim().toLowerCase();
      reasons.set(r, (reasons.get(r) ?? 0) + 1);
    }
  }
  const topReasons = [...reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Suivi global
  const followupsByClient = new Map<string, FollowupResponse[]>();
  for (const f of followups) {
    const l = followupsByClient.get(f.client_id) ?? [];
    l.push(f);
    followupsByClient.set(f.client_id, l);
  }
  const atRisk = active.filter((c) => churnRisk(followupsByClient.get(c.id) ?? [], today).level === "eleve");
  const weekly = globalWeeklyStats(active.flatMap((c) => followupsByClient.get(c.id) ?? []), today, 1)[0];

  // Retards de paiement
  const late = active.filter((c) => planState(c, payments.filter((p) => p.client_id === c.id), today).kind === "en_retard");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>CoachOS — Bilan d'activité</Text>
            <Text style={s.h1}>Rapport global</Text>
          </View>
          <Text style={{ color: COLORS.muted }}>Édité le {dateFR(today)}</Text>
        </View>

        {/* KPIs business */}
        <View style={s.cardRow}>
          <View style={s.card}><Text style={s.cardLabel}>CA encaissé ce mois</Text><Text style={s.cardValue}>{eur(caMonth)}</Text></View>
          <View style={s.card}><Text style={s.cardLabel}>CA 90 derniers jours</Text><Text style={s.cardValue}>{eur(ca90)}</Text></View>
          <View style={s.card}><Text style={s.cardLabel}>Clients actifs</Text><Text style={s.cardValue}>{active.length}</Text></View>
        </View>

        {/* CA par mois */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Chiffre d'affaires — 6 derniers mois</Text>
          {histo.map((h, i) => (
            <View key={i} style={s.chartBar}>
              <Text style={s.chartLabel}>{monthLabel(h.month)}</Text>
              <View style={s.chartTrack}>
                <View style={[s.chartFill, { width: `${(h.total / maxHisto) * 100}%` }]} />
              </View>
              <Text style={s.chartVal}>{eur(h.total)}</Text>
            </View>
          ))}
        </View>

        {/* Prospection */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Prospection & conversion</Text>
          <View style={s.kv}><Text style={s.k}>Pipeline actif (prospects en cours)</Text><Text style={s.v}>{pipeline}</Text></View>
          <View style={s.kv}><Text style={s.k}>Prospects gagnés</Text><Text style={s.v}>{won}</Text></View>
          <View style={s.kv}><Text style={s.k}>Prospects perdus</Text><Text style={s.v}>{lost}</Text></View>
          <View style={s.kv}><Text style={s.k}>Taux de conversion (gagnés / décidés)</Text><Text style={s.v}>{convRate !== null ? `${convRate}%` : "-"}</Text></View>
        </View>

        {/* Objections */}
        {topReasons.length ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Raisons de non-closing (à travailler)</Text>
            {topReasons.map(([r, n], i) => (
              <View key={i} style={s.kv}><Text style={s.k}>{r}</Text><Text style={s.v}>{n} fois</Text></View>
            ))}
          </View>
        ) : null}

        {/* Accompagnement */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Santé de l'accompagnement</Text>
          <View style={s.kv}><Text style={s.k}>Satisfaction moyenne (cette semaine)</Text><Text style={s.v}>{weekly?.avgSatisfaction !== null && weekly?.avgSatisfaction !== undefined ? `${weekly.avgSatisfaction}/5` : "-"}</Text></View>
          <View style={s.kv}><Text style={s.k}>Passage à l'action (cette semaine)</Text><Text style={s.v}>{weekly?.actionRate !== null && weekly?.actionRate !== undefined ? `${weekly.actionRate}%` : "-"}</Text></View>
          <View style={s.kv}><Text style={s.k}>Clients à risque élevé</Text><Text style={[s.v, atRisk.length ? { color: COLORS.red } : {}]}>{atRisk.length ? atRisk.map((c) => c.name).join(", ") : "aucun"}</Text></View>
          <View style={s.kv}><Text style={s.k}>Retards de paiement</Text><Text style={[s.v, late.length ? { color: COLORS.red } : {}]}>{late.length ? late.map((c) => c.name).join(", ") : "aucun"}</Text></View>
        </View>

        <Text style={s.footer} fixed>
          CoachOS — document interne confidentiel.
        </Text>
      </Page>
    </Document>
  );
}
