import {
  vendors, transactions, categories, contracts, benchmarks, marketTrends,
  getCategoryByName, getSubcategoryByName, getVendorsByCategory,
  getVendorsBySubcategory, getTransactionsByCategory, getTotalSpend,
  getSpendByMonth, getTailSpendVendors, getMaverickTransactions,
  getAutoRenewingAboveMarket, getExpiringContracts, getContractRiskSummary,
  duplicateVendorClusters, getMarketTrend, formatCurrency,
} from "@/data";
import { searchMarketNews } from "@/lib/news-search";

// ============ 14. GENERATE VENDOR RECOMMENDATIONS ============
export function generateVendorRecommendations(params: {
  vendor?: string;
  category?: string;
  limit?: number;
}) {
  const { vendor, category, limit = 10 } = params;

  let targetVendors = [...vendors];
  if (category) {
    const cat = getCategoryByName(category);
    if (cat) targetVendors = getVendorsByCategory(cat.id);
  }

  if (vendor) {
    const lower = vendor.toLowerCase();
    targetVendors = targetVendors.filter(
      (v) => v.name.toLowerCase().includes(lower) || v.aliases.some((a) => a.toLowerCase().includes(lower))
    );
  }

  const recommendations = targetVendors
    .sort((a, b) => b.annualSpend - a.annualSpend)
    .slice(0, limit)
    .map((v) => {
      const contract = contracts.find((c) => c.vendorId === v.id);
      const actions: string[] = [];
      let priority: "high" | "medium" | "low" = "low";
      let estimatedSavings = 0;

      // Check for contract issues
      if (contract?.status === "expired") {
        actions.push("Renegotiate expired contract immediately");
        estimatedSavings += Math.round(v.annualSpend * 0.08);
        priority = "high";
      } else if (contract?.autoRenew && (contract?.aboveMarketPercent || 0) > 10) {
        actions.push(`Contract auto-renewing at ${contract.aboveMarketPercent}% above market - intervene before renewal`);
        estimatedSavings += Math.round(v.annualSpend * (contract.aboveMarketPercent / 100));
        priority = "high";
      } else if (contract?.status === "expiring_soon") {
        actions.push("Begin renewal negotiations - contract expiring within 90 days");
        estimatedSavings += Math.round(v.annualSpend * 0.05);
        priority = "high";
      }

      // Check for consolidation opportunity
      const dupeCluster = duplicateVendorClusters.find(
        (d) => d.canonical === v.name || v.aliases.includes(d.canonical)
      );
      if (dupeCluster) {
        actions.push(`Consolidate ${dupeCluster.duplicates.length} duplicate records`);
        estimatedSavings += Math.round(dupeCluster.totalFragmentedSpend * 0.05);
        if (priority === "low") priority = "medium";
      }

      // Check payment terms optimization
      if (v.paymentTerms === "Net 60" || v.paymentTerms === "Net 90") {
        actions.push(`Optimize payment terms (currently ${v.paymentTerms})`);
      }

      // Check risk score
      if (v.riskScore > 30) {
        actions.push("Elevated supplier risk - develop contingency plan");
        if (priority === "low") priority = "medium";
      }

      if (actions.length === 0) {
        actions.push("Maintain current relationship - no immediate action needed");
      }

      return {
        vendorName: v.name,
        annualSpend: v.annualSpend,
        annualSpendFormatted: formatCurrency(v.annualSpend),
        priority,
        estimatedSavings,
        estimatedSavingsFormatted: formatCurrency(estimatedSavings),
        actions,
        contractStatus: v.contractStatus,
        riskScore: v.riskScore,
      };
    });

  // Sort by priority then by savings
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] || b.estimatedSavings - a.estimatedSavings
  );

  const totalSavings = recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0);

  return {
    summary: {
      vendorsAnalyzed: recommendations.length,
      highPriority: recommendations.filter((r) => r.priority === "high").length,
      mediumPriority: recommendations.filter((r) => r.priority === "medium").length,
      totalEstimatedSavings: totalSavings,
      totalEstimatedSavingsFormatted: formatCurrency(totalSavings),
    },
    recommendations,
  };
}

// ============ 15. ASSESS COMMODITY BUY TIMING ============
export async function assessCommodityBuyTiming(params: {
  commodity: string;
  months?: number;
  currentInventoryWeeks?: number;
}) {
  const { commodity, months = 6, currentInventoryWeeks = 2 } = params;
  const trend = getMarketTrend(commodity);

  if (!trend) {
    const available = marketTrends.map((t) => t.commodity).join(", ");
    return { error: `No market data for "${commodity}". Available: ${available}` };
  }

  const currentPrice = trend.currentPrice;
  const avgForecastPrice = trend.forecast.slice(0, months).reduce((sum, f) => sum + f.price, 0) / Math.min(months, trend.forecast.length);
  const expectedPriceIncrease = ((avgForecastPrice - currentPrice) / currentPrice) * 100;

  // Calculate expected value of forward buying
  const monthlySpend = 100000; // Assume $100k/month baseline
  const forwardBuyAmount = monthlySpend * months;
  const carryingCostRate = 0.02; // 2% per month
  const carryingCost = forwardBuyAmount * carryingCostRate * (months / 2);

  const upsideIfPriceRises = Math.round(forwardBuyAmount * (expectedPriceIncrease / 100));
  const downsideIfPriceFalls = Math.round(forwardBuyAmount * 0.05); // Assume 5% downside risk
  const expectedValue = upsideIfPriceRises - carryingCost;

  // Optimal months to buy
  const optimalMonths = expectedPriceIncrease > 5 ? Math.min(months, 4) : Math.min(months, 2);
  const avgConfidence = trend.forecast.slice(0, optimalMonths).reduce((sum, f) => sum + f.confidence, 0) / optimalMonths;

  const recentNews = await searchMarketNews(`${commodity} supply chain market outlook pricing`, 4);

  return {
    commodity: trend.commodity,
    currentPrice: `${currentPrice} ${trend.unit}`,
    avgPrice12Month: `${trend.avgPrice12Month} ${trend.unit}`,
    currentVsAvg: `${trend.percentFromAvg > 0 ? "+" : ""}${trend.percentFromAvg}%`,
    inventoryStatus: {
      currentWeeks: currentInventoryWeeks,
      assessment: currentInventoryWeeks < 4 ? "Low inventory - increased urgency" : "Adequate inventory levels",
    },
    recommendation: {
      action: expectedPriceIncrease > 3 ? "BUY" : expectedPriceIncrease > 0 ? "PARTIAL BUY" : "HOLD",
      months: optimalMonths,
      rationale: expectedPriceIncrease > 3
        ? `Buy ${optimalMonths} months of inventory now. Prices expected to rise ${Math.round(expectedPriceIncrease)}% over the next ${months} months.`
        : expectedPriceIncrease > 0
          ? `Buy ${optimalMonths} months of inventory. Modest price increases expected.`
          : "Hold current position. Prices stable or declining.",
    },
    financialAnalysis: {
      forwardBuyAmount: formatCurrency(forwardBuyAmount),
      expectedPriceChange: `${expectedPriceIncrease > 0 ? "+" : ""}${Math.round(expectedPriceIncrease * 10) / 10}%`,
      upsideIfMarketRises: formatCurrency(upsideIfPriceRises),
      downsideIfMarketFalls: formatCurrency(-downsideIfPriceFalls),
      carryingCost: formatCurrency(-Math.round(carryingCost)),
      expectedValue: formatCurrency(Math.round(expectedValue)),
      confidence: `${Math.round(avgConfidence)}%`,
    },
    forecast: trend.forecast.slice(0, months),
    outlook: trend.outlook,
    sources: trend.outlookSources,
    recentNews: recentNews.length > 0 ? recentNews : undefined,
  };
}

// ============ 16. CREATE ACTION PLAN ============
export function createActionPlan(params: {
  focus?: string;
  timeframe?: number;
}) {
  const { focus, timeframe = 90 } = params;

  // Gather all opportunities
  const tailSpendVendors = getTailSpendVendors();
  const tailSpend = tailSpendVendors.reduce((sum, v) => sum + v.annualSpend, 0);
  const tailSavings = Math.round(tailSpend * 0.12);

  const dupeSpend = duplicateVendorClusters.reduce((sum, c) => sum + c.totalFragmentedSpend, 0);
  const dupeSavings = Math.round(dupeSpend * 0.07);

  const maverickTxns = getMaverickTransactions();
  const maverickSpend = getTotalSpend(maverickTxns);
  const maverickSavings = Math.round(maverickSpend * 0.14);

  const contractRisk = getContractRiskSummary();
  const autoRenewContracts = getAutoRenewingAboveMarket();
  const contractSavings = autoRenewContracts.reduce(
    (sum, c) => sum + Math.round(c.annualValue * (c.aboveMarketPercent / 100)), 0
  );

  const expiringContracts = getExpiringContracts(timeframe);
  const expiringSavings = expiringContracts.reduce(
    (sum, c) => sum + Math.round(c.annualValue * 0.05), 0
  );

  const totalSavings = tailSavings + dupeSavings + maverickSavings + contractSavings + expiringSavings;

  return {
    title: `${timeframe}-Day Procurement Action Plan`,
    totalEstimatedSavings: totalSavings,
    totalEstimatedSavingsFormatted: formatCurrency(totalSavings),
    phases: [
      {
        phase: 1,
        title: "Quick Wins (Days 1-30)",
        actions: [
          {
            action: "Intervene on auto-renewing contracts above market rate",
            vendors: autoRenewContracts.slice(0, 3).map((c) => c.vendorName),
            estimatedSavings: contractSavings,
            estimatedSavingsFormatted: formatCurrency(contractSavings),
            effort: "Low",
            impact: "High",
          },
          {
            action: "Merge top duplicate vendor records",
            vendorClusters: duplicateVendorClusters.slice(0, 10).map((c) => c.canonical),
            estimatedSavings: Math.round(dupeSavings * 0.5),
            estimatedSavingsFormatted: formatCurrency(Math.round(dupeSavings * 0.5)),
            effort: "Low",
            impact: "Medium",
          },
        ],
      },
      {
        phase: 2,
        title: "Strategic Initiatives (Days 31-60)",
        actions: [
          {
            action: "Launch RFP process for expiring contracts",
            contracts: expiringContracts.slice(0, 5).map((c) => ({ vendor: c.vendorName, endDate: c.endDate })),
            estimatedSavings: expiringSavings,
            estimatedSavingsFormatted: formatCurrency(expiringSavings),
            effort: "Medium",
            impact: "High",
          },
          {
            action: "Implement maverick spend controls",
            topDepartments: (() => {
              const byDept: Record<string, number> = {};
              for (const t of maverickTxns) byDept[t.department] = (byDept[t.department] || 0) + t.amount;
              return Object.entries(byDept).sort(([, a], [, b]) => b - a).slice(0, 3).map(([d]) => d);
            })(),
            estimatedSavings: maverickSavings,
            estimatedSavingsFormatted: formatCurrency(maverickSavings),
            effort: "Medium",
            impact: "High",
          },
        ],
      },
      {
        phase: 3,
        title: "Operational Excellence (Days 61-90)",
        actions: [
          {
            action: "Execute tail spend consolidation program",
            currentVendors: tailSpendVendors.length,
            targetVendors: Math.round(tailSpendVendors.length * 0.3),
            estimatedSavings: tailSavings,
            estimatedSavingsFormatted: formatCurrency(tailSavings),
            effort: "High",
            impact: "Medium",
          },
          {
            action: "Complete remaining duplicate vendor cleanup",
            remainingClusters: duplicateVendorClusters.length - 10,
            estimatedSavings: Math.round(dupeSavings * 0.5),
            estimatedSavingsFormatted: formatCurrency(Math.round(dupeSavings * 0.5)),
            effort: "Medium",
            impact: "Medium",
          },
        ],
      },
    ],
    keyMetrics: {
      totalVendors: vendors.length,
      tailSpendVendors: tailSpendVendors.length,
      duplicateClusters: duplicateVendorClusters.length,
      expiringContracts: expiringContracts.length,
      maverickSpendPercent: Math.round((maverickSpend / getTotalSpend()) * 100),
    },
  };
}

// ============ 17. IDENTIFY ALTERNATIVE SUPPLIERS ============
export function identifyAlternativeSuppliers(params: {
  vendor?: string;
  category?: string;
  limit?: number;
}) {
  const { vendor: vendorName, category, limit = 10 } = params;

  let targetSubcategoryId: string | null = null;
  let currentVendor = null;

  if (vendorName) {
    const lower = vendorName.toLowerCase();
    currentVendor = vendors.find(
      (v) => v.name.toLowerCase().includes(lower) || v.aliases.some((a) => a.toLowerCase().includes(lower))
    );
    if (currentVendor) targetSubcategoryId = currentVendor.subcategoryId;
  }

  if (category && !targetSubcategoryId) {
    const sub = getSubcategoryByName(category);
    const cat = getCategoryByName(category);
    if (sub) targetSubcategoryId = sub.id;
    else if (cat && cat.subcategories.length > 0) targetSubcategoryId = cat.subcategories[0].id;
  }

  if (!targetSubcategoryId) {
    return { error: "Please specify a vendor or category to find alternatives for." };
  }

  let alternatives = getVendorsBySubcategory(targetSubcategoryId);
  if (currentVendor) {
    alternatives = alternatives.filter((v) => v.id !== currentVendor!.id);
  }

  alternatives.sort((a, b) => b.annualSpend - a.annualSpend);

  return {
    searchContext: {
      forVendor: currentVendor?.name || null,
      category: categories.find((c) => c.subcategories.some((s) => s.id === targetSubcategoryId))?.name,
      subcategory: categories.flatMap((c) => c.subcategories).find((s) => s.id === targetSubcategoryId)?.name,
    },
    alternatives: alternatives.slice(0, limit).map((v, i) => ({
      rank: i + 1,
      name: v.name,
      annualSpend: formatCurrency(v.annualSpend),
      location: v.location,
      contractStatus: v.contractStatus,
      riskScore: v.riskScore,
      diversityStatus: v.diversityStatus,
      yearOnboarded: v.yearOnboarded,
      assessment: v.riskScore < 15
        ? "Low risk - strong alternative"
        : v.riskScore < 25
          ? "Moderate risk - viable alternative"
          : "Higher risk - requires due diligence",
    })),
    recommendation: alternatives.length > 0
      ? `${alternatives.length} alternative suppliers identified. Top recommendation: ${alternatives[0].name} (${formatCurrency(alternatives[0].annualSpend)} existing spend, risk score: ${alternatives[0].riskScore}/100).`
      : "No alternative suppliers found in this subcategory.",
  };
}

// ============ 18. GENERATE BUSINESS CASE ============
export function generateBusinessCase(params: {
  initiative: string;
  category?: string;
  estimatedInvestment?: number;
}) {
  const { initiative, category, estimatedInvestment = 50000 } = params;

  // Calculate relevant savings based on initiative type
  const lower = initiative.toLowerCase();
  let annualSavings: number;
  let implementationCost: number;
  let timeToValue: string;
  let description: string;

  if (lower.includes("consolidat") || lower.includes("tail")) {
    const tailVendors = getTailSpendVendors();
    const tailSpend = tailVendors.reduce((sum, v) => sum + v.annualSpend, 0);
    annualSavings = Math.round(tailSpend * 0.12);
    implementationCost = estimatedInvestment;
    timeToValue = "3-6 months";
    description = `Consolidate ${tailVendors.length} tail-spend vendors to reduce administrative costs and leverage volume discounts.`;
  } else if (lower.includes("contract") || lower.includes("renegotiat")) {
    const autoRenew = getAutoRenewingAboveMarket();
    annualSavings = autoRenew.reduce((sum, c) => sum + Math.round(c.annualValue * (c.aboveMarketPercent / 100)), 0);
    const expiring = getExpiringContracts(180);
    annualSavings += expiring.reduce((sum, c) => sum + Math.round(c.annualValue * 0.05), 0);
    implementationCost = estimatedInvestment;
    timeToValue = "1-3 months";
    description = "Renegotiate expiring and auto-renewing contracts to align pricing with current market rates.";
  } else if (lower.includes("duplicate") || lower.includes("data")) {
    const dupeSpend = duplicateVendorClusters.reduce((sum, c) => sum + c.totalFragmentedSpend, 0);
    annualSavings = Math.round(dupeSpend * 0.07);
    implementationCost = estimatedInvestment;
    timeToValue = "2-4 months";
    description = `Clean up ${duplicateVendorClusters.length} duplicate vendor clusters to improve data quality and consolidate spending.`;
  } else if (lower.includes("maverick") || lower.includes("compliance")) {
    const maverickTxns = getMaverickTransactions();
    const maverickSpend = getTotalSpend(maverickTxns);
    annualSavings = Math.round(maverickSpend * 0.14);
    implementationCost = estimatedInvestment;
    timeToValue = "2-4 months";
    description = "Implement procurement compliance controls to redirect off-contract spend to contracted rates.";
  } else {
    annualSavings = Math.round(getTotalSpend() * 0.02);
    implementationCost = estimatedInvestment;
    timeToValue = "3-6 months";
    description = initiative;
  }

  const roi = ((annualSavings - implementationCost) / implementationCost) * 100;
  const paybackMonths = implementationCost > 0 ? Math.round((implementationCost / annualSavings) * 12) : 0;

  return {
    title: `Business Case: ${initiative}`,
    description,
    financialSummary: {
      annualSavings,
      annualSavingsFormatted: formatCurrency(annualSavings),
      implementationCost,
      implementationCostFormatted: formatCurrency(implementationCost),
      roi: Math.round(roi),
      roiFormatted: `${Math.round(roi)}%`,
      paybackPeriod: `${paybackMonths} months`,
      threeYearNPV: Math.round(annualSavings * 2.7 - implementationCost), // ~10% discount rate
      threeYearNPVFormatted: formatCurrency(Math.round(annualSavings * 2.7 - implementationCost)),
    },
    timeToValue,
    riskAssessment: {
      implementationRisk: implementationCost > 100000 ? "Medium" : "Low",
      savingsConfidence: annualSavings > 500000 ? "High (based on identified opportunities)" : "Medium (estimates based on benchmarks)",
      keyRisks: [
        "Stakeholder resistance to vendor changes",
        "Integration complexity with existing procurement systems",
        "Market conditions may shift during implementation",
      ],
      mitigations: [
        "Executive sponsorship and change management program",
        "Phased rollout with pilot categories first",
        "Build in contract flexibility for market adjustments",
      ],
    },
    recommendation: roi > 200
      ? "STRONG APPROVE - Exceptional ROI with low implementation risk"
      : roi > 100
        ? "APPROVE - Solid business case with good return on investment"
        : roi > 50
          ? "CONDITIONAL APPROVE - Moderate ROI, ensure scope is well-defined"
          : "REVIEW - Low ROI, consider alternative approaches",
  };
}

// ============ 19. GENERATE SAVINGS REPORT ============
export function generateSavingsReport(params: {
  period?: string;
}) {
  const { period = "annual" } = params;

  const totalSpend = getTotalSpend();
  const tailVendors = getTailSpendVendors();
  const tailSpend = tailVendors.reduce((sum, v) => sum + v.annualSpend, 0);
  const maverickTxns = getMaverickTransactions();
  const maverickSpend = getTotalSpend(maverickTxns);
  const dupeSpend = duplicateVendorClusters.reduce((sum, c) => sum + c.totalFragmentedSpend, 0);
  const autoRenew = getAutoRenewingAboveMarket();
  const expiring = getExpiringContracts(180);

  const opportunities = [
    {
      category: "Tail Spend Consolidation",
      currentState: `${tailVendors.length} vendors each under 1% of total spend`,
      estimatedSavings: Math.round(tailSpend * 0.12),
      confidence: "High",
      timeline: "60-90 days",
      effort: "Medium",
    },
    {
      category: "Duplicate Vendor Cleanup",
      currentState: `${duplicateVendorClusters.length} duplicate clusters with ${formatCurrency(dupeSpend)} fragmented spend`,
      estimatedSavings: Math.round(dupeSpend * 0.07),
      confidence: "High",
      timeline: "30-60 days",
      effort: "Low",
    },
    {
      category: "Contract Renegotiation",
      currentState: `${autoRenew.length} auto-renewing above market + ${expiring.length} expiring within 6 months`,
      estimatedSavings: autoRenew.reduce((s, c) => s + Math.round(c.annualValue * (c.aboveMarketPercent / 100)), 0) + expiring.reduce((s, c) => s + Math.round(c.annualValue * 0.05), 0),
      confidence: "Medium-High",
      timeline: "30-90 days",
      effort: "Medium",
    },
    {
      category: "Maverick Spend Reduction",
      currentState: `${formatCurrency(maverickSpend)} in off-contract purchases (${Math.round((maverickSpend / totalSpend) * 100)}% of spend)`,
      estimatedSavings: Math.round(maverickSpend * 0.14),
      confidence: "Medium",
      timeline: "60-120 days",
      effort: "Medium-High",
    },
    {
      category: "Payment Terms Optimization",
      currentState: "Multiple vendors on suboptimal payment terms",
      estimatedSavings: Math.round(totalSpend * 0.005),
      confidence: "Medium",
      timeline: "30-60 days",
      effort: "Low",
    },
  ];

  const totalSavings = opportunities.reduce((sum, o) => sum + o.estimatedSavings, 0);

  return {
    reportTitle: "Executive Savings Summary",
    period: period === "annual" ? "Annual" : period,
    overview: {
      totalAddressableSpend: totalSpend,
      totalAddressableSpendFormatted: formatCurrency(totalSpend),
      totalIdentifiedSavings: totalSavings,
      totalIdentifiedSavingsFormatted: formatCurrency(totalSavings),
      savingsAsPercentOfSpend: Math.round((totalSavings / totalSpend) * 1000) / 10,
      vendorCount: vendors.length,
      categoryCount: categories.length,
    },
    opportunities: opportunities.map((o) => ({
      ...o,
      estimatedSavingsFormatted: formatCurrency(o.estimatedSavings),
    })),
    quickWins: opportunities.filter((o) => o.effort === "Low").map((o) => ({
      category: o.category,
      savings: formatCurrency(o.estimatedSavings),
      timeline: o.timeline,
    })),
    executiveSummary: `Analysis of ${formatCurrency(totalSpend)} in total procurement spend across ${vendors.length} vendors identified ${formatCurrency(totalSavings)} in savings opportunities (${Math.round((totalSavings / totalSpend) * 1000) / 10}% of addressable spend). Quick wins in duplicate cleanup and contract renegotiation can deliver ${formatCurrency(opportunities.filter(o => o.effort === "Low").reduce((s, o) => s + o.estimatedSavings, 0))} within 60 days.`,
  };
}

// ============ 20. OPTIMIZE PAYMENT TERMS ============
export function optimizePaymentTerms(params: {
  category?: string;
  vendor?: string;
}) {
  const { category, vendor } = params;

  let targetVendors = [...vendors];
  if (category) {
    const cat = getCategoryByName(category);
    if (cat) targetVendors = getVendorsByCategory(cat.id);
  }
  if (vendor) {
    const lower = vendor.toLowerCase();
    targetVendors = targetVendors.filter(
      (v) => v.name.toLowerCase().includes(lower) || v.aliases.some((a) => a.toLowerCase().includes(lower))
    );
  }

  // Analyze payment terms distribution
  const termsDist: Record<string, { count: number; totalSpend: number }> = {};
  for (const v of targetVendors) {
    if (!termsDist[v.paymentTerms]) termsDist[v.paymentTerms] = { count: 0, totalSpend: 0 };
    termsDist[v.paymentTerms].count++;
    termsDist[v.paymentTerms].totalSpend += v.annualSpend;
  }

  const termsBreakdown = Object.entries(termsDist)
    .sort(([, a], [, b]) => b.totalSpend - a.totalSpend)
    .map(([terms, data]) => ({
      terms,
      vendorCount: data.count,
      totalSpend: data.totalSpend,
      totalSpendFormatted: formatCurrency(data.totalSpend),
    }));

  // Identify optimization opportunities
  const earlyPayDiscount = targetVendors
    .filter((v) => v.paymentTerms === "Net 30" || v.paymentTerms === "Net 45")
    .reduce((sum, v) => sum + v.annualSpend, 0);

  const extendableTerms = targetVendors
    .filter((v) => v.paymentTerms === "Net 15" || v.paymentTerms === "Net 30")
    .reduce((sum, v) => sum + v.annualSpend, 0);

  const earlyPaySavings = Math.round(earlyPayDiscount * 0.02); // 2% discount for early pay
  const cashFlowBenefit = Math.round(extendableTerms * 0.003); // Working capital benefit

  return {
    summary: {
      vendorsAnalyzed: targetVendors.length,
      totalSpendAnalyzed: targetVendors.reduce((sum, v) => sum + v.annualSpend, 0),
      totalSpendFormatted: formatCurrency(targetVendors.reduce((sum, v) => sum + v.annualSpend, 0)),
    },
    currentTermsDistribution: termsBreakdown,
    opportunities: [
      {
        strategy: "Early Payment Discounts (2/10 Net 30)",
        description: "Negotiate 2% discount for paying within 10 days on Net 30/45 terms",
        applicableSpend: earlyPayDiscount,
        applicableSpendFormatted: formatCurrency(earlyPayDiscount),
        estimatedSavings: earlyPaySavings,
        estimatedSavingsFormatted: formatCurrency(earlyPaySavings),
        annualizedReturn: "36.7% APR equivalent",
      },
      {
        strategy: "Extend Payment Terms to Net 60",
        description: "Negotiate longer payment terms with suppliers on Net 15/30",
        applicableSpend: extendableTerms,
        applicableSpendFormatted: formatCurrency(extendableTerms),
        cashFlowBenefit,
        cashFlowBenefitFormatted: formatCurrency(cashFlowBenefit),
        workingCapitalImpact: "Improves DPO by 15-30 days",
      },
      {
        strategy: "Dynamic Discounting",
        description: "Offer sliding-scale early payment in exchange for discounts",
        applicableSpend: formatCurrency(Math.round(earlyPayDiscount * 0.6)),
        estimatedSavings: formatCurrency(Math.round(earlyPaySavings * 0.8)),
        note: "Requires dynamic discounting platform",
      },
    ],
    totalOptimizationValue: earlyPaySavings + cashFlowBenefit,
    totalOptimizationValueFormatted: formatCurrency(earlyPaySavings + cashFlowBenefit),
    recommendations: [
      "Prioritize 2/10 Net 30 negotiations with top 20 vendors by spend",
      "Extend terms to Net 60 for vendors with strong relationships",
      "Implement dynamic discounting for mid-tier vendors",
      "Review payment terms as part of every contract renewal",
    ],
  };
}
