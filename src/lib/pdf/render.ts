import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

export interface SF425Values {
  // Header
  federalAgency: string;
  recipientOrg: string;
  recipientUei: string;
  fain: string;
  recipientEin: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;
  reportType: string; // "Quarterly" | "Annual" | "Final"
  basis: string; // "Cash" | "Accrual"

  // Financial lines
  line10a: string; // Cash receipts
  line10b: string; // Cash disbursements
  line10c: string; // Cash on hand
  line10d: string; // Total federal funds authorized
  line10e: string; // Federal share of expenditures
  line10f: string; // Federal share of unliquidated obligations
  line10g: string; // Total federal share
  line10h: string; // Unobligated balance of federal funds
  line10i: string; // Recipient share required
  line10j: string; // Recipient share of expenditures
  line10k: string; // Remaining recipient share to be provided

  // Line 11 - Indirect expense
  line11a_rate: string;
  line11a_base: string;
  line11a_amount: string;
  line11a_type: string;
  line11a_period: string;
  line11_total: string;

  // Line 12
  line12: string; // Remarks

  // Certification (box 13)
  certifierName: string;
  certifierTitle: string;
  certifierPhone: string;
  certifierEmail: string;
  certifiedDate: string;

  // Certification footer
  certificationFooter?: string;
}

function drawCell(
  page: PDFPage,
  font: PDFFont,
  boldFont: PDFFont,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });
  page.drawText(label, {
    x: x + 3,
    y: y - 9,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(value || "", {
    x: x + 3,
    y: y - 20,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
}

export async function renderSF425(values: SF425Values): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612; // Letter
  const pageHeight = 792;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  const page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // ── Title block ──
  page.drawRectangle({
    x: margin,
    y: y - 40,
    width: contentWidth,
    height: 40,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
  });
  page.drawText("FEDERAL FINANCIAL REPORT", {
    x: margin + contentWidth / 2 - 80,
    y: y - 16,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  page.drawText("(Follow form instructions)", {
    x: margin + contentWidth / 2 - 55,
    y: y - 28,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText("OMB Number: 4040-0014", {
    x: margin + contentWidth - 120,
    y: y - 10,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText("Expiration Date: 02/28/2025", {
    x: margin + contentWidth - 120,
    y: y - 20,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 48;

  // ── Header rows ──
  const colHalf = contentWidth / 2;
  const rowH = 28;

  drawCell(
    page,
    font,
    boldFont,
    "1. Federal Agency and Organizational Element",
    values.federalAgency,
    margin,
    y,
    colHalf,
    rowH,
  );
  drawCell(
    page,
    font,
    boldFont,
    "2. Federal Grant Number (FAIN)",
    values.fain,
    margin + colHalf,
    y,
    colHalf,
    rowH,
  );
  y -= rowH;

  drawCell(
    page,
    font,
    boldFont,
    "3. Recipient Organization",
    values.recipientOrg,
    margin,
    y,
    colHalf,
    rowH,
  );
  drawCell(
    page,
    font,
    boldFont,
    "4a. UEI",
    values.recipientUei,
    margin + colHalf,
    y,
    colHalf / 2,
    rowH,
  );
  drawCell(
    page,
    font,
    boldFont,
    "4b. EIN",
    values.recipientEin,
    margin + colHalf + colHalf / 2,
    y,
    colHalf / 2,
    rowH,
  );
  y -= rowH;

  const col3 = contentWidth / 3;
  drawCell(
    page,
    font,
    boldFont,
    "8. Report Period Start",
    values.reportPeriodStart,
    margin,
    y,
    col3,
    rowH,
  );
  drawCell(
    page,
    font,
    boldFont,
    "Report Period End",
    values.reportPeriodEnd,
    margin + col3,
    y,
    col3,
    rowH,
  );
  drawCell(
    page,
    font,
    boldFont,
    "9. Report Type: " + values.reportType,
    "Basis: " + values.basis,
    margin + col3 * 2,
    y,
    col3,
    rowH,
  );
  y -= rowH + 4;

  // ── Section 10: Transactions ──
  page.drawText("10. Transactions:", {
    x: margin,
    y,
    size: 8,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  const lineCol = 24;
  const valCol = 120;

  page.drawRectangle({
    x: margin,
    y: y - 14,
    width: contentWidth,
    height: 14,
    color: rgb(0.92, 0.92, 0.92),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });
  page.drawText("Federal Cash (Use lines a through c for the Reporting Period)", {
    x: margin + lineCol + 2,
    y: y - 10,
    size: 6,
    font: boldFont,
  });
  page.drawText("Cumulative", {
    x: margin + contentWidth - valCol + 20,
    y: y - 10,
    size: 6,
    font: boldFont,
  });
  y -= 14;

  const lines10: [string, string, string][] = [
    ["a.", "Cash Receipts", values.line10a],
    ["b.", "Cash Disbursements", values.line10b],
    ["c.", "Cash on Hand (line a minus b)", values.line10c],
    ["d.", "Total Federal Funds Authorized", values.line10d],
    ["e.", "Federal Share of Expenditures", values.line10e],
    ["f.", "Federal Share of Unliquidated Obligations", values.line10f],
    ["g.", "Total Federal Share (sum of lines e and f)", values.line10g],
    ["h.", "Unobligated Balance of Federal Funds (line d minus g)", values.line10h],
    ["i.", "Recipient Share Required", values.line10i],
    ["j.", "Recipient Share of Expenditures", values.line10j],
    ["k.", "Remaining Recipient Share to be Provided (line i minus j)", values.line10k],
  ];

  for (const [num, desc, val] of lines10) {
    if (num === "i.") {
      page.drawRectangle({
        x: margin,
        y: y - 12,
        width: contentWidth,
        height: 12,
        color: rgb(0.92, 0.92, 0.92),
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 0.5,
      });
      page.drawText("Recipient Share:", {
        x: margin + lineCol + 2,
        y: y - 9,
        size: 6,
        font: boldFont,
      });
      y -= 12;
    }

    page.drawRectangle({
      x: margin,
      y: y - 16,
      width: contentWidth,
      height: 16,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
      color: rgb(1, 1, 1),
    });
    page.drawText(num, { x: margin + 4, y: y - 11, size: 7, font: boldFont });
    page.drawText(desc, { x: margin + lineCol + 2, y: y - 11, size: 7, font });
    page.drawText(val || "$0.00", {
      x: margin + contentWidth - valCol + 4,
      y: y - 11,
      size: 8,
      font: boldFont,
    });
    y -= 16;
  }

  y -= 4;

  // ── Section 11: Indirect Expense ──
  page.drawText("11. Indirect Expense:", {
    x: margin,
    y,
    size: 8,
    font: boldFont,
  });
  y -= 14;

  page.drawRectangle({
    x: margin,
    y: y - 22,
    width: contentWidth,
    height: 22,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });
  const icColW = contentWidth / 5;
  page.drawText("a. Type", {
    x: margin + 3,
    y: y - 8,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(values.line11a_type || "", {
    x: margin + 3,
    y: y - 18,
    size: 7,
    font: boldFont,
  });
  page.drawText("Rate", {
    x: margin + icColW + 3,
    y: y - 8,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(values.line11a_rate || "", {
    x: margin + icColW + 3,
    y: y - 18,
    size: 7,
    font: boldFont,
  });
  page.drawText("Period", {
    x: margin + icColW * 2 + 3,
    y: y - 8,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(values.line11a_period || "", {
    x: margin + icColW * 2 + 3,
    y: y - 18,
    size: 7,
    font: boldFont,
  });
  page.drawText("Base", {
    x: margin + icColW * 3 + 3,
    y: y - 8,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(values.line11a_base || "", {
    x: margin + icColW * 3 + 3,
    y: y - 18,
    size: 7,
    font: boldFont,
  });
  page.drawText("Amount", {
    x: margin + icColW * 4 + 3,
    y: y - 8,
    size: 6,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(values.line11a_amount || "", {
    x: margin + icColW * 4 + 3,
    y: y - 18,
    size: 7,
    font: boldFont,
  });
  y -= 22;

  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 16,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
    color: rgb(0.97, 0.97, 0.97),
  });
  page.drawText("g. Totals (sum of lines a through f)", {
    x: margin + 4,
    y: y - 11,
    size: 7,
    font: boldFont,
  });
  page.drawText(values.line11_total || "$0.00", {
    x: margin + contentWidth - valCol + 4,
    y: y - 11,
    size: 8,
    font: boldFont,
  });
  y -= 20;

  // ── Section 12: Remarks ──
  page.drawText("12. Remarks:", { x: margin, y, size: 8, font: boldFont });
  y -= 12;
  page.drawRectangle({
    x: margin,
    y: y - 40,
    width: contentWidth,
    height: 40,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
  });
  const remarkLines = (values.line12 || "").split("\n").slice(0, 3);
  for (let i = 0; i < remarkLines.length; i++) {
    page.drawText(remarkLines[i].slice(0, 100), {
      x: margin + 3,
      y: y - 10 - i * 10,
      size: 7,
      font,
    });
  }
  y -= 44;

  // ── Section 13: Certification ──
  page.drawText("13. Certification:", { x: margin, y, size: 8, font: boldFont });
  y -= 10;
  page.drawText(
    "By signing this report, I certify to the best of my knowledge and belief that the report is true, complete,",
    { x: margin, y, size: 6, font, color: rgb(0.3, 0.3, 0.3) },
  );
  y -= 8;
  page.drawText(
    "and accurate, and the expenditures, disbursements and cash receipts are for the purposes set forth in the award documents.",
    { x: margin, y, size: 6, font, color: rgb(0.3, 0.3, 0.3) },
  );
  y -= 14;

  const certColW = contentWidth / 2;
  drawCell(page, font, boldFont, "a. Typed or Printed Name", values.certifierName, margin, y, certColW, 24);
  drawCell(
    page,
    font,
    boldFont,
    "b. Signature of Authorized Certifying Official",
    values.certifierName,
    margin + certColW,
    y,
    certColW,
    24,
  );
  y -= 24;
  drawCell(page, font, boldFont, "c. Title", values.certifierTitle, margin, y, certColW / 2, 24);
  drawCell(page, font, boldFont, "d. Phone", values.certifierPhone, margin + certColW / 2, y, certColW / 2, 24);
  drawCell(page, font, boldFont, "e. Email", values.certifierEmail, margin + certColW, y, certColW / 2, 24);
  drawCell(
    page,
    font,
    boldFont,
    "f. Date",
    values.certifiedDate,
    margin + certColW + certColW / 2,
    y,
    certColW / 2,
    24,
  );
  y -= 28;

  // ── Certification footer ──
  if (values.certificationFooter) {
    page.drawText(values.certificationFooter, {
      x: margin,
      y: 18,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  return doc.save();
}
