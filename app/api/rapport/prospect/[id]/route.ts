import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ProspectReport } from "@/lib/pdf/ProspectReport";
import { todayISO } from "@/lib/dates";
import type { Prospect } from "@/lib/types";

// Fiche de prépa d'appel (prospect) en PDF, générée côté serveur, 1 clic.
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  const { data } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return new NextResponse("Prospect introuvable", { status: 404 });

  const buffer = await renderToBuffer(
    ProspectReport({ prospect: data as Prospect, today: todayISO() }),
  );

  const safeName = (data.name as string).replace(/[^a-zA-Z0-9]+/g, "-");
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="prepa-${safeName}-${todayISO()}.pdf"`,
    },
  });
}
