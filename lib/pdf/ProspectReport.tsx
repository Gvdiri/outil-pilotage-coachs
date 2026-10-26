import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { COLORS, dateFR } from "./helpers";
import { PROSPECT_STATUS_META } from "@/lib/types";
import type { Prospect } from "@/lib/types";

// Fiche de prépa d'appel : tout ce qu'il faut avoir sous les yeux avant un
// appel de closing (objectif, douleur, situation désirée, objections).

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: COLORS.text, fontFamily: "Helvetica" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  brand: { fontSize: 9, color: COLORS.muted, marginBottom: 2 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingBottom: 8, marginBottom: 16 },
  block: { backgroundColor: COLORS.bg, borderLeftWidth: 3, borderLeftColor: COLORS.primary, padding: 10, marginBottom: 10 },
  blockLabel: { fontSize: 8, color: COLORS.muted, marginBottom: 3, textTransform: "uppercase" },
  blockText: { fontSize: 12, lineHeight: 1.4 },
  kv: { flexDirection: "row", marginBottom: 4 },
  k: { width: 120, color: COLORS.muted },
  v: { flex: 1 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6, color: COLORS.primary },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: COLORS.muted, textAlign: "center", borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 },
});

function fmtTs(ts: string | null): string {
  if (!ts) return "-";
  const d = new Date(ts);
  return `${dateFR(ts)} à ${new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d)}`;
}

export function ProspectReport({
  prospect,
  today,
}: {
  prospect: Prospect;
  today: string;
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.brand}>CoachOS — Prépa d&apos;appel</Text>
            <Text style={s.h1}>{prospect.name}</Text>
          </View>
          <Text style={{ color: COLORS.muted }}>{dateFR(today)}</Text>
        </View>

        <View style={s.section}>
          <View style={s.kv}><Text style={s.k}>Statut</Text><Text style={s.v}>{PROSPECT_STATUS_META[prospect.status].label}</Text></View>
          {prospect.rdv_at ? <View style={s.kv}><Text style={s.k}>Rendez-vous</Text><Text style={s.v}>{fmtTs(prospect.rdv_at)}</Text></View> : null}
          {prospect.email ? <View style={s.kv}><Text style={s.k}>Email</Text><Text style={s.v}>{prospect.email}</Text></View> : null}
          {prospect.instagram ? <View style={s.kv}><Text style={s.k}>Instagram</Text><Text style={s.v}>{prospect.instagram}</Text></View> : null}
          {prospect.phone ? <View style={s.kv}><Text style={s.k}>WhatsApp</Text><Text style={s.v}>{prospect.phone}</Text></View> : null}
        </View>

        {prospect.objective ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>Objectif visé</Text>
            <Text style={s.blockText}>{prospect.objective}</Text>
          </View>
        ) : null}
        {prospect.pain ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>Douleur / situation actuelle</Text>
            <Text style={s.blockText}>{prospect.pain}</Text>
          </View>
        ) : null}
        {prospect.desired ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>Situation désirée</Text>
            <Text style={s.blockText}>{prospect.desired}</Text>
          </View>
        ) : null}
        {prospect.objections ? (
          <View style={s.block}>
            <Text style={s.blockLabel}>Objections à préparer</Text>
            <Text style={s.blockText}>{prospect.objections}</Text>
          </View>
        ) : null}

        {prospect.notes ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={{ lineHeight: 1.4 }}>{prospect.notes}</Text>
          </View>
        ) : null}

        {!prospect.objective && !prospect.pain && !prospect.desired && !prospect.objections ? (
          <Text style={{ color: COLORS.muted }}>
            Fiche de closing vide. Renseigne l&apos;objectif, la douleur et la
            situation désirée du prospect pour préparer ton appel.
          </Text>
        ) : null}

        <Text style={s.footer} fixed>
          CoachOS — document interne confidentiel.
        </Text>
      </Page>
    </Document>
  );
}
