"use client";

import { ArrowRight } from "lucide-react";

const suggestions = [
  {
    label: "PIDP vendors",
    question: "Which vendors are best qualified for the PIDP grant?",
  },
  {
    label: "Marine DBE vendors",
    question: "Show me marine construction companies with DBE certification",
  },
  {
    label: "Compare programs",
    question: "Compare the PIDP and RAISE grant programs",
  },
  {
    label: "Vendor gaps",
    question: "What capability gaps does Bechtel have for the Clean Ports program?",
  },
  {
    label: "Dredging landscape",
    question: "Generate a competitive landscape for dredging projects",
  },
  {
    label: "Open grants",
    question: "What federal grant programs are currently open for port projects?",
  },
];

interface GrantMatchSuggestionsProps {
  onSelect: (question: string) => void;
}

export function GrantMatchSuggestions({ onSelect }: GrantMatchSuggestionsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {suggestions.map((s) => (
        <button
          key={s.label}
          onClick={() => onSelect(s.question)}
          className="group flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <div>
            <div className="font-medium text-foreground">{s.label}</div>
            <div className="text-xs text-muted-foreground">{s.question}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
}
