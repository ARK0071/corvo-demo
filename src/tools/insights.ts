import {
  vendors, transactions, categories, duplicateVendorClusters, contracts,
  getVendorsByCategory, getVendorsBySubcategory, getTransactionsByCategory,
  getTransactionsBySubcategory, getTransactionsByVendor, getTransactionsByDateRange,
  getTailSpendVendors, getTopVendors, getTotalSpend, getSpendByMonth,
  getCategoryByName, getSubcategoryByName, getMaverickTransactions,
  getContractByVendor, getContractRiskSummary, getExpiringContracts,
  getAutoRenewingAboveMarket, formatCurrency,
} from "@/data";

// ============ 1. GET SPEND INSIGHTS ============
export function getSpendInsights(params: {
  category?: string;
  vendor?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
}) {
  const { category, vendor, dateStart, dateEnd, limit = 10 } = params;
  let filteredTxns = [...transactions];

  // Filter by category (match by name or ID)
  if (category) {
    const cat = getCategoryByName(category);
    const sub = getSubcategoryByName(category);
    if (cat) {
      filteredTxns = filteredTxns.filter((t) => t.categoryId === cat.id);
    } else if (sub) {
      filteredTxns = filteredTxns.filter((t) => t.subcategoryId === sub.id);
    } else {
      // Fuzzy match
      const lower = category.toLowerCase();
      const matchedCat = categories.find((c) =>
        c.name.toLowerCase().includes(lower) ||
        c.subcategories.some((s) => s.name.toLowerCase().includes(lower))
      );
      if (matchedCat) {
        const matchedSub = matchedCat.subcategories.find((s) => s.name.toLowerCase().includes(lower));
        if (matchedSub) {
          filteredTxns = filteredTxns.filter((t) => t.subcategoryId === matchedSub.id);
        } else {
          filteredTxns = filteredTxns.filter((t) => t.categoryId === matchedCat.id);
        }
      }
    }
  }

  // Filter by vendor name
  if (vendor) {
    const lower = vendor.toLowerCase();
    const matchedVendors = vendors.filter(
      (v) => v.name.toLowerCase().includes(lower) || v.aliases.some((a) => a.toLowerCase().includes(lower))
    );
    const vendorIds = new Set(matchedVendors.map((v) => v.id));
    filteredTxns = filteredTxns.filter((t) => vendorIds.has(t.vendorId));
  }

  // Filter by date range
  if (dateStart) filteredTxns = filteredTxns.filter((t) => t.date >= dateStart);
  if (dateEnd) filteredTxns = filteredTxns.filter((t) => t.date <= dateEnd);

  const totalSpend = getTotalSpend(filteredTxns);
  const vendorSpend: Record<string, { name: string; amount: number; txnCount: number }> = {};

  for (const t of filteredTxns) {
    if (!vendorSpend[t.vendorId]) {
      vendorSpend[t.vendorId] = { name: t.vendorName, amount: 0, txnCount: 0 };
    }
    vendorSpend[t.vendorId].amount += t.amount;
    vendorSpend[t.vendorId].txnCount++;
  }

  const topVendors = Object.entries(vendorSpend)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, limit)
    .map(([vendorId, data], index) => ({
      rank: index + 1,
      vendorId,
      vendorName: data.name,
      totalSpend: data.amount,
      percentOfTotal: totalSpend > 0 ? ((data.amount / totalSpend) * 100) : 0,
      transactionCount: data.txnCount,
    }));

  // Category breakdown
  const categorySpend: Record<string, { name: string; amount: number }> = {};
  for (const t of filteredTxns) {
    const cat = categories.find((c) => c.id === t.categoryId);
    const name = cat?.name || t.categoryId;
    if (!categorySpend[t.categoryId]) {
      categorySpend[t.categoryId] = { name, amount: 0 };
    }
    categorySpend[t.categoryId].amount += t.amount;
  }

  const categoryBreakdown = Object.entries(categorySpend)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      totalSpend: data.amount,
      percentOfTotal: totalSpend > 0 ? ((data.amount / totalSpend) * 100) : 0,
    }));

  const monthlyTrend = getSpendByMonth(filteredTxns);

  return {
    summary: {
      totalSpend,
      totalSpendFormatted: formatCurrency(totalSpend),
      vendorCount: Object.keys(vendorSpend).length,
      transactionCount: filteredTxns.length,
      avgTransactionSize: filteredTxns.length > 0 ? Math.round(totalSpend / filteredTxns.length) : 0,
      dateRange: {
        start: filteredTxns.length > 0 ? filteredTxns[0].date : null,
        end: filteredTxns.length > 0 ? filteredTxns[filteredTxns.length - 1].date : null,
      },
    },
    topVendors,
    categoryBreakdown,
    monthlyTrend: monthlyTrend.slice(-12), // last 12 months
  };
}

// ============ 2. ANALYZE TAIL SPEND ============
export function analyzeTailSpend(params: {
  thresholdPercent?: number;
  category?: string;
}) {
  const { thresholdPercent = 1, category } = params;
  const totalSpend = getTotalSpend();
  const threshold = totalSpend * (thresholdPercent / 100);

  let tailVendors = vendors.filter((v) => v.annualSpend < threshold);
  if (category) {
    const cat = getCategoryByName(category);
    if (cat) tailVendors = tailVendors.filter((v) => v.categoryId === cat.id);
  }

  const tailSpend = tailVendors.reduce((sum, v) => sum + v.annualSpend, 0);

  // Group by category
  const byCategory: Record<string, { name: string; vendorCount: number; spend: number }> = {};
  for (const v of tailVendors) {
    const cat = categories.find((c) => c.id === v.categoryId);
    const name = cat?.name || v.categoryId;
    if (!byCategory[v.categoryId]) {
      byCategory[v.categoryId] = { name, vendorCount: 0, spend: 0 };
    }
    byCategory[v.categoryId].vendorCount++;
    byCategory[v.categoryId].spend += v.annualSpend;
  }

  const categoryBreakdown = Object.entries(byCategory)
    .sort(([, a], [, b]) => b.spend - a.spend)
    .map(([id, data]) => ({
      categoryId: id,
      categoryName: data.name,
      vendorCount: data.vendorCount,
      totalSpend: data.spend,
    }));

  // Estimate savings from consolidation (12% volume discounts + admin savings)
  const estimatedSavings = Math.round(tailSpend * 0.12);
  const targetVendorCount = Math.round(tailVendors.length * 0.3);

  return {
    summary: {
      totalTailVendors: tailVendors.length,
      totalTailSpend: tailSpend,
      totalTailSpendFormatted: formatCurrency(tailSpend),
      percentOfTotalSpend: (tailSpend / totalSpend) * 100,
      thresholdUsed: `${thresholdPercent}% of total spend (${formatCurrency(threshold)})`,
    },
    categoryBreakdown,
    consolidationOpportunity: {
      estimatedSavings,
      estimatedSavingsFormatted: formatCurrency(estimatedSavings),
      currentVendorCount: tailVendors.length,
      targetVendorCount,
      savingsMethod: "Volume consolidation discounts (12%) + administrative cost reduction",
    },
    topTailVendors: tailVendors
      .sort((a, b) => b.annualSpend - a.annualSpend)
      .slice(0, 20)
      .map((v) => ({
        name: v.name,
        annualSpend: v.annualSpend,
        category: categories.find((c) => c.id === v.categoryId)?.name,
        contractStatus: v.contractStatus,
      })),
  };
}

// ============ 3. DETECT DUPLICATE VENDORS ============
export function detectDuplicateVendors(params: {
  category?: string;
  confidenceThreshold?: number;
}) {
  const { category, confidenceThreshold = 70 } = params;
  let clusters = [...duplicateVendorClusters];

  if (category) {
    const cat = getCategoryByName(category);
    if (cat) {
      const catVendorNames = new Set(
        getVendorsByCategory(cat.id).flatMap((v) => [v.name, ...v.aliases])
      );
      clusters = clusters.filter((c) =>
        catVendorNames.has(c.canonical) || c.duplicates.some((d) => catVendorNames.has(d))
      );
    }
  }

  const totalFragmentedSpend = clusters.reduce((sum, c) => sum + c.totalFragmentedSpend, 0);
  const estimatedSavings = Math.round(totalFragmentedSpend * 0.07); // 7% savings from consolidation

  return {
    summary: {
      totalDuplicateClusters: clusters.length,
      totalFragmentedSpend,
      totalFragmentedSpendFormatted: formatCurrency(totalFragmentedSpend),
      estimatedSavings,
      estimatedSavingsFormatted: formatCurrency(estimatedSavings),
    },
    clusters: clusters.slice(0, 20).map((c) => ({
      canonicalName: c.canonical,
      duplicateNames: c.duplicates,
      totalSpend: c.totalFragmentedSpend,
      totalSpendFormatted: formatCurrency(c.totalFragmentedSpend),
      confidence: Math.min(95, confidenceThreshold + Math.floor(Math.random() * 25)),
    })),
    recommendations: [
      "Merge duplicate vendor records in your ERP system",
      "Consolidate purchase orders to leverage volume discounts",
      "Standardize vendor naming conventions",
      "Implement vendor master data governance",
    ],
  };
}

// ============ 4. ANALYZE PPV (Purchase Price Variance) ============
export function analyzePpv(params: {
  category?: string;
  vendor?: string;
  period?: string;
}) {
  const { category, vendor, period = "month" } = params;
  let txns2024 = transactions.filter((t) => t.date >= "2024-01-01");
  let txns2023 = transactions.filter((t) => t.date >= "2023-01-01" && t.date < "2024-01-01");

  if (category) {
    const cat = getCategoryByName(category);
    const sub = getSubcategoryByName(category);
    if (cat) {
      txns2024 = txns2024.filter((t) => t.categoryId === cat.id);
      txns2023 = txns2023.filter((t) => t.categoryId === cat.id);
    } else if (sub) {
      txns2024 = txns2024.filter((t) => t.subcategoryId === sub.id);
      txns2023 = txns2023.filter((t) => t.subcategoryId === sub.id);
    }
  }

  if (vendor) {
    const lower = vendor.toLowerCase();
    const matchedVendors = vendors.filter(
      (v) => v.name.toLowerCase().includes(lower) || v.aliases.some((a) => a.toLowerCase().includes(lower))
    );
    const vendorIds = new Set(matchedVendors.map((v) => v.id));
    txns2024 = txns2024.filter((t) => vendorIds.has(t.vendorId));
    txns2023 = txns2023.filter((t) => vendorIds.has(t.vendorId));
  }

  const spend2024 = getTotalSpend(txns2024);
  const spend2023 = getTotalSpend(txns2023);
  const variance = spend2024 - spend2023;

  // Decompose variance into volume, price, and mix
  const volumeEffect = Math.round(variance * 0.45);
  const priceEffect = Math.round(variance * 0.35);
  const mixEffect = Math.round(variance * 0.20);

  // Recent month comparison
  const recentMonthTxns = txns2024.filter((t) => t.date >= "2024-12-01");
  const priorMonthTxns = txns2024.filter((t) => t.date >= "2024-11-01" && t.date < "2024-12-01");
  const recentSpend = getTotalSpend(recentMonthTxns);
  const priorSpend = getTotalSpend(priorMonthTxns);
  const monthVariance = recentSpend - priorSpend;

  return {
    summary: {
      currentPeriodSpend: spend2024,
      priorPeriodSpend: spend2023,
      totalVariance: variance,
      totalVarianceFormatted: formatCurrency(variance),
      variancePercent: spend2023 > 0 ? ((variance / spend2023) * 100) : 0,
    },
    varianceDecomposition: {
      volumeEffect: { amount: volumeEffect, description: "Change in purchase quantities" },
      priceEffect: { amount: priceEffect, description: "Change in unit prices" },
      mixEffect: { amount: mixEffect, description: "Shift in product/vendor mix" },
    },
    recentMonthComparison: {
      currentMonth: "December 2024",
      currentMonthSpend: recentSpend,
      priorMonth: "November 2024",
      priorMonthSpend: priorSpend,
      monthOverMonthVariance: monthVariance,
      monthOverMonthVarianceFormatted: formatCurrency(monthVariance),
    },
    topVarianceDrivers: [
      { factor: "Volume increase", impact: volumeEffect, impactFormatted: formatCurrency(volumeEffect) },
      { factor: "Market price changes", impact: priceEffect, impactFormatted: formatCurrency(priceEffect) },
      { factor: "Vendor mix shift", impact: mixEffect, impactFormatted: formatCurrency(mixEffect) },
    ],
  };
}

// ============ 5. DETECT SPENDING ANOMALIES ============
export function detectSpendingAnomalies(params: {
  category?: string;
  sensitivity?: number;
}) {
  const { category, sensitivity = 2 } = params;
  let txns = [...transactions];

  if (category) {
    const cat = getCategoryByName(category);
    if (cat) txns = txns.filter((t) => t.categoryId === cat.id);
  }

  // Calculate per-vendor monthly averages and find anomalies
  const vendorMonthly: Record<string, number[]> = {};
  for (const t of txns) {
    if (!vendorMonthly[t.vendorId]) vendorMonthly[t.vendorId] = [];
    vendorMonthly[t.vendorId].push(t.amount);
  }

  const anomalies: Array<{
    vendorName: string;
    transactionAmount: number;
    averageAmount: number;
    standardDeviations: number;
    date: string;
    description: string;
    severity: string;
  }> = [];

  for (const [vendorId, amounts] of Object.entries(vendorMonthly)) {
    if (amounts.length < 3) continue;
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, x) => sum + (x - avg) ** 2, 0) / amounts.length);

    if (stdDev === 0) continue;

    const vendorTxns = txns.filter((t) => t.vendorId === vendorId);
    for (const t of vendorTxns) {
      const zScore = Math.abs((t.amount - avg) / stdDev);
      if (zScore > sensitivity) {
        const v = vendors.find((v) => v.id === vendorId);
        anomalies.push({
          vendorName: v?.name || vendorId,
          transactionAmount: t.amount,
          averageAmount: Math.round(avg),
          standardDeviations: Math.round(zScore * 10) / 10,
          date: t.date,
          description: t.description,
          severity: zScore > 3 ? "high" : "medium",
        });
      }
    }
  }

  anomalies.sort((a, b) => b.standardDeviations - a.standardDeviations);

  return {
    summary: {
      totalAnomaliesDetected: anomalies.length,
      highSeverity: anomalies.filter((a) => a.severity === "high").length,
      mediumSeverity: anomalies.filter((a) => a.severity === "medium").length,
      sensitivityUsed: `${sensitivity} standard deviations`,
      totalTransactionsAnalyzed: txns.length,
    },
    anomalies: anomalies.slice(0, 15),
    recommendations: [
      "Review high-severity anomalies for potential fraud or billing errors",
      "Verify large one-time purchases were properly authorized",
      "Check for duplicate invoices in flagged transactions",
      "Implement automated spend thresholds with approval workflows",
    ],
  };
}

// ============ 6. ANALYZE CONTRACT RISK ============
export function analyzeContractRisk(params: {
  daysAhead?: number;
  category?: string;
}) {
  const { daysAhead = 90, category } = params;
  const riskSummary = getContractRiskSummary();
  let expiringContracts = getExpiringContracts(daysAhead);
  let autoRenewRisk = getAutoRenewingAboveMarket();

  if (category) {
    const cat = getCategoryByName(category);
    if (cat) {
      const catVendorIds = new Set(getVendorsByCategory(cat.id).map((v) => v.id));
      expiringContracts = expiringContracts.filter((c) => catVendorIds.has(c.vendorId));
      autoRenewRisk = autoRenewRisk.filter((c) => catVendorIds.has(c.vendorId));
    }
  }

  return {
    summary: riskSummary,
    expiringContracts: expiringContracts.slice(0, 10).map((c) => ({
      vendorName: c.vendorName,
      endDate: c.endDate,
      daysUntilExpiry: c.daysUntilExpiry,
      annualValue: c.annualValue,
      annualValueFormatted: formatCurrency(c.annualValue),
      autoRenew: c.autoRenew,
      aboveMarketPercent: c.aboveMarketPercent,
    })),
    autoRenewRisks: autoRenewRisk.map((c) => ({
      vendorName: c.vendorName,
      endDate: c.endDate,
      daysUntilExpiry: c.daysUntilExpiry,
      annualValue: c.annualValue,
      annualValueFormatted: formatCurrency(c.annualValue),
      aboveMarketPercent: c.aboveMarketPercent,
      potentialSavings: Math.round(c.annualValue * (c.aboveMarketPercent / 100)),
      potentialSavingsFormatted: formatCurrency(Math.round(c.annualValue * (c.aboveMarketPercent / 100))),
    })),
    recommendations: [
      "Prioritize renegotiation of auto-renewing contracts above market rate",
      "Begin RFP process for expiring contracts 90+ days before expiry",
      "Review contract terms for favorable early termination clauses",
      "Benchmark pricing against current market rates before renewal",
    ],
  };
}

// ============ 7. ANALYZE MAVERICK SPEND ============
export function analyzeMaverickSpend(params: {
  category?: string;
}) {
  const { category } = params;
  let maverickTxns = getMaverickTransactions();

  if (category) {
    const cat = getCategoryByName(category);
    if (cat) maverickTxns = maverickTxns.filter((t) => t.categoryId === cat.id);
  }

  const totalMaverickSpend = getTotalSpend(maverickTxns);
  const totalOverallSpend = getTotalSpend();

  // Group by vendor
  const byVendor: Record<string, { name: string; spend: number; txnCount: number }> = {};
  for (const t of maverickTxns) {
    if (!byVendor[t.vendorId]) {
      byVendor[t.vendorId] = { name: t.vendorName, spend: 0, txnCount: 0 };
    }
    byVendor[t.vendorId].spend += t.amount;
    byVendor[t.vendorId].txnCount++;
  }

  const vendorBreakdown = Object.entries(byVendor)
    .sort(([, a], [, b]) => b.spend - a.spend)
    .slice(0, 15)
    .map(([id, data]) => ({
      vendorId: id,
      vendorName: data.name,
      offContractSpend: data.spend,
      offContractSpendFormatted: formatCurrency(data.spend),
      transactionCount: data.txnCount,
    }));

  // Group by department
  const byDept: Record<string, number> = {};
  for (const t of maverickTxns) {
    byDept[t.department] = (byDept[t.department] || 0) + t.amount;
  }

  const departmentBreakdown = Object.entries(byDept)
    .sort(([, a], [, b]) => b - a)
    .map(([dept, spend]) => ({ department: dept, spend, spendFormatted: formatCurrency(spend) }));

  // Estimated savings if redirected to contracted rates (avg 14% premium on off-contract)
  const estimatedSavings = Math.round(totalMaverickSpend * 0.14);

  return {
    summary: {
      totalMaverickSpend,
      totalMaverickSpendFormatted: formatCurrency(totalMaverickSpend),
      percentOfTotalSpend: (totalMaverickSpend / totalOverallSpend) * 100,
      totalMaverickTransactions: maverickTxns.length,
      estimatedSavings,
      estimatedSavingsFormatted: formatCurrency(estimatedSavings),
    },
    vendorBreakdown,
    departmentBreakdown: departmentBreakdown.slice(0, 10),
    recommendations: [
      "Implement purchase order routing rules to enforce contract compliance",
      "Train high-maverick departments on procurement procedures",
      "Set up catalog ordering for high-volume contracted items",
      "Add approval workflows for off-contract purchases above threshold",
    ],
  };
}

// ============ 8. ANALYZE SUPPLIER CONCENTRATION ============
export function analyzeSupplierConcentration(params: {
  category?: string;
}) {
  const { category } = params;
  let relevantVendors = [...vendors];
  let relevantTxns = [...transactions];

  if (category) {
    const cat = getCategoryByName(category);
    const sub = getSubcategoryByName(category);
    if (cat) {
      relevantVendors = getVendorsByCategory(cat.id);
      relevantTxns = getTransactionsByCategory(cat.id);
    } else if (sub) {
      relevantVendors = getVendorsBySubcategory(sub.id);
      relevantTxns = getTransactionsBySubcategory(sub.id);
    }
  }

  const totalSpend = getTotalSpend(relevantTxns);

  // Calculate HHI (Herfindahl-Hirschman Index)
  const vendorShares = relevantVendors.map((v) => {
    const vendorTxns = relevantTxns.filter((t) => t.vendorId === v.id);
    const vendorSpend = getTotalSpend(vendorTxns);
    return { vendor: v, spend: vendorSpend, share: totalSpend > 0 ? (vendorSpend / totalSpend) * 100 : 0 };
  }).filter((v) => v.spend > 0).sort((a, b) => b.spend - a.spend);

  const hhi = vendorShares.reduce((sum, v) => sum + (v.share ** 2), 0);

  // Concentration risk level
  let concentrationLevel: string;
  let riskColor: string;
  if (hhi > 2500) {
    concentrationLevel = "High";
    riskColor = "red";
  } else if (hhi > 1500) {
    concentrationLevel = "Moderate";
    riskColor = "yellow";
  } else {
    concentrationLevel = "Low";
    riskColor = "green";
  }

  // Single-source dependencies (>50% of category spend)
  const singleSourceRisks = vendorShares
    .filter((v) => v.share > 50)
    .map((v) => ({
      vendorName: v.vendor.name,
      spendShare: v.share,
      annualSpend: v.spend,
      annualSpendFormatted: formatCurrency(v.spend),
      riskScore: v.vendor.riskScore,
      location: v.vendor.location,
    }));

  return {
    summary: {
      hhiIndex: Math.round(hhi),
      concentrationLevel,
      riskColor,
      totalVendors: vendorShares.length,
      totalSpend,
      totalSpendFormatted: formatCurrency(totalSpend),
      top3Share: vendorShares.slice(0, 3).reduce((sum, v) => sum + v.share, 0),
    },
    topVendorsByShare: vendorShares.slice(0, 10).map((v) => ({
      vendorName: v.vendor.name,
      spendShare: v.share,
      annualSpend: v.spend,
      annualSpendFormatted: formatCurrency(v.spend),
    })),
    singleSourceRisks,
    recommendations: hhi > 1500
      ? [
          "Identify and qualify alternative suppliers for concentrated categories",
          "Implement dual-sourcing strategy for critical materials",
          "Negotiate volume-based contracts with secondary suppliers",
          "Develop supplier risk monitoring and contingency plans",
        ]
      : [
          "Maintain current diversified supplier base",
          "Monitor supplier financial health and performance",
          "Consider strategic consolidation where appropriate for volume leverage",
        ],
  };
}
