export { categories, getCategoryById, getCategoryByName, getSubcategoryByName, getCategoriesByGroup } from "./categories";
export type { Category, Subcategory } from "./categories";

export {
  vendors,
  duplicateVendorClusters,
  getVendorById,
  getVendorByName,
  getVendorsByCategory,
  getVendorsBySubcategory,
  getTailSpendVendors,
  getTopVendors,
} from "./vendors";
export type { Vendor } from "./vendors";

export {
  transactions,
  getTransactionsByVendor,
  getTransactionsByCategory,
  getTransactionsBySubcategory,
  getTransactionsByDateRange,
  getTransactionsByMonth,
  getMaverickTransactions,
  getTotalSpend,
  getSpendByMonth,
} from "./transactions";
export type { Transaction } from "./transactions";

export {
  contracts,
  getAutoRenewingAboveMarket,
  getExpiringContracts,
  getExpiredContracts,
  getContractByVendor,
  getContractRiskSummary,
} from "./contracts";
export type { Contract } from "./contracts";

export {
  benchmarks,
  getBenchmarkByCategory,
  getBenchmarkBySubcategory,
  getBenchmarkByCategoryName,
} from "./benchmarks";
export type { Benchmark } from "./benchmarks";

export {
  marketTrends,
  getMarketTrend,
  getMarketTrendBySubcategory,
} from "./market-trends";
export type { MarketTrend } from "./market-trends";

export {
  grants,
  getGrantById,
  getGrantsByAgency,
  getGrantsByFocusArea,
  getActiveGrants,
  getUpcomingGrants,
  searchGrants,
} from "./grants";
export type { GrantProgram } from "./grants";

export {
  portVendors,
  getPortVendorById,
  getPortVendorsBySector,
  searchPortVendors,
  getPortVendorsByCapability,
  getDBEVendors,
  getPortVendorsByCertification,
} from "./port-vendors";
export type { PortVendor } from "./port-vendors";

export {
  matchMatrix,
  scoreVendorForGrant,
  getTopMatchesForGrant,
  getTopGrantsForVendor,
  getMatchDetails,
  getStrongMatches,
  getMatchesByRecommendation,
} from "./matches";
export type { GrantVendorMatch, MatchDimensions } from "./matches";

// Aggregate helpers
export function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function formatCurrencyExact(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
