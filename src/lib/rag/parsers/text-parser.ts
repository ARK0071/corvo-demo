/**
 * Plain text / markdown parser for document RAG ingestion.
 * Splits text into pages (if applicable) and returns structured output.
 */

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  title: string;
  pageCount: number;
  pages: ParsedPage[];
  fullText: string;
}

/**
 * Parse plain text or markdown into a ParsedDocument.
 * Since there are no real "pages", we treat the whole text as page 1
 * or split on markdown headings if the document is large.
 */
export function parseText(
  text: string,
  title: string = "Untitled"
): ParsedDocument {
  const trimmed = text.trim();

  // For shorter documents, single page
  if (trimmed.length < 5000) {
    return {
      title,
      pageCount: 1,
      pages: [{ pageNumber: 1, text: trimmed }],
      fullText: trimmed,
    };
  }

  // For longer docs, split on major headings (# or ##)
  // to create "virtual pages" for page number tracking
  const sections = trimmed.split(/\n(?=#{1,2}\s)/);
  const pages: ParsedPage[] = sections
    .filter((s) => s.trim().length > 0)
    .map((s, i) => ({
      pageNumber: i + 1,
      text: s.trim(),
    }));

  return {
    title,
    pageCount: pages.length,
    pages,
    fullText: trimmed,
  };
}
