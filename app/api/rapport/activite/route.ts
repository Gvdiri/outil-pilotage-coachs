import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ActivityReport } from "@/lib/pdf/ActivityReport";
import { todayISO } from "@/lib/dates";
import type { Client, FollowupResponse, Payment, Prospect } from "@/lib/types";

// Bilan d'activité global en PDF, généré côté serveur, téléchargé directement.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const [clientsRes, prospectsRes, paymentsRes, followupsRes] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("prospects").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("client_followup_response").select("*"),
  ]);

  // Exclut les clients archivés des statistiques
  const clients = ((clientsRes.data ?? []) as Client[]).filter((c) => !c.archived);
  const clientIds = new Set(clients.map((c) => c.id));

  const buffer = await renderToBuffer(
    ActivityReport({
      clients,
      prospects: (prospectsRes.data ?? []) as Prospect[],
      payments: ((paymentsRes.data ?? []) as Payment[]).filter((p) => clientIds.has(p.client_id)),
      followups: ((followupsRes.data ?? []) as FollowupResponse[]).filter((f) => clientIds.has(f.client_id)),
      today: todayISO(),
    }),
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bilan-activite-${todayISO()}.pdf"`,
    },
  });
}
