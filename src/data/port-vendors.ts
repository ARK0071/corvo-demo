export interface PortVendor {
  id: string;
  name: string;
  sector: string;
  headquarters: string;
  annualRevenue: number;
  employeeCount: number;
  capabilities: string[];
  certifications: string[];
  pastPortProjects: { name: string; port: string; value: number; year: number }[];
  bondingCapacity: number;
  safetyRecord: number; // EMR (Experience Modification Rate), 1.0 = industry avg, lower = better
  disadvantagedBusiness: string | null; // "DBE" | "MBE" | "WBE" | "SDVOSB" | null
  keyPersonnel: { name: string; title: string }[];
  description: string;
}

// Mutable vendor array - populated dynamically from SAM.gov
export let portVendors: PortVendor[] = [];

export function setPortVendors(vendors: PortVendor[]): void {
  portVendors = vendors;
}

export function addPortVendors(vendors: PortVendor[]): void {
  const existingIds = new Set(portVendors.map((v) => v.id));
  const newVendors = vendors.filter((v) => !existingIds.has(v.id));
  portVendors = [...portVendors, ...newVendors];
}

export function clearPortVendors(): void {
  portVendors = [];
}

export function isVendorsLoaded(): boolean {
  return portVendors.length > 0;
}

export function getPortVendorById(id: string): PortVendor | undefined {
  return portVendors.find((v) => v.id === id);
}

export function getPortVendorsBySector(sector: string): PortVendor[] {
  const q = sector.toLowerCase();
  return portVendors.filter((v) => v.sector.toLowerCase().includes(q));
}

export function searchPortVendors(query: string): PortVendor[] {
  const q = query.toLowerCase();
  return portVendors.filter(
    (v) =>
      v.name.toLowerCase().includes(q) ||
      v.sector.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q) ||
      v.capabilities.some((c) => c.toLowerCase().includes(q)) ||
      v.certifications.some((c) => c.toLowerCase().includes(q))
  );
}

export function getPortVendorsByCapability(capability: string): PortVendor[] {
  const q = capability.toLowerCase();
  return portVendors.filter((v) => v.capabilities.some((c) => c.toLowerCase().includes(q)));
}

export function getDBEVendors(): PortVendor[] {
  return portVendors.filter((v) => v.disadvantagedBusiness !== null);
}

export function getPortVendorsByCertification(cert: string): PortVendor[] {
  const q = cert.toLowerCase();
  return portVendors.filter((v) => v.certifications.some((c) => c.toLowerCase().includes(q)));
}
