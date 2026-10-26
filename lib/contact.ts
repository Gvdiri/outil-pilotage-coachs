// Helpers de contact (WhatsApp click-to-chat).
// wa.me n'est PAS une intégration : c'est un simple lien, comme un mailto.

/** "+33 6 12 34 56 78" -> "https://wa.me/33612345678" (null si pas exploitable). */
export function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  // "06…" français sans indicatif -> on préfixe 33 en retirant le 0
  const normalized =
    phone.trim().startsWith("+") || digits.length > 10
      ? digits
      : digits.startsWith("0")
        ? "33" + digits.slice(1)
        : digits;
  return `https://wa.me/${normalized}`;
}
