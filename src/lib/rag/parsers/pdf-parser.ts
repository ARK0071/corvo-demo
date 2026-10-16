/**
 * PDF parser for document RAG ingestion.
 * Extracts raw text from PDF buffers using pdf-parse.
 */

import pdfParse from "pdf-parse";

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
 * Parse a PDF buffer into text with page boundaries.
 *
 * pdf-parse returns the full text and page count but doesn't give
 * per-page text natively. We use the pagerender callback to capture
 * text per page.
 */
export async function parsePdf(
  buffer: Buffer,
  title?: string
): Promise<ParsedDocument> {
  const pages: ParsedPage[] = [];

  const result = await pdfParse(buffer, {
    // Custom page renderer to capture per-page text
    pagerender: async (pageData: any) => {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      pages.push({
        pageNumber: pageData.pageIndex + 1,
        text: pageText,
      });

      return pageText;
    },
  });

  // If pagerender didn't populate pages, fall back to splitting by form feed
  if (pages.length === 0 && result.text) {
    const rawPages = result.text.split(/\f/);
    for (let i = 0; i < rawPages.length; i++) {
      const text = rawPages[i].trim();
      if (text) {
        pages.push({ pageNumber: i + 1, text });
      }
    }
  }

  return {
    title: title ?? result.info?.Title ?? "Untitled PDF",
    pageCount: result.numpages,
    pages,
    fullText: result.text,
  };
}
