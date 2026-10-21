/**
 * Builds a deep link into a requirement's source document.
 *
 * PDF sources → `#page=N` (browser PDF viewer jumps to the page).
 * Web sources (e.g. riksdagen.se) → a text fragment `#:~:text=...` which
 * scrolls to and highlights the exact paragraph in Chrome/Edge/Safari.
 */

export function isPdfUrl(url: string): boolean {
  return /\.pdf($|[?#])/i.test(url);
}

function textFragment(snippet: string): string | null {
  const clean = snippet.replace(/\s+/g, ' ').trim();
  if (clean.length < 12) return null;
  // Keep the fragment short — long fragments rarely match due to line breaks.
  const start = clean.slice(0, 70).trim();
  return encodeURIComponent(start);
}

export interface SourceLinkInput {
  documentUrl: string | null | undefined;
  page?: number | null;
  excerpt?: string | null;
  chapterSection?: string | null;
}

export function buildSourceLink({ documentUrl, page, excerpt, chapterSection }: SourceLinkInput): string | null {
  if (!documentUrl) return null;

  if (isPdfUrl(documentUrl)) {
    return page != null ? `${documentUrl}#page=${page}` : documentUrl;
  }

  const fragment = textFragment(excerpt || '') || textFragment(chapterSection || '');
  return fragment ? `${documentUrl}#:~:text=${fragment}` : documentUrl;
}

/** Short human label for the link, e.g. "s. 47" or "2 kap. 5 §". */
export function sourceLinkLabel({ documentUrl, page, chapterSection }: SourceLinkInput): string | null {
  if (!documentUrl) return null;
  if (isPdfUrl(documentUrl)) return page != null ? `s. ${page}` : null;
  return chapterSection?.trim() || null;
}
