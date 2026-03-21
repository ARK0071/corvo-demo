/**
 * Builds embeddable text documents from vendor and grant/project data.
 * Used to produce inputs for OpenAI embedding comparisons.
 */

import type { PortVendor } from "@/data/port-vendors";
import type { GrantProgram } from "@/data/grants";

/**
 * Compose a capability-focused text document for a vendor.
 */
export function buildVendorCapabilityDoc(vendor: PortVendor): string {
  const parts: string[] = [];

  if (vendor.description) parts.push(vendor.description);

  if (vendor.capabilities.length > 0) {
    parts.push("Capabilities: " + vendor.capabilities.join(", "));
  }

  if (vendor.certifications.length > 0) {
    parts.push("Certifications: " + vendor.certifications.join(", "));
  }

  if (vendor.sector) {
    parts.push("Sector: " + vendor.sector);
  }

  if (vendor.disadvantagedBusiness) {
    parts.push("Business designation: " + vendor.disadvantagedBusiness);
  }

  if (vendor.pastPortProjects.length > 0) {
    const projTexts = vendor.pastPortProjects
      .slice(0, 10)
      .map((p) => `${p.name} (${p.port}, $${(p.value / 1_000_000).toFixed(1)}M, ${p.year})`)
      .join("; ");
    parts.push("Past projects: " + projTexts);
  }

  return parts.filter(Boolean).join(". ");
}

/**
 * Compose a grant opportunity document capturing the grant's scope and needs.
 */
export function buildGrantOpportunityDoc(grant: GrantProgram): string {
  const parts: string[] = [];

  parts.push(grant.name);

  if (grant.description) parts.push(grant.description);

  if (grant.focusAreas.length > 0) {
    parts.push("Focus areas: " + grant.focusAreas.join(", "));
  }

  if (grant.eligibleActivities.length > 0) {
    parts.push("Eligible activities: " + grant.eligibleActivities.join(", "));
  }

  return parts.filter(Boolean).join(". ");
}

/**
 * Compose a composite opportunity document that enriches the grant doc
 * with port/maritime domain language to aid embedding relevance.
 */
export function buildCompositeOpportunityDoc(grant: GrantProgram): string {
  const base = buildGrantOpportunityDoc(grant);
  const domainContext = [
    "port", "maritime", "terminal", "dredging", "intermodal",
    "resilience", "security", "electrification", "cargo",
    "wharf", "berth", "freight", "logistics", "coastal",
  ];

  const descLower = base.toLowerCase();
  const relevantDomain = domainContext.filter((kw) => descLower.includes(kw));

  if (relevantDomain.length > 0) {
    return base + ". Domain context: " + relevantDomain.join(", ");
  }
  return base;
}
