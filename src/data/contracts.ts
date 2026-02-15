import { vendors } from "./vendors";

export interface Contract {
  id: string;
  vendorId: string;
  vendorName: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  annualValue: number;
  terms: string;
  status: "active" | "expiring_soon" | "expired" | "auto_renewing";
  daysUntilExpiry: number;
  aboveMarketPercent: number; // positive = above market rate
}

function generateContracts(): Contract[] {
  const contracts: Contract[] = [];
  let contractId = 1;

  const activeVendors = vendors.filter((v) => v.contractStatus === "active" || v.contractStatus === "expired");

  for (const vendor of activeVendors) {
    const isExpired = vendor.contractStatus === "expired";

    let startDate: string;
    let endDate: string;
    let autoRenew: boolean;
    let daysUntilExpiry: number;
    let aboveMarketPercent: number;
    let status: Contract["status"];

    if (isExpired) {
      // Expired contracts - ended 1-6 months ago
      const monthsAgo = Math.floor(Math.random() * 6) + 1;
      const end = new Date(2024, 12 - monthsAgo, 15);
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 2);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
      autoRenew = false;
      daysUntilExpiry = -monthsAgo * 30;
      aboveMarketPercent = Math.floor(Math.random() * 15) + 5; // 5-20% above market
      status = "expired";
    } else {
      // Active contracts
      const yearsLength = Math.random() > 0.5 ? 2 : 3;
      const monthsFromNow = Math.floor(Math.random() * 24) - 3; // -3 to +21 months from "now" (Dec 2024)
      const end = new Date(2025, monthsFromNow, 15);
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - yearsLength);

      startDate = start.toISOString().split("T")[0];
      endDate = end.toISOString().split("T")[0];
      autoRenew = Math.random() > 0.6;
      daysUntilExpiry = monthsFromNow * 30;
      aboveMarketPercent = Math.floor(Math.random() * 20) - 5; // -5% to +15% vs market

      if (daysUntilExpiry < 0) {
        status = autoRenew ? "auto_renewing" : "expired";
      } else if (daysUntilExpiry < 90) {
        status = autoRenew ? "auto_renewing" : "expiring_soon";
      } else {
        status = "active";
      }
    }

    contracts.push({
      id: `contract-${String(contractId++).padStart(4, "0")}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      startDate,
      endDate,
      autoRenew,
      annualValue: vendor.annualSpend,
      terms: vendor.paymentTerms,
      status,
      daysUntilExpiry,
      aboveMarketPercent,
    });
  }

  return contracts;
}

export const contracts = generateContracts();

// Critical contracts that are auto-renewing at above-market rates
export function getAutoRenewingAboveMarket(): Contract[] {
  return contracts.filter(
    (c) => c.autoRenew && c.aboveMarketPercent > 10 && c.daysUntilExpiry < 90
  );
}

export function getExpiringContracts(daysAhead: number = 90): Contract[] {
  return contracts.filter(
    (c) => c.status === "expiring_soon" || (c.daysUntilExpiry > 0 && c.daysUntilExpiry <= daysAhead)
  );
}

export function getExpiredContracts(): Contract[] {
  return contracts.filter((c) => c.status === "expired");
}

export function getContractByVendor(vendorId: string): Contract | undefined {
  return contracts.find((c) => c.vendorId === vendorId);
}

export function getContractRiskSummary() {
  const expiringSoon = contracts.filter((c) => c.status === "expiring_soon");
  const autoRenewing = contracts.filter((c) => c.status === "auto_renewing");
  const expired = contracts.filter((c) => c.status === "expired");
  const aboveMarket = contracts.filter((c) => c.aboveMarketPercent > 10);

  return {
    totalContracts: contracts.length,
    expiringSoon: expiringSoon.length,
    autoRenewing: autoRenewing.length,
    expired: expired.length,
    aboveMarketRate: aboveMarket.length,
    totalAtRiskValue: [...expiringSoon, ...autoRenewing.filter((c) => c.aboveMarketPercent > 10)]
      .reduce((sum, c) => sum + c.annualValue, 0),
  };
}
