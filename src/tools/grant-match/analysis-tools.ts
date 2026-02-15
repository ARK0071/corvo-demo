import { grants } from "@/data/grants";
import { portVendors } from "@/data/port-vendors";
import { matchMatrix, getTopMatchesForGrant } from "@/data/matches";

export function generateCompetitiveLandscapeReport(params: {
  grantId?: string;
  sector?: string;
  focusArea?: string;
}) {
  // If specific grant, analyze competition for that grant
  if (params.grantId) {
    const grant = grants.find((g) => g.id === params.grantId);
    if (!grant) {
      return { error: `Grant program not found: ${params.grantId}` };
    }

    const topMatches = getTopMatchesForGrant(params.grantId, 20);
    const vendors = topMatches.map((m) => {
      const v = portVendors.find((pv) => pv.id === m.vendorId)!;
      return { ...m, vendor: v };
    });

    // Sector breakdown
    const sectorBreakdown: Record<string, { count: number; avgScore: number; topVendor: string }> = {};
    for (const v of vendors) {
      if (!sectorBreakdown[v.vendor.sector]) {
        sectorBreakdown[v.vendor.sector] = { count: 0, avgScore: 0, topVendor: "" };
      }
      sectorBreakdown[v.vendor.sector].count++;
      sectorBreakdown[v.vendor.sector].avgScore += v.overallScore;
      if (!sectorBreakdown[v.vendor.sector].topVendor || v.overallScore > 0) {
        sectorBreakdown[v.vendor.sector].topVendor = v.vendor.name;
      }
    }
    for (const s of Object.values(sectorBreakdown)) {
      s.avgScore = Math.round(s.avgScore / s.count);
    }

    // Teaming opportunities
    const teamingOpportunities: { primary: string; partner: string; rationale: string }[] = [];
    const primeContractors = vendors.filter((v) => v.overallScore >= 65 && v.vendor.annualRevenue >= 1_000_000_000);
    const dbeVendors = vendors.filter((v) => v.vendor.disadvantagedBusiness !== null);
    const specialists = vendors.filter((v) => v.overallScore >= 50 && v.vendor.annualRevenue < 500_000_000);

    for (const prime of primeContractors.slice(0, 3)) {
      for (const dbe of dbeVendors.slice(0, 2)) {
        if (prime.vendor.id !== dbe.vendor.id) {
          teamingOpportunities.push({
            primary: prime.vendor.name,
            partner: dbe.vendor.name,
            rationale: `${prime.vendor.name} as prime with ${dbe.vendor.name} (${dbe.vendor.disadvantagedBusiness}) to meet DBE participation goals`,
          });
        }
      }
    }

    return {
      grantProgram: grant.shortName,
      grantFullName: grant.name,
      totalVendorsAnalyzed: vendors.length,
      topContenders: vendors.slice(0, 10).map((v) => ({
        rank: vendors.indexOf(v) + 1,
        name: v.vendor.name,
        sector: v.vendor.sector,
        score: v.overallScore,
        recommendation: v.recommendation,
        revenue: v.vendor.annualRevenue,
        dbeStatus: v.vendor.disadvantagedBusiness,
      })),
      sectorBreakdown: Object.entries(sectorBreakdown)
        .sort(([, a], [, b]) => b.avgScore - a.avgScore)
        .map(([sector, data]) => ({
          sector,
          vendorCount: data.count,
          avgScore: data.avgScore,
          topVendor: data.topVendor,
        })),
      teamingOpportunities: teamingOpportunities.slice(0, 5),
      marketConcentration: {
        topVendorScore: vendors[0]?.overallScore || 0,
        top3AvgScore: Math.round(vendors.slice(0, 3).reduce((s, v) => s + v.overallScore, 0) / Math.min(3, vendors.length)),
        competitivenessRating: vendors.filter((v) => v.overallScore >= 60).length >= 5 ? "Highly Competitive" :
          vendors.filter((v) => v.overallScore >= 60).length >= 3 ? "Competitive" : "Limited Competition",
      },
    };
  }

  // General landscape by sector or focus area
  if (portVendors.length === 0) {
    return { error: "No vendors loaded yet. Use the Vendor Directory or Grant Upload page to search for vendors first." };
  }
  let relevantVendors = [...portVendors];
  if (params.sector) {
    const q = params.sector.toLowerCase();
    relevantVendors = relevantVendors.filter((v) => v.sector.toLowerCase().includes(q));
  }

  // Sector overview
  const sectors: Record<string, { vendors: string[]; totalRevenue: number; avgEMR: number }> = {};
  for (const v of relevantVendors) {
    if (!sectors[v.sector]) {
      sectors[v.sector] = { vendors: [], totalRevenue: 0, avgEMR: 0 };
    }
    sectors[v.sector].vendors.push(v.name);
    sectors[v.sector].totalRevenue += v.annualRevenue;
    sectors[v.sector].avgEMR += v.safetyRecord;
  }
  for (const s of Object.values(sectors)) {
    s.avgEMR = Math.round((s.avgEMR / s.vendors.length) * 100) / 100;
  }

  // Best grant matches per sector
  const sectorGrantFit: { sector: string; bestGrants: string[] }[] = [];
  for (const [sector] of Object.entries(sectors)) {
    const sectorVendors = relevantVendors.filter((v) => v.sector === sector);
    const grantScores: Record<string, number> = {};
    for (const grant of grants) {
      let totalScore = 0;
      for (const v of sectorVendors.slice(0, 5)) {
        const match = matchMatrix.find((m) => m.grantId === grant.id && m.vendorId === v.id);
        totalScore += match?.overallScore || 0;
      }
      grantScores[grant.shortName] = Math.round(totalScore / Math.min(5, sectorVendors.length));
    }
    const bestGrants = Object.entries(grantScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);
    sectorGrantFit.push({ sector, bestGrants });
  }

  return {
    totalVendors: relevantVendors.length,
    totalSectors: Object.keys(sectors).length,
    sectorOverview: Object.entries(sectors).map(([sector, data]) => ({
      sector,
      vendorCount: data.vendors.length,
      totalRevenue: data.totalRevenue,
      avgSafetyRecord: data.avgEMR,
      topVendors: data.vendors.slice(0, 3),
    })),
    sectorGrantFit,
    dbeVendors: relevantVendors
      .filter((v) => v.disadvantagedBusiness !== null)
      .map((v) => ({
        name: v.name,
        sector: v.sector,
        dbeType: v.disadvantagedBusiness,
        revenue: v.annualRevenue,
      })),
  };
}
