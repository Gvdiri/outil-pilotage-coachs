import "server-only";
import { Resend } from "resend";
import { APP_NAME } from "@/lib/config";

// Envoi d'emails via Resend. Dégrade proprement si la clé n'est pas configurée
// (les boutons signalent "email non configuré" au lieu de crasher).
//
// Config (.env.local puis Vercel) :
//   RESEND_API_KEY   = clé API Resend
//   RESEND_FROM      = expéditeur (ex: "CoachOS <coach@ton-domaine.com>")
//                      tant que le domaine n'est pas vérifié, Resend n'autorise
//                      que "onboarding@resend.dev" vers ta propre adresse.

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function fromAddress(): string {
  return process.env.RESEND_FROM || `${APP_NAME} <onboarding@resend.dev>`;
}

type SendResult = { ok: true } | { ok: false; error: string };

async function send(
  to: string,
  subject: string,
  html: string,
): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "Emails non configurés (clé Resend manquante)." };
  }
  if (!to || !to.includes("@")) {
    return { ok: false, error: "Le client n'a pas d'adresse email valide." };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to,
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Envoi impossible." };
  }
}

// --- Gabarit HTML simple et propre (compatible clients mail) ---------------
function layout(body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="font-weight:800;font-size:18px;color:#4f46e5;margin-bottom:16px">${APP_NAME}</div>
    ${body}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#64748b">Cet email t'est envoyé par ton coach via ${APP_NAME}.</p>
  </div>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${label}</a>`;
}

export async function sendOnboardingEmail(
  to: string,
  firstName: string,
  url: string,
): Promise<SendResult> {
  return send(
    to,
    "Bienvenue — ton questionnaire de départ",
    layout(`
      <p style="font-size:16px">Bienvenue ${firstName} 👋</p>
      <p style="line-height:1.6">Avant de démarrer ton accompagnement, prends 3 minutes pour remplir ton questionnaire de départ. Ça permet à ton coach de te préparer un programme vraiment adapté.</p>
      <p style="margin:24px 0">${button(url, "Remplir mon questionnaire")}</p>
      <p style="font-size:13px;color:#64748b">Ou copie ce lien : ${url}</p>
    `),
  );
}

export async function sendFollowupEmail(
  to: string,
  firstName: string,
  url: string,
): Promise<SendResult> {
  return send(
    to,
    "Ton point de la semaine 💪",
    layout(`
      <p style="font-size:16px">Salut ${firstName} !</p>
      <p style="line-height:1.6">C'est l'heure de ton retour hebdo. Fais le point sur ta semaine : ton coach lit chaque réponse pour ajuster ton programme. 2 minutes, pas plus.</p>
      <p style="margin:24px 0">${button(url, "Faire mon retour de la semaine")}</p>
      <p style="font-size:13px;color:#64748b">Ou copie ce lien : ${url}</p>
    `),
  );
}
