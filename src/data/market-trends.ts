export interface MarketTrend {
  commodity: string;
  categoryId: string;
  subcategoryId: string;
  currentPrice: number;
  unit: string;
  priceHistory: { date: string; price: number }[];
  forecast: { date: string; price: number; confidence: number }[];
  avgPrice12Month: number;
  percentFromAvg: number;
  outlook: string;
  outlookSources: string[];
  historicalCycles: number;
  volatilityIndex: number;
}

export const marketTrends: MarketTrend[] = [
  {
    commodity: "Steel",
    categoryId: "cat-42",
    subcategoryId: "sub-4205",
    currentPrice: 820,
    unit: "$/ton",
    priceHistory: [
      { date: "2023-01", price: 750 }, { date: "2023-02", price: 740 }, { date: "2023-03", price: 755 },
      { date: "2023-04", price: 770 }, { date: "2023-05", price: 785 }, { date: "2023-06", price: 790 },
      { date: "2023-07", price: 775 }, { date: "2023-08", price: 760 }, { date: "2023-09", price: 780 },
      { date: "2023-10", price: 795 }, { date: "2023-11", price: 800 }, { date: "2023-12", price: 810 },
      { date: "2024-01", price: 800 }, { date: "2024-02", price: 790 }, { date: "2024-03", price: 805 },
      { date: "2024-04", price: 815 }, { date: "2024-05", price: 825 }, { date: "2024-06", price: 830 },
      { date: "2024-07", price: 820 }, { date: "2024-08", price: 810 }, { date: "2024-09", price: 825 },
      { date: "2024-10", price: 835 }, { date: "2024-11", price: 830 }, { date: "2024-12", price: 820 },
    ],
    forecast: [
      { date: "2025-01", price: 830, confidence: 85 }, { date: "2025-02", price: 840, confidence: 80 },
      { date: "2025-03", price: 855, confidence: 75 }, { date: "2025-04", price: 865, confidence: 70 },
      { date: "2025-05", price: 870, confidence: 65 }, { date: "2025-06", price: 880, confidence: 60 },
    ],
    avgPrice12Month: 801,
    percentFromAvg: 2.4,
    outlook: "Moderately bullish. Infrastructure spending and reshoring driving demand. Chinese export restrictions may tighten supply.",
    outlookSources: ["Goldman Sachs Commodities", "Bloomberg Intelligence", "World Steel Association"],
    historicalCycles: 22,
    volatilityIndex: 35,
  },
  {
    commodity: "Copper",
    categoryId: "cat-42",
    subcategoryId: "sub-4205",
    currentPrice: 4.20,
    unit: "$/lb",
    priceHistory: [
      { date: "2023-01", price: 4.10 }, { date: "2023-02", price: 4.05 }, { date: "2023-03", price: 4.15 },
      { date: "2023-04", price: 4.25 }, { date: "2023-05", price: 3.95 }, { date: "2023-06", price: 3.85 },
      { date: "2023-07", price: 3.90 }, { date: "2023-08", price: 3.80 }, { date: "2023-09", price: 3.75 },
      { date: "2023-10", price: 3.70 }, { date: "2023-11", price: 3.80 }, { date: "2023-12", price: 3.90 },
      { date: "2024-01", price: 3.95 }, { date: "2024-02", price: 4.00 }, { date: "2024-03", price: 4.10 },
      { date: "2024-04", price: 4.30 }, { date: "2024-05", price: 4.50 }, { date: "2024-06", price: 4.55 },
      { date: "2024-07", price: 4.40 }, { date: "2024-08", price: 4.25 }, { date: "2024-09", price: 4.15 },
      { date: "2024-10", price: 4.10 }, { date: "2024-11", price: 4.15 }, { date: "2024-12", price: 4.20 },
    ],
    forecast: [
      { date: "2025-01", price: 4.30, confidence: 82 }, { date: "2025-02", price: 4.40, confidence: 78 },
      { date: "2025-03", price: 4.50, confidence: 74 }, { date: "2025-04", price: 4.55, confidence: 68 },
      { date: "2025-05", price: 4.60, confidence: 62 }, { date: "2025-06", price: 4.65, confidence: 55 },
    ],
    avgPrice12Month: 4.46,
    percentFromAvg: -5.8,
    outlook: "Bullish. EV transition and grid infrastructure driving structural demand growth. Supply constrained by permitting delays at major mines.",
    outlookSources: ["Goldman Sachs", "Bloomberg", "CRU Group"],
    historicalCycles: 18,
    volatilityIndex: 42,
  },
  {
    commodity: "Aluminum",
    categoryId: "cat-42",
    subcategoryId: "sub-4201",
    currentPrice: 2450,
    unit: "$/ton",
    priceHistory: [
      { date: "2023-01", price: 2400 }, { date: "2023-02", price: 2380 }, { date: "2023-03", price: 2420 },
      { date: "2023-04", price: 2450 }, { date: "2023-05", price: 2430 }, { date: "2023-06", price: 2410 },
      { date: "2023-07", price: 2350 }, { date: "2023-08", price: 2320 }, { date: "2023-09", price: 2380 },
      { date: "2023-10", price: 2400 }, { date: "2023-11", price: 2420 }, { date: "2023-12", price: 2440 },
      { date: "2024-01", price: 2430 }, { date: "2024-02", price: 2410 }, { date: "2024-03", price: 2450 },
      { date: "2024-04", price: 2470 }, { date: "2024-05", price: 2490 }, { date: "2024-06", price: 2500 },
      { date: "2024-07", price: 2480 }, { date: "2024-08", price: 2460 }, { date: "2024-09", price: 2440 },
      { date: "2024-10", price: 2450 }, { date: "2024-11", price: 2460 }, { date: "2024-12", price: 2450 },
    ],
    forecast: [
      { date: "2025-01", price: 2460, confidence: 80 }, { date: "2025-02", price: 2475, confidence: 76 },
      { date: "2025-03", price: 2490, confidence: 72 }, { date: "2025-04", price: 2500, confidence: 67 },
      { date: "2025-05", price: 2510, confidence: 62 }, { date: "2025-06", price: 2520, confidence: 56 },
    ],
    avgPrice12Month: 2458,
    percentFromAvg: -0.3,
    outlook: "Neutral to slightly bullish. Energy costs remain a key driver. EU carbon border adjustment may support prices.",
    outlookSources: ["LME", "CRU Group", "Wood Mackenzie"],
    historicalCycles: 20,
    volatilityIndex: 28,
  },
  {
    commodity: "Plastics & Resins",
    categoryId: "cat-42",
    subcategoryId: "sub-4224",
    currentPrice: 1.15,
    unit: "$/lb",
    priceHistory: [
      { date: "2023-01", price: 1.20 }, { date: "2023-02", price: 1.18 }, { date: "2023-03", price: 1.15 },
      { date: "2023-04", price: 1.12 }, { date: "2023-05", price: 1.10 }, { date: "2023-06", price: 1.08 },
      { date: "2023-07", price: 1.05 }, { date: "2023-08", price: 1.03 }, { date: "2023-09", price: 1.06 },
      { date: "2023-10", price: 1.08 }, { date: "2023-11", price: 1.10 }, { date: "2023-12", price: 1.12 },
      { date: "2024-01", price: 1.10 }, { date: "2024-02", price: 1.08 }, { date: "2024-03", price: 1.10 },
      { date: "2024-04", price: 1.12 }, { date: "2024-05", price: 1.14 }, { date: "2024-06", price: 1.16 },
      { date: "2024-07", price: 1.18 }, { date: "2024-08", price: 1.15 }, { date: "2024-09", price: 1.13 },
      { date: "2024-10", price: 1.12 }, { date: "2024-11", price: 1.14 }, { date: "2024-12", price: 1.15 },
    ],
    forecast: [
      { date: "2025-01", price: 1.16, confidence: 78 }, { date: "2025-02", price: 1.18, confidence: 73 },
      { date: "2025-03", price: 1.20, confidence: 68 }, { date: "2025-04", price: 1.22, confidence: 63 },
      { date: "2025-05", price: 1.23, confidence: 58 }, { date: "2025-06", price: 1.24, confidence: 52 },
    ],
    avgPrice12Month: 1.13,
    percentFromAvg: 1.8,
    outlook: "Mildly bullish. Feedstock costs stabilizing. Sustainability regulations may increase virgin resin costs.",
    outlookSources: ["ICIS", "IHS Markit", "Chemical Market Analytics"],
    historicalCycles: 15,
    volatilityIndex: 32,
  },
  {
    commodity: "Natural Gas",
    categoryId: "cat-30",
    subcategoryId: "sub-3002",
    currentPrice: 2.85,
    unit: "$/MMBtu",
    priceHistory: [
      { date: "2023-01", price: 3.50 }, { date: "2023-02", price: 3.20 }, { date: "2023-03", price: 2.80 },
      { date: "2023-04", price: 2.40 }, { date: "2023-05", price: 2.30 }, { date: "2023-06", price: 2.50 },
      { date: "2023-07", price: 2.70 }, { date: "2023-08", price: 2.60 }, { date: "2023-09", price: 2.80 },
      { date: "2023-10", price: 3.00 }, { date: "2023-11", price: 3.20 }, { date: "2023-12", price: 3.40 },
      { date: "2024-01", price: 3.10 }, { date: "2024-02", price: 2.90 }, { date: "2024-03", price: 2.70 },
      { date: "2024-04", price: 2.50 }, { date: "2024-05", price: 2.40 }, { date: "2024-06", price: 2.60 },
      { date: "2024-07", price: 2.80 }, { date: "2024-08", price: 2.75 }, { date: "2024-09", price: 2.85 },
      { date: "2024-10", price: 2.95 }, { date: "2024-11", price: 3.05 }, { date: "2024-12", price: 2.85 },
    ],
    forecast: [
      { date: "2025-01", price: 3.00, confidence: 75 }, { date: "2025-02", price: 2.90, confidence: 70 },
      { date: "2025-03", price: 2.75, confidence: 65 }, { date: "2025-04", price: 2.60, confidence: 60 },
      { date: "2025-05", price: 2.55, confidence: 55 }, { date: "2025-06", price: 2.65, confidence: 50 },
    ],
    avgPrice12Month: 2.79,
    percentFromAvg: 2.2,
    outlook: "Neutral. Winter demand spike fading. LNG export capacity additions may support prices mid-year.",
    outlookSources: ["EIA", "Henry Hub", "Wood Mackenzie"],
    historicalCycles: 25,
    volatilityIndex: 55,
  },
  {
    commodity: "Diesel Fuel",
    categoryId: "cat-20",
    subcategoryId: "sub-2003",
    currentPrice: 3.95,
    unit: "$/gallon",
    priceHistory: [
      { date: "2023-01", price: 4.50 }, { date: "2023-02", price: 4.30 }, { date: "2023-03", price: 4.10 },
      { date: "2023-04", price: 4.00 }, { date: "2023-05", price: 3.90 }, { date: "2023-06", price: 3.85 },
      { date: "2023-07", price: 3.95 }, { date: "2023-08", price: 4.10 }, { date: "2023-09", price: 4.30 },
      { date: "2023-10", price: 4.20 }, { date: "2023-11", price: 4.00 }, { date: "2023-12", price: 3.90 },
      { date: "2024-01", price: 3.85 }, { date: "2024-02", price: 3.80 }, { date: "2024-03", price: 3.90 },
      { date: "2024-04", price: 4.00 }, { date: "2024-05", price: 4.05 }, { date: "2024-06", price: 4.10 },
      { date: "2024-07", price: 4.00 }, { date: "2024-08", price: 3.95 }, { date: "2024-09", price: 3.90 },
      { date: "2024-10", price: 3.85 }, { date: "2024-11", price: 3.90 }, { date: "2024-12", price: 3.95 },
    ],
    forecast: [
      { date: "2025-01", price: 3.90, confidence: 72 }, { date: "2025-02", price: 3.85, confidence: 67 },
      { date: "2025-03", price: 3.90, confidence: 62 }, { date: "2025-04", price: 3.95, confidence: 57 },
      { date: "2025-05", price: 4.00, confidence: 52 }, { date: "2025-06", price: 4.05, confidence: 47 },
    ],
    avgPrice12Month: 3.94,
    percentFromAvg: 0.3,
    outlook: "Neutral. OPEC+ production decisions and seasonal demand patterns will be key drivers.",
    outlookSources: ["EIA", "OPEC Monthly Report", "Platts"],
    historicalCycles: 30,
    volatilityIndex: 48,
  },
];

export function getMarketTrend(commodity: string): MarketTrend | undefined {
  return marketTrends.find(
    (t) => t.commodity.toLowerCase() === commodity.toLowerCase()
  );
}

export function getMarketTrendBySubcategory(subcategoryId: string): MarketTrend | undefined {
  return marketTrends.find((t) => t.subcategoryId === subcategoryId);
}
