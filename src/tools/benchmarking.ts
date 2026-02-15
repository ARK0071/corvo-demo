import {
  vendors, transactions, categories, benchmarks, marketTrends, contracts,
  getCategoryByName, getSubcategoryByName, getVendorsByCategory,
  getVendorsBySubcategory, getTransactionsByCategory, getTransactionsBySubcategory,
  getBenchmarkByCategory, getBenchmarkBySubcategory, getBenchmarkByCategoryName,
  getMarketTrend, getTotalSpend, formatCurrency,
} from "@/data";
import { searchMarketNews } from "@/lib/news-search";

// ============ 9. GET BENCHMARK COMPARISON ============
export function getBenchmarkComparison(params: {
  category?: string;
  vendor?: string;
}) {
  const { category, vendor } = params;

  if (category) {
    const cat = getCategoryByName(category);
    const sub = getSubcategoryByName(category);
    const benchmark = sub
      ? getBenchmarkBySubcategory(sub.id)
      : cat
        ? getBenchmarkByCategory(cat.id)
        : getBenchmarkByCategoryName(category);

    if (!benchmark) {
      return { error: `No benchmark data found for "${category}". Available categories: ${categories.map(c => c.name).join(", ")}` };
    }

    const catVendors = sub
      ? getVendorsBySubcategory(sub.id)
      : cat
        ? getVendorsByCategory(cat.id)
        : [];

    const catTxns = sub
      ? getTransactionsBySubcategory(sub.id)
      : cat
        ? getTransactionsByCategory(cat.id)
        : [];

    const totalSpend = getTotalSpend(catTxns);
    const avgSpendPerVendor = catVendors.length > 0 ? totalSpend / catVendors.length : 0;

    // Compare to benchmark
    const vsMarketAvg = benchmark.marketAvgPrice > 0
      ? ((avgSpendPerVendor - benchmark.marketAvgPrice) / benchmark.marketAvgPrice) * 100
      : 0;

    let percentilePosition: string;
    if (avgSpendPerVendor < benchmark.percentile25) percentilePosition = "Below 25th percentile (low spender)";
    else if (avgSpendPerVendor < benchmark.medianPrice) percentilePosition = "25th-50th percentile (below median)";
    else if (avgSpendPerVendor < benchmark.percentile75) percentilePosition = "50th-75th percentile (above median)";
    else percentilePosition = "Above 75th percentile (high spender)";

    const vendorComparisons = catVendors
      .sort((a, b) => b.annualSpend - a.annualSpend)
      .slice(0, 10)
      .map((v) => ({
        vendorName: v.name,
        annualSpend: v.annualSpend,
        annualSpendFormatted: formatCurrency(v.annualSpend),
        vsMarketAvg: ((v.annualSpend - benchmark.marketAvgPrice) / benchmark.marketAvgPrice * 100),
        assessment: v.annualSpend > benchmark.percentile75
          ? "Above market"
          : v.annualSpend < benchmark.percentile25
            ? "Below market"
            : "Within market range",
      }));

    return {
      category: benchmark.categoryName,
      subcategory: benchmark.subcategoryName || null,
      yourSpend: {
        totalSpend,
        totalSpendFormatted: formatCurrency(totalSpend),
        avgPerVendor: Math.round(avgSpendPerVendor),
        vendorCount: catVendors.length,
      },
      marketBenchmark: {
        avgPrice: benchmark.marketAvgPrice,
        avgPriceFormatted: formatCurrency(benchmark.marketAvgPrice),
        percentile25: benchmark.percentile25,
        percentile25Formatted: formatCurrency(benchmark.percentile25),
        median: benchmark.medianPrice,
        medianFormatted: formatCurrency(benchmark.medianPrice),
        percentile75: benchmark.percentile75,
        percentile75Formatted: formatCurrency(benchmark.percentile75),
        trend: benchmark.trend,
        trendPercent: benchmark.trendPercent,
        source: benchmark.source,
        lastUpdated: benchmark.lastUpdated,
      },
      comparison: {
        vsMarketAvg: Math.round(vsMarketAvg * 10) / 10,
        percentilePosition,
        assessment: vsMarketAvg > 10
          ? "You are spending significantly above market average. Consider renegotiation."
          : vsMarketAvg > 0
            ? "You are spending slightly above market average."
            : "You are spending at or below market average. Good positioning.",
      },
      vendorComparisons,
    };
  }

  // No category specified - return overview
  const overview = benchmarks
    .filter((b) => !b.subcategoryId)
    .map((b) => ({
      category: b.categoryName,
      marketAvg: formatCurrency(b.marketAvgPrice),
      trend: b.trend,
      trendPercent: b.trendPercent,
    }));

  return {
    message: "Benchmark overview across all categories. Specify a category for detailed comparison.",
    benchmarks: overview,
  };
}

// ============ 10. COMPARE PORTFOLIO PRICING ============
export function comparePortfolioPricing(params: {
  categories?: string[];
  entities?: string[];
}) {
  const { categories: catNames = [], entities = ["Entity A", "Entity B", "Entity C"] } = params;

  const targetCats = catNames.length > 0
    ? catNames.map((n) => getCategoryByName(n)).filter(Boolean)
    : categories.slice(0, 5);

  const comparisons = targetCats.map((cat) => {
    if (!cat) return null;
    const benchmark = getBenchmarkByCategory(cat.id);
    const catVendors = getVendorsByCategory(cat.id);
    const totalSpend = catVendors.reduce((sum, v) => sum + v.annualSpend, 0);

    // Simulate cross-entity pricing (varies +/- 15% around actual)
    const entityPricing = entities.map((entity, i) => {
      const factor = 0.85 + (i * 0.12) + (Math.random() * 0.08);
      return {
        entity,
        totalSpend: Math.round(totalSpend * factor),
        totalSpendFormatted: formatCurrency(Math.round(totalSpend * factor)),
        vendorCount: Math.max(1, catVendors.length + Math.floor((Math.random() - 0.5) * 10)),
      };
    });

    const bestPrice = Math.min(...entityPricing.map((e) => e.totalSpend));
    const worstPrice = Math.max(...entityPricing.map((e) => e.totalSpend));
    const savingsOpportunity = worstPrice - bestPrice;

    return {
      category: cat.name,
      entityPricing,
      bestPriceEntity: entityPricing.find((e) => e.totalSpend === bestPrice)?.entity,
      pricingSpread: ((worstPrice - bestPrice) / bestPrice) * 100,
      savingsOpportunity,
      savingsOpportunityFormatted: formatCurrency(savingsOpportunity),
    };
  }).filter(Boolean);

  const totalSavings = comparisons.reduce((sum, c) => sum + (c?.savingsOpportunity || 0), 0);

  return {
    summary: {
      entitiesCompared: entities,
      categoriesAnalyzed: comparisons.length,
      totalSavingsOpportunity: totalSavings,
      totalSavingsFormatted: formatCurrency(totalSavings),
    },
    comparisons,
    recommendations: [
      "Leverage best-in-class pricing across all entities",
      "Consolidate contracts under a single enterprise agreement where possible",
      "Share supplier relationships and negotiation outcomes across entities",
    ],
  };
}

// ============ 11. GET MARKET PRICE TRENDS ============
export async function getMarketPriceTrends(params: {
  commodity: string;
  horizon?: string;
}) {
  const { commodity, horizon = "6 months" } = params;
  const trend = getMarketTrend(commodity);

  if (!trend) {
    const available = marketTrends.map((t) => t.commodity).join(", ");
    return { error: `No market data found for "${commodity}". Available commodities: ${available}` };
  }

  const recentNews = await searchMarketNews(`${commodity} commodity price forecast market outlook`, 4);

  return {
    commodity: trend.commodity,
    currentPrice: `${trend.currentPrice} ${trend.unit}`,
    avgPrice12Month: `${trend.avgPrice12Month} ${trend.unit}`,
    percentFromAvg: `${trend.percentFromAvg > 0 ? "+" : ""}${trend.percentFromAvg}%`,
    priceHistory: trend.priceHistory.slice(-12),
    forecast: trend.forecast,
    outlook: trend.outlook,
    sources: trend.outlookSources,
    volatilityIndex: trend.volatilityIndex,
    historicalCycles: trend.historicalCycles,
    recentNews: recentNews.length > 0 ? recentNews : undefined,
    analysis: {
      currentVsAvg: trend.percentFromAvg < -5
        ? `Current price is ${Math.abs(trend.percentFromAvg)}% below the 12-month average — potentially favorable buying opportunity.`
        : trend.percentFromAvg > 5
          ? `Current price is ${trend.percentFromAvg}% above the 12-month average — consider deferring non-urgent purchases.`
          : "Current price is near the 12-month average.",
      volatility: trend.volatilityIndex > 40
        ? "High volatility — consider hedging or fixed-price contracts."
        : "Moderate volatility — standard procurement approach appropriate.",
    },
  };
}

// ============ 12. ANALYZE SHOULD-COST ============
export function analyzeShouldCost(params: {
  category: string;
  vendor?: string;
}) {
  const { category, vendor } = params;
  const cat = getCategoryByName(category);
  const sub = getSubcategoryByName(category);
  const benchmark = sub
    ? getBenchmarkBySubcategory(sub.id)
    : cat
      ? getBenchmarkByCategory(cat.id)
      : getBenchmarkByCategoryName(category);

  if (!benchmark) {
    return { error: `No benchmark data available for "${category}"` };
  }

  // Build a should-cost model
  const materialCost = Math.round(benchmark.marketAvgPrice * 0.45);
  const laborCost = Math.round(benchmark.marketAvgPrice * 0.25);
  const overhead = Math.round(benchmark.marketAvgPrice * 0.15);
  const margin = Math.round(benchmark.marketAvgPrice * 0.10);
  const logistics = Math.round(benchmark.marketAvgPrice * 0.05);
  const shouldCost = materialCost + laborCost + overhead + margin + logistics;

  // Compare to actual if vendor specified
  let vendorComparison = null;
  if (vendor) {
    const lower = vendor.toLowerCase();
    const v = vendors.find(
      (v) => v.name.toLowerCase().includes(lower) || v.aliases.some((a) => a.toLowerCase().includes(lower))
    );
    if (v) {
      const premium = ((v.annualSpend - shouldCost) / shouldCost) * 100;
      vendorComparison = {
        vendorName: v.name,
        actualSpend: v.annualSpend,
        actualSpendFormatted: formatCurrency(v.annualSpend),
        shouldCost,
        shouldCostFormatted: formatCurrency(shouldCost),
        premium: Math.round(premium * 10) / 10,
        assessment: premium > 15
          ? "Significantly above should-cost. Strong renegotiation opportunity."
          : premium > 5
            ? "Moderately above should-cost. Some room for negotiation."
            : premium > 0
              ? "Slightly above should-cost. Pricing is reasonable."
              : "Below should-cost. Excellent pricing achieved.",
      };
    }
  }

  return {
    category: benchmark.categoryName,
    shouldCostModel: {
      totalShouldCost: shouldCost,
      totalShouldCostFormatted: formatCurrency(shouldCost),
      breakdown: [
        { component: "Materials/Licenses", cost: materialCost, costFormatted: formatCurrency(materialCost), percentOfTotal: 45 },
        { component: "Labor/Implementation", cost: laborCost, costFormatted: formatCurrency(laborCost), percentOfTotal: 25 },
        { component: "Overhead & SGA", cost: overhead, costFormatted: formatCurrency(overhead), percentOfTotal: 15 },
        { component: "Supplier Margin", cost: margin, costFormatted: formatCurrency(margin), percentOfTotal: 10 },
        { component: "Logistics & Delivery", cost: logistics, costFormatted: formatCurrency(logistics), percentOfTotal: 5 },
      ],
    },
    vendorComparison,
    marketContext: {
      trend: benchmark.trend,
      trendPercent: benchmark.trendPercent,
      source: benchmark.source,
    },
    negotiationLevers: [
      "Challenge material/license cost component — request volume discounts",
      "Benchmark labor rates against market alternatives",
      "Negotiate overhead allocation based on actual utilization",
      "Target supplier margin compression for long-term commitments",
      "Optimize logistics through local sourcing or consolidated shipments",
    ],
  };
}

// ============ 13. GENERATE NEGOTIATION BRIEF ============
export async function generateNegotiationBrief(params: {
  vendor: string;
  category?: string;
}) {
  const { vendor: vendorName, category } = params;
  const lower = vendorName.toLowerCase();
  const v = vendors.find(
    (v) => v.name.toLowerCase().includes(lower) || v.aliases.some((a) => a.toLowerCase().includes(lower))
  );

  if (!v) {
    return { error: `Vendor "${vendorName}" not found in the database.` };
  }

  const cat = categories.find((c) => c.id === v.categoryId);
  const benchmark = getBenchmarkByCategory(v.categoryId);
  const contract = contracts.find((c) => c.vendorId === v.id);

  // Calculate spend trend
  const vendorTxns2024 = transactions.filter((t) => t.vendorId === v.id && t.date >= "2024-01-01");
  const vendorTxns2023 = transactions.filter((t) => t.vendorId === v.id && t.date >= "2023-01-01" && t.date < "2024-01-01");
  const spend2024 = getTotalSpend(vendorTxns2024);
  const spend2023 = getTotalSpend(vendorTxns2023);
  const spendGrowth = spend2023 > 0 ? ((spend2024 - spend2023) / spend2023) * 100 : 0;

  // Alternatives
  const alternatives = vendors
    .filter((alt) => alt.subcategoryId === v.subcategoryId && alt.id !== v.id)
    .sort((a, b) => b.annualSpend - a.annualSpend)
    .slice(0, 5);

  // Fetch real market news for this vendor/category
  const searchQuery = `${v.name} ${cat?.name || ""} pricing contract procurement news`;
  const recentNews = await searchMarketNews(searchQuery, 5);

  return {
    briefTitle: `Negotiation Brief: ${v.name}`,
    vendorProfile: {
      name: v.name,
      category: cat?.name,
      annualSpend: v.annualSpend,
      annualSpendFormatted: formatCurrency(v.annualSpend),
      spendGrowthYoY: `${spendGrowth > 0 ? "+" : ""}${Math.round(spendGrowth)}%`,
      contractStatus: v.contractStatus,
      paymentTerms: v.paymentTerms,
      riskScore: v.riskScore,
      location: v.location,
    },
    contractDetails: contract
      ? {
          startDate: contract.startDate,
          endDate: contract.endDate,
          autoRenew: contract.autoRenew,
          aboveMarketPercent: contract.aboveMarketPercent,
        }
      : { note: "No active contract on file" },
    marketPosition: benchmark
      ? {
          marketAvg: formatCurrency(benchmark.marketAvgPrice),
          yourPricing: v.annualSpend > benchmark.marketAvgPrice ? "Above market" : "At or below market",
          marketTrend: benchmark.trend,
          trendPercent: benchmark.trendPercent,
        }
      : null,
    marketIntelligence: {
      recentNews,
      fetchedAt: new Date().toISOString(),
      available: recentNews.length > 0,
    },
    negotiationStrategy: {
      primaryObjective: contract?.aboveMarketPercent && contract.aboveMarketPercent > 10
        ? `Reduce pricing by ${contract.aboveMarketPercent}% to align with market rates`
        : "Maintain competitive pricing with improved terms",
      targetSavings: formatCurrency(Math.round(v.annualSpend * 0.08)),
      keyLeveragePoints: [
        `${formatCurrency(v.annualSpend)} annual spend provides significant volume leverage`,
        spendGrowth > 10 ? `${Math.round(spendGrowth)}% YoY spend growth — use future growth as incentive` : null,
        alternatives.length > 0 ? `${alternatives.length} qualified alternatives available in market` : null,
        contract?.autoRenew ? "Auto-renewal clause — threaten non-renewal for concessions" : null,
        benchmark?.trend === "declining" ? "Market prices are declining — leverage market conditions" : null,
      ].filter(Boolean),
    },
    alternatives: alternatives.map((a) => ({
      name: a.name,
      annualSpend: formatCurrency(a.annualSpend),
      location: a.location,
    })),
    recommendedActions: [
      "Request competitive bid from top 2-3 alternatives",
      "Prepare should-cost analysis to support pricing discussion",
      "Identify contract terms for improvement (payment terms, SLAs, exit clauses)",
      `Target ${formatCurrency(Math.round(v.annualSpend * 0.08))} in savings (8% of current spend)`,
    ],
  };
}
