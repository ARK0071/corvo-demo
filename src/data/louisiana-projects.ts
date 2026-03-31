import type { Project } from "./projects";

/** Louisiana Gateway Port (Plaquemines) demo projects — IDs align with profile embedding exports. */
export const louisianaGatewayProjects: Project[] = [
    // ─── CONTAINERS ────────────────────────────────────────────────────────────
  
    {
      id: "lgp-lgct",
      name: "Louisiana Gateway Container Terminal (LGCT)",
      description:
        "New greenfield container terminal developed in partnership with APM Terminals under a 30-year lease. Located at Mile 51 AHP on the West Bank, providing first gateway access to the Mississippi River System. Phase 1 includes 3 berths, 6 ship-to-shore cranes, and a 200-acre site expandable to 900 acres.",
      projectType: "infrastructure",
      status: "design",
      priority: "critical",
      budget: 467_000_000,
      location: "West Bank, Mile Marker 51 AHP",
      startDate: "2024-01-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Container terminal",
        "Port infrastructure",
        "Trade competitiveness",
        "Private investment",
        "Freight movement",
      ],
      notes:
        "Letter of intent signed with APM Terminals in January 2024. APM committed $500M initial investment. Phase 1 capacity: 1.0M TEU/yr. Phase 2 expands to 1.5M TEU/yr on up to 900 acres.",
    },
  
    {
      id: "lgp-intermodal-rail-yard",
      name: "Louisiana Gateway Intermodal Rail Yard",
      description:
        "State-of-the-art intermodal rail yard adjacent to LGCT designed to streamline container transfers. Includes 4 working/storage tracks averaging 3,800 ft, one access track, and a highway flyover (4-lane divided elevated roadway) connecting the terminal to LA-23.",
      projectType: "infrastructure",
      status: "design",
      priority: "critical",
      budget: 300_000_000,
      location: "Mile Marker 51.5 AHP",
      startDate: "2024-01-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Intermodal rail",
        "Container logistics",
        "Port infrastructure",
        "Highway connectivity",
        "Freight efficiency",
      ],
      notes:
        "Phase 1 rail capacity: 1.0M TEU/yr. Flyover provides uninterrupted emergency responder access during hurricane evacuations. Tied directly to LGCT development timeline.",
    },
  
    // ─── LAND ──────────────────────────────────────────────────────────────────
  
    {
      id: "lgp-land-acquisition",
      name: "Port Land Acquisition Program",
      description:
        "Ongoing acquisition of parcels required for terminal and port development. As of May 2024, the port owns Parcels 1–3 (2,146 acres including 31 Piano Keys I parcels). Parcels 4–5, 32 Piano Keys I/II parcels, and ~175 IMT-owned acres are still being acquired. Parcel 6 is reserved for future phases.",
      projectType: "real_estate",
      status: "procurement",
      priority: "high",
      budget: 64_200_000,
      location: "Miles 51–48 AHP, West Bank",
      startDate: "2023-01-01",
      endDate: "2026-12-31",
      focusAreas: [
        "Land acquisition",
        "Port expansion",
        "Terminal development",
        "Right-of-way",
      ],
      notes:
        "Port has acquired >50% of required footprint as of May 2024. Budget reflects port-funded sub-parcels ($10M + $20M + $30M + $4.2M). Parcel 6 deferred to future phases.",
    },
  
    // ─── LIQUID-BULK / LNG ─────────────────────────────────────────────────────
  
    {
      id: "lgp-vg-plaquemines-lng",
      name: "Venture Global Plaquemines LNG Terminal",
      description:
        "Major LNG export facility on a 632-acre site with 1.3 miles of deep-water frontage. Includes 3 ship loading berths (max 185,000 m³ vessels), 4 full-containment storage tanks (200,000 m³ capacity), two 42-inch diameter pipelines (15 and 12 miles), and a utility river dock. Exports to both FTA and non-FTA nations.",
      projectType: "infrastructure",
      status: "construction",
      priority: "critical",
      budget: 21_000_000_000,
      location: "Mile Marker 53.5 AHP",
      startDate: "2021-01-01",
      endDate: "2027-12-31",
      focusAreas: [
        "LNG export",
        "Liquid-bulk",
        "Energy infrastructure",
        "Private investment",
        "Deep-water terminal",
      ],
      notes:
        "Phased $21B investment. First LNG export targeted before end of 2024; fully operational 2026; Phase 2 expansion 2027. Venture Global owns a new fleet of 9 next-generation LNG vessels. Split as $13.2B + $7.8B across phases.",
    },
  
    {
      id: "lgp-sungas-methanol",
      name: "SunGas Renewables Green Methanol Terminal (Beaver Lake)",
      description:
        "Green methanol production and export project developed by Beaver Lake Renewable Energy (BLRE), a SunGas Renewables subsidiary. Plant located at the former International Paper facility in Rapides Parish, producing 441,000 MT/yr of green methanol for carbon-neutral ships. Product travels 255 miles via Red River and Mississippi River by barge to the port.",
      projectType: "infrastructure",
      status: "planning",
      priority: "high",
      budget: 1_800_000_000,
      location: "Mile Marker 51 AHP (terminal); Pineville, Rapides Parish (midstream plant)",
      startDate: "2024-12-01",
      endDate: "2027-12-31",
      focusAreas: [
        "Green methanol",
        "Renewable energy",
        "Liquid-bulk",
        "Sustainable shipping",
        "Barge logistics",
      ],
      notes:
        "Construction at Pineville plant begins late 2024; commercial operations 2027. Port is nearest deepwater port between Pineville's Red River site and the Gulf of Mexico, offering competitive transportation cost advantage.",
    },
  
    {
      id: "lgp-gulfstream-lng",
      name: "Gulfstream LNG at Magnolia Terminal",
      description:
        "LNG production and export facility on a 418-acre leased port parcel south of Belle Chasse. Includes 2 feed gas processing trains, 3 LNG trains (~1.4 MTPA each), 1 LNG storage tank, 2 marine loading berths (one barge-capable, one for 180,000 m³ ocean ships), and an on-site power plant. Connected via a 26-inch natural gas pipeline.",
      projectType: "infrastructure",
      status: "planning",
      priority: "high",
      budget: 4_000_000_000,
      location: "Mile Marker 46.5 AHP (Magnolia Terminal)",
      startDate: "2025-01-01",
      endDate: "2028-06-30",
      focusAreas: [
        "LNG production",
        "Liquid-bulk",
        "Energy export",
        "Deep-water terminal",
        "Pipeline infrastructure",
      ],
      notes:
        "Term sheet executed with pipeline owner for gas supply. Expected operational ~3.5 years post-approval. Capacity: 4M MT/yr (237.5 BCF/yr). Sales to both FTA and non-FTA countries.",
    },
  
    // ─── INTERMODAL RAIL ───────────────────────────────────────────────────────
  
    {
      id: "lgp-peters-rail-bridge",
      name: "Peters Road Alternative Rail Alignment & Rail Bridge",
      description:
        "Alternative rail corridor paralleling Peters Road to replace the existing line through Gretna's downtown in Jefferson Parish. Includes a new railroad bridge crossing the Gulf Intracoastal Waterway (GIWW). Required to handle increased rail traffic from LGCT and Venture Global LNG without routing through residential areas.",
      projectType: "infrastructure",
      status: "planning",
      priority: "critical",
      budget: 650_000_000,
      location: "Mile Marker 71.5 AHP, Jefferson Parish",
      startDate: "2024-01-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Rail infrastructure",
        "Intermodal connectivity",
        "Urban rail relocation",
        "GIWW crossing",
        "Freight corridor",
      ],
      notes:
        "Funded by Jefferson Parish Government. Partnership with City of Gretna, Plaquemines Parish, Union Pacific, and NOGC Railway (Rio Grande subsidiary). 9.3-mile throughput track + 1 passing sidetrack; 286,000 lb max railcar. Only railroad east of Avondale on the west bank.",
    },
  
    {
      id: "lgp-rail-extension-11mi",
      name: "11-Mile Track Extension & Rehabilitation (Myrtle Grove to Woodland)",
      description:
        "Extension and rehabilitation of the abandoned NOGC short-line from its current southern terminus at Myrtle Grove, southbound through Citrus Lands to Woodland. Provides continuous rail access to the southern port area currently unreachable by rail.",
      projectType: "infrastructure",
      status: "planning",
      priority: "high",
      budget: 50_000_000,
      location: "Mile Markers 61.5–27.5 AHP",
      startDate: "2025-01-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Rail extension",
        "Abandoned line rehabilitation",
        "Intermodal connectivity",
        "Freight access",
      ],
      notes:
        "NOGC is a 32-mile short-line interchanging with Union Pacific at Westwego, LA. Serves 20+ switching/industrial customers. 34-mile total throughput track when complete; 286,000 lb max railcar. Privately funded.",
    },
  
    // ─── HIGHWAY CONNECTIVITY ──────────────────────────────────────────────────
  
    {
      id: "lgp-walker-peters-highway",
      name: "Walker Road – Peters Road Extension (Highway Bypass & Bridge)",
      description:
        "Extension of Peters Road ~3 miles south from its current terminus at Engineers Rd (LA-3017), crossing the GIWW via a new bridge, connecting to Walker Road and LA-23 at the port's main entrance. Serves as a relief route for USWC freight and traffic west of the Mississippi River, bypassing the Belle Chasse and Greater New Orleans bridges.",
      projectType: "infrastructure",
      status: "design",
      priority: "high",
      budget: 30_000_000,
      location: "Mile Marker 63 AHP, Jefferson/Plaquemines Parish line",
      startDate: "2022-07-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Highway connectivity",
        "Bridge construction",
        "GIWW crossing",
        "Freight access",
        "Evacuation route",
      ],
      notes:
        "In design status as of July 2022. $7.5M RAISE Grant requested April 2024 for 100% engineering design of bridge. Funded by Plaquemines Parish Government. Total corridor is ~4.65 miles.",
    },
  
    {
      id: "lgp-peters-highway-relocation",
      name: "Peters Road Highway Relocation (Union Pacific ROW Realignment)",
      description:
        "Relocates the Peters Road (LA-3017) centerline and right-of-way eastward from Lapalco Blvd for approximately 1.8 miles to accommodate the Peters Road rail corridor realignment. Road shifted east of the Union Pacific rail corridor adjacent to the Boomtown Floodwall.",
      projectType: "infrastructure",
      status: "planning",
      priority: "medium",
      budget: 75_000_000,
      location: "Mile Marker 63 AHP, Lapalco Blvd to Harvey Blvd, Jefferson Parish",
      startDate: "2024-01-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Highway relocation",
        "Right-of-way",
        "Rail-highway coordination",
        "Urban infrastructure",
      ],
      notes:
        "Directly interrelated with Peters Rd Alternative Rail Alignment project (Project 7). Funded by Plaquemines Parish Government. ~1.8 miles of road realignment.",
    },
  
    // ─── FERRY & MARINE HIGHWAY ────────────────────────────────────────────────
  
    {
      id: "lgp-belle-chasse-ferry",
      name: "Belle Chasse–Scarsdale Ferry Infrastructure Replacement",
      description:
        "Replacement of two aging ferry landing barges and one maintenance barge on the Belle Chasse–Scarsdale evacuation route. The existing infrastructure was built in 2002 and requires immediate upgrades for safety, reliability, and operational efficiency. Without the ferry, 193,334 vehicles would be rerouted 54 miles each way.",
      projectType: "infrastructure",
      status: "procurement",
      priority: "high",
      budget: 2_000_000,
      location: "Mile Marker 75 AHP",
      startDate: "2024-01-01",
      endDate: "2026-12-31",
      focusAreas: [
        "Ferry infrastructure",
        "Emergency evacuation",
        "Public transportation",
        "Maritime safety",
        "Community resilience",
      ],
      notes:
        "Serves 329,000 passengers and 193,334 vehicles/yr. New landing barges: 2 × 190'×35'×8'; maintenance barge: 200'×50'×7'. Port-funded. Critical evacuation lifeline for a transportation-insecure parish.",
    },
  
    {
      id: "lgp-pointe-hache-ferry",
      name: "Pointe à la Hache – Port Sulphur Ferry Restoration",
      description:
        "Emergency restoration of ferry ramps and landing barges on both sides of the Mississippi River at Pointe à la Hache and Port Sulphur. Service was closed by LaDOTD in January 2023 after Hurricane Ida and subsequent storms caused structural damage to ferry landings.",
      projectType: "infrastructure",
      status: "construction",
      priority: "critical",
      budget: 22_500_000,
      location: "Mile Marker 48 AHP",
      startDate: "2023-01-01",
      endDate: "2027-12-31",
      focusAreas: [
        "Ferry restoration",
        "Hurricane recovery",
        "Emergency transportation",
        "Community access",
        "Maritime infrastructure",
      ],
      notes:
        "$18.6M FTA grant received for permanent reconstruction. $4.5M in temporary repairs to restore service by January 2025. Full reconstruction expected 2027. Serves 109,650 passengers/yr.",
    },
  
    {
      id: "lgp-new-ferry-diesel-electric",
      name: "New Ferry Build – Diesel Electric",
      description:
        "Construction of a new dual-mode diesel/electric ferry to be placed into service for the Plaquemines Parish ferry system. Designed for lower operating costs, reduced downtime, and improved passenger safety. Part of a multimodal grant shared with Cameron Parish.",
      projectType: "procurement",
      status: "design",
      priority: "medium",
      budget: 26_500_000,
      location: "Mile Marker 51.5 AHP",
      startDate: "2024-01-01",
      endDate: "2027-12-31",
      focusAreas: [
        "Ferry construction",
        "Diesel-electric propulsion",
        "Public transportation",
        "Maritime sustainability",
        "Rural mobility",
      ],
      notes:
        "Funded by MPDG Rural program grant shared with Cameron Parish. Engineering and design contract awarded to Pelican Marine Design LLC, New Orleans (2024). Expected in service 2027.",
    },
  
    // ─── OTHER INFRASTRUCTURE ──────────────────────────────────────────────────
  
    {
      id: "lgp-port-sulphur-water",
      name: "Port Sulphur Water Treatment Plant & Water Booster Station",
      description:
        "New municipal-grade water treatment plant with reverse osmosis technology to address Mississippi River saltwater intrusion affecting the port expansion area. Capacity of 12 million gallons per day, built above flood zone elevation. Paired with Alliance Water Booster Station feedline upgrades (~10-mile, 20-inch line from Alliance Refinery to Port Sulphur).",
      projectType: "infrastructure",
      status: "planning",
      priority: "high",
      budget: 98_000_000,
      location: "Mile Marker 47 AHP, Port Sulphur",
      startDate: "2025-01-01",
      endDate: "2029-12-31",
      focusAreas: [
        "Water infrastructure",
        "Environmental compliance",
        "Saltwater intrusion mitigation",
        "Public utilities",
        "Community resilience",
      ],
      notes:
        "Currently unfunded/proposed. Port in active discussions with Plaquemines Parish for joint funding partnership. $80M for water treatment plant; $18M LA DOTD Port Priority Fund Grant for booster station. Essential for sustainable port expansion.",
    },
  
    {
      id: "lgp-support-boat-complex",
      name: "Port Support Boat Complex – Watercrafts & Emergency Response",
      description:
        "State-of-the-art maritime support complex at Mile 52 AHP providing berthing for tugboats, pilot boats, ferries, and emergency response craft. Includes advanced fueling, maintenance, and repair services plus a dedicated emergency response coordination center for incidents including hurricanes, oil spills, fires, and medical emergencies.",
      projectType: "infrastructure",
      status: "planning",
      priority: "high",
      budget: 20_000_000,
      location: "Mile Marker 52 AHP",
      startDate: "2025-01-01",
      endDate: "2028-12-31",
      focusAreas: [
        "Emergency response",
        "Maritime safety",
        "Port operations",
        "Watercraft support",
        "Hurricane preparedness",
      ],
      notes:
        "Strategically located for rapid response coverage across the port corridor. Funded via port grant. Supports all cargo types and ferry operations.",
    },
  
    {
      id: "lgp-nola-terminal",
      name: "NOLA Terminal – New Wharf & Docks",
      description:
        "Multi-use terminal at Mile 59 AHP on a 158-acre site handling crude oil, refined products, grain, gravel, containers, and breakbulk. Phase 1 includes new wharf and docks; Phase 2 completes the full $930M complex. Designed to accommodate new Panamax-sized vessels with 3 deep-water berths and 1 barge dock.",
      projectType: "infrastructure",
      status: "construction",
      priority: "high",
      budget: 930_000_000,
      location: "Mile Marker 59 AHP",
      startDate: "2021-10-01",
      endDate: "2027-12-31",
      focusAreas: [
        "Multi-use terminal",
        "Liquid-bulk",
        "Breakbulk",
        "Grain handling",
        "Panamax vessel accommodation",
      ],
      notes:
        "Construction began October 2021. Louisiana State Bond Commission approved $300M in tax-exempt bonds (February 2022). Total project: $930M ($300M Phase 1 private + $630M Phase 2 private). 3 deep-water Panamax berths + 1 barge dock.",
    },
  ];