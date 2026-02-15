import { z } from "zod";
import { getSpendInsights, analyzeTailSpend, detectDuplicateVendors, analyzePpv, detectSpendingAnomalies, analyzeContractRisk, analyzeMaverickSpend, analyzeSupplierConcentration } from "./insights";
import { getBenchmarkComparison, comparePortfolioPricing, getMarketPriceTrends, analyzeShouldCost, generateNegotiationBrief } from "./benchmarking";
import { generateVendorRecommendations, assessCommodityBuyTiming, createActionPlan, identifyAlternativeSuppliers, generateBusinessCase, generateSavingsReport, optimizePaymentTerms } from "./recommendations";

export const procurementTools = {
  // ===== INSIGHTS & ANALYTICS =====
  get_spend_insights: {
    description: "Get comprehensive spend analysis across vendors, categories, and time periods. Use this for questions about spend amounts, top vendors, category breakdowns, and spending trends.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category or subcategory name to filter by (e.g., 'IT Software', 'BI Software', 'Raw Materials', 'Steel')"),
      vendor: z.string().optional().describe("Vendor name to filter by"),
      dateStart: z.string().optional().describe("Start date in YYYY-MM-DD format"),
      dateEnd: z.string().optional().describe("End date in YYYY-MM-DD format"),
      limit: z.number().optional().describe("Max number of top vendors to return (default 10)"),
    }),
    execute: async (params: { category?: string; vendor?: string; dateStart?: string; dateEnd?: string; limit?: number }) => getSpendInsights(params),
  },

  analyze_tail_spend: {
    description: "Identify small vendors (each <1% of total spend) that are candidates for consolidation. Use for tail spend analysis and vendor reduction programs.",
    inputSchema: z.object({
      thresholdPercent: z.number().optional().describe("Threshold as % of total spend (default 1%)"),
      category: z.string().optional().describe("Category to filter by"),
    }),
    execute: async (params: { thresholdPercent?: number; category?: string }) => analyzeTailSpend(params),
  },

  detect_duplicate_vendors: {
    description: "Find duplicate vendor records using name matching. Identifies vendors recorded under different names that are actually the same entity.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category to filter by"),
      confidenceThreshold: z.number().optional().describe("Minimum confidence for matches (default 70%)"),
    }),
    execute: async (params: { category?: string; confidenceThreshold?: number }) => detectDuplicateVendors(params),
  },

  analyze_ppv: {
    description: "Purchase price variance analysis with root cause attribution. Decomposes spend changes into volume, price, and mix effects.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category or subcategory to analyze"),
      vendor: z.string().optional().describe("Specific vendor to analyze"),
      period: z.string().optional().describe("Period to compare (default 'month')"),
    }),
    execute: async (params: { category?: string; vendor?: string; period?: string }) => analyzePpv(params),
  },

  detect_spending_anomalies: {
    description: "Statistical detection of spending anomalies and outliers using z-score analysis. Identifies potentially fraudulent or erroneous transactions.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category to analyze"),
      sensitivity: z.number().optional().describe("Z-score threshold (default 2, higher = fewer anomalies)"),
    }),
    execute: async (params: { category?: string; sensitivity?: number }) => detectSpendingAnomalies(params),
  },

  analyze_contract_risk: {
    description: "Track contract expirations, auto-renewal traps, and above-market rates. Identifies contracts that need immediate attention.",
    inputSchema: z.object({
      daysAhead: z.number().optional().describe("Days ahead to check for expirations (default 90)"),
      category: z.string().optional().describe("Category to filter by"),
    }),
    execute: async (params: { daysAhead?: number; category?: string }) => analyzeContractRisk(params),
  },

  analyze_maverick_spend: {
    description: "Identify off-contract (maverick) purchases — transactions with contracted vendors that were made outside their contract terms.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category to filter by"),
    }),
    execute: async (params: { category?: string }) => analyzeMaverickSpend(params),
  },

  analyze_supplier_concentration: {
    description: "Calculate supplier concentration risk using HHI index. Identifies single-source dependencies and over-reliance on specific vendors.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category or subcategory to analyze"),
    }),
    execute: async (params: { category?: string }) => analyzeSupplierConcentration(params),
  },

  // ===== BENCHMARKING & MARKET INTELLIGENCE =====
  get_benchmark_comparison: {
    description: "Compare your spending to market benchmarks and peer companies. Shows percentile position, market average, and pricing assessment.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category or subcategory to benchmark"),
      vendor: z.string().optional().describe("Specific vendor to benchmark"),
    }),
    execute: async (params: { category?: string; vendor?: string }) => getBenchmarkComparison(params),
  },

  compare_portfolio_pricing: {
    description: "Cross-company pricing comparison for portfolio companies or business entities. Identifies pricing disparities across entities.",
    inputSchema: z.object({
      categories: z.array(z.string()).optional().describe("Categories to compare"),
      entities: z.array(z.string()).optional().describe("Entity names to compare"),
    }),
    execute: async (params: { categories?: string[]; entities?: string[] }) => comparePortfolioPricing(params),
  },

  get_market_price_trends: {
    description: "Get commodity price trends, forecasts, and market outlook. Available commodities: Steel, Copper, Aluminum, Plastics & Resins, Natural Gas, Diesel Fuel.",
    inputSchema: z.object({
      commodity: z.string().describe("Commodity name (e.g., 'Steel', 'Copper', 'Aluminum')"),
      horizon: z.string().optional().describe("Forecast horizon (default '6 months')"),
    }),
    execute: async (params: { commodity: string; horizon?: string }) => getMarketPriceTrends(params),
  },

  analyze_should_cost: {
    description: "Bottom-up cost modeling that breaks down what a product/service should cost based on materials, labor, overhead, margin, and logistics.",
    inputSchema: z.object({
      category: z.string().describe("Category to model"),
      vendor: z.string().optional().describe("Vendor to compare against the model"),
    }),
    execute: async (params: { category: string; vendor?: string }) => analyzeShouldCost(params),
  },

  generate_negotiation_brief: {
    description: "Auto-generate a comprehensive negotiation preparation document for a specific vendor. Includes vendor profile, market position, leverage points, and strategy.",
    inputSchema: z.object({
      vendor: z.string().describe("Vendor name to prepare negotiation brief for"),
      category: z.string().optional().describe("Category context"),
    }),
    execute: async (params: { vendor: string; category?: string }) => generateNegotiationBrief(params),
  },

  // ===== RECOMMENDATIONS & ACTIONS =====
  generate_vendor_recommendations: {
    description: "Generate a prioritized, ranked action plan for vendors. Identifies high-priority actions like expired contracts, above-market pricing, and risk issues.",
    inputSchema: z.object({
      vendor: z.string().optional().describe("Specific vendor to get recommendations for"),
      category: z.string().optional().describe("Category to focus on"),
      limit: z.number().optional().describe("Max vendors to analyze (default 10)"),
    }),
    execute: async (params: { vendor?: string; category?: string; limit?: number }) => generateVendorRecommendations(params),
  },

  assess_commodity_buy_timing: {
    description: "Forward-buying expected value analysis for commodities. Recommends buy/hold/sell timing based on market forecasts and carrying costs.",
    inputSchema: z.object({
      commodity: z.string().describe("Commodity to assess (e.g., 'Copper', 'Steel')"),
      months: z.number().optional().describe("Forward-buy horizon in months (default 6)"),
      currentInventoryWeeks: z.number().optional().describe("Current inventory in weeks (default 2)"),
    }),
    execute: async (params: { commodity: string; months?: number; currentInventoryWeeks?: number }) => assessCommodityBuyTiming(params),
  },

  create_action_plan: {
    description: "Generate a comprehensive 90-day procurement improvement roadmap with prioritized actions, estimated savings, and implementation phases.",
    inputSchema: z.object({
      focus: z.string().optional().describe("Specific focus area (e.g., 'cost reduction', 'vendor consolidation')"),
      timeframe: z.number().optional().describe("Plan duration in days (default 90)"),
    }),
    execute: async (params: { focus?: string; timeframe?: number }) => createActionPlan(params),
  },

  identify_alternative_suppliers: {
    description: "Find qualified alternative vendors for a given vendor or category. Useful for dual-sourcing strategies and competitive bidding.",
    inputSchema: z.object({
      vendor: z.string().optional().describe("Current vendor to find alternatives for"),
      category: z.string().optional().describe("Category to search in"),
      limit: z.number().optional().describe("Max alternatives to return (default 10)"),
    }),
    execute: async (params: { vendor?: string; category?: string; limit?: number }) => identifyAlternativeSuppliers(params),
  },

  generate_business_case: {
    description: "Generate an ROI analysis and business case for procurement initiatives. Calculates savings, payback period, NPV, and provides a recommendation.",
    inputSchema: z.object({
      initiative: z.string().describe("Initiative description (e.g., 'tail spend consolidation', 'contract renegotiation')"),
      category: z.string().optional().describe("Category focus"),
      estimatedInvestment: z.number().optional().describe("Expected implementation cost in dollars (default 50000)"),
    }),
    execute: async (params: { initiative: string; category?: string; estimatedInvestment?: number }) => generateBusinessCase(params),
  },

  generate_savings_report: {
    description: "Generate an executive summary of all identified savings opportunities across the entire procurement portfolio.",
    inputSchema: z.object({
      period: z.string().optional().describe("Report period (default 'annual')"),
    }),
    execute: async (params: { period?: string }) => generateSavingsReport(params),
  },

  optimize_payment_terms: {
    description: "Analyze payment terms across vendors and identify optimization opportunities including early payment discounts, term extensions, and dynamic discounting.",
    inputSchema: z.object({
      category: z.string().optional().describe("Category to focus on"),
      vendor: z.string().optional().describe("Specific vendor to analyze"),
    }),
    execute: async (params: { category?: string; vendor?: string }) => optimizePaymentTerms(params),
  },
};
