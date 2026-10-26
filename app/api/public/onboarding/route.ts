import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findClientByToken,
  getPublicFormConfig,
  sanitizeAnswers,
} from "@/lib/public-forms";

// Soumission publique du formulaire d'onboarding (1 par client).
// Sécurité : token validé côté serveur ; seules les clés déclarées sont
// acceptées ; la seule écriture possible est la réponse de CE client.

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { token, answers: rawAnswers } = (body ?? {}) as {
    token?: string;
    answers?: unknown;
  };

  let client = null;
  try {
    client = token ? await findClientByToken(token) : null;
  } catch {
    return NextResponse.json(
      { error: "Service indisponible, réessaie plus tard." },
      { status: 503 },
    );
  }
  if (!client) {
    return NextResponse.json(
      { error: "Lien invalide ou expiré." },
      { status: 404 },
    );
  }

  const config = await getPublicFormConfig("onboarding");
  const { answers, error } = sanitizeAnswers(config.fields, rawAnswers);
  if (error || !answers) {
    return NextResponse.json({ error: error ?? "Réponses invalides." }, { status: 422 });
  }

  const admin = createAdminClient();

  // 1 réponse d'onboarding par client : une resoumission remplace l'existante.
  const { data: existing } = await admin
    .from("client_onboarding_response")
    .select("id")
    .eq("client_id", client.id)
    .maybeSingle();

  const write = existing
    ? admin
        .from("client_onboarding_response")
        .update({ answers, submitted_at: new Date().toISOString() })
        .eq("id", existing.id)
    : admin
        .from("client_onboarding_response")
        .insert({ client_id: client.id, answers });

  const { error: writeError } = await write;
  if (writeError) {
    return NextResponse.json(
      { error: "Enregistrement impossible, réessaie dans un instant." },
      { status: 500 },
    );
  }

  // Backfill : complète email / Instagram / WhatsApp de la fiche s'ils sont
  // vides (ne JAMAIS écraser une saisie d'Alex/Sam).
  const backfill: Record<string, string> = {};
  if (!client.email && answers.email) backfill.email = answers.email;
  if (!client.instagram && answers.instagram) backfill.instagram = answers.instagram;
  if (!client.phone && answers.whatsapp) backfill.phone = answers.whatsapp;
  if (!client.contact && (answers.email || answers.whatsapp)) {
    backfill.contact = answers.email || answers.whatsapp;
  }
  if (Object.keys(backfill).length > 0) {
    await admin.from("clients").update(backfill).eq("id", client.id);
  }

  return NextResponse.json({ ok: true });
}
