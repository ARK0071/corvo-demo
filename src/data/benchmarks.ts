export interface Benchmark {
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  marketAvgPrice: number;
  percentile25: number;
  percentile75: number;
  medianPrice: number;
  trend: "rising" | "stable" | "declining";
  trendPercent: number;
  source: string;
  lastUpdated: string;
}

export const benchmarks: Benchmark[] = [
  { categoryId: "cat-01", categoryName: "Business Applications", marketAvgPrice: 3137874, percentile25: 1412043, percentile75: 5648173, medianPrice: 2824087, trend: "stable", trendPercent: 2.8, source: "IDC Technology Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-02", categoryName: "Cloud & Infrastructure", marketAvgPrice: 31793, percentile25: 14307, percentile75: 57227, medianPrice: 28614, trend: "stable", trendPercent: 4, source: "IDC Technology Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-03", categoryName: "Data & Analytics", marketAvgPrice: 974998, percentile25: 438749, percentile75: 1754996, medianPrice: 877498, trend: "stable", trendPercent: 3.5, source: "Gartner IT Spending Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-04", categoryName: "Emerging Technologies", marketAvgPrice: 653722, percentile25: 294175, percentile75: 1176700, medianPrice: 588350, trend: "stable", trendPercent: 2.8, source: "Forrester Research", lastUpdated: "2024-12-01" },
  { categoryId: "cat-05", categoryName: "Hardware & Equipment", marketAvgPrice: 109927, percentile25: 49467, percentile75: 197869, medianPrice: 98934, trend: "stable", trendPercent: 2.1, source: "Gartner IT Spending Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-06", categoryName: "It Services", marketAvgPrice: 3131820, percentile25: 1409319, percentile75: 5637276, medianPrice: 2818638, trend: "rising", trendPercent: 13.1, source: "Gartner IT Spending Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-07", categoryName: "Telecommunications", marketAvgPrice: 1398435, percentile25: 629296, percentile75: 2517183, medianPrice: 1258592, trend: "rising", trendPercent: 7, source: "Forrester Research", lastUpdated: "2024-12-01" },
  { categoryId: "cat-08", categoryName: "Employee Services", marketAvgPrice: 200759, percentile25: 90342, percentile75: 361366, medianPrice: 180683, trend: "rising", trendPercent: 7.1, source: "GBTA Travel Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-09", categoryName: "Human Resources", marketAvgPrice: 1733966, percentile25: 780285, percentile75: 3121139, medianPrice: 1560569, trend: "stable", trendPercent: 4.9, source: "Mercer Benefits Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-10", categoryName: "Occupational Health", marketAvgPrice: 1548545, percentile25: 696845, percentile75: 2787381, medianPrice: 1393691, trend: "declining", trendPercent: -3.1, source: "Mercer Benefits Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-11", categoryName: "Payroll & Administration", marketAvgPrice: 4151595, percentile25: 1868218, percentile75: 7472871, medianPrice: 3736436, trend: "rising", trendPercent: 10.6, source: "GBTA Travel Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-12", categoryName: "Recruitment & Staffing", marketAvgPrice: 4732380, percentile25: 2129571, percentile75: 8518284, medianPrice: 4259142, trend: "declining", trendPercent: -1.1, source: "SIA Staffing Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-13", categoryName: "Travel & Expense", marketAvgPrice: 6319288, percentile25: 2843680, percentile75: 11374718, medianPrice: 5687359, trend: "rising", trendPercent: 12.6, source: "GBTA Travel Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-14", categoryName: "Banking & Treasury", marketAvgPrice: 1986040, percentile25: 893718, percentile75: 3574872, medianPrice: 1787436, trend: "declining", trendPercent: -2.1, source: "Willis Re Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-15", categoryName: "Business Process Outsourcing", marketAvgPrice: 70972, percentile25: 31937, percentile75: 127750, medianPrice: 63875, trend: "rising", trendPercent: 12.7, source: "Willis Re Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-16", categoryName: "Corporate Services", marketAvgPrice: 2402139, percentile25: 1080963, percentile75: 4323850, medianPrice: 2161925, trend: "declining", trendPercent: -3.9, source: "Willis Re Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-17", categoryName: "Financial Operations", marketAvgPrice: 4513590, percentile25: 2031116, percentile75: 8124462, medianPrice: 4062231, trend: "stable", trendPercent: 2.6, source: "Source Global Consulting", lastUpdated: "2024-12-01" },
  { categoryId: "cat-18", categoryName: "Professional Services", marketAvgPrice: 2953388, percentile25: 1329025, percentile75: 5316098, medianPrice: 2658049, trend: "declining", trendPercent: -2.6, source: "Big Four Audit Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-19", categoryName: "Equipment & Machinery", marketAvgPrice: 23007695, percentile25: 10353463, percentile75: 41413851, medianPrice: 20706926, trend: "stable", trendPercent: 1.2, source: "Cass Freight Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-20", categoryName: "Fleet Management", marketAvgPrice: 2690265, percentile25: 1210619, percentile75: 4842477, medianPrice: 2421239, trend: "declining", trendPercent: -2.6, source: "Cass Freight Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-21", categoryName: "Industrial Supplies", marketAvgPrice: 96533007, percentile25: 43439853, percentile75: 173759413, medianPrice: 86879706, trend: "stable", trendPercent: 1.3, source: "Cass Freight Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-22", categoryName: "Packaging & Materials", marketAvgPrice: 2758473, percentile25: 1241313, percentile75: 4965251, medianPrice: 2482626, trend: "declining", trendPercent: -2.7, source: "Cass Freight Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-23", categoryName: "Transportation Services", marketAvgPrice: 2287368, percentile25: 1029316, percentile75: 4117262, medianPrice: 2058631, trend: "rising", trendPercent: 8.1, source: "Bloomberg Commodity Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-24", categoryName: "Warehousing & Distribution", marketAvgPrice: 572431, percentile25: 257594, percentile75: 1030376, medianPrice: 515188, trend: "rising", trendPercent: 13.2, source: "Bloomberg Commodity Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-25", categoryName: "Building Systems", marketAvgPrice: 871266, percentile25: 392070, percentile75: 1568279, medianPrice: 784139, trend: "rising", trendPercent: 11.8, source: "IFMA Benchmarks", lastUpdated: "2024-12-01" },
  { categoryId: "cat-26", categoryName: "Construction Services", marketAvgPrice: 4411896, percentile25: 1985353, percentile75: 7941413, medianPrice: 3970706, trend: "stable", trendPercent: 4.4, source: "ENR Construction Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-27", categoryName: "Facility Operations", marketAvgPrice: 3131932, percentile25: 1409369, percentile75: 5637478, medianPrice: 2818739, trend: "stable", trendPercent: 2.2, source: "ENR Construction Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-28", categoryName: "Office & Workplace", marketAvgPrice: 516116, percentile25: 232252, percentile75: 929009, medianPrice: 464504, trend: "rising", trendPercent: 6.5, source: "EIA Energy Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-29", categoryName: "Property Management", marketAvgPrice: 2492739, percentile25: 1121733, percentile75: 4486930, medianPrice: 2243465, trend: "rising", trendPercent: 9.1, source: "IFMA Benchmarks", lastUpdated: "2024-12-01" },
  { categoryId: "cat-30", categoryName: "Utilities & Energy", marketAvgPrice: 563557, percentile25: 253601, percentile75: 1014403, medianPrice: 507201, trend: "stable", trendPercent: 4.2, source: "EIA Energy Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-31", categoryName: "Advertising & Media", marketAvgPrice: 289997, percentile25: 130499, percentile75: 521995, medianPrice: 260997, trend: "declining", trendPercent: -2.2, source: "GroupM Media Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-32", categoryName: "Digital Marketing", marketAvgPrice: 180835, percentile25: 81376, percentile75: 325503, medianPrice: 162752, trend: "rising", trendPercent: 14.7, source: "GroupM Media Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-33", categoryName: "Events & Experiences", marketAvgPrice: 297758, percentile25: 133991, percentile75: 535964, medianPrice: 267982, trend: "stable", trendPercent: 3.1, source: "eMarketer Digital Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-34", categoryName: "Market Research", marketAvgPrice: 48470, percentile25: 21812, percentile75: 87246, medianPrice: 43623, trend: "rising", trendPercent: 6.6, source: "Gartner CRM Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-35", categoryName: "Print & Production", marketAvgPrice: 150358, percentile25: 67661, percentile75: 270644, medianPrice: 135322, trend: "stable", trendPercent: 3.7, source: "GroupM Media Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-36", categoryName: "Building Systems", marketAvgPrice: 3876243, percentile25: 1744309, percentile75: 6977237, medianPrice: 3488619, trend: "declining", trendPercent: -2, source: "Bloomberg Commodity Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-37", categoryName: "Data & Analytics", marketAvgPrice: 4378900, percentile25: 1970505, percentile75: 7882020, medianPrice: 3941010, trend: "rising", trendPercent: 10.3, source: "Industrial Distribution Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-38", categoryName: "Emerging Technologies", marketAvgPrice: 4135233, percentile25: 1860855, percentile75: 7443419, medianPrice: 3721710, trend: "stable", trendPercent: 4, source: "Industrial Distribution Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-39", categoryName: "Equipment & Machinery", marketAvgPrice: 2704505, percentile25: 1217027, percentile75: 4868109, medianPrice: 2434055, trend: "declining", trendPercent: -4.4, source: "Metal Miner", lastUpdated: "2024-12-01" },
  { categoryId: "cat-40", categoryName: "Facility Operations", marketAvgPrice: 3108720, percentile25: 1398924, percentile75: 5595696, medianPrice: 2797848, trend: "rising", trendPercent: 12.8, source: "Metal Miner", lastUpdated: "2024-12-01" },
  { categoryId: "cat-41", categoryName: "Hardware & Equipment", marketAvgPrice: 149698, percentile25: 67364, percentile75: 269456, medianPrice: 134728, trend: "declining", trendPercent: -5.8, source: "Metal Miner", lastUpdated: "2024-12-01" },
  { categoryId: "cat-42", categoryName: "Industrial Supplies", marketAvgPrice: 2823947, percentile25: 1270776, percentile75: 5083105, medianPrice: 2541552, trend: "declining", trendPercent: -2, source: "Industrial Distribution Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-43", categoryName: "Print & Production", marketAvgPrice: 34343, percentile25: 15454, percentile75: 61817, medianPrice: 30909, trend: "stable", trendPercent: 2.6, source: "Industrial Distribution Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-44", categoryName: "Employee Benefits & Compensation", marketAvgPrice: 5967, percentile25: 2685, percentile75: 10741, medianPrice: 5370, trend: "stable", trendPercent: 4.8, source: "Deloitte CFO Survey", lastUpdated: "2024-12-01" },
  { categoryId: "cat-45", categoryName: "Executive & Governance", marketAvgPrice: 247191, percentile25: 111236, percentile75: 444944, medianPrice: 222472, trend: "rising", trendPercent: 7.3, source: "Deloitte CFO Survey", lastUpdated: "2024-12-01" },
  { categoryId: "cat-46", categoryName: "Financial Transactions", marketAvgPrice: 6187496, percentile25: 2784373, percentile75: 11137493, medianPrice: 5568746, trend: "declining", trendPercent: -4.6, source: "Deloitte CFO Survey", lastUpdated: "2024-12-01" },
  { categoryId: "cat-47", categoryName: "Miscellaneous & Petty Cash", marketAvgPrice: 14051928, percentile25: 6323368, percentile75: 25293470, medianPrice: 12646735, trend: "rising", trendPercent: 4.9, source: "Deloitte CFO Survey", lastUpdated: "2024-12-01" },
  { categoryId: "cat-48", categoryName: "Operational Adjustments", marketAvgPrice: 3796408, percentile25: 1708384, percentile75: 6833534, medianPrice: 3416767, trend: "rising", trendPercent: 5.6, source: "Treasury Management Index", lastUpdated: "2024-12-01" },
  { categoryId: "cat-49", categoryName: "Regulatory & Compliance", marketAvgPrice: 670671, percentile25: 301802, percentile75: 1207208, medianPrice: 603604, trend: "declining", trendPercent: -4.8, source: "Bureau of Labor Statistics", lastUpdated: "2024-12-01" },
];

export function getBenchmarkByCategory(categoryId: string): Benchmark | undefined {
  return benchmarks.find((b) => b.categoryId === categoryId && !b.subcategoryId);
}

export function getBenchmarkBySubcategory(subcategoryId: string): Benchmark | undefined {
  return benchmarks.find((b) => b.subcategoryId === subcategoryId);
}

export function getBenchmarkByCategoryName(name: string): Benchmark | undefined {
  return benchmarks.find(
    (b) => b.categoryName.toLowerCase() === name.toLowerCase() && !b.subcategoryId
  );
}
