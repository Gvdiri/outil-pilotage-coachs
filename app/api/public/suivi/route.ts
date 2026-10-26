import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findClientByToken,
  getPublicFormConfig,
  sanitizeAnswers,
} from "@/lib/public-forms";
import { mondayOfWeekISO, todayISO } from "@/lib/dates";

// Soumission publique du suivi récurrent : 1 réponse par semaine ISO et par
// client (clé = lundi de la semaine). Une resoumission la même semaine met à
// jour la réponse au lieu de créer un doublon (sinon les historiques faussent).

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

  const config = await getPublicFormConfig("suivi");
  const { answers, error } = sanitizeAnswers(config.fields, rawAnswers);
  if (error || !answers) {
    return NextResponse.json({ error: error ?? "Réponses invalides." }, { status: 422 });
  }

  const admin = createAdminClient();
  const period = mondayOfWeekISO(todayISO());

  const { error: writeError } = await admin
    .from("client_followup_response")
    .upsert(
      {
        client_id: client.id,
        period,
        answers,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "client_id,period" },
    );

  if (writeError) {
    return NextResponse.json(
      { error: "Enregistrement impossible, réessaie dans un instant." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
