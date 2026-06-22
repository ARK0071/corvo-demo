/**
 * SF-270 Request for Advance or Reimbursement — PDF Renderer
 *
 * Fills the official OMB Standard Form 270 template PDF.
 * Uses the same template-filling pattern as the SF-425 renderer.
 */

import { PDFDocument, PDFTextField, PDFRadioGroup } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

export interface SF270PdfValues {
  // Header (page 1)
  federalSponsoringAgency: string;
  grantNumber: string;
  requestNumber: string;
  ein?: string;
  recipientAccountNumber?: string;

  // Computation period dates
  computationPeriodStart: string;
  computationPeriodEnd: string;

  // Recipient info (3 lines)
  recipientName: string;
  recipientAddress: string;
  recipientCityState?: string;

  // Payee (if different)
  payeeName?: string;
  payeeAddress?: string;
  payeeCityState?: string;

  // Programs/functions (up to 3 columns)
  programs?: string[];

  // Radio group selections
  paymentType: "advance" | "reimbursement";
  paymentScope?: "final" | "partial";
  basis?: "cash" | "accrual";

  // Financial lines — the official form supports 3 funding columns
  // We fill column 1 with the primary values; columns 2/3 left empty
  lineA: string; // Total program outlays to date
  lineB: string; // Less: Non-federal share of outlays
  lineC: string; // Federal share (a minus b)
  lineD: string; // Federal payments previously received
  lineE: string; // Federal share now requested (c minus d)
  lineF: string; // Non-federal disbursements
  lineG: string; // Federal share of unliquidated obligations
  lineH: string; // Total federal share (line e + g)

  // Advance fields (if advance request)
  advanceFields?: {
    estimatedDisbursements1?: string;
    estimatedDisbursements2?: string;
    estimatedDisbursements3?: string;
  };

  // Totals row
  totalA?: string;
  totalB?: string;
  totalC?: string;
  totalD?: string;
  totalE?: string;

  // Summary fields (page 2)
  cashOnHand?: string;
  balance?: string;
  amountToSend?: string;
  amountRequested?: string;

  // Non-federal share of expenditures
  nfse?: string;
  // Federal share of expenditures
  fse?: string;
  // Prior period federal funds received
  pffr?: string;
  // As of date
  asOfDate?: string;

  // Certification
  certifierName: string;
  certifierPhone?: string;
  certifiedDate: string;
}

// ─── Template loading ───

let templateBytes: Buffer | null = null;

function loadTemplate(): Buffer {
  if (templateBytes) return templateBytes;
  const candidates = [
    join(process.cwd(), "src", "lib", "pdf", "SF-270_template.pdf"),
    join(__dirname, "SF-270_template.pdf"),
    join(__dirname, "..", "..", "..", "src", "lib", "pdf", "SF-270_template.pdf"),
  ];
  for (const p of candidates) {
    try {
      templateBytes = readFileSync(p);
      return templateBytes;
    } catch {
      // Try next candidate
    }
  }
  throw new Error("SF-270 template PDF not found");
}

function setTextField(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string | undefined) {
  if (!value) return;
  try {
    const field = form.getField(name);
    if (field instanceof PDFTextField) {
      field.setText(value);
    }
  } catch {
    // Field not found — skip silently
  }
}

function selectRadio(form: ReturnType<PDFDocument["getForm"]>, name: string, value: string | undefined) {
  if (!value) return;
  try {
    const field = form.getField(name);
    if (field instanceof PDFRadioGroup) {
      field.select(value);
    }
  } catch {
    // Field not found — skip silently
  }
}

export async function renderSF270(values: SF270PdfValues): Promise<Uint8Array> {
  const template = loadTemplate();
  const doc = await PDFDocument.load(template);
  const form = doc.getForm();

  // ─── Header fields ───
  setTextField(form, "sponsor", values.federalSponsoringAgency);
  setTextField(form, "award", values.grantNumber);
  setTextField(form, "request_no", values.requestNumber);
  setTextField(form, "ein", values.ein);
  setTextField(form, "account", values.recipientAccountNumber);

  // Computation period dates
  setTextField(form, "date.1", values.computationPeriodStart);
  setTextField(form, "date.2", values.computationPeriodEnd);

  // Recipient info (3 lines)
  setTextField(form, "recipient.1", values.recipientName);
  setTextField(form, "recipient.2", values.recipientAddress);
  setTextField(form, "recipient.3", values.recipientCityState);

  // Payee (if different from recipient)
  setTextField(form, "payee.1", values.payeeName);
  setTextField(form, "payee.2", values.payeeAddress);
  setTextField(form, "payee.3", values.payeeCityState);

  // Programs/functions (up to 3 columns)
  if (values.programs) {
    if (values.programs[0]) setTextField(form, "prog.1", values.programs[0]);
    if (values.programs[1]) setTextField(form, "prog.2", values.programs[1]);
    if (values.programs[2]) setTextField(form, "prog.3", values.programs[2]);
  }

  // ─── Radio groups ───
  selectRadio(form, "pmta", values.paymentType);
  selectRadio(form, "pmtb", values.paymentScope);
  selectRadio(form, "reqb", values.basis);

  // ─── Financial lines (column 1) ───
  setTextField(form, "a.1", values.lineA);
  setTextField(form, "b.1", values.lineB);
  setTextField(form, "c.1", values.lineC);
  setTextField(form, "d.1", values.lineD);
  setTextField(form, "e.1", values.lineE);
  setTextField(form, "f.1", values.lineF);
  setTextField(form, "g.1", values.lineG);
  setTextField(form, "h.1", values.lineH);

  // Advance fields (if advance request)
  if (values.advanceFields) {
    setTextField(form, "advance.1", values.advanceFields.estimatedDisbursements1);
    setTextField(form, "advance.2", values.advanceFields.estimatedDisbursements2);
    setTextField(form, "advance.3", values.advanceFields.estimatedDisbursements3);
  }

  // Totals row
  setTextField(form, "total.1", values.totalA || values.lineA);
  setTextField(form, "total.2", values.totalB || values.lineB);
  setTextField(form, "total.3", values.totalC || values.lineC);
  setTextField(form, "total.4", values.totalD || values.lineD);
  setTextField(form, "total.5", values.totalE || values.lineE);

  // ─── Summary fields (page 2) ───
  setTextField(form, "cash", values.cashOnHand);
  setTextField(form, "balance", values.balance);
  setTextField(form, "send", values.amountToSend);
  setTextField(form, "requested", values.amountRequested || values.lineE);

  setTextField(form, "nfse", values.nfse);
  setTextField(form, "fse", values.fse);
  setTextField(form, "pffr", values.pffr);
  setTextField(form, "As of Date", values.asOfDate);

  // J lines (column 1 — adjustments)
  // Leave empty by default

  // ─── Certification ───
  setTextField(form, "name", values.certifierName);
  setTextField(form, "phone", values.certifierPhone);
  setTextField(form, "Today", values.certifiedDate);

  // Page numbers
  setTextField(form, "page.1", "1");
  setTextField(form, "page.2", "2");

  // Flatten the form so fields become static text
  form.flatten();

  return doc.save();
}
