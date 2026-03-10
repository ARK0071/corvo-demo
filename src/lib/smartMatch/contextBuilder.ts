/**
 * Smart Match Context Builder
 * 
 * Builds intelligent context from demo data for grant matching.
 */

import type { DemoContext, DemoProject, SpendSignals } from "@/data/demoContext";

export interface SmartContext {
  projects: DemoProject[];
  spendSignals: SpendSignals;
  derived: {
    focusAreas: string[];
    keywords: string[];
    budgetRange: {
      min: number | null;
      max: number | null;
    };
  };
}

// Fixed port/maritime terms to always include
const FIXED_PORT_TERMS = [
  "port",
  "terminal",
  "berth",
  "wharf",
  
];

// Map spend categories to focus areas
const CATEGORY_TO_FOCUS: Record<string, string[]> = {
  "Professional Services": ["consulting", "engineering", "planning"],
  "Materials & Supplies": ["materials", "supplies", "equipment"],
  "Workforce / Labor": ["workforce", "training", "labor"],
  "Facilities Maintenance": ["maintenance", "repairs", "infrastructure"],
  "Utilities": ["utilities", "energy", "electrification"],
};

/**
 * Build smart context from demo context
 */
export async function buildSmartContext(
  demoContext: DemoContext,
  useAI: boolean = true
): Promise<SmartContext> {
  console.log("[Smart Match] Building context from demo data...");
  console.log("[Smart Match] Projects:", demoContext.projects.length, "projects");
  demoContext.projects.forEach((p, i) => {
    console.log(`  [${i + 1}] ${p.name} - Focus: ${p.focusAreas.join(", ")} - Budget: ${p.budget ? `$${(p.budget / 1_000_000).toFixed(1)}M` : "N/A"}`);
  });

  // Extract focus areas from projects
  const projectFocusAreas = new Set<string>();
  for (const project of demoContext.projects) {
    for (const focus of project.focusAreas) {
      projectFocusAreas.add(focus.toLowerCase());
    }
  }
  console.log("[Smart Match] Project focus areas:", Array.from(projectFocusAreas));

  // Map spend categories to focus areas
  const categoryFocusAreas = new Set<string>();
  console.log("[Smart Match] Spend categories:", demoContext.spendSignals.topCategoriesL2.map(c => `${c.category} ($${(c.spend / 1_000_000).toFixed(2)}M)`).join(", "));
  
  for (const category of demoContext.spendSignals.topCategoriesL2) {
    const mapped = CATEGORY_TO_FOCUS[category.category] || [];
    for (const focus of mapped) {
      categoryFocusAreas.add(focus.toLowerCase());
    }
    // Also add the category name itself (normalized)
    const categoryLower = category.category.toLowerCase().replace(/\s+\/\s+/g, " ").replace(/\s+/g, "-");
    categoryFocusAreas.add(categoryLower);
  }

  // Combine all focus areas
  const allFocusAreas = new Set<string>([...projectFocusAreas, ...categoryFocusAreas]);
  console.log("[Smart Match] Combined focus areas:", Array.from(allFocusAreas).slice(0, 10), `(${allFocusAreas.size} total)`);

  // Generate keywords using AI or deterministic approach
  let finalKeywords: string[] = [];
  let keywordSource = "deterministic";

  if (useAI) {
    try {
      console.log("[Smart Match] Attempting AI-powered keyword generation via API...");
      const res = await fetch("/api/smart-match-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: demoContext }),
      });

      if (res.ok) {
        const data = await res.json() as { keywords: string[]; source: string };
        finalKeywords = data.keywords;
        keywordSource = data.source;
        console.log("[Smart Match] ✓ AI keyword generation successful");
      } else {
        const errBody = await res.text();
        console.warn(`[Smart Match] AI keyword API returned ${res.status}:`, errBody);
      }
    } catch (error) {
      console.warn("[Smart Match] AI keyword generation failed, falling back to deterministic:", error);
    }
  }

  // Fallback to deterministic keyword generation
  if (finalKeywords.length === 0) {
    console.log("[Smart Match] Using deterministic keyword generation");
    const keywords = new Set<string>();
    
    // Add project focus areas
    for (const focus of projectFocusAreas) {
      if (focus.length >= 3) {
        keywords.add(focus);
      }
    }

    // Add spend category terms
    for (const category of demoContext.spendSignals.topCategoriesL2) {
      const terms = category.category.toLowerCase().split(/\s+/);
      for (const term of terms) {
        if (term.length >= 3 && !term.match(/^[&/]$/)) {
          keywords.add(term);
        }
      }
    }

    // Add fixed port terms
    for (const term of FIXED_PORT_TERMS) {
      keywords.add(term);
    }

    // Clean and dedupe keywords
    const cleanedKeywords: string[] = [];
    for (const keyword of keywords) {
      const cleaned = keyword.toLowerCase().trim();
      if (cleaned.length >= 3 && cleaned.length <= 30) {
        cleanedKeywords.push(cleaned);
      }
    }

    // Cap to 18 keywords
    finalKeywords = cleanedKeywords.slice(0, 18);
    keywordSource = "deterministic";
  }

  console.log(`[Smart Match] Generated keywords (${keywordSource}):`, finalKeywords.join(", "));
  console.log("[Smart Match] Keyword count:", finalKeywords.length);

  // Calculate budget range from projects
  let minBudget: number | null = null;
  let maxBudget: number | null = null;

  for (const project of demoContext.projects) {
    if (project.budget !== undefined && project.budget > 0) {
      if (minBudget === null || project.budget < minBudget) {
        minBudget = project.budget;
      }
      if (maxBudget === null || project.budget > maxBudget) {
        maxBudget = project.budget;
      }
    }
  }

  console.log("[Smart Match] Budget range:", 
    minBudget ? `$${(minBudget / 1_000_000).toFixed(1)}M` : "N/A",
    "-",
    maxBudget ? `$${(maxBudget / 1_000_000).toFixed(1)}M` : "N/A"
  );

  const context = {
    projects: demoContext.projects,
    spendSignals: demoContext.spendSignals,
    derived: {
      focusAreas: Array.from(allFocusAreas),
      keywords: finalKeywords,
      budgetRange: {
        min: minBudget,
        max: maxBudget,
      },
    },
  };

  console.log("[Smart Match] Context built successfully:", {
    projectCount: context.projects.length,
    focusAreaCount: context.derived.focusAreas.length,
    keywordCount: context.derived.keywords.length,
    budgetRange: context.derived.budgetRange,
  });

  return context;
}
