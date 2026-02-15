import { vendors } from "./vendors";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  vendorId: string;
  vendorName: string;
  amount: number;
  categoryId: string;
  subcategoryId: string;
  description: string;
  poNumber: string;
  isOnContract: boolean;
  invoiceNumber: string;
  department: string;
}

// Seeded random for deterministic transaction generation
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const rand = seededRandom(12345);

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

const departments = [
  "Engineering", "Marketing", "Sales", "Operations", "Finance",
  "Human Resources", "Legal", "R&D", "Procurement", "IT",
  "Manufacturing", "Quality", "Logistics", "Executive", "Facilities",
];

const descriptions: Record<string, string[]> = {
  "cat-01": ["Research & Development Costs", "Research & Development Costs Design Services - R+D", "Computer Software Stores (5734)", "A/P Trade Payables", "COS Material", "Others COS", "Service Expense", "Repairs & Maintenance SGA"],
  "cat-02": ["Business Services Not Elsewhere Classified (7399)", "Unknown", "Computer Software Stores (5734)", "Computer Network/Information Services (4816)", "Computer Programming, Data Processing (7372)", "Digital Goods-Software Apps (Excluding Games) (5817)", "Dues & Subscriptions", "Onderhoudsabonnementen"],
  "cat-03": ["Business Services Not Elsewhere Classified (7399)", "FMH-NOCC-Accounts Payable - Trade-NOIC", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Prepaids", "PROFESSIONAL SERVICES", "VOUCHERS PAYABLE", "Cost of Sales Freight (CORP)", "IC Payable - Multiscan"],
  "cat-04": ["Commercial Art, Graphics, Photography (7333)", "Marketing", "Unknown", "Direct Marketing - Other Direct Marketers (5969)", "COS Material", "A/P Trade Payables", "A/P US$ ACCRUED-Corp", "PREPAID LICENCE / SUPPORT TECH-Corp"],
  "cat-05": ["DUR-NOCC-Accounts Payable - Trade-NOIC", "Stationery, Office Supplies, Printing (5111)", "MAIN WAREHOUSE", "A/P Trade Payables", "DOMESTIC FREIGHT IN", "VOUCHERS PAYABLE", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Nondurable Goods Not Elsewhere Classifed (5199)"],
  "cat-06": ["DUR-NOCC-Accounts Payable - Trade-NOIC", "Computer Tech Exp (ADMIN)", "Computer Tech Exp (AFTER SALE)", "Computer Tech Exp (AIP)", "Computer Tech Exp (OPER)", "Computer Tech Exp (R&D)", "Computer Tech Exp (SALES)", "Computer Tech Exp (SERV)"],
  "cat-07": ["Cable And Other Pay Television Services (4899)", "DUR-NOCC-Accounts Payable - Trade-NOIC", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Telecommunication Equipment (4812)", "TELEPHONE", "Telephone & Communications", "Missing", "Telephone Expense (ADMIN)"],
  "cat-08": ["DUR-NOCC-Accounts Payable - Trade-NOIC", "Meetings/Service Awards - OEM Sales", "Meetings/Service Awards - Sales", "A/P Trade Payables", "Employee Development", "Motor Freight Carriers, Trucking (4214)", "Miscellaneous And Specialty Retail Stores (5999)", "Truck And Utility Trailer Rental (7513)"],
  "cat-09": ["SG&A Healthcare Benefits", "SG&A Healthcare Benefits Insurance & Benefits", "Insurance Sales, Underwriting, And Premiums (6300)", "DUR-NOCC-Accounts Payable - Trade-NOIC", "(60000150) Ecovouchers COS (100% non-deduct.)", "(60000150) Ecovouchers Sales (100% non-deduct.)", "(60000410) Honorary various vouchers", "(70000220) Miscellaneous costs employees COS"],
  "cat-10": ["Missing", "A/P Trade Payables", "AP - Trade Payables", "Employee Development", "Health Practitioners, Medical Services (8099)", "Professional Services - Human Resources", "Departamental expenses", "Outside Services SGA"],
  "cat-11": ["AP - Trade Payables", "Temporary Help COS", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Health Practitioners, Medical Services (8099)", "Missing"],
  "cat-12": ["Goods Received Not Invoiced", "Goods Received Not Invoiced Hardware/Fasteners", "Hardware Equipment And Supplies (5072)", "A/P Trade Payables", "Departamental expenses", "Other Benefits SGA", "Outside Services SGA", "Salaries and Wages SGA"],
  "cat-13": ["Aer Lingus (3043)", "Aeromexico (3076)", "Air Canada (3009)", "Fast-Food Restaurants (5814)", "Air China (3261)", "Air France (3007)", "Air New Zealand (3025)", "Warehouse Expense (OPER)"],
  "cat-14": ["Employee Expense (AFTER SALE)", "Employee Expense (AIP)", "Employee Expense (OPER)", "Employee Expense (PROJECTS)", "Employee Expense (R&D)", "Employee Expenses (ADMIN )", "Employee Expenses (SALES )", "Employee Expenses (SERV )"],
  "cat-15": ["A/P Trade Payables", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Supplies", "DUR-NOCC-Accounts Payable - Trade-NOIC", "AP - Trade Payables", "Professional Services - Administration", "Digital Goods-Multi Category (5818)"],
  "cat-16": ["(60000260) Insurance civil responsibility", "(60000320) Insurance for passenger cars", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Insurance Sales, Underwriting, And Premiums (6300)", "Unknown", "B.A.-uitbating", "Brandverzekering", "Verzekering personenwagen"],
  "cat-17": ["Missing", "Outside Services SGA", "Prof. Serv. - Audit/Tax SGA", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Accounting Services", "Audit & Accountancy", "Audit & Accountancy Accounting & Auditing", "Unknown"],
  "cat-18": ["A/P Trade Payables", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Missing", "Outside Services SGA", "Research & Development (R&D)", "PROFESSIONAL SERVICES", "LEGAL FEES", "OTHER EXPENSE/INCOME"],
  "cat-19": ["Industrial Supplies Not Elsewhere Classified (5085)", "Rent or Lease Expense (OPER)", "BUILDING & EQUIP RENTAL", "CONSTRUCTION IN PROGRESS", "INVENTORY ADJUSTMENT", "REPAIRS & MAINTENANCE EQUIPMENT", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Inkoop/kostprijs goederen"],
  "cat-20": ["Automotive Tire Stores (5532)", "Automotive Service Shops (7538)", "Car Washes (7542)", "Automotive Parts, Accessories Stores (5533)", "Miscellaneous And Specialty Retail Stores (5999)", "Vehicle Maintenance", "Fuel Dispenser, Automated (5542)", "Grocery Stores, Supermarkets (5411)"],
  "cat-21": ["MAIN WAREHOUSE", "PARTS COST", "Inkoop/kostprijs goederen", "A/P Trade Payables", "Commercial Equipment Not Elsewhere Classified (5046)", "(60000280) Rental expenses machinery and equipment", "BUILDING & EQUIP RENTAL", "EQUIPMENT FUEL"],
  "cat-22": ["Outside Services SGA", "A/P Trade Payables", "Freight In", "Packaging Material COS", "Supplies SGA", "COS Material", "Raw Materials", "DOMESTIC FREIGHT IN"],
  "cat-23": ["A/P Trade Payables", "Freight Paid - Vendors", "Freight Paid - Warranty", "Transportkosten", "Unknown", "COST OF SALES - FREIGHT", "DOMESTIC FREIGHT IN", "Freight Out Expense (ADMIN)"],
  "cat-24": ["Aer Lingus (3043)", "Freight In", "A/P Trade Payables", "COST OF SALES - FREIGHT", "DOMESTIC FREIGHT IN", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Freight Paid - Courtesy", "Freight Paid - Customers"],
  "cat-25": ["COS Material", "FMH-NOCC-Accounts Payable - Trade-NOIC", "A/P Trade Payables", "MAIN WAREHOUSE", "Missing", "Electrical Parts And Equipment (5065)", "Legal & Professional Fees", "Legal & Professional Fees Quality Assurance & Testing"],
  "cat-26": ["Advertising SGA", "COS Material", "Departamental expenses", "Trade Shows/Promotions SGA", "INVENTORY ADJUSTMENT", "VOUCHERS PAYABLE", "Grocery Stores, Supermarkets (5411)", "Freight In"],
  "cat-27": ["Cleaning Costs", "Cleaning Costs Cleaning Services", "A/P Trade Payables", "Outside Services (ADMIN )", "FMH-NOCC-Accounts Payable - Trade-NOIC", "ENTRETIEN PLANCHER-ALLO", "Outside Services SGA", "Maintenance"],
  "cat-28": ["(60000150) Gifts staff", "Sporting Goods Stores (5941)", "Aankopen R&D", "Boeken, tijdschr., dokum.", "Bureelbehoeften", "Department Stores (5311)", "Klein gereedschap", "Onderh. en herst. Gebouw"],
  "cat-29": ["Missing", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Fuel Dispenser, Automated (5542)", "Gas / Service Stations (5541)", "Grocery Stores, Supermarkets (5411)", "Rent", "(60000280) Rent facility", "Recht van opstal grond Braet"],
  "cat-30": ["Attorneys, Legal Services (8111)", "Missing", "Utilities COS", "Utilities Expense (ADMIN)", "Utilities", "A/P Trade Payables", "Electricity", "Electricity Electricity"],
  "cat-31": ["OTHER EXPENSE", "PREPAID SHOW EXPENSE", "Supplies", "Advertising Expense (MKTG)", "SupportPro Sub-contractors Engineering Services", "A/P Trade Payables", "Marketing", "Unknown"],
  "cat-32": ["A/P Trade Payables", "ADVERTISING", "AP - Trade Payables", "WEBSITE", "Marketing & Promotion", "Professional Services Not Elsewhere Classified (8999)", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Dues & Subscriptions"],
  "cat-33": ["Trade Show - Booth", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Show Expense (MKTG)", "Contractors, Special Trade Not Elsewhere Class (1799)", "Business Services Not Elsewhere Classified (7399)", "Unknown", "Trade Show - Expenses - McD", "A/P Trade Payables"],
  "cat-34": ["Legal & Professional Fees", "Legal & Professional Fees Legal services", "COS Material", "Freight In", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Kosten Marelec China", "Unknown", "Commercial Art, Graphics, Photography (7333)"],
  "cat-35": ["Stock - Demo/Paint/Electrical/", "Missing", "Drukwerken", "Unknown", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Miscellaneous Publishing And Printing (2741)", "Goods Received Not Invoiced", "Advertising SGA"],
  "cat-36": ["COS Material", "FMH-NOCC-Accounts Payable - Trade-NOIC", "A/P Trade Payables", "MAIN WAREHOUSE", "Missing", "Electrical Parts And Equipment (5065)", "Legal & Professional Fees", "Legal & Professional Fees Quality Assurance & Testing"],
  "cat-37": ["Business Services Not Elsewhere Classified (7399)", "FMH-NOCC-Accounts Payable - Trade-NOIC", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Prepaids", "PROFESSIONAL SERVICES", "VOUCHERS PAYABLE", "Cost of Sales Freight (CORP)", "IC Payable - Multiscan"],
  "cat-38": ["Commercial Art, Graphics, Photography (7333)", "Marketing", "Unknown", "Direct Marketing - Other Direct Marketers (5969)", "COS Material", "A/P Trade Payables", "A/P US$ ACCRUED-Corp", "PREPAID LICENCE / SUPPORT TECH-Corp"],
  "cat-39": ["Industrial Supplies Not Elsewhere Classified (5085)", "Rent or Lease Expense (OPER)", "BUILDING & EQUIP RENTAL", "CONSTRUCTION IN PROGRESS", "INVENTORY ADJUSTMENT", "REPAIRS & MAINTENANCE EQUIPMENT", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Inkoop/kostprijs goederen"],
  "cat-40": ["Cleaning Costs", "Cleaning Costs Cleaning Services", "A/P Trade Payables", "Outside Services (ADMIN )", "FMH-NOCC-Accounts Payable - Trade-NOIC", "ENTRETIEN PLANCHER-ALLO", "Outside Services SGA", "Maintenance"],
  "cat-41": ["DUR-NOCC-Accounts Payable - Trade-NOIC", "Stationery, Office Supplies, Printing (5111)", "MAIN WAREHOUSE", "A/P Trade Payables", "DOMESTIC FREIGHT IN", "VOUCHERS PAYABLE", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Nondurable Goods Not Elsewhere Classifed (5199)"],
  "cat-42": ["MAIN WAREHOUSE", "PARTS COST", "Inkoop/kostprijs goederen", "A/P Trade Payables", "Commercial Equipment Not Elsewhere Classified (5046)", "(60000280) Rental expenses machinery and equipment", "BUILDING & EQUIP RENTAL", "EQUIPMENT FUEL"],
  "cat-43": ["Stock - Demo/Paint/Electrical/", "Missing", "Drukwerken", "Unknown", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Miscellaneous Publishing And Printing (2741)", "Goods Received Not Invoiced", "Advertising SGA"],
  "cat-44": ["Employee Benefits & Compensation - General", "Employee Benefits & Compensation - Monthly service", "Employee Benefits & Compensation - Quarterly invoice", "Employee Benefits & Compensation - Annual renewal", "Employee Benefits & Compensation - Project work", "Employee Benefits & Compensation - Supplies order"],
  "cat-45": ["DUR-NOCC-Accounts Payable - Trade-NOIC", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Reisonkosten verkoop", "A/P Trade Payables", "Missing"],
  "cat-46": ["Missing", "DUR-NOCC-Accounts Payable - Trade-NOIC", "A/P Trade Payables", "CONTRACT LABOR DIRECT", "ACCRUED WARRANTY - UNITHERM", "CONTRACT LABOR", "DOMESTIC FREIGHT IN", "INTERCOMPANY AFOHEAT"],
  "cat-47": ["FMH-NOCC-Accounts Payable - Trade-NOIC", "ACCOUNTS PAYABLE - OTHER", "ACCOUNTS RECEIVABLE - OTHER", "ADVERTISING", "Bank Fees", "BUILDING & EQUIP RENTAL", "BUILDING REPAIRS & MAINTENANCE", "COMPUTER SUPPLIES"],
  "cat-48": ["A/P Trade Payables", "FMH-NOCC-Accounts Payable - Trade-NOIC", "Charitable Donations", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Industrial Supplies Not Elsewhere Classified (5085)", "Organizations, Charitable And Social Service (8398)", "Organizations, Membership (8699)", "COS Material"],
  "cat-49": ["Licence & Permits", "Other Travel Expenses", "S&M Vehicle Tax & License", "Vehicle Tax & Licence", "Government Services Not Elsewhere Classified (9399)", "DUR-NOCC-Accounts Payable - Trade-NOIC", "Professional Services - Human Resources", "Workers Compensation"],
};

// Monthly seasonality factors (some months have more spend)
const seasonality = [0.85, 0.88, 1.05, 1.02, 0.98, 1.10, 0.92, 0.90, 1.08, 1.05, 1.02, 1.15];

// Generate a trend factor for raw materials
function getTrendFactor(date: Date, categoryId: string): number {
  const monthsFromStart = (date.getFullYear() - 2023) * 12 + date.getMonth();

  // Direct Materials categories (cat-36 to cat-43) - slight upward trend with volatility
  const catNum = parseInt(categoryId.replace("cat-", ""));
  if (catNum >= 36 && catNum <= 43) {
    return 1 + (monthsFromStart * 0.005) + (Math.sin(monthsFromStart * 0.5) * 0.03);
  }
  // IT Services & Technology - steady growth
  if (catNum >= 1 && catNum <= 7) {
    return 1 + (monthsFromStart * 0.003);
  }
  return 1 + (monthsFromStart * 0.001); // Slight inflation for everything else
}

function generateTransactions(): Transaction[] {
  const txns: Transaction[] = [];
  let txnId = 1;

  // Generate 24 months of data: Jan 2023 - Dec 2024
  for (let year = 2023; year <= 2024; year++) {
    for (let month = 0; month < 12; month++) {
      const monthFactor = seasonality[month];

      for (const vendor of vendors) {
        // Determine how many transactions this vendor has per month
        let txnsPerMonth: number;
        if (vendor.annualSpend > 1000000) {
          txnsPerMonth = randomInt(1, 3);
        } else if (vendor.annualSpend > 200000) {
          txnsPerMonth = rand() > 0.3 ? 1 : 0;
        } else if (vendor.annualSpend > 50000) {
          txnsPerMonth = rand() > 0.5 ? 1 : 0;
        } else {
          txnsPerMonth = rand() > 0.75 ? 1 : 0;
        }

        for (let t = 0; t < txnsPerMonth; t++) {
          const day = randomInt(1, 28);
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split("T")[0];

          const monthlyBase = vendor.annualSpend / 12;
          const trendFactor = getTrendFactor(date, vendor.categoryId);
          const variance = 0.7 + rand() * 0.6;
          const amount = Math.round(monthlyBase * monthFactor * trendFactor * variance / txnsPerMonth);

          const catDescriptions = descriptions[vendor.categoryId] || ["General procurement"];
          const isOnContract = vendor.contractStatus === "active" ? (rand() > 0.15) : false;
          const isMaverick = vendor.contractStatus === "active" && !isOnContract;

          txns.push({
            id: `txn-${String(txnId++).padStart(6, "0")}`,
            date: dateStr,
            vendorId: vendor.id,
            vendorName: vendor.name,
            amount: Math.max(amount, 100),
            categoryId: vendor.categoryId,
            subcategoryId: vendor.subcategoryId,
            description: pickRandom(catDescriptions) + (isMaverick ? " (off-contract)" : ""),
            poNumber: `PO-${year}${String(month + 1).padStart(2, "0")}-${String(randomInt(1000, 9999))}`,
            isOnContract,
            invoiceNumber: `INV-${randomInt(100000, 999999)}`,
            department: pickRandom(departments),
          });
        }
      }
    }
  }

  return txns.sort((a, b) => a.date.localeCompare(b.date));
}

export const transactions = generateTransactions();

// Helper functions
export function getTransactionsByVendor(vendorId: string): Transaction[] {
  return transactions.filter((t) => t.vendorId === vendorId);
}

export function getTransactionsByCategory(categoryId: string): Transaction[] {
  return transactions.filter((t) => t.categoryId === categoryId);
}

export function getTransactionsBySubcategory(subcategoryId: string): Transaction[] {
  return transactions.filter((t) => t.subcategoryId === subcategoryId);
}

export function getTransactionsByDateRange(start: string, end: string): Transaction[] {
  return transactions.filter((t) => t.date >= start && t.date <= end);
}

export function getTransactionsByMonth(year: number, month: number): Transaction[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return transactions.filter((t) => t.date.startsWith(prefix));
}

export function getMaverickTransactions(): Transaction[] {
  return transactions.filter((t) => !t.isOnContract && vendors.find((v) => v.id === t.vendorId)?.contractStatus === "active");
}

export function getTotalSpend(txns?: Transaction[]): number {
  return (txns || transactions).reduce((sum, t) => sum + t.amount, 0);
}

export function getSpendByMonth(txns?: Transaction[]): { month: string; amount: number }[] {
  const source = txns || transactions;
  const byMonth: Record<string, number> = {};

  for (const t of source) {
    const month = t.date.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + t.amount;
  }

  return Object.entries(byMonth)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
