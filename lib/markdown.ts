// Mini-rendu markdown sans dépendance (module Docs).
// Couvre : titres, gras/italique, code inline, listes, citations, liens, hr.
// Le HTML est échappé AVANT tout rendu : aucune injection possible.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return (
    s
      // code inline d'abord (son contenu ne doit pas être re-formaté)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // liens [texte](url) — uniquement http(s)
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      )
  );
}

export function renderMarkdown(md: string): string {
  const lines = escapeHtml(md).split(/\r?\n/);
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inQuote = false;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push("</blockquote>");
      inQuote = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      closeQuote();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      closeList();
      closeQuote();
      out.push("<hr />");
      continue;
    }

    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      closeList();
      if (!inQuote) {
        out.push("<blockquote>");
        inQuote = true;
      }
      out.push(`<p>${inline(quote[1])}</p>`);
      continue;
    }
    closeQuote();

    const ulItem = line.match(/^[-*]\s+(.*)$/);
    const olItem = line.match(/^\d+[.)]\s+(.*)$/);
    if (ulItem || olItem) {
      const type = ulItem ? "ul" : "ol";
      if (listType !== type) {
        closeList();
        out.push(`<${type}>`);
        listType = type;
      }
      out.push(`<li>${inline((ulItem ?? olItem)![1])}</li>`);
      continue;
    }
    closeList();

    if (line.trim() === "") continue;
    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  closeQuote();
  return out.join("\n");
}

/** "prospection, dm, modele" -> ["prospection", "dm", "modele"] */
export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}
