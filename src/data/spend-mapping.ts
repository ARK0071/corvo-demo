/**
 * Port Freeport Spend Mapping Table
 *
 * Maps top spend categories to grant themes for embedding-based similarity.
 * Use the "embeddingTheme" field for embeddings, not the raw category name.
 */

export interface SpendCategory {
  category: string;
  operationalSignal: string;
  grantTheme: string;
  searchKeywords: string;
  embeddingTheme: string;
  weight: number;
}

export const SPEND_CATEGORIES: SpendCategory[] = [
  {
    category: "Workforce / Labor",
    operationalSignal: "Skilled maritime workforce required",
    grantTheme: "Maritime workforce development",
    searchKeywords: "maritime workforce, port workforce training, logistics workforce",
    embeddingTheme:
      "Workforce training and development programs supporting maritime logistics, port operations, and skilled trades.",
    weight: 0.1,
  },
  {
    category: "Professional Services",
    operationalSignal: "Engineering + environmental planning",
    grantTheme: "Infrastructure planning & resilience planning",
    searchKeywords: "infrastructure planning, environmental studies, resilience planning",
    embeddingTheme:
      "Engineering design, environmental studies, and planning activities supporting port infrastructure expansion and climate resilience.",
    weight: 0.15,
  },
  {
    category: "Materials & Supplies",
    operationalSignal: "Cargo equipment + facility operations",
    grantTheme: "Cargo equipment modernization",
    searchKeywords: "cargo handling equipment, terminal modernization, port equipment",
    embeddingTheme:
      "Modernization of cargo handling equipment and terminal infrastructure to improve freight throughput and operational efficiency.",
    weight: 0.2,
  },
  {
    category: "Utilities",
    operationalSignal: "High electricity demand",
    grantTheme: "Port electrification & shore power",
    searchKeywords: "port electrification, shore power, emissions reduction",
    embeddingTheme:
      "Electrification of port infrastructure and installation of shore power systems to reduce diesel emissions and improve air quality.",
    weight: 0.25,
  },
  {
    category: "Facilities Maintenance",
    operationalSignal: "Aging infrastructure",
    grantTheme: "Infrastructure rehabilitation",
    searchKeywords: "dock rehabilitation, berth repair, terminal modernization",
    embeddingTheme:
      "Rehabilitation and modernization of port infrastructure including docks, terminals, and cargo handling facilities.",
    weight: 0.3,
  },
];
