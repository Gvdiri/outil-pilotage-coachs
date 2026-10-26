import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cible du lien de récupération envoyé par Supabase : échange le code contre
// une session, puis redirige vers la page de définition du nouveau mot de passe.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/reinitialiser`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=lien_invalide`,
  );
}
