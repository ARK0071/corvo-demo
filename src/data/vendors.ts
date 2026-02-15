export interface Vendor {
  id: string;
  name: string;
  aliases: string[];
  categoryId: string;
  subcategoryId: string;
  annualSpend: number;
  contractStatus: "active" | "expired" | "no_contract";
  paymentTerms: string;
  riskScore: number; // 0-100, higher = riskier
  location: string;
  employeeCount: number;
  diversityStatus: string;
  yearOnboarded: number;
}

// Seeded random number generator for deterministic data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

const rand = seededRandom(42);

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

const locations = [
  "New York, NY", "San Francisco, CA", "Chicago, IL", "Dallas, TX", "Atlanta, GA",
  "Boston, MA", "Seattle, WA", "Denver, CO", "Miami, FL", "Portland, OR",
  "Austin, TX", "Phoenix, AZ", "Charlotte, NC", "Detroit, MI", "Minneapolis, MN",
  "Philadelphia, PA", "San Diego, CA", "Nashville, TN", "Columbus, OH", "Indianapolis, IN",
  "Shenzhen, China", "Munich, Germany", "London, UK", "Tokyo, Japan", "Bangalore, India",
  "Toronto, Canada", "São Paulo, Brazil", "Sydney, Australia", "Dublin, Ireland", "Singapore",
  "Amsterdam, Netherlands", "Brussels, Belgium", "Monterrey, Mexico", "Seoul, South Korea",
];

const diversityStatuses = ["None", "None", "None", "None", "MBE", "WBE", "SDVOB", "HUBZone", "8(a)", "LGBTBE"];

const paymentTermsOptions = ["Net 15", "Net 30", "Net 30", "Net 30", "Net 45", "Net 60", "Net 90", "2/10 Net 30"];

// ===== VENDOR DEFINITIONS FROM PORTFOLIO SPEND DATA =====
// Each entry: [name, subcategoryId, annualSpend, aliases?, riskScore?]

type VendorDef = [string, string, number, string[]?, number?];

const majorVendors: VendorDef[] = [
  ["FOODMATE B V", "sub-4602", 48685912, [], 5],
  ["IMPREST FUNDING", "sub-4602", 11660224, [], 9],
  ["BARTH INDUSTRIAL AUTOMATION", "sub-4210", 10301077, [], 11],
  ["ROACH CONVEYORS", "sub-3902", 10299983, [], 6],
  ["MESPACK", "sub-4602", 8765155, [], 11],
  ["BMO HARRIS BANK NA", "sub-4701", 7161732, ["BMO HARRIS", "BMO HARRIS BANK"], 14],
  ["INDIVIDUAL", "sub-4701", 6970510, [], 6],
  ["BLUFF CITY ELECTRONICS", "sub-4209", 6865252, [], 8],
  ["VGI WILLEMS RVS MACHINEBOUW BV", "sub-4230", 6718447, [], 9],
  ["REVERE ELECTRIC", "sub-4209", 5911819, [], 10],
  ["LUMEN", "sub-4209", 5372740, ["LUMEN TECHNOLOGIES", "CENTURYLINK"], 8],
  ["WULFTEC INTL", "sub-4602", 4951859, [], 10],
  ["ATN INC", "sub-3904", 4868113, [], 9],
  ["SAMUEL SON AND COMPANY INC", "sub-4231", 4573758, ["SAMUEL SON", "SAMUEL & SON"], 22],
  ["MULTISCAN TECHNOLOGIES", "sub-3701", 4349454, [], 20],
  ["DERTEC B V", "sub-3906", 4286656, [], 22],
  ["MOTION INDUSTRIES INC", "sub-4202", 4225231, ["MOTION INDUSTRIES"], 21],
  ["AMERICAN EXPRESS", "sub-1305", 4063140, ["AMEX", "AMEX GBT"], 8],
  ["OMNI METALCRAFT CORPORATION", "sub-3902", 4020881, [], 20],
  ["KAMA", "sub-4218", 4010894, [], 9],
  ["SICK INC", "sub-3905", 3973649, ["SICK", "SICK AG"], 22],
  ["PARTENA VZW", "sub-1103", 3760750, ["PARTENA"], 21],
  ["SEW EURODRIVE INC", "sub-3906", 3607740, ["SEW EURODRIVE", "SEW-EURODRIVE"], 11],
  ["PRO - HAWK CORPORATION", "sub-3901", 3571995, [], 10],
  ["FASTENAL", "sub-4215", 3421425, ["FASTENAL COMPANY"], 11],
  ["PRICEWATERHOUSECOOPERS", "sub-1701", 3407615, ["PWC", "PWC LLP"], 10],
  ["DURAVANT", "sub-4602", 3383379, [], 17],
  ["FESTO", "sub-3908", 3190625, ["FESTO CORPORATION", "FESTO INC"], 19],
  ["HIGH DREAM MACHINERY LLC", "sub-3904", 3167557, [], 14],
  ["RXBENEFITS INC", "sub-0901", 3143864, ["RXBENEFITS"], 20],
  ["TECH M", "sub-4218", 3047885, ["TECH MAHINDRA", "TECH MAHINDRA LTD"], 18],
  ["WORLDWIDE EXPRESS", "sub-2305", 2919608, ["WORLDWIDE EXPRESS INC"], 13],
  ["YASKAWA", "sub-3801", 2886864, ["YASKAWA AMERICA", "YASKAWA ELECTRIC"], 21],
  ["HILLCREST TOOL AND DIE", "sub-4218", 2804088, [], 20],
  ["FABRICACION Y MONTAJE DE EQUIPO INDUSTRIAL SA DE CV", "sub-4230", 2743025, [], 18],
  ["ROLS MACHINEONDERDELEN B V", "sub-4218", 2740889, [], 9],
  ["ELECTRO MAG", "sub-3905", 2738518, [], 20],
  ["INTERROLL CORPORATION", "sub-3901", 2716908, [], 8],
  ["MARSH INC", "sub-1601", 2652615, ["MARSH MCLENNAN", "MARSH"], 19],
  ["SMC PNEUMATICS", "sub-3908", 2639101, ["SMC CORPORATION", "SMC"], 17],
  ["ATELIERS BG", "sub-4204", 2612509, [], 20],
  ["DKH METAALBEWERKING B V", "sub-4218", 2595349, [], 20],
  ["BRIDGE POINT WOOD DALE LLC", "sub-2902", 2568640, [], 22],
  ["BECKHOFF AUTOMATION", "sub-3905", 2556636, ["BECKHOFF", "BECKHOFF GMBH"], 22],
  ["ELCEE B V", "sub-4221", 2541844, [], 13],
  ["TEDCO", "sub-4230", 2534630, [], 9],
  ["CREATION TECHNOLOGIES IDAHO", "sub-4209", 2526124, [], 13],
  ["WA VAN DER GIESSEN BV", "sub-4230", 2523680, [], 13],
  ["GRANT THORNTON", "sub-1701", 2507109, ["GRANT THORNTON LLP"], 22],
  ["WEST COAST METALS", "sub-4231", 2500230, ["WEST COAST METALS INC"], 18],
  ["NATIONAL INDUSTRIAL SOLUTIONS", "sub-3904", 2474379, [], 19],
  ["AMMERAAL BELTECH", "sub-4203", 2474239, [], 20],
  ["HABASIT", "sub-4203", 2389850, [], 19],
  ["RDL MACHINE", "sub-4218", 2305361, [], 15],
  ["KOSTWEIN GROUP", "sub-3904", 2295951, [], 21],
  ["CANIMEX", "sub-4202", 2261129, [], 8],
  ["AIM HIGH", "sub-4204", 2253693, [], 18],
  ["ABB INC", "sub-3906", 2251567, [], 16],
  ["STUMACO ENG NV", "sub-4230", 2229435, [], 12],
  ["EGAN", "sub-4210", 2224201, [], 22],
  ["SPG USA INC", "sub-3906", 2176084, [], 19],
  ["SIMPLY MANUFACTURING INC", "sub-4230", 2163460, [], 16],
  ["UPS", "sub-2305", 2114111, [], 22],
  ["FRIEDRICH SCHWINGTECHNIEK GMBH VIMARC", "sub-3906", 2112433, [], 9],
  ["ADAPTEC SOLUTIONS", "sub-4201", 2078405, [], 13],
  ["PHOENIX STAMPING GROUP LLC", "sub-4232", 2072689, [], 10],
  ["OMRON SA", "sub-3905", 2052678, [], 10],
  ["ROCKWELL AUTOMATION LTD", "sub-3905", 2019723, [], 10],
  ["RENSENHOUSE ELECTRIC SUPPLY", "sub-4209", 1994334, [], 16],
  ["WEST MEMPHIS STEEL CORPORATION", "sub-4205", 1993243, [], 14],
  ["FISCHBEIN COMPANY", "sub-4602", 1989748, [], 12],
  ["TORRENT CONSULTING LLC", "sub-0601", 1981150, [], 28],
  ["MCMASTER CARR SUPPLY CO", "sub-4215", 1863781, [], 18],
  ["ATELIER MG", "sub-4204", 1847693, [], 31],
  ["ARCO MURRAY NATIONAL TENANT SOLUTIONS", "sub-2603", 1847090, [], 13],
  ["FEDEX", "sub-2305", 1813432, [], 25],
  ["SALESFORCE.COM", "sub-0101", 1792199, [], 28],
  ["EMO TRANS INC", "sub-2303", 1788760, [], 25],
  ["NVENIA", "sub-4602", 1781965, [], 13],
  ["TGW INTL INC", "sub-2106", 1752930, [], 24],
  ["GORDON COMPOSITES INC", "sub-4224", 1747562, [], 18],
  ["JANSEN MACHINEBOUW B V", "sub-4218", 1731020, [], 15],
  ["PRIDE INDUSTRIES", "sub-4210", 1716909, [], 18],
  ["COLSON GROUP USA", "sub-4205", 1716788, [], 27],
  ["AFCO", "sub-1601", 1701470, [], 17],
  ["ALRO STEEL", "sub-4204", 1673773, [], 29],
  ["METOSAK INC", "sub-4204", 1664893, [], 14],
  ["MICROSOFT", "sub-0101", 1651032, [], 18],
  ["TEC OF JONESBORO", "sub-4209", 1650718, [], 22],
  ["SIM", "sub-4218", 1641749, [], 28],
  ["PEERLESS WINSMITH", "sub-4202", 1636871, [], 25],
  ["CAPITAL RUBBER COMPANY", "sub-4224", 1627330, [], 25],
  ["SYSTEMS PLUS", "sub-4210", 1610712, [], 12],
  ["WABOPLAST B V", "sub-4224", 1609614, [], 21],
  ["RTC SA", "sub-4209", 1600999, [], 12],
  ["VANTAGE GROUP", "sub-4209", 1580441, [], 22],
  ["DUTCH TECSOURCE BV", "sub-4230", 1572175, [], 31],
  ["VICON FABRICATING COMPANY", "sub-4204", 1563376, [], 12],
  ["MONTNURI ITC", "sub-1308", 1549495, [], 29],
  ["POWERMATION DIVISION", "sub-4209", 1499876, [], 14],
  ["NEXIKON INC", "sub-3904", 1481635, [], 31],
  ["JARBORNE INC", "sub-4218", 1472187, [], 21],
  ["INTRALOX", "sub-4203", 1462124, [], 28],
  ["MIDWEST METALCRAFT EQUIP", "sub-4230", 1421833, [], 30],
  ["WIPOTEC OCS INC", "sub-4220", 1410682, [], 28],
  ["GFC INDUSTRIAL SOLUTIONS LLC", "sub-2704", 1398902, [], 17],
  ["KLUGE", "sub-4218", 1397163, [], 22],
  ["QC INDUSTRIES LLC", "sub-4602", 1381570, [], 22],
  ["CRESCENT ELECTRIC SUPPLY CO", "sub-4209", 1377806, [], 25],
  ["REO", "sub-4210", 1365262, [], 26],
  ["MORGAN HARBOUR CONSTRUCTION", "sub-2603", 1319359, [], 23],
  ["ENTERPRISE FLEET", "sub-2002", 1304216, [], 21],
  ["FENNER", "sub-4203", 1302403, [], 12],
  ["NORTHSTATE MANUFACTURING", "sub-4218", 1301191, [], 26],
  ["B OF A VISA CORPORATION CARD", "sub-4601", 1289356, [], 19],
  ["HEURKENS AND VAN VELUW BV", "sub-4230", 1284268, [], 21],
  ["BEES INDUSTRIAL SERVICES", "sub-3601", 1276275, [], 29],
  ["B BAM LOGISTICS", "sub-2304", 1275585, [], 23],
  ["BRANDING B V DE", "sub-4230", 1271124, [], 13],
  ["WESCO CASCADE CONTROLS", "sub-4209", 1266403, [], 26],
  ["VISION PLASTICS INC", "sub-4226", 1260384, [], 13],
  ["BUCHANAN AUTOMATION INC", "sub-4233", 1252543, [], 23],
  ["DUMACO HARDINXVELD GIESSENDAM B V", "sub-4218", 1240461, [], 13],
  ["INSIGHT AUTOMATION INC", "sub-3906", 1228540, [], 31],
  ["STRATEGIC BENEFIT RESOURCES", "sub-0901", 1203936, [], 19],
  ["CLT METAL SERVICE BV", "sub-4230", 1177937, [], 16],
  ["WORLD BEARING TRADE B V", "sub-4202", 1175341, [], 20],
  ["JAI INC USA", "sub-4210", 1160835, [], 21],
  ["VISA", "sub-1401", 1133310, [], 28],
  ["BEST MANUFACTURING", "sub-4231", 1127824, [], 18],
  ["VERIZON", "sub-0701", 1124675, [], 19],
  ["EMS SOLUTIONS", "sub-4210", 1123560, [], 16],
  ["WEST CENTRAL METAL FAB INC", "sub-4204", 1105518, [], 21],
  ["9701 EAST HIGHLAND OWNER LLC", "sub-3503", 1101750, [], 19],
  ["TECNICAL DEL VALLES SL", "sub-4209", 1095206, [], 21],
  ["BLUE CROSS BLUE SHIELD", "sub-1001", 1091340, [], 15],
  ["OHIO ROD PRODUCTS COMPANY", "sub-4215", 1090937, [], 17],
  ["HOLBROOK MITCHELL TRUCKING INC", "sub-2304", 1086046, [], 15],
  ["TALLERES", "sub-4218", 1085594, [], 15],
  ["FMH LIEFERANT", "sub-3904", 1080113, [], 18],
  ["DSV AIR AND SEA INC", "sub-2303", 1064166, [], 14],
  ["EE TECHNOLOGIES INC", "sub-4210", 1061840, [], 29],
  ["JATEC", "sub-4215", 1056761, [], 23],
  ["PETERSONS WELDING AND MACHINE", "sub-4218", 1046357, [], 23],
  ["AGRITEKS CONSULTING LTD", "sub-1802", 1041530, [], 20],
  ["UNUM", "sub-0901", 1040402, [], 29],
  ["NOU INOXTECNIC SL", "sub-4204", 1027394, [], 20],
  ["PRECISION AUTOMATION EXPERTS LLC", "sub-4210", 1022564, [], 28],
  ["MANUFACTURE EXM LTEE", "sub-4209", 1021343, [], 29],
  ["RITTAL", "sub-4209", 1019391, [], 15],
  ["MAXON CORPORATION", "sub-3906", 1017289, [], 26],
  ["ZEN METAL TECHNOLOGIES", "sub-4204", 1014820, [], 12],
  ["COX METAAL", "sub-4230", 1013139, [], 16],
  ["REED SMITH", "sub-1801", 993894, [], 14],
  ["TECLES MAYER SL", "sub-2106", 991931, [], 31],
  ["BEST GLOBAL LOGISTICS B V", "sub-2303", 988014, [], 17],
  ["D AND K MACHINE AND TOOL INC", "sub-4218", 987997, [], 29],
  ["RYERSON INC", "sub-4205", 982767, [], 28],
  ["JONESBORO TOOL AND DIE", "sub-4232", 978176, [], 30],
  ["TMIC LTD", "sub-4001", 956596, [], 23],
  ["EMMERT WELDING AND MFG INC", "sub-4218", 952515, [], 21],
  ["HORIZONS INDUSTRIAL LLC", "sub-2902", 952041, [], 21],
  ["DELONGS GIZZARD EQUIP INC", "sub-3904", 950859, [], 31],
  ["MCA LINEAR MOTION ROBOTICS BV", "sub-3902", 949152, [], 28],
  ["EAGLE PERFORMANCE PLASTICS", "sub-4224", 930353, [], 26],
  ["KEY TECHNOLOGY INC", "sub-4602", 923237, [], 13],
  ["WEX", "sub-2003", 919042, [], 12],
  ["LASER AMP", "sub-4204", 915175, [], 23],
  ["NITEK LASER", "sub-4226", 909247, [], 14],
  ["RS AMERICAS INC", "sub-4209", 904628, [], 17],
  ["JMC OF JONESBORO INC", "sub-4230", 904510, [], 13],
  ["NAEM", "sub-4802", 904212, [], 26],
  ["DELTA DENTAL", "sub-0901", 897282, [], 14],
  ["AFOHEAT", "sub-4602", 895777, [], 23],
  ["FPE AUTOMATION INC", "sub-3905", 893478, [], 26],
  ["ARCWIDE BELGIUM", "sub-0601", 891669, [], 25],
  ["FORBO SIEGLING", "sub-4203", 887301, [], 24],
  ["JT TECHNIEK B V", "sub-4230", 878669, [], 30],
  ["KAISER PERMANENTE", "sub-0901", 877449, [], 21],
  ["OLD DOMINION", "sub-2305", 869170, [], 14],
  ["MTE PACK", "sub-4802", 851341, [], 31],
  ["LOJISTIC READY PAY", "sub-2305", 849927, [], 13],
  ["CASCADE CONTROLS NORTHWEST", "sub-4209", 848060, [], 23],
  ["HERMAN MANUFACTURING COMPANY", "sub-4218", 847709, [], 25],
  ["MATRIX METAALBEWERKING B V", "sub-4218", 844992, [], 29],
  ["EUROFORK", "sub-3905", 844475, [], 18],
  ["LENZE AMERICAS CORPORATION", "sub-3906", 840599, [], 12],
  ["ATFE SL", "sub-4218", 836317, [], 25],
  ["UNITED EQUIPMENT ACCESSORIES", "sub-4231", 836266, [], 18],
  ["AMADOR MACHINERY GROUP S L", "sub-3904", 836128, [], 24],
  ["KASE RESOURCES", "sub-3902", 835255, [], 22],
  ["SINCO", "sub-4224", 833521, [], 19],
  ["INMOPAK", "sub-2902", 827893, [], 15],
  ["ALDENZEE RVS B V", "sub-4231", 819725, [], 17],
  ["BETECH KUNSTSTOFFEN BV", "sub-4218", 810015, [], 26],
  ["MECANIZADOS CALERO SL", "sub-4218", 807558, [], 28],
  ["SUMITOMO MACHINERY COMPANY", "sub-3906", 802954, [], 21],
  ["TUMMERS PLAATBEWERKING BV", "sub-4230", 798512, [], 31],
  ["ICB GREENLINE LLC", "sub-3902", 795647, [], 17],
  ["PRECISION PULLEY AND IDLER", "sub-3901", 791566, [], 31],
  ["RIGIDIZED METALS CORPORATION", "sub-4231", 791471, [], 31],
  ["APPLIED INDUSTRIAL TECHNOLOGIES", "sub-4202", 788592, [], 22],
  ["OXARC INC", "sub-2101", 786107, [], 24],
  ["NELSON MULLINS", "sub-1801", 783152, [], 31],
  ["SKARDA EQUIPMENT COMPANY INC", "sub-3903", 778323, [], 18],
  ["PLANCHISTERAA INDUSTRIAL METALSER", "sub-4209", 773618, [], 16],
  ["CLEARY GOTTLIEB STEEN AND HAMILTON", "sub-1801", 769515, [], 27],
  ["HAAS AUTOMATION LEASING FINANCING", "sub-3905", 766594, [], 21],
  ["VOTECH B V", "sub-4602", 765037, [], 22],
  ["BALDWIN SUPPLY COMPANY", "sub-4202", 758202, [], 15],
  ["PRECISION SHEETMETAL FABRICATORS", "sub-4204", 752663, [], 26],
  ["VESFY BV", "sub-4218", 752501, [], 17],
  ["BROTHER INTL", "sub-3906", 751258, [], 19],
  ["CIGNA", "sub-0901", 745682, [], 24],
  ["RAF SOFTWARE TECHNOLOGY INC", "sub-0101", 732683, [], 19],
  ["FINOX SL", "sub-4204", 732515, [], 14],
  ["COMPOSANTS INDUSTRIEL WAJAX", "sub-4202", 728689, [], 25],
  ["ACCURATE PERSONNEL LLC S", "sub-1201", 725973, [], 15],
  ["REBA MACHINE CORPORATION", "sub-4218", 718914, [], 20],
  ["UNLIMITED SPARE PARTS B V", "sub-4218", 718593, [], 22],
  ["METLAS METAALINDUSTRIE B V", "sub-4230", 709263, [], 14],
  ["PMMI", "sub-1602", 703719, [], 30],
  ["RICE LAKE WEIGHING SYSTEMS", "sub-4220", 698805, [], 21],
  ["ULINE", "sub-2203", 691786, [], 20],
  ["AZCAVAL INGENIERIA DEL ENVASADO", "sub-2202", 681485, [], 31],
  ["K TEK MACHINING COMPANY LTD", "sub-4218", 679615, [], 14],
  ["G F FRANK AND SON INC", "sub-4230", 679594, [], 22],
  ["DSV ROAD", "sub-2304", 669256, [], 18],
  ["BOWSTONE", "sub-4230", 669032, [], 26],
  ["T2 MASCHINENBAU GMBH", "sub-2202", 664888, [], 26],
  ["MACHINEFABRIEK STURM B V", "sub-4218", 661642, [], 25],
  ["ALES METAALTECHNIEK BV", "sub-4230", 656343, [], 27],
  ["OPENROAD TRANSPORTATION INC", "sub-2304", 652067, [], 18],
  ["SERVE ELECTRIC LLC", "sub-4210", 641942, [], 12],
  ["IFM EFECTOR INC", "sub-4209", 639897, [], 20],
  ["K AND L SHEET METAL LLC", "sub-4230", 635099, [], 20],
  ["MESPACK INDIA PVT LTD", "sub-4602", 623991, [], 29],
  ["ASCO NUMATICS", "sub-4233", 623948, [], 24],
  ["XONIX INDUSTRIES SRL", "sub-4230", 619017, [], 21],
  ["MARELEC", "sub-4220", 618565, [], 23],
  ["EPI CENTER", "sub-0101", 617330, [], 31],
  ["AEROTEK", "sub-1203", 614794, [], 16],
  ["IMP AUTOMATION B V", "sub-3905", 612232, [], 15],
  ["DHL EXPRESS", "sub-2305", 606635, [], 18],
  ["MESPACK CLOUD LLC", "sub-4602", 603162, [], 27],
  ["AMERICAN CUSTOM METAL FABRICATING INC", "sub-4230", 602410, [], 14],
  ["PLD ELECTRONICS", "sub-4210", 597099, [], 22],
  ["DUTESCO HOLDING BV", "sub-2902", 596900, [], 31],
  ["ADVANCED NETWORK SERVICES", "sub-0701", 595437, [], 29],
  ["WHP", "sub-4210", 593601, [], 23],
];

// Generate tail-spend vendors (small vendors < 1% of total spend)
function generateTailVendors(): VendorDef[] {
  const tailVendors: VendorDef[] = [];

  // Pick subcategories that commonly have tail spend
  const subcategoryIds = [
    "sub-0101",
    "sub-0102",
    "sub-0201",
    "sub-0202",
    "sub-0301",
    "sub-0401",
    "sub-0501",
    "sub-0502",
    "sub-0503",
    "sub-0504",
    "sub-0601",
    "sub-0602",
    "sub-0603",
    "sub-0701",
    "sub-0702",
    "sub-0801",
    "sub-0802",
    "sub-0803",
    "sub-0901",
    "sub-1001",
    "sub-1101",
    "sub-1102",
    "sub-1103",
    "sub-1201",
    "sub-1202",
    "sub-1203",
    "sub-1301",
    "sub-1302",
    "sub-1303",
    "sub-1304",
  ];

  const prefixes = [
    "Apex", "Prime", "Global", "Pacific", "Atlas", "Summit", "Metro",
    "National", "United", "First Choice", "Quality", "Pro", "Elite",
    "Standard", "Premier", "Central", "Northern", "Southern", "Western",
    "Eastern", "Alpha", "Omega", "Delta", "Pinnacle", "Keystone",
    "Liberty", "Eagle", "Star", "Crown", "Diamond", "Platinum",
    "Golden", "Silver", "American", "Continental", "Regional",
    "Superior", "Advanced", "Modern", "Classic", "Dynamic",
    "Reliable", "Trusted", "Preferred", "Select", "Precision",
  ];

  const suffixes = [
    "Solutions", "Services", "Supply Co", "Industries", "Enterprises",
    "Corp", "Group", "Partners", "Associates", "International",
    "Systems", "Technologies", "Consulting", "LLC", "Inc",
    "Company", "Trading", "Distributors", "Holdings", "Logistics",
  ];

  const usedNames = new Set<string>();

  for (let i = 0; i < 150; i++) {
    let name: string;
    do {
      name = `${pickRandom(prefixes)} ${pickRandom(suffixes)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const spend = randomInt(2000, 120000);
    const subcatId = pickRandom(subcategoryIds);
    tailVendors.push([name, subcatId, spend]);
  }

  return tailVendors;
}

// Build the full vendor list
const allVendorDefs: VendorDef[] = [...majorVendors, ...generateTailVendors()];

export const vendors: Vendor[] = allVendorDefs.map((def, index) => {
  const [name, subcategoryId, annualSpend, aliases = [], riskScore] = def;
  const catId = "cat-" + subcategoryId.substring(4, 6);

  return {
    id: `v-${String(index + 1).padStart(4, "0")}`,
    name,
    aliases,
    categoryId: catId,
    subcategoryId,
    annualSpend,
    contractStatus: annualSpend > 200000 ? (rand() > 0.15 ? "active" : "expired") : (rand() > 0.5 ? "active" : "no_contract"),
    paymentTerms: pickRandom(paymentTermsOptions),
    riskScore: riskScore ?? randomInt(10, 45),
    location: pickRandom(locations),
    employeeCount: annualSpend > 1000000 ? randomInt(1000, 100000) : randomInt(10, 5000),
    diversityStatus: pickRandom(diversityStatuses),
    yearOnboarded: randomInt(2018, 2025),
  };
});

// Duplicate vendor clusters (built-in data quality issue)
export const duplicateVendorClusters = [
  { canonical: "PRICEWATERHOUSECOOPERS", duplicates: ["PWC", "PWC LLP"], totalFragmentedSpend: 3407615 },
  { canonical: "LUMEN", duplicates: ["LUMEN TECHNOLOGIES", "CENTURYLINK"], totalFragmentedSpend: 5372740 },
  { canonical: "AMERICAN EXPRESS", duplicates: ["AMEX", "AMEX GBT"], totalFragmentedSpend: 4063140 },
  { canonical: "GRANT THORNTON", duplicates: ["GRANT THORNTON LLP"], totalFragmentedSpend: 2507109 },
  { canonical: "MARSH INC", duplicates: ["MARSH MCLENNAN", "MARSH"], totalFragmentedSpend: 2652615 },
  { canonical: "FASTENAL", duplicates: ["FASTENAL COMPANY"], totalFragmentedSpend: 3421425 },
  { canonical: "MOTION INDUSTRIES INC", duplicates: ["MOTION INDUSTRIES"], totalFragmentedSpend: 4225231 },
  { canonical: "SMC PNEUMATICS", duplicates: ["SMC CORPORATION", "SMC"], totalFragmentedSpend: 2639101 },
  { canonical: "FESTO", duplicates: ["FESTO CORPORATION", "FESTO INC"], totalFragmentedSpend: 3190625 },
  { canonical: "SICK INC", duplicates: ["SICK", "SICK AG"], totalFragmentedSpend: 3973649 },
  { canonical: "BECKHOFF AUTOMATION", duplicates: ["BECKHOFF", "BECKHOFF GMBH"], totalFragmentedSpend: 2556636 },
  { canonical: "YASKAWA", duplicates: ["YASKAWA AMERICA", "YASKAWA ELECTRIC"], totalFragmentedSpend: 2886864 },
  { canonical: "SEW EURODRIVE INC", duplicates: ["SEW EURODRIVE", "SEW-EURODRIVE"], totalFragmentedSpend: 3607740 },
  { canonical: "SAMUEL SON AND COMPANY INC", duplicates: ["SAMUEL SON", "SAMUEL & SON"], totalFragmentedSpend: 4573758 },
  { canonical: "WORLDWIDE EXPRESS", duplicates: ["WORLDWIDE EXPRESS INC"], totalFragmentedSpend: 2919608 },
  { canonical: "TECH M", duplicates: ["TECH MAHINDRA", "TECH MAHINDRA LTD"], totalFragmentedSpend: 3047885 },
  { canonical: "BMO HARRIS BANK NA", duplicates: ["BMO HARRIS", "BMO HARRIS BANK"], totalFragmentedSpend: 7161732 },
  { canonical: "RXBENEFITS INC", duplicates: ["RXBENEFITS"], totalFragmentedSpend: 3143864 },
  { canonical: "PARTENA VZW", duplicates: ["PARTENA"], totalFragmentedSpend: 3760750 },
  { canonical: "WEST COAST METALS", duplicates: ["WEST COAST METALS INC"], totalFragmentedSpend: 2500230 },
];

// Helper functions
export function getVendorById(id: string): Vendor | undefined {
  return vendors.find((v) => v.id === id);
}

export function getVendorByName(name: string): Vendor | undefined {
  const lower = name.toLowerCase();
  return vendors.find(
    (v) =>
      v.name.toLowerCase() === lower ||
      v.aliases.some((a) => a.toLowerCase() === lower)
  );
}

export function getVendorsByCategory(categoryId: string): Vendor[] {
  return vendors.filter((v) => v.categoryId === categoryId);
}

export function getVendorsBySubcategory(subcategoryId: string): Vendor[] {
  return vendors.filter((v) => v.subcategoryId === subcategoryId);
}

export function getTailSpendVendors(thresholdPercent: number = 1): Vendor[] {
  const totalSpend = vendors.reduce((sum, v) => sum + v.annualSpend, 0);
  const threshold = totalSpend * (thresholdPercent / 100);
  return vendors.filter((v) => v.annualSpend < threshold);
}

export function getTopVendors(limit: number = 10, categoryId?: string): Vendor[] {
  let filtered = categoryId ? getVendorsByCategory(categoryId) : vendors;
  return [...filtered].sort((a, b) => b.annualSpend - a.annualSpend).slice(0, limit);
}
