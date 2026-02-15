"use client";

import { useState } from "react";
import { Copy, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GrantVendorMatch } from "@/data/matches";
import type { GrantProgram } from "@/data/grants";
import type { PortVendor } from "@/data/port-vendors";

interface OutreachEmailProps {
  match: GrantVendorMatch;
  grant: GrantProgram;
  vendor: PortVendor;
}

function formatCurrency(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

function generateEmail(match: GrantVendorMatch, grant: GrantProgram, vendor: PortVendor): string {
  const strengthsList = match.strengths
    .map((s) => `  • ${s}`)
    .join("\n");

  const activitiesList = grant.eligibleActivities
    .slice(0, 5)
    .map((a) => `  • ${a}`)
    .join("\n");

  return `Subject: Grant Opportunity – ${grant.shortName} (${formatCurrency(grant.totalFunding)} available)

Dear ${vendor.keyPersonnel[0]?.name || "Team"},

I'm reaching out regarding a federal grant opportunity that aligns well with ${vendor.name}'s capabilities and experience.

GRANT PROGRAM: ${grant.name} (${grant.shortName})
AGENCY: ${grant.agency}
TOTAL FUNDING: ${formatCurrency(grant.totalFunding)}
AWARD RANGE: ${formatCurrency(grant.minAward)} – ${formatCurrency(grant.maxAward)}
DEADLINE: ${grant.deadline}
${grant.matchRequirement > 0 ? `MATCH REQUIREMENT: ${(grant.matchRequirement * 100).toFixed(0)}% local cost-share` : "MATCH REQUIREMENT: None"}

${grant.description}

ELIGIBLE ACTIVITIES:
${activitiesList}

WHY ${vendor.name.toUpperCase()} IS A STRONG FIT:
${strengthsList}

Your overall match score for this program is ${match.overallScore}/100, placing you in the ${match.recommendation.replace("_", " ")} category.${match.gaps.length > 0 ? `\n\nAreas to address in the application:\n${match.gaps.map((g) => `  • ${g}`).join("\n")}` : ""}

We'd like to discuss how to position ${vendor.name} for a competitive application. Would you be available for a brief call this week?

Best regards,
Port Authority Grants Team`;
}

export function OutreachEmail({ match, grant, vendor }: OutreachEmailProps) {
  const [copied, setCopied] = useState(false);
  const emailText = generateEmail(match, grant, vendor);

  async function handleCopy() {
    await navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-md border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span>Draft Outreach – {vendor.name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1.5">
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap p-3 text-xs leading-relaxed font-mono text-foreground/80">
        {emailText}
      </pre>
    </div>
  );
}
