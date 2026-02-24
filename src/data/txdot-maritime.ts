/**
 * TxDOT Maritime Infrastructure Program Data
 *
 * Texas state port infrastructure grants (Rider 37 / Port Access Account).
 * Tracks current entitlement and remaining funds.
 */

export interface TxDOTMaritimeProgram {
  programName: string;
  programCode: string;
  entitlement: number; // Total entitlement in dollars
  remaining: number; // Remaining funds in dollars
  disbursementSchedule: Array<{
    fiscalYear: string;
    amount: number;
    status: "disbursed" | "pending" | "scheduled";
  }>;
  lastUpdated: string; // ISO date string
}

/**
 * Current TxDOT Maritime Program status for Port Freeport
 * Based on 88th Legislature Rider 37 / Port Access Account
 */
export const TXDOT_MARITIME_PROGRAM: TxDOTMaritimeProgram = {
  programName: "Port Access Account (Rider 37)",
  programCode: "RIDER-37",
  entitlement: 6_200_000, // $6.2M total entitlement
  remaining: 5_400_000, // $5.4M remaining
  disbursementSchedule: [
    {
      fiscalYear: "FY2024",
      amount: 800_000,
      status: "disbursed",
    },
    {
      fiscalYear: "FY2025",
      amount: 1_200_000,
      status: "scheduled",
    },
    {
      fiscalYear: "FY2026",
      amount: 1_200_000,
      status: "scheduled",
    },
    {
      fiscalYear: "FY2027",
      amount: 1_200_000,
      status: "scheduled",
    },
    {
      fiscalYear: "FY2028",
      amount: 1_200_000,
      status: "scheduled",
    },
  ],
  lastUpdated: "2024-01-15T00:00:00Z",
};

/**
 * Get current program status
 */
export function getTxDOTMaritimeStatus(): TxDOTMaritimeProgram {
  return TXDOT_MARITIME_PROGRAM;
}

/**
 * Get disbursed amount
 */
export function getDisbursedAmount(): number {
  return TXDOT_MARITIME_PROGRAM.disbursementSchedule
    .filter((d) => d.status === "disbursed")
    .reduce((sum, d) => sum + d.amount, 0);
}

/**
 * Get pending/scheduled amount
 */
export function getPendingAmount(): number {
  return TXDOT_MARITIME_PROGRAM.disbursementSchedule
    .filter((d) => d.status === "pending" || d.status === "scheduled")
    .reduce((sum, d) => sum + d.amount, 0);
}
