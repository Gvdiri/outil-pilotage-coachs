import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFollowupEmail, isEmailConfigured } from "@/lib/email";

// Rappel hebdomadaire automatique : envoie le lien de suivi à tous les clients
// actifs (non archivés) ayant un email. Déclenché par le cron Vercel le
// dimanche (voir vercel.json). Protégé par CRON_SECRET.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Sécurité : Vercel Cron envoie "Authorization: Bearer <CRON_SECRET>".
  // Fermé par défaut : sans CRON_SECRET configuré, la route refuse tout le
  // monde. Sinon n'importe qui pourrait la déclencher en boucle et spammer
  // les clients (et brûler le quota d'emails).
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse(
      "CRON_SECRET non configuré : route désactivée.",
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Emails non configurés" }, { status: 200 });
  }

  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("clients")
    .select("id, name, email, contact, form_token, status, archived")
    .eq("status", "actif");

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "";
  let sent = 0;
  let skipped = 0;

  for (const c of clients ?? []) {
    if ((c as { archived?: boolean }).archived) continue;
    let email = c.email as string | null;
    if (!email && typeof c.contact === "string" && c.contact.includes("@")) {
      email = c.contact;
    }
    if (!email) {
      skipped++;
      continue;
    }
    const res = await sendFollowupEmail(
      email,
      (c.name as string).split(" ")[0],
      `${origin}/form/suivi/${c.form_token}`,
    );
    if (res.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
