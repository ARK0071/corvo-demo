"use client";

import { useMemo } from "react";
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  FileWarning,
  Layers,
  Radar,
  Shield,
  Sparkles,
  Anchor,
  Link2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTenant } from "@/contexts/tenant-context";

/** Visible only when the active tenant port is Polestar Defense (Settings → port / headers). */
export default function PolestarOpportunityPage() {
  const { portId, portName, isLoading } = useTenant();

  const generatedAt = useMemo(
    () =>
      new Date().toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" aria-hidden />
      </div>
    );
  }

  if (portId !== "polestar-defense") {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Radar className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight">Workspace not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This partner opportunity view is enabled only for the <strong>Polestar Defense</strong> tenant.
          Admins can activate it under <strong>Settings</strong> by selecting that port for your session.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">Current tenant: {portName}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* System header — reads like in-app intelligence, not a slide deck */}
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 font-normal">
                <Sparkles className="h-3 w-3" />
                Corvo synthesis
              </Badge>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Port Freeport · Pole Star Defense
              </Badge>
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-200">
                Confidential
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Partner–port–grant path</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Cross-linking your product catalog with Port Freeport&rsquo;s project and grant pipeline: where a federal award
              could fund work that includes your stack, and how Corvo keeps the port compliant after award.
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div className="flex items-center justify-end gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Generated {generatedAt}
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground/80">
              source_graph: port_projects + federal_nofos + vendor_solutions
            </div>
          </div>
        </div>

        {/* Pipeline — horizontal flow on large screens */}
        <div className="mb-10 grid gap-4 lg:grid-cols-3">
          <PipelineStep
            step={1}
            icon={Radar}
            title="Your solutions"
            subtitle="Pole Star Defense / Global (catalog)"
            accent="from-slate-500/10 to-transparent"
          >
            <ul className="space-y-3 text-sm">
              <ProductRow
                name="PurpleTRAC"
                tag="Sanctions & screening"
                detail="Vessel calls and counterparties screened across 1,800+ watchlists in 90+ jurisdictions — aligned with OFAC / BIS / FinCEN expectations for US ports handling LNG and refined products."
              />
              <ProductRow
                name="Maritime Transparency Index (MTI)"
                tag="0–5 risk verdict"
                detail="Real-time gate criterion and voyage risk signal to prioritize traffic and partners at the fence line."
              />
              <ProductRow
                name="Pole Star Defense ISR"
                tag="Coastal awareness"
                detail="Coastal surveillance and dark-vessel detection to extend physical security and domain awareness."
              />
            </ul>
          </PipelineStep>

          <PipelineStep
            step={2}
            icon={Anchor}
            title="Port projects Corvo matched"
            subtitle="Port Freeport — live workspace entities"
            accent="from-teal-500/10 to-transparent"
          >
            <p className="mb-3 text-xs text-muted-foreground">
              Corvo maps grants and narratives to infrastructure the port is already funding or designing — the attachment
              surface for vendor scope (hardware, integration, SaaS).
            </p>
            <ul className="space-y-2.5 text-sm">
              <MatchRow
                label="Velasco & intermodal"
                confidence={88}
                note="Container terminal expansion, rail, digital and gate modernization — natural overlay for screening + MTI at the gate."
              />
              <MatchRow
                label="Risk & security budget context"
                confidence={82}
                note="~$2.3M/yr directed to security services in FY25 budget — frames recurring O&M and upgrade paths."
              />
              <MatchRow
                label="Digital / pilot language gap"
                confidence={71}
                note="Published PIDP-style narratives emphasize physical infrastructure; harbor-pilot optimization language not prominent — opening for Pole Star + digital scope in next NOFO cycle."
              />
              <MatchRow
                label="BRIC / resilience stack"
                confidence={76}
                note="Storm surge, hardening, utilities — sensor and monitoring layers increasingly cited; fits vessel intelligence as part of layered monitoring."
              />
            </ul>
          </PipelineStep>

          <PipelineStep
            step={3}
            icon={CircleDollarSign}
            title="Grants → award → buy"
            subtitle="Federal pathways (representative)"
            accent="from-emerald-500/10 to-transparent"
          >
            <p className="mb-3 text-xs text-muted-foreground">
              Port applies as recipient; award funds eligible scope (construction, IT, sensors, services per NOFO). Procurement
              can then engage Pole Star under federal rules Corvo tracks.
            </p>
            <div className="space-y-2.5">
              <GrantCard
                name="PIDP (MARAD)"
                detail="Port infrastructure & digital acquisitions; FY26 NOFO timing and cybersecurity plan tie-ins (e.g. NDAA-style cyber expectations for digital buys)."
                status="Open / recurring phase"
              />
              <GrantCard
                name="FEMA PSGP"
                detail="Port security, cyber hardening, domain awareness — COTP / AMSC alignment drives merit; prior PSGP history at Freeport."
                status="FY26 cycle (pre-stage IJ)"
              />
              <GrantCard
                name="FEMA BRIC"
                detail="Resilience and hardening — direct construction-heavy; monitoring / sensor integration as subcomponent in many subapplications."
                state="Urgent state / federal deadlines vary"
              />
            </div>
          </PipelineStep>
        </div>

        {/* Closing the loop */}
        <Card className="mb-8 border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-700 dark:text-teal-400" />
              <CardTitle className="text-base">How the loop closes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <FlowChunk>Pole Star capability</FlowChunk>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              <FlowChunk icon={Building2}>Freeport project need (Corvo-matched)</FlowChunk>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              <FlowChunk icon={Layers}>Eligible NOFO / grant package</FlowChunk>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              <FlowChunk icon={Shield}>Award → funded scope</FlowChunk>
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              <FlowChunk icon={Link2}>Procurement → Pole Star delivery</FlowChunk>
            </div>
            <Separator />
            <div className="flex gap-3 rounded-lg bg-muted/40 p-4">
              <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">Corvo after the award</p>
                <p className="mt-1 text-muted-foreground">
                  Same workspace carries <strong>2 CFR 200</strong> posture, <strong>BABA</strong> and <strong>Davis-Bacon</strong>{" "}
                  triggers where construction hits, <strong>NEPA</strong> / FEMA EHP where required, PSGP cyber reporting,
                  single audit / SEFA tracking — so Pole Star sees clean procurement pathways instead of compliance fire drills.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Illustrative synthesis from Corvo entity linking and grant intelligence — not legal, investment, or funding advice.
          Confirm all NOFO and state subapplicant deadlines with agencies before committing resources.
        </p>
      </div>
    </div>
  );
}

function PipelineStep({
  step,
  icon: Icon,
  title,
  subtitle,
  accent,
  children,
}: {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={`relative overflow-hidden border bg-gradient-to-b ${accent}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/5 text-[10px] text-foreground">
            {step}
          </span>
          <Icon className="h-3.5 w-3.5" />
          {subtitle}
        </div>
        <CardTitle className="text-lg leading-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function ProductRow({ name, tag, detail }: { name: string; tag: string; detail: string }) {
  return (
    <li className="rounded-md border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <span className="font-medium">{name}</span>
        <Badge variant="secondary" className="text-[10px] font-normal">
          {tag}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </li>
  );
}

function MatchRow({ label, confidence, note }: { label: string; confidence: number; note: string }) {
  return (
    <li className="rounded-md border border-border/50 bg-background/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400">match {confidence}%</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </li>
  );
}

function GrantCard({
  name,
  detail,
  status,
  state,
}: {
  name: string;
  detail: string;
  status?: string;
  state?: string;
}) {
  return (
    <div className="rounded-md border bg-background/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-sm font-semibold">{name}</span>
        {status && (
          <Badge variant="outline" className="text-[10px] font-normal">
            {status}
          </Badge>
        )}
      </div>
      {state && <p className="mt-0.5 text-[10px] text-amber-800 dark:text-amber-200">{state}</p>}
      <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function FlowChunk({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex min-h-[3rem] flex-1 items-center justify-center rounded-lg border bg-muted/30 px-3 py-2 text-center text-xs font-medium">
      {Icon && <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      {children}
    </div>
  );
}
