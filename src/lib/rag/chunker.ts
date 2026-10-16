/**
 * Section-aware chunker for document RAG ingestion.
 *
 * Chunks text while respecting section boundaries (§, Section, numbered headings).
 * Each chunk carries section, pageNumber, and heading metadata for citations.
 *
 * Target: ~500 tokens per chunk with 50-token overlap.
 * A token is approximately 4 characters.
 */

export interface DocumentChunkData {
  chunkIndex: number;
  content: string;
  section: string | null;
  pageNumber: number | null;
  metadata: {
    heading?: string;
    parentSection?: string;
  };
}

interface PagedText {
  pageNumber: number;
  text: string;
}

const TARGET_CHUNK_CHARS = 2000; // ~500 tokens
const OVERLAP_CHARS = 200; // ~50 tokens
const MIN_CHUNK_CHARS = 200; // Don't create tiny chunks

// Patterns that indicate section boundaries
const SECTION_BOUNDARY_PATTERNS = [
  /^§\s*\d+/m, // §200.403
  /^Section\s+[IVXLC\d]+/im, // Section IV.B.2
  /^PART\s+\d+/im, // PART 200
  /^Subpart\s+[A-Z]/im, // Subpart A
  /^(?:ARTICLE|Article)\s+\d+/m, // Article 1
  /^\d+\.\d+(?:\.\d+)*\s+[A-Z]/m, // 200.403 Factors...
  /^[A-Z][a-z]*\s+\d+[-–]\s/m, // Title 2 -
  /^#{1,3}\s+/m, // Markdown headings
];

/**
 * Extract the section identifier from a line of text.
 */
function extractSection(line: string): string | null {
  // §200.403 style
  const cfr = line.match(/§\s*(\d+(?:\.\d+)*)/);
  if (cfr) return `§${cfr[1]}`;

  // Section IV.B.2 style
  const sec = line.match(/Section\s+([IVXLC\d]+(?:\.[A-Z0-9.]+)*)/i);
  if (sec) return `Section ${sec[1]}`;

  // 200.403 Factors style
  const num = line.match(/^(\d+\.\d+(?:\.\d+)*)\s/);
  if (num) return `§${num[1]}`;

  // Subpart A style
  const sub = line.match(/Subpart\s+([A-Z])/i);
  if (sub) return `Subpart ${sub[1]}`;

  return null;
}

/**
 * Extract heading text from a line (for metadata).
 */
function extractHeading(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return null;

  // Markdown heading
  const md = trimmed.match(/^#{1,3}\s+(.+)/);
  if (md) return md[1].trim();

  // Section/§ heading (take the full line as heading)
  if (SECTION_BOUNDARY_PATTERNS.some((p) => p.test(trimmed))) {
    return trimmed.slice(0, 150);
  }

  return null;
}

/**
 * Check if a line is a section boundary.
 */
function isSectionBoundary(line: string): boolean {
  const trimmed = line.trim();
  return SECTION_BOUNDARY_PATTERNS.some((p) => p.test(trimmed));
}

/**
 * Chunk a document into sections respecting structural boundaries.
 *
 * @param pages - Array of pages with text and page numbers
 * @param docType - Document type for metadata
 */
export function chunkDocument(
  pages: PagedText[]
): DocumentChunkData[] {
  const chunks: DocumentChunkData[] = [];
  let chunkIndex = 0;

  // First, merge all pages into lines with page tracking
  const lines: Array<{ text: string; pageNumber: number }> = [];
  for (const page of pages) {
    const pageLines = page.text.split("\n");
    for (const line of pageLines) {
      lines.push({ text: line, pageNumber: page.pageNumber });
    }
  }

  let currentChunk = "";
  let currentSection: string | null = null;
  let currentHeading: string | null = null;
  let currentPageNumber: number | null = pages[0]?.pageNumber ?? null;
  let parentSection: string | null = null;

  for (const { text: line, pageNumber } of lines) {
    const trimmed = line.trim();

    // Check for section boundary
    if (isSectionBoundary(trimmed) && currentChunk.length >= MIN_CHUNK_CHARS) {
      // Flush current chunk
      if (currentChunk.trim().length >= MIN_CHUNK_CHARS) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: currentChunk.trim(),
          section: currentSection,
          pageNumber: currentPageNumber,
          metadata: {
            heading: currentHeading ?? undefined,
            parentSection: parentSection ?? undefined,
          },
        });
      }

      // Start new chunk with overlap from end of previous
      const overlap = currentChunk.slice(-OVERLAP_CHARS);
      currentChunk = overlap;
      parentSection = currentSection;
      currentSection = extractSection(trimmed) ?? currentSection;
      currentHeading = extractHeading(trimmed);
      currentPageNumber = pageNumber;
    }

    // Check for section without flushing (first section or small chunks)
    if (isSectionBoundary(trimmed)) {
      const newSection = extractSection(trimmed);
      if (newSection) {
        if (!currentSection) parentSection = null;
        else parentSection = currentSection;
        currentSection = newSection;
      }
      const heading = extractHeading(trimmed);
      if (heading) currentHeading = heading;
      if (!currentPageNumber) currentPageNumber = pageNumber;
    }

    currentChunk += (currentChunk ? "\n" : "") + line;

    // If chunk exceeds target, split at a natural break
    if (currentChunk.length >= TARGET_CHUNK_CHARS) {
      // Try to split at paragraph boundary
      const lastParagraph = currentChunk.lastIndexOf("\n\n");
      const lastSentence = currentChunk.lastIndexOf(". ");
      const splitPoint =
        lastParagraph > TARGET_CHUNK_CHARS * 0.5
          ? lastParagraph
          : lastSentence > TARGET_CHUNK_CHARS * 0.3
            ? lastSentence + 1
            : TARGET_CHUNK_CHARS;

      const chunkText = currentChunk.slice(0, splitPoint).trim();
      if (chunkText.length >= MIN_CHUNK_CHARS) {
        chunks.push({
          chunkIndex: chunkIndex++,
          content: chunkText,
          section: currentSection,
          pageNumber: currentPageNumber,
          metadata: {
            heading: currentHeading ?? undefined,
            parentSection: parentSection ?? undefined,
          },
        });
      }

      // Keep overlap + remainder
      currentChunk = currentChunk.slice(
        Math.max(0, splitPoint - OVERLAP_CHARS)
      );
      currentPageNumber = pageNumber;
    }
  }

  // Flush remaining content
  if (currentChunk.trim().length >= MIN_CHUNK_CHARS) {
    chunks.push({
      chunkIndex: chunkIndex++,
      content: currentChunk.trim(),
      section: currentSection,
      pageNumber: currentPageNumber,
      metadata: {
        heading: currentHeading ?? undefined,
        parentSection: parentSection ?? undefined,
      },
    });
  } else if (currentChunk.trim().length > 0 && chunks.length > 0) {
    // Append tiny remainder to last chunk
    chunks[chunks.length - 1].content +=
      "\n" + currentChunk.trim();
  }

  return chunks;
}
