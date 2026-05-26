import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  Footer,
  Header,
  BorderStyle,
  TableOfContents,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DraftSection } from "@/lib/grant-drafting/types";

export const maxDuration = 30;

interface ExportRequest {
  format: "pdf" | "docx";
  grantProgram: string;
  applicantName: string;
  sections: DraftSection[];
  generatedAt: string;
  overallCompleteness: number;
}

// ─── Strip HTML/annotation tags for clean export ───

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripAnnotations(text: string): string {
  return text
    .replace(/\[Source:[^\]]+\]/g, "")
    .replace(/\[NEEDS:[^\]]+\]/g, "[TO BE PROVIDED]")
    .replace(/\[To be provided by applicant\]/g, "[TO BE PROVIDED]")
    .trim();
}

// ─── DOCX Generation ───

async function generateDocx(data: ExportRequest): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 24 }, // 12pt
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: data.grantProgram,
                    italics: true,
                    size: 18,
                    color: "666666",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `${data.applicantName} — `, size: 18, color: "666666" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "666666" }),
                ],
              }),
            ],
          }),
        },
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
          },
        },
        children: [
          // Title
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: data.grantProgram, bold: true, size: 32 }),
            ],
          }),
          // Subtitle
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: `Application by ${data.applicantName}`, size: 24 }),
            ],
          }),
          // Date
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `Draft Generated: ${new Date(data.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
                size: 20,
                color: "666666",
              }),
            ],
          }),
          // Separator
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "333333" } },
            spacing: { after: 400 },
          }),
          // Sections
          ...data.sections.flatMap((section) => {
            const cleanContent = stripAnnotations(stripHtml(section.content));
            const paragraphs = cleanContent.split("\n\n").filter(Boolean);

            return [
              // Section heading
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 },
                children: [
                  new TextRun({
                    text: section.title,
                    bold: true,
                    size: 28,
                  }),
                  new TextRun({
                    text: ` (${section.weight}% of score)`,
                    italics: true,
                    size: 22,
                    color: "666666",
                  }),
                ],
              }),
              // Section paragraphs
              ...paragraphs.map(
                (p) =>
                  new Paragraph({
                    spacing: { after: 200, line: 360 }, // 1.5 line spacing
                    children: [new TextRun({ text: p, size: 24 })],
                  }),
              ),
            ];
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

// ─── PDF Generation ───

async function generatePdf(data: ExportRequest): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const pageWidth = 612; // Letter
  const pageHeight = 792;
  const margin = 72; // 1 inch
  const contentWidth = pageWidth - 2 * margin;
  const fontSize = 12;
  const headingSize = 16;
  const lineHeight = fontSize * 1.5;
  const headingHeight = headingSize * 1.8;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function addFooter(page: ReturnType<typeof pdfDoc.addPage>, pageNum: number) {
    page.drawText(`${data.applicantName} — Page ${pageNum}`, {
      x: margin,
      y: 36,
      size: 9,
      font: italicFont,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  function newPage(): ReturnType<typeof pdfDoc.addPage> {
    addFooter(currentPage, pdfDoc.getPageCount());
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    return currentPage;
  }

  function ensureSpace(needed: number) {
    if (y - needed < margin + 40) {
      newPage();
    }
  }

  // Helper to wrap text
  function wrapText(text: string, maxWidth: number, textFont: typeof font, textSize: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = textFont.widthOfTextAtSize(testLine, textSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Title page
  const titleLines = wrapText(data.grantProgram, contentWidth, boldFont, 20);
  y = pageHeight - margin - 100;
  for (const line of titleLines) {
    const titleWidth = boldFont.widthOfTextAtSize(line, 20);
    currentPage.drawText(line, {
      x: margin + (contentWidth - titleWidth) / 2,
      y,
      size: 20,
      font: boldFont,
    });
    y -= 28;
  }

  y -= 20;
  const subtitleText = `Application by ${data.applicantName}`;
  const subtitleWidth = font.widthOfTextAtSize(subtitleText, 14);
  currentPage.drawText(subtitleText, {
    x: margin + (contentWidth - subtitleWidth) / 2,
    y,
    size: 14,
    font,
  });

  y -= 30;
  const dateText = `Draft Generated: ${new Date(data.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
  const dateWidth = italicFont.widthOfTextAtSize(dateText, 11);
  currentPage.drawText(dateText, {
    x: margin + (contentWidth - dateWidth) / 2,
    y,
    size: 11,
    font: italicFont,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Content pages
  newPage();

  for (const section of data.sections) {
    ensureSpace(headingHeight + lineHeight * 3);

    // Section heading
    currentPage.drawText(section.title, {
      x: margin,
      y,
      size: headingSize,
      font: boldFont,
    });
    y -= 4;
    // Underline
    currentPage.drawLine({
      start: { x: margin, y },
      end: { x: margin + contentWidth, y },
      thickness: 0.5,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= headingHeight - 4;

    // Weight info
    const weightText = `${section.weight}% of score — ${section.wordCount} words`;
    currentPage.drawText(weightText, {
      x: margin,
      y,
      size: 9,
      font: italicFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= lineHeight;

    // Section content
    const cleanContent = stripAnnotations(stripHtml(section.content));
    const paragraphs = cleanContent.split("\n\n").filter(Boolean);

    for (const para of paragraphs) {
      const lines = wrapText(para, contentWidth, font, fontSize);
      for (const line of lines) {
        ensureSpace(lineHeight);
        currentPage.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
        });
        y -= lineHeight;
      }
      y -= lineHeight * 0.5; // paragraph spacing
    }

    y -= lineHeight; // section spacing
  }

  addFooter(currentPage, pdfDoc.getPageCount());

  return Buffer.from(await pdfDoc.save());
}

// ─── Route ───

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body: ExportRequest = await req.json();

    if (!body.format || !body.sections?.length) {
      return new Response(
        JSON.stringify({ error: "format and sections are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    let buffer: Buffer;
    let contentType: string;
    let filename: string;
    const safeName = body.grantProgram.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    if (body.format === "docx") {
      buffer = await generateDocx(body);
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      filename = `${safeName}-draft.docx`;
    } else {
      buffer = await generatePdf(body);
      contentType = "application/pdf";
      filename = `${safeName}-draft.pdf`;
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Export failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
