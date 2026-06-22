/**
 * BABA (Build America, Buy America) Compliance Report — PDF Renderer
 *
 * Generates a formatted BABA compliance tracking report using pdf-lib.
 * Per Infrastructure Investment and Jobs Act, Pub. L. 117-58, Section 70914.
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export interface BABALineItemPdf {
  description: string;
  manufacturer: string;
  origin: string;
  cost: string;
  domestic: boolean;
  waiverStatus: string;
}

export interface BABAPdfValues {
  // Header
  federalAgency: string;
  grantNumber: string;
  recipientName: string;
  program: string;
  awardTitle: string;

  // Period
  periodStart: string;
  periodEnd: string;

  // Compliance status
  overallCompliance: string;
  ironSteelCompliance: boolean;
  constructionMaterialsCompliance: boolean;
  manufacturedProductsCompliance: boolean;

  // Summary
  totalProcurementCost: string;
  domesticProcurementCost: string;
  foreignProcurementCost: string;
  domesticContentPercentage: number;

  // Waivers
  waiversTotal: number;
  waiversPending: number;
  waiversApproved: number;
  waiversDenied: number;

  // Line items
  lineItems: BABALineItemPdf[];

  // Certification
  certifierName: string;
  certifierTitle: string;
  certifiedDate: string;
}

// ─── Layout constants ───

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const GRAY = rgb(0.4, 0.4, 0.4);
const BLACK = rgb(0, 0, 0);
const TEAL = rgb(0.24, 0.545, 0.545);
const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.13, 0.55, 0.13);
const RED = rgb(0.7, 0.15, 0.15);
const AMBER = rgb(0.72, 0.53, 0.04);

function fmtDate(d: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function complianceColor(status: string) {
  if (status === "compliant") return GREEN;
  if (status === "non_compliant") return RED;
  if (status === "waiver_pending") return AMBER;
  return GRAY;
}

function complianceLabel(status: string): string {
  const map: Record<string, string> = { compliant: "COMPLIANT", non_compliant: "NON-COMPLIANT", waiver_pending: "WAIVER PENDING", not_applicable: "N/A" };
  return map[status] || status.toUpperCase();
}

export async function renderBABA(values: BABAPdfValues): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([PAGE_W, PAGE_H]);

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = PAGE_H - MARGIN;

  // ─── Title Banner ───
  page.drawRectangle({ x: MARGIN, y: y - 30, width: CONTENT_W, height: 30, color: TEAL });
  page.drawText("BUILD AMERICA, BUY AMERICA (BABA)", { x: MARGIN + 10, y: y - 22, size: 13, font: helveticaBold, color: WHITE });
  page.drawText("Compliance Report", { x: MARGIN + 310, y: y - 22, size: 11, font: helvetica, color: WHITE });
  y -= 45;

  // Subtitle
  page.drawText("Per Infrastructure Investment and Jobs Act (Pub. L. 117-58), Division G, Title IX, Section 70914", { x: MARGIN, y: y, size: 7, font: helvetica, color: GRAY });
  y -= 18;

  // ─── Section 1: Award Information ───
  y = drawSectionHeader(page, helveticaBold, "1. AWARD INFORMATION", y);
  y -= 5;

  y = drawFieldRow(page, helvetica, helveticaBold, [
    { label: "Federal Agency", value: values.federalAgency, width: CONTENT_W * 0.6 },
    { label: "Grant Number (FAIN)", value: values.grantNumber, width: CONTENT_W * 0.4 },
  ], y);
  y = drawFieldRow(page, helvetica, helveticaBold, [
    { label: "Recipient Organization", value: values.recipientName, width: CONTENT_W * 0.4 },
    { label: "Program", value: values.program, width: CONTENT_W * 0.25 },
    { label: "Reporting Period", value: `${fmtDate(values.periodStart)} – ${fmtDate(values.periodEnd)}`, width: CONTENT_W * 0.35 },
  ], y);

  y -= 10;

  // ─── Section 2: Overall Compliance Status ───
  y = drawSectionHeader(page, helveticaBold, "2. OVERALL COMPLIANCE STATUS", y);
  y -= 8;

  const statusLabel = complianceLabel(values.overallCompliance);
  const statusColor = complianceColor(values.overallCompliance);

  // Status badge
  const badgeW = helveticaBold.widthOfTextAtSize(statusLabel, 11) + 20;
  page.drawRectangle({ x: MARGIN + 5, y: y - 18, width: badgeW, height: 18, color: statusColor, borderColor: statusColor, borderWidth: 1 });
  page.drawText(statusLabel, { x: MARGIN + 15, y: y - 14, size: 11, font: helveticaBold, color: WHITE });

  // Domestic content percentage
  const pctText = `${values.domesticContentPercentage}% Domestic Content`;
  page.drawText(pctText, { x: MARGIN + badgeW + 25, y: y - 14, size: 11, font: helveticaBold, color: values.domesticContentPercentage === 100 ? GREEN : values.domesticContentPercentage >= 80 ? AMBER : RED });

  y -= 30;

  // ─── Section 3: Domestic Preference (Section 70914) ───
  y = drawSectionHeader(page, helveticaBold, "3. DOMESTIC PREFERENCE — SECTION 70914", y);
  y -= 8;

  const checks: { label: string; desc: string; pass: boolean }[] = [
    { label: "Iron & Steel", desc: "All iron and steel produced in the United States", pass: values.ironSteelCompliance },
    { label: "Construction Materials", desc: "All construction materials manufactured in the United States", pass: values.constructionMaterialsCompliance },
    { label: "Manufactured Products", desc: "All manufactured products produced in the United States", pass: values.manufacturedProductsCompliance },
  ];

  for (const check of checks) {
    const icon = check.pass ? "✓" : "✗";
    const iconColor = check.pass ? GREEN : RED;
    page.drawText(icon, { x: MARGIN + 10, y: y - 4, size: 12, font: helveticaBold, color: iconColor });
    page.drawText(check.label, { x: MARGIN + 28, y: y - 3, size: 9, font: helveticaBold, color: BLACK });
    page.drawText(` — ${check.desc}`, { x: MARGIN + 28 + helveticaBold.widthOfTextAtSize(check.label, 9), y: y - 3, size: 8, font: helvetica, color: GRAY });
    y -= 16;
  }

  y -= 8;

  // ─── Section 4: Procurement Cost Summary ───
  y = drawSectionHeader(page, helveticaBold, "4. PROCUREMENT COST SUMMARY", y);
  y -= 5;

  // Cost table
  const costRows: { label: string; value: string; color: ReturnType<typeof rgb> }[] = [
    { label: "Domestic Procurement", value: values.domesticProcurementCost, color: GREEN },
    { label: "Foreign Procurement", value: values.foreignProcurementCost, color: values.foreignProcurementCost !== "$0" ? RED : GRAY },
  ];

  for (const row of costRows) {
    page.drawText(row.label, { x: MARGIN + 10, y: y - 12, size: 9, font: helvetica, color: BLACK });
    page.drawText(row.value, { x: PAGE_W - MARGIN - 10 - helveticaBold.widthOfTextAtSize(row.value, 10), y: y - 12, size: 10, font: helveticaBold, color: row.color });
    y -= 20;
  }

  // Total line
  page.drawLine({ start: { x: MARGIN + 5, y: y }, end: { x: PAGE_W - MARGIN - 5, y: y }, thickness: 0.75, color: GRAY });
  y -= 5;
  page.drawText("Total Procurement", { x: MARGIN + 10, y: y - 12, size: 9, font: helveticaBold, color: BLACK });
  page.drawText(values.totalProcurementCost, { x: PAGE_W - MARGIN - 10 - helveticaBold.widthOfTextAtSize(values.totalProcurementCost, 10), y: y - 12, size: 10, font: helveticaBold, color: BLACK });
  y -= 20;

  // Progress bar
  const barX = MARGIN + 10;
  const barW = CONTENT_W - 20;
  const barH = 8;
  page.drawRectangle({ x: barX, y: y - barH, width: barW, height: barH, color: LIGHT_GRAY });
  const fillW = Math.round(barW * values.domesticContentPercentage / 100);
  if (fillW > 0) {
    page.drawRectangle({ x: barX, y: y - barH, width: fillW, height: barH, color: GREEN });
  }
  y -= barH + 5;
  const barLabel = `${values.domesticContentPercentage}% domestic content`;
  const barLabelW = helvetica.widthOfTextAtSize(barLabel, 7);
  page.drawText(barLabel, { x: barX + (barW - barLabelW) / 2, y: y - 5, size: 7, font: helvetica, color: GRAY });
  y -= 15;

  // ─── Section 5: Waiver Summary ───
  if (values.waiversTotal > 0) {
    y = drawSectionHeader(page, helveticaBold, "5. WAIVER REQUESTS", y);
    y -= 8;

    const waiverCols: { label: string; value: string; color: ReturnType<typeof rgb> }[] = [
      { label: "Total", value: String(values.waiversTotal), color: BLACK },
      { label: "Pending", value: String(values.waiversPending), color: AMBER },
      { label: "Approved", value: String(values.waiversApproved), color: GREEN },
      { label: "Denied", value: String(values.waiversDenied), color: RED },
    ];

    const colW = CONTENT_W / 4;
    let cx = MARGIN;
    for (const col of waiverCols) {
      const labelW = helvetica.widthOfTextAtSize(col.label, 7);
      const valueW = helveticaBold.widthOfTextAtSize(col.value, 16);
      page.drawText(col.label, { x: cx + (colW - labelW) / 2, y: y - 8, size: 7, font: helvetica, color: GRAY });
      page.drawText(col.value, { x: cx + (colW - valueW) / 2, y: y - 26, size: 16, font: helveticaBold, color: col.color });
      cx += colW;
    }
    y -= 35;
  }

  // ─── Section 6: Materials & Products Tracking ───
  const sectionNum = values.waiversTotal > 0 ? "6" : "5";
  y = drawSectionHeader(page, helveticaBold, `${sectionNum}. MATERIALS & PRODUCTS TRACKING`, y);
  y -= 5;

  if (values.lineItems.length === 0) {
    page.drawText("No procurement activity recorded for this period.", { x: MARGIN + 10, y: y - 12, size: 9, font: helvetica, color: GRAY });
    y -= 25;
  } else {
    // Table header
    const cols = [
      { label: "Description", x: MARGIN, w: 180 },
      { label: "Manufacturer", x: MARGIN + 180, w: 110 },
      { label: "Origin", x: MARGIN + 290, w: 80 },
      { label: "Cost", x: MARGIN + 370, w: 70 },
      { label: "Domestic", x: MARGIN + 440, w: 45 },
      { label: "Waiver", x: MARGIN + 485, w: 27 },
    ];

    page.drawRectangle({ x: MARGIN, y: y - 14, width: CONTENT_W, height: 14, color: LIGHT_GRAY });
    for (const col of cols) {
      page.drawText(col.label, { x: col.x + 3, y: y - 10, size: 6.5, font: helveticaBold, color: GRAY });
    }
    y -= 14;

    // Rows (max ~15 to fit on page)
    const maxRows = Math.min(values.lineItems.length, 15);
    for (let i = 0; i < maxRows; i++) {
      const item = values.lineItems[i];
      const rowH = 18;

      // Check if we need a new page
      if (y - rowH < MARGIN + 100) {
        // Add footer to current page
        drawFooter(page, helvetica);
        // Create new page
        page = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }

      page.drawLine({ start: { x: MARGIN, y: y - rowH }, end: { x: PAGE_W - MARGIN, y: y - rowH }, thickness: 0.3, color: LIGHT_GRAY });

      // Truncate long text
      const descTrunc = truncateText(item.description, 38);
      const mfgTrunc = truncateText(item.manufacturer, 22);
      const originTrunc = truncateText(item.origin, 16);

      page.drawText(descTrunc, { x: cols[0].x + 3, y: y - 12, size: 7.5, font: helvetica, color: BLACK });
      page.drawText(mfgTrunc, { x: cols[1].x + 3, y: y - 12, size: 7.5, font: helvetica, color: GRAY });
      page.drawText(originTrunc, { x: cols[2].x + 3, y: y - 12, size: 7.5, font: helvetica, color: BLACK });
      page.drawText(item.cost, { x: cols[3].x + 3, y: y - 12, size: 7.5, font: helvetica, color: BLACK });
      page.drawText(item.domestic ? "Yes" : "No", { x: cols[4].x + 12, y: y - 12, size: 7.5, font: helveticaBold, color: item.domestic ? GREEN : RED });
      if (item.waiverStatus && item.waiverStatus !== "-") {
        page.drawText(item.waiverStatus, { x: cols[5].x + 3, y: y - 12, size: 6.5, font: helvetica, color: AMBER });
      } else {
        page.drawText("—", { x: cols[5].x + 8, y: y - 12, size: 7.5, font: helvetica, color: GRAY });
      }

      y -= rowH;
    }

    if (values.lineItems.length > maxRows) {
      y -= 5;
      page.drawText(`... and ${values.lineItems.length - maxRows} additional item(s)`, { x: MARGIN + 10, y: y - 8, size: 7, font: helvetica, color: GRAY });
      y -= 15;
    }

    // Table border
    page.drawRectangle({
      x: MARGIN, y: y, width: CONTENT_W, height: 0,
      borderColor: GRAY, borderWidth: 0.5,
    });
  }

  y -= 10;

  // ─── Certification ───
  const certNum = values.waiversTotal > 0 ? "7" : "6";

  // Check if certification fits on current page
  if (y < MARGIN + 110) {
    drawFooter(page, helvetica);
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  y = drawSectionHeader(page, helveticaBold, `${certNum}. CERTIFICATION`, y);
  y -= 5;

  const certText = "I certify that to the best of my knowledge and belief, all iron, steel, manufactured products, and construction materials used in this federally funded project comply with the Build America, Buy America Act (Pub. L. 117-58, Division G, Title IX, Subtitle A, Section 70914), unless a waiver has been granted by the federal awarding agency.";
  y = drawWrappedText(page, helvetica, certText, MARGIN + 5, y, CONTENT_W - 10, 7.5, 10, GRAY);
  y -= 12;

  y = drawFieldRow(page, helvetica, helveticaBold, [
    { label: "Typed or Printed Name", value: values.certifierName, width: CONTENT_W * 0.4 },
    { label: "Title", value: values.certifierTitle, width: CONTENT_W * 0.35 },
    { label: "Date", value: fmtDate(values.certifiedDate), width: CONTENT_W * 0.25 },
  ], y);

  y -= 8;
  page.drawText("Signature:", { x: MARGIN + 5, y: y, size: 8, font: helvetica, color: GRAY });
  page.drawLine({ start: { x: MARGIN + 55, y: y - 2 }, end: { x: MARGIN + CONTENT_W * 0.5, y: y - 2 }, thickness: 0.5, color: GRAY });

  // Footer
  drawFooter(page, helvetica);

  return doc.save();
}

// ─── Helpers ───

function drawFooter(page: PDFPage, font: PDFFont) {
  const y = MARGIN - 15;
  page.drawLine({ start: { x: MARGIN, y: y + 10 }, end: { x: PAGE_W - MARGIN, y: y + 10 }, thickness: 0.5, color: LIGHT_GRAY });
  page.drawText("Build America, Buy America Act — Section 70914 Compliance Report", { x: MARGIN, y, size: 7, font, color: GRAY });
  page.drawText("Generated by Corvo", { x: PAGE_W - MARGIN - 95, y, size: 7, font, color: GRAY });
}

function drawSectionHeader(page: PDFPage, font: PDFFont, title: string, y: number): number {
  page.drawRectangle({ x: MARGIN, y: y - 16, width: CONTENT_W, height: 16, color: rgb(0.95, 0.95, 0.95) });
  page.drawLine({ start: { x: MARGIN, y: y - 16 }, end: { x: PAGE_W - MARGIN, y: y - 16 }, thickness: 0.75, color: TEAL });
  page.drawText(title, { x: MARGIN + 8, y: y - 12, size: 8, font, color: TEAL });
  return y - 22;
}

function drawFieldRow(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  fields: { label: string; value: string; width: number }[],
  y: number,
): number {
  let x = MARGIN;
  const rowH = 32;

  for (const field of fields) {
    page.drawText(field.label, { x: x + 5, y: y - 10, size: 7, font, color: GRAY });
    const valueText = field.value || "";
    // Truncate value if too wide
    const maxChars = Math.floor(field.width / 5.5);
    const display = valueText.length > maxChars ? valueText.slice(0, maxChars - 1) + "…" : valueText;
    page.drawText(display, { x: x + 5, y: y - 24, size: 9, font: boldFont, color: BLACK });
    page.drawLine({ start: { x, y: y - rowH }, end: { x: x + field.width, y: y - rowH }, thickness: 0.5, color: LIGHT_GRAY });
    x += field.width;
  }

  return y - rowH - 2;
}

function drawWrappedText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
  color: ReturnType<typeof rgb>,
): number {
  const words = text.split(" ");
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      page.drawText(currentLine, { x, y, size: fontSize, font, color });
      y -= lineHeight;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    page.drawText(currentLine, { x, y, size: fontSize, font, color });
    y -= lineHeight;
  }

  return y;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}
