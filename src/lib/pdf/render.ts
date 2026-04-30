import { PDFDocument, PDFCheckBox, PDFTextField } from "pdf-lib";
import { readFileSync } from "fs";
import { join } from "path";

export interface SF425Values {
  federalAgency: string;
  fain: string;
  recipientOrg: string;
  recipientStreet1?: string;
  recipientCityState?: string;
  recipientUei: string;
  recipientEin: string;
  recipientAccountNumber?: string;

  reportType: "Quarterly" | "Semi-Annual" | "Annual" | "Final";
  basis: "Cash" | "Accrual";

  projectPeriodFrom?: string;
  projectPeriodTo?: string;
  reportPeriodStart: string;
  reportPeriodEnd: string;

  line10a: string;
  line10b: string;
  line10c: string;
  line10d: string;
  line10e: string;
  line10f: string;
  line10g: string;
  line10h: string;
  line10i: string;
  line10j: string;
  line10k: string;

  line10l?: string;
  line10m?: string;
  line10n?: string;
  line10o?: string;

  line11a_type: string;
  line11a_rate: string;
  line11a_periodFrom?: string;
  line11a_periodTo?: string;
  line11a_period: string;
  line11a_base: string;
  line11a_amount: string;
  line11a_fedShare?: string;
  line11_total: string;
  line11_totalBase?: string;
  line11_totalFedShare?: string;

  line12: string;

  certifierName: string;
  certifierTitle: string;
  certifierPhone: string;
  certifierEmail: string;
  certifiedDate: string;

  certificationFooter?: string;
}

let templateBytes: Buffer | null = null;

function loadTemplate(): Buffer {
  if (templateBytes) return templateBytes;
  const candidates = [
    join(process.cwd(), "src", "lib", "pdf", "SF-425_template.pdf"),
    join(__dirname, "SF-425_template.pdf"),
    join(__dirname, "..", "..", "..", "src", "lib", "pdf", "SF-425_template.pdf"),
  ];
  for (const p of candidates) {
    try {
      templateBytes = readFileSync(p);
      return templateBytes;
    } catch {
      // Try next candidate
    }
  }
  throw new Error("SF-425 template PDF not found");
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

function checkBox(form: ReturnType<PDFDocument["getForm"]>, name: string, checked: boolean) {
  if (!checked) return;
  try {
    const field = form.getField(name);
    if (field instanceof PDFCheckBox) {
      field.check();
    }
  } catch {
    // Field not found — skip silently
  }
}

function splitCertName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  if (parts.length === 2) return { first: parts[0], last: parts[1] };
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

function parsePeriod(periodStr: string): { from: string; to: string } {
  const match = periodStr.match(/(.+?)\s+to\s+(.+)/i);
  if (match) return { from: match[1].trim(), to: match[2].trim() };
  return { from: periodStr, to: "" };
}

export async function renderSF425(values: SF425Values): Promise<Uint8Array> {
  const template = loadTemplate();
  const doc = await PDFDocument.load(template);
  const form = doc.getForm();

  // Header fields
  setTextField(form, "FederalAgency", values.federalAgency);
  setTextField(form, "FederalGrantNumber", values.fain);
  setTextField(form, "RecipientOrgName", values.recipientOrg);
  setTextField(form, "RecipientStreet1", values.recipientStreet1);
  setTextField(form, "RecipientCityState", values.recipientCityState);
  setTextField(form, "UEI", values.recipientUei);
  setTextField(form, "EIN", values.recipientEin);
  setTextField(form, "RecipientAccountNumber", values.recipientAccountNumber);

  // Report type checkboxes
  checkBox(form, "ReportTypeQuarterly", values.reportType === "Quarterly");
  checkBox(form, "ReportTypeSemiAnnual", values.reportType === "Semi-Annual");
  checkBox(form, "ReportTypeAnnual", values.reportType === "Annual");
  checkBox(form, "ReportTypeFinal", values.reportType === "Final");

  // Basis of accounting checkboxes
  checkBox(form, "BasisCash", values.basis === "Cash");
  checkBox(form, "BasisAccrual", values.basis === "Accrual");

  // Period fields
  setTextField(form, "ProjectPeriodFrom", values.projectPeriodFrom || values.reportPeriodStart);
  setTextField(form, "ProjectPeriodTo", values.projectPeriodTo || values.reportPeriodEnd);
  setTextField(form, "ReportingPeriodEnd", values.reportPeriodEnd);

  // Section 10 – Financial lines
  setTextField(form, "CashReceipts", values.line10a);
  setTextField(form, "CashDisbursements", values.line10b);
  setTextField(form, "CashOnHand", values.line10c);
  setTextField(form, "TotalFederalFundsAuthorized", values.line10d);
  setTextField(form, "FederalShareExpenditures", values.line10e);
  setTextField(form, "FederalShareUnliquidated", values.line10f);
  setTextField(form, "TotalFederalShare", values.line10g);
  setTextField(form, "UnobligatedBalance", values.line10h);
  setTextField(form, "TotalRecipientShareRequired", values.line10i);
  setTextField(form, "RecipientShareExpenditures", values.line10j);
  setTextField(form, "RemainingRecipientShare", values.line10k);
  setTextField(form, "TotalProgramIncomeEarned", values.line10l);
  setTextField(form, "ProgramIncomeDeduction", values.line10m);
  setTextField(form, "ProgramIncomeAddition", values.line10n);
  setTextField(form, "UnexpendedProgramIncome", values.line10o);

  // Section 11 – Indirect expense row 1
  setTextField(form, "IE_Type_1", values.line11a_type);
  setTextField(form, "IE_Rate_1", values.line11a_rate);

  if (values.line11a_periodFrom) {
    setTextField(form, "IE_PeriodFrom_1", values.line11a_periodFrom);
    setTextField(form, "IE_PeriodTo_1", values.line11a_periodTo);
  } else if (values.line11a_period) {
    const { from, to } = parsePeriod(values.line11a_period);
    setTextField(form, "IE_PeriodFrom_1", from);
    setTextField(form, "IE_PeriodTo_1", to);
  }

  setTextField(form, "IE_Base_1", values.line11a_base);
  setTextField(form, "IE_Amount_1", values.line11a_amount);
  setTextField(form, "IE_FedShare_1", values.line11a_fedShare || values.line11a_amount);

  // Section 11 totals
  setTextField(form, "IE_Total_Base", values.line11_totalBase || values.line11a_base);
  setTextField(form, "IE_Total_Amount", values.line11_total);
  setTextField(form, "IE_Total_FedShare", values.line11_totalFedShare || values.line11_total);

  // Section 12 – Remarks
  setTextField(form, "Remarks", values.line12);

  // Section 13 – Certification
  const name = splitCertName(values.certifierName);
  setTextField(form, "Cert_FirstName", name.first);
  setTextField(form, "Cert_MiddleName", name.middle);
  setTextField(form, "Cert_LastName", name.last);
  setTextField(form, "Cert_Title", values.certifierTitle);
  setTextField(form, "Cert_Signature", values.certifierName);
  setTextField(form, "Cert_Telephone", values.certifierPhone);
  setTextField(form, "Cert_Email", values.certifierEmail);
  setTextField(form, "Cert_DateSubmitted", values.certifiedDate);

  // Flatten the form so fields become static text
  form.flatten();

  return doc.save();
}
