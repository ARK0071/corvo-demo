export interface Category {
  id: string;
  name: string;
  group: string;
  subcategories: Subcategory[];
}

export interface Subcategory {
  id: string;
  name: string;
  parentCategoryId: string;
}

export const categories: Category[] = [
  // ===== TECHNOLOGY & DIGITAL =====
  {
    id: "cat-01",
    name: "Business Applications",
    group: "Technology & Digital",
    subcategories: [
      { id: "sub-0101", name: "Erp Systems", parentCategoryId: "cat-01" },
      { id: "sub-0102", name: "Expense Management Software", parentCategoryId: "cat-01" },
    ],
  },
  {
    id: "cat-02",
    name: "Cloud & Infrastructure",
    group: "Technology & Digital",
    subcategories: [
      { id: "sub-0201", name: "Cloud Services & Hosting", parentCategoryId: "cat-02" },
      { id: "sub-0202", name: "Data Center & Colocation", parentCategoryId: "cat-02" },
    ],
  },
  {
    id: "cat-03",
    name: "Data & Analytics",
    group: "Technology & Digital",
    subcategories: [
      { id: "sub-0301", name: "Data Feeds & Services", parentCategoryId: "cat-03" },
    ],
  },
  {
    id: "cat-04",
    name: "Emerging Technologies",
    group: "Technology & Digital",
    subcategories: [
      { id: "sub-0401", name: "Video Streaming & Content Development", parentCategoryId: "cat-04" },
    ],
  },
  {
    id: "cat-05",
    name: "Hardware & Equipment",
    group: "Technology & Digital",
    subcategories: [
      { id: "sub-0501", name: "Av & Display Technology", parentCategoryId: "cat-05" },
      { id: "sub-0502", name: "Barcode Printers & Scanners", parentCategoryId: "cat-05" },
      { id: "sub-0503", name: "Computer & Storage Hardware", parentCategoryId: "cat-05" },
      { id: "sub-0504", name: "Office Equipment & Peripherals", parentCategoryId: "cat-05" },
    ],
  },
  {
    id: "cat-06",
    name: "It Services",
    group: "Technology & Digital",
    subcategories: [
      { id: "sub-0601", name: "It Consulting & Advisory", parentCategoryId: "cat-06" },
      { id: "sub-0602", name: "It Staffing & Resources", parentCategoryId: "cat-06" },
      { id: "sub-0603", name: "Managed It Services", parentCategoryId: "cat-06" },
    ],
  },
  {
    id: "cat-07",
    name: "Telecommunications",
    group: "Technology & Digital",
    subcategories: [
      { id: "sub-0701", name: "Voice & Data Services", parentCategoryId: "cat-07" },
      { id: "sub-0702", name: "Wireless Services", parentCategoryId: "cat-07" },
    ],
  },
  // ===== PEOPLE & WORKPLACE =====
  {
    id: "cat-08",
    name: "Employee Services",
    group: "People & Workplace",
    subcategories: [
      { id: "sub-0801", name: "Employee Recognition Programs", parentCategoryId: "cat-08" },
      { id: "sub-0802", name: "Relocation Services", parentCategoryId: "cat-08" },
      { id: "sub-0803", name: "Training & Development", parentCategoryId: "cat-08" },
    ],
  },
  {
    id: "cat-09",
    name: "Human Resources",
    group: "People & Workplace",
    subcategories: [
      { id: "sub-0901", name: "Benefits Administration", parentCategoryId: "cat-09" },
    ],
  },
  {
    id: "cat-10",
    name: "Occupational Health",
    group: "People & Workplace",
    subcategories: [
      { id: "sub-1001", name: "Occupational Health Services", parentCategoryId: "cat-10" },
    ],
  },
  {
    id: "cat-11",
    name: "Payroll & Administration",
    group: "People & Workplace",
    subcategories: [
      { id: "sub-1101", name: "Background Checks & Drug Testing", parentCategoryId: "cat-11" },
      { id: "sub-1102", name: "Hr Outsourcing", parentCategoryId: "cat-11" },
      { id: "sub-1103", name: "Payroll Processing", parentCategoryId: "cat-11" },
    ],
  },
  {
    id: "cat-12",
    name: "Recruitment & Staffing",
    group: "People & Workplace",
    subcategories: [
      { id: "sub-1201", name: "Contingent Labor", parentCategoryId: "cat-12" },
      { id: "sub-1202", name: "Outplacement Services", parentCategoryId: "cat-12" },
      { id: "sub-1203", name: "Recruiting Services", parentCategoryId: "cat-12" },
    ],
  },
  {
    id: "cat-13",
    name: "Travel & Expense",
    group: "People & Workplace",
    subcategories: [
      { id: "sub-1301", name: "Airfare & Corporate Aircraft", parentCategoryId: "cat-13" },
      { id: "sub-1302", name: "Auto Rental Services", parentCategoryId: "cat-13" },
      { id: "sub-1303", name: "Corporate Housing", parentCategoryId: "cat-13" },
      { id: "sub-1304", name: "Ground Transportation", parentCategoryId: "cat-13" },
      { id: "sub-1305", name: "Hotels & Lodging", parentCategoryId: "cat-13" },
      { id: "sub-1306", name: "Meals & Entertainment", parentCategoryId: "cat-13" },
      { id: "sub-1307", name: "Parking & Tolls", parentCategoryId: "cat-13" },
      { id: "sub-1308", name: "Travel Management Services", parentCategoryId: "cat-13" },
    ],
  },
  // ===== FINANCE & OPERATIONS =====
  {
    id: "cat-14",
    name: "Banking & Treasury",
    group: "Finance & Operations",
    subcategories: [
      { id: "sub-1401", name: "Corporate Banking Services", parentCategoryId: "cat-14" },
      { id: "sub-1402", name: "Merchant Services & Payment Processing", parentCategoryId: "cat-14" },
    ],
  },
  {
    id: "cat-15",
    name: "Business Process Outsourcing",
    group: "Finance & Operations",
    subcategories: [
      { id: "sub-1501", name: "Document Management & Shredding", parentCategoryId: "cat-15" },
      { id: "sub-1502", name: "Investor Relations Services", parentCategoryId: "cat-15" },
    ],
  },
  {
    id: "cat-16",
    name: "Corporate Services",
    group: "Finance & Operations",
    subcategories: [
      { id: "sub-1601", name: "Corporate Insurance Services", parentCategoryId: "cat-16" },
      { id: "sub-1602", name: "Dues & Subscriptions", parentCategoryId: "cat-16" },
    ],
  },
  {
    id: "cat-17",
    name: "Financial Operations",
    group: "Finance & Operations",
    subcategories: [
      { id: "sub-1701", name: "Accounting & Bookkeeping", parentCategoryId: "cat-17" },
      { id: "sub-1702", name: "Financial Advisory Services", parentCategoryId: "cat-17" },
    ],
  },
  {
    id: "cat-18",
    name: "Professional Services",
    group: "Finance & Operations",
    subcategories: [
      { id: "sub-1801", name: "Legal Services", parentCategoryId: "cat-18" },
      { id: "sub-1802", name: "Management Consulting", parentCategoryId: "cat-18" },
      { id: "sub-1803", name: "Translation Services", parentCategoryId: "cat-18" },
    ],
  },
  // ===== SUPPLY CHAIN & LOGISTICS =====
  {
    id: "cat-19",
    name: "Equipment & Machinery",
    group: "Supply Chain & Logistics",
    subcategories: [
      { id: "sub-1901", name: "Construction Equipment", parentCategoryId: "cat-19" },
      { id: "sub-1902", name: "Manufacturing Equipment", parentCategoryId: "cat-19" },
      { id: "sub-1903", name: "Material Handling Equipment", parentCategoryId: "cat-19" },
    ],
  },
  {
    id: "cat-20",
    name: "Fleet Management",
    group: "Supply Chain & Logistics",
    subcategories: [
      { id: "sub-2001", name: "Fleet Maintenance & Repair", parentCategoryId: "cat-20" },
      { id: "sub-2002", name: "Fleet Management & Leasing", parentCategoryId: "cat-20" },
      { id: "sub-2003", name: "Fuel & Fuel Management", parentCategoryId: "cat-20" },
      { id: "sub-2004", name: "Vehicle Leasing & Purchase", parentCategoryId: "cat-20" },
    ],
  },
  {
    id: "cat-21",
    name: "Industrial Supplies",
    group: "Supply Chain & Logistics",
    subcategories: [
      { id: "sub-2101", name: "Chemicals & Lubricants", parentCategoryId: "cat-21" },
      { id: "sub-2102", name: "Electrical & Electronic Supplies", parentCategoryId: "cat-21" },
      { id: "sub-2103", name: "Janitorial & Cleaning Supplies", parentCategoryId: "cat-21" },
      { id: "sub-2104", name: "Mro & Industrial Supplies", parentCategoryId: "cat-21" },
      { id: "sub-2105", name: "Safety Supplies & Equipment", parentCategoryId: "cat-21" },
      { id: "sub-2106", name: "Tools & Hardware", parentCategoryId: "cat-21" },
    ],
  },
  {
    id: "cat-22",
    name: "Packaging & Materials",
    group: "Supply Chain & Logistics",
    subcategories: [
      { id: "sub-2201", name: "Flexible & Retail Packaging", parentCategoryId: "cat-22" },
      { id: "sub-2202", name: "Packaging Products & Services", parentCategoryId: "cat-22" },
      { id: "sub-2203", name: "Packaging Supplies", parentCategoryId: "cat-22" },
      { id: "sub-2204", name: "Protective Packaging", parentCategoryId: "cat-22" },
    ],
  },
  {
    id: "cat-23",
    name: "Transportation Services",
    group: "Supply Chain & Logistics",
    subcategories: [
      { id: "sub-2301", name: "Air Freight Services", parentCategoryId: "cat-23" },
      { id: "sub-2302", name: "Courier & Delivery Services", parentCategoryId: "cat-23" },
      { id: "sub-2303", name: "Freight Forwarding", parentCategoryId: "cat-23" },
      { id: "sub-2304", name: "Ground Transportation & Trucking", parentCategoryId: "cat-23" },
      { id: "sub-2305", name: "Ltl & Parcel Shipping", parentCategoryId: "cat-23" },
      { id: "sub-2306", name: "Ocean Freight Services", parentCategoryId: "cat-23" },
    ],
  },
  {
    id: "cat-24",
    name: "Warehousing & Distribution",
    group: "Supply Chain & Logistics",
    subcategories: [
      { id: "sub-2401", name: "Fulfillment Services", parentCategoryId: "cat-24" },
      { id: "sub-2402", name: "Third Party Logistics", parentCategoryId: "cat-24" },
      { id: "sub-2403", name: "Warehousing Services", parentCategoryId: "cat-24" },
    ],
  },
  // ===== INFRASTRUCTURE & FACILITIES =====
  {
    id: "cat-25",
    name: "Building Systems",
    group: "Infrastructure & Facilities",
    subcategories: [
      { id: "sub-2501", name: "Electrical Services", parentCategoryId: "cat-25" },
      { id: "sub-2502", name: "Elevators & Vertical Transport", parentCategoryId: "cat-25" },
      { id: "sub-2503", name: "Fire & Life Safety", parentCategoryId: "cat-25" },
      { id: "sub-2504", name: "Hvac & Refrigeration", parentCategoryId: "cat-25" },
      { id: "sub-2505", name: "Plumbing Services", parentCategoryId: "cat-25" },
      { id: "sub-2506", name: "Security Systems", parentCategoryId: "cat-25" },
    ],
  },
  {
    id: "cat-26",
    name: "Construction Services",
    group: "Infrastructure & Facilities",
    subcategories: [
      { id: "sub-2601", name: "Architecture & Design", parentCategoryId: "cat-26" },
      { id: "sub-2602", name: "Engineering Services", parentCategoryId: "cat-26" },
      { id: "sub-2603", name: "General Construction", parentCategoryId: "cat-26" },
      { id: "sub-2604", name: "Specialized Construction", parentCategoryId: "cat-26" },
      { id: "sub-2605", name: "Structural & Civil Work", parentCategoryId: "cat-26" },
    ],
  },
  {
    id: "cat-27",
    name: "Facility Operations",
    group: "Infrastructure & Facilities",
    subcategories: [
      { id: "sub-2701", name: "Cleaning & Janitorial Services", parentCategoryId: "cat-27" },
      { id: "sub-2702", name: "Food & Catering Services", parentCategoryId: "cat-27" },
      { id: "sub-2703", name: "Landscaping & Grounds", parentCategoryId: "cat-27" },
      { id: "sub-2704", name: "Maintenance & Repair", parentCategoryId: "cat-27" },
      { id: "sub-2705", name: "Pest Control Services", parentCategoryId: "cat-27" },
      { id: "sub-2706", name: "Waste Management & Recycling", parentCategoryId: "cat-27" },
    ],
  },
  {
    id: "cat-28",
    name: "Office & Workplace",
    group: "Infrastructure & Facilities",
    subcategories: [
      { id: "sub-2801", name: "Flowers & Gifts", parentCategoryId: "cat-28" },
      { id: "sub-2802", name: "Mail & Shipping Services", parentCategoryId: "cat-28" },
      { id: "sub-2803", name: "Office Furniture & Equipment", parentCategoryId: "cat-28" },
      { id: "sub-2804", name: "Office Supplies & Stationery", parentCategoryId: "cat-28" },
      { id: "sub-2805", name: "Printing & Reproduction", parentCategoryId: "cat-28" },
      { id: "sub-2806", name: "Uniforms & Workwear", parentCategoryId: "cat-28" },
    ],
  },
  {
    id: "cat-29",
    name: "Property Management",
    group: "Infrastructure & Facilities",
    subcategories: [
      { id: "sub-2901", name: "Real Estate Services", parentCategoryId: "cat-29" },
      { id: "sub-2902", name: "Rent & Lease Payments", parentCategoryId: "cat-29" },
    ],
  },
  {
    id: "cat-30",
    name: "Utilities & Energy",
    group: "Infrastructure & Facilities",
    subcategories: [
      { id: "sub-3001", name: "Electricity Services", parentCategoryId: "cat-30" },
      { id: "sub-3002", name: "Natural Gas Services", parentCategoryId: "cat-30" },
      { id: "sub-3003", name: "Utility Management Services", parentCategoryId: "cat-30" },
      { id: "sub-3004", name: "Water & Sewer Services", parentCategoryId: "cat-30" },
    ],
  },
  // ===== MARKETING & SALES =====
  {
    id: "cat-31",
    name: "Advertising & Media",
    group: "Marketing & Sales",
    subcategories: [
      { id: "sub-3101", name: "Advertising Agencies", parentCategoryId: "cat-31" },
      { id: "sub-3102", name: "Media Buying & Planning", parentCategoryId: "cat-31" },
      { id: "sub-3103", name: "Public Relations", parentCategoryId: "cat-31" },
    ],
  },
  {
    id: "cat-32",
    name: "Digital Marketing",
    group: "Marketing & Sales",
    subcategories: [
      { id: "sub-3201", name: "Digital Marketing Services", parentCategoryId: "cat-32" },
      { id: "sub-3202", name: "Marketing Technology", parentCategoryId: "cat-32" },
    ],
  },
  {
    id: "cat-33",
    name: "Events & Experiences",
    group: "Marketing & Sales",
    subcategories: [
      { id: "sub-3301", name: "Event Planning & Management", parentCategoryId: "cat-33" },
      { id: "sub-3302", name: "Trade Shows & Exhibitions", parentCategoryId: "cat-33" },
    ],
  },
  {
    id: "cat-34",
    name: "Market Research",
    group: "Marketing & Sales",
    subcategories: [
      { id: "sub-3401", name: "Market Research Services", parentCategoryId: "cat-34" },
    ],
  },
  {
    id: "cat-35",
    name: "Print & Production",
    group: "Marketing & Sales",
    subcategories: [
      { id: "sub-3501", name: "Commercial Printing", parentCategoryId: "cat-35" },
      { id: "sub-3502", name: "Promotional Products", parentCategoryId: "cat-35" },
      { id: "sub-3503", name: "Signage & Graphics", parentCategoryId: "cat-35" },
    ],
  },
  // ===== DIRECT MATERIALS =====
  {
    id: "cat-36",
    name: "Building Systems",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-3601", name: "Heating Ventilation & Air Circulation", parentCategoryId: "cat-36" },
    ],
  },
  {
    id: "cat-37",
    name: "Data & Analytics",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-3701", name: "Quality Assurance & Testing", parentCategoryId: "cat-37" },
    ],
  },
  {
    id: "cat-38",
    name: "Emerging Technologies",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-3801", name: "Robotics", parentCategoryId: "cat-38" },
    ],
  },
  {
    id: "cat-39",
    name: "Equipment & Machinery",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-3901", name: "Conveyor Components", parentCategoryId: "cat-39" },
      { id: "sub-3902", name: "Conveyor Systems", parentCategoryId: "cat-39" },
      { id: "sub-3903", name: "Hydraulic Machinery & Equipment", parentCategoryId: "cat-39" },
      { id: "sub-3904", name: "Industrial Machinery & Equipment", parentCategoryId: "cat-39" },
      { id: "sub-3905", name: "Manufacturing Equipment", parentCategoryId: "cat-39" },
      { id: "sub-3906", name: "Motors", parentCategoryId: "cat-39" },
      { id: "sub-3907", name: "Pneumatic Machinery & Equipment", parentCategoryId: "cat-39" },
      { id: "sub-3908", name: "Pneumatics Hydraulics & Electrical Control Systems", parentCategoryId: "cat-39" },
      { id: "sub-3909", name: "Power Conversion Transmission Equipment", parentCategoryId: "cat-39" },
      { id: "sub-3910", name: "Pumps", parentCategoryId: "cat-39" },
    ],
  },
  {
    id: "cat-40",
    name: "Facility Operations",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-4001", name: "Installation Services & Repair", parentCategoryId: "cat-40" },
    ],
  },
  {
    id: "cat-41",
    name: "Hardware & Equipment",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-4101", name: "Printers Labels & Accessories", parentCategoryId: "cat-41" },
    ],
  },
  {
    id: "cat-42",
    name: "Industrial Supplies",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-4201", name: "Aluminum Shapes Coil & Sheet", parentCategoryId: "cat-42" },
      { id: "sub-4202", name: "Bearings Bushings Gears & Sprockets", parentCategoryId: "cat-42" },
      { id: "sub-4203", name: "Belting", parentCategoryId: "cat-42" },
      { id: "sub-4204", name: "Carbon Steel Fabrication & Assemblies", parentCategoryId: "cat-42" },
      { id: "sub-4205", name: "Carbon Steel Shapes Coil & Sheet", parentCategoryId: "cat-42" },
      { id: "sub-4206", name: "Casters", parentCategoryId: "cat-42" },
      { id: "sub-4207", name: "Castings", parentCategoryId: "cat-42" },
      { id: "sub-4208", name: "Chemicals & Lubricants", parentCategoryId: "cat-42" },
      { id: "sub-4209", name: "Electrical Equipment Components & Supplies", parentCategoryId: "cat-42" },
      { id: "sub-4210", name: "Electrical Panel & Circuit Boards", parentCategoryId: "cat-42" },
      { id: "sub-4211", name: "Electrical Wire Cable & Harnesses", parentCategoryId: "cat-42" },
      { id: "sub-4212", name: "Extrusions", parentCategoryId: "cat-42" },
      { id: "sub-4213", name: "Fibers Threads Yarns & Fabrics", parentCategoryId: "cat-42" },
      { id: "sub-4214", name: "Fluid & Gas Distribution", parentCategoryId: "cat-42" },
      { id: "sub-4215", name: "Hardware/fasteners", parentCategoryId: "cat-42" },
      { id: "sub-4216", name: "Insulation", parentCategoryId: "cat-42" },
      { id: "sub-4217", name: "Lubricants Oils & Greases", parentCategoryId: "cat-42" },
      { id: "sub-4218", name: "Machined Parts", parentCategoryId: "cat-42" },
      { id: "sub-4219", name: "Machining", parentCategoryId: "cat-42" },
      { id: "sub-4220", name: "Measuring & Testing Equipment", parentCategoryId: "cat-42" },
      { id: "sub-4221", name: "Mechanical Chain Cable & Wire", parentCategoryId: "cat-42" },
      { id: "sub-4222", name: "Optical Instruments & Lenses", parentCategoryId: "cat-42" },
      { id: "sub-4223", name: "Paints Primers & Finishes", parentCategoryId: "cat-42" },
      { id: "sub-4224", name: "Plastics & Rubber", parentCategoryId: "cat-42" },
      { id: "sub-4225", name: "Power Conversion Transmission Devices", parentCategoryId: "cat-42" },
      { id: "sub-4226", name: "Processing Services", parentCategoryId: "cat-42" },
      { id: "sub-4227", name: "Rails", parentCategoryId: "cat-42" },
      { id: "sub-4228", name: "Safety & Security Devices", parentCategoryId: "cat-42" },
      { id: "sub-4229", name: "Seals & Gaskets", parentCategoryId: "cat-42" },
      { id: "sub-4230", name: "Stainless Steel Fabrication & Assemblies", parentCategoryId: "cat-42" },
      { id: "sub-4231", name: "Stainless Steel Shapes Coil & Sheet", parentCategoryId: "cat-42" },
      { id: "sub-4232", name: "Stamping & Sheet Components", parentCategoryId: "cat-42" },
      { id: "sub-4233", name: "Valves", parentCategoryId: "cat-42" },
    ],
  },
  {
    id: "cat-43",
    name: "Print & Production",
    group: "Direct Materials",
    subcategories: [
      { id: "sub-4301", name: "Signage Labels & Accessories", parentCategoryId: "cat-43" },
    ],
  },
  // ===== CORPORATE FINANCE & ADMIN =====
  {
    id: "cat-44",
    name: "Employee Benefits & Compensation",
    group: "Corporate Finance & Admin",
    subcategories: [
      { id: "sub-4401", name: "Retirement Fund Contributions", parentCategoryId: "cat-44" },
    ],
  },
  {
    id: "cat-45",
    name: "Executive & Governance",
    group: "Corporate Finance & Admin",
    subcategories: [
      { id: "sub-4501", name: "Board & Director Fees", parentCategoryId: "cat-45" },
      { id: "sub-4502", name: "Management Fees", parentCategoryId: "cat-45" },
      { id: "sub-4503", name: "Partnership & Joint Venture Fees", parentCategoryId: "cat-45" },
    ],
  },
  {
    id: "cat-46",
    name: "Financial Transactions",
    group: "Corporate Finance & Admin",
    subcategories: [
      { id: "sub-4601", name: "Interest & Debt Payments", parentCategoryId: "cat-46" },
      { id: "sub-4602", name: "Internal Transfers & Allocations", parentCategoryId: "cat-46" },
      { id: "sub-4603", name: "Revenue Adjustments & Reimbursements", parentCategoryId: "cat-46" },
    ],
  },
  {
    id: "cat-47",
    name: "Miscellaneous & Petty Cash",
    group: "Corporate Finance & Admin",
    subcategories: [
      { id: "sub-4701", name: "Employee Reimbursements", parentCategoryId: "cat-47" },
      { id: "sub-4702", name: "Petty Cash & Small Purchases", parentCategoryId: "cat-47" },
      { id: "sub-4703", name: "Uncategorized Expenses", parentCategoryId: "cat-47" },
    ],
  },
  {
    id: "cat-48",
    name: "Operational Adjustments",
    group: "Corporate Finance & Admin",
    subcategories: [
      { id: "sub-4801", name: "Charitable Contributions & Sponsorships", parentCategoryId: "cat-48" },
      { id: "sub-4802", name: "Commissions & Sales Incentives", parentCategoryId: "cat-48" },
    ],
  },
  {
    id: "cat-49",
    name: "Regulatory & Compliance",
    group: "Corporate Finance & Admin",
    subcategories: [
      { id: "sub-4901", name: "Licenses & Permits", parentCategoryId: "cat-49" },
      { id: "sub-4902", name: "Settlements & Legal Claims", parentCategoryId: "cat-49" },
      { id: "sub-4903", name: "Taxes & Government Fees", parentCategoryId: "cat-49" },
    ],
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getCategoryByName(name: string): Category | undefined {
  return categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function getSubcategoryByName(name: string): Subcategory | undefined {
  for (const cat of categories) {
    const sub = cat.subcategories.find(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (sub) return sub;
  }
  return undefined;
}

export function getCategoriesByGroup(group: string): Category[] {
  return categories.filter((c) => c.group.toLowerCase() === group.toLowerCase());
}
