import {
  portVendors,
  getPortVendorById,
  getPortVendorsBySector,
  searchPortVendors,
  getPortVendorsByCapability,
  getDBEVendors,
} from "@/data/port-vendors";

export function searchVendorProfiles(params: {
  query?: string;
  sector?: string;
  capability?: string;
  certification?: string;
  minRevenue?: number;
  maxRevenue?: number;
  dbeOnly?: boolean;
  limit?: number;
}) {
  if (portVendors.length === 0) {
    return { error: "No vendors loaded yet. Use the Vendor Directory or Grant Upload page to search for vendors first." };
  }

  let results = [...portVendors];

  if (params.query) {
    results = searchPortVendors(params.query);
  }

  if (params.sector) {
    const sectorResults = getPortVendorsBySector(params.sector);
    results = results.filter((v) => sectorResults.some((sv) => sv.id === v.id));
  }

  if (params.capability) {
    const capResults = getPortVendorsByCapability(params.capability);
    results = results.filter((v) => capResults.some((cv) => cv.id === v.id));
  }

  if (params.certification) {
    const q = params.certification.toLowerCase();
    results = results.filter((v) => v.certifications.some((c) => c.toLowerCase().includes(q)));
  }

  if (params.minRevenue !== undefined) {
    results = results.filter((v) => v.annualRevenue >= params.minRevenue!);
  }

  if (params.maxRevenue !== undefined) {
    results = results.filter((v) => v.annualRevenue <= params.maxRevenue!);
  }

  if (params.dbeOnly) {
    results = results.filter((v) => v.disadvantagedBusiness !== null);
  }

  const limit = params.limit || 15;
  results = results.slice(0, limit);

  return {
    totalResults: results.length,
    vendors: results.map((v) => ({
      id: v.id,
      name: v.name,
      sector: v.sector,
      headquarters: v.headquarters,
      annualRevenue: v.annualRevenue,
      employeeCount: v.employeeCount,
      capabilities: v.capabilities.slice(0, 5),
      certifications: v.certifications,
      bondingCapacity: v.bondingCapacity,
      safetyRecord: v.safetyRecord,
      dbeStatus: v.disadvantagedBusiness,
      portProjectCount: v.pastPortProjects.length,
    })),
    sectors: [...new Set(results.map((v) => v.sector))],
  };
}

export function getVendorFullProfile(params: { vendorId: string }) {
  const vendor = getPortVendorById(params.vendorId);
  if (!vendor) {
    return { error: `Vendor not found: ${params.vendorId}. Vendors are loaded dynamically from federal data — use the Vendor Directory to search first.` };
  }

  return {
    id: vendor.id,
    name: vendor.name,
    sector: vendor.sector,
    headquarters: vendor.headquarters,
    description: vendor.description,
    financials: {
      annualRevenue: vendor.annualRevenue,
      bondingCapacity: vendor.bondingCapacity,
      employeeCount: vendor.employeeCount,
    },
    capabilities: vendor.capabilities,
    certifications: vendor.certifications,
    safetyRecord: {
      emr: vendor.safetyRecord,
      rating: vendor.safetyRecord <= 0.65 ? "Excellent" : vendor.safetyRecord <= 0.75 ? "Good" : vendor.safetyRecord <= 0.85 ? "Average" : "Below Average",
    },
    disadvantagedBusiness: vendor.disadvantagedBusiness,
    pastPortProjects: vendor.pastPortProjects,
    keyPersonnel: vendor.keyPersonnel,
    totalPortProjectValue: vendor.pastPortProjects.reduce((s, p) => s + p.value, 0),
  };
}

export function analyzeVendorCapabilityGaps(params: { vendorId: string; requiredCapabilities: string[] }) {
  const vendor = getPortVendorById(params.vendorId);
  if (!vendor) {
    return { error: `Vendor not found: ${params.vendorId}` };
  }

  const vendorCaps = vendor.capabilities.map((c) => c.toLowerCase());
  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of params.requiredCapabilities) {
    const reqLower = req.toLowerCase();
    const found = vendorCaps.some(
      (vc) => vc.includes(reqLower) || reqLower.includes(vc) ||
        vc.split(" ").some((w) => reqLower.includes(w) && w.length > 3)
    );
    if (found) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }

  const coveragePercent = Math.round((matched.length / Math.max(params.requiredCapabilities.length, 1)) * 100);

  const teamingRecommendations: string[] = [];
  for (const gap of missing) {
    const potentialPartners = portVendors
      .filter((v) => v.id !== vendor.id)
      .filter((v) => v.capabilities.some((c) => c.toLowerCase().includes(gap.toLowerCase()) || gap.toLowerCase().includes(c.toLowerCase())))
      .slice(0, 2)
      .map((v) => v.name);
    if (potentialPartners.length > 0) {
      teamingRecommendations.push(`For "${gap}": Consider teaming with ${potentialPartners.join(" or ")}`);
    }
  }

  return {
    vendorName: vendor.name,
    sector: vendor.sector,
    existingCapabilities: vendor.capabilities,
    analysis: {
      requiredCapabilities: params.requiredCapabilities.length,
      matchedCapabilities: matched.length,
      missingCapabilities: missing.length,
      coveragePercent,
    },
    matched,
    missing,
    teamingRecommendations,
    assessment: coveragePercent >= 80
      ? "Strong capability coverage - vendor can likely perform as prime contractor"
      : coveragePercent >= 50
        ? "Moderate coverage - vendor should consider teaming arrangement for missing capabilities"
        : "Limited coverage - vendor better suited as subcontractor for specialized scope",
  };
}

export function findSimilarVendorProfiles(params: { vendorId: string; limit?: number }) {
  const vendor = getPortVendorById(params.vendorId);
  if (!vendor) {
    return { error: `Vendor not found: ${params.vendorId}. Vendors are loaded dynamically from federal data.` };
  }

  const limit = params.limit || 5;

  // Score similarity based on sector, capabilities, revenue range, and certifications
  const scored = portVendors
    .filter((v) => v.id !== vendor.id)
    .map((v) => {
      let score = 0;

      // Same sector = big bonus
      if (v.sector === vendor.sector) score += 40;

      // Capability overlap
      const sharedCaps = v.capabilities.filter((c) =>
        vendor.capabilities.some((vc) => vc.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(vc.toLowerCase()))
      );
      score += Math.min(30, sharedCaps.length * 8);

      // Revenue similarity (within 2x range)
      const revenueRatio = Math.min(v.annualRevenue, vendor.annualRevenue) / Math.max(v.annualRevenue, vendor.annualRevenue);
      score += Math.round(revenueRatio * 20);

      // Certification overlap
      const sharedCerts = v.certifications.filter((c) =>
        vendor.certifications.some((vc) => vc === c)
      );
      score += Math.min(10, sharedCerts.length * 3);

      return { vendor: v, score, sharedCaps, sharedCerts };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    referenceVendor: { name: vendor.name, sector: vendor.sector },
    similarVendors: scored.map((s) => ({
      id: s.vendor.id,
      name: s.vendor.name,
      sector: s.vendor.sector,
      headquarters: s.vendor.headquarters,
      annualRevenue: s.vendor.annualRevenue,
      similarityScore: s.score,
      sharedCapabilities: s.sharedCaps,
      sharedCertifications: s.sharedCerts,
      dbeStatus: s.vendor.disadvantagedBusiness,
    })),
  };
}
