"use client";

import { ArrowRight } from "lucide-react";

const suggestions = [
  {
    label: "Top suppliers",
    question: "Who are my top 10 suppliers by spend?",
  },
  {
    label: "Savings opportunities",
    question: "What are our biggest savings opportunities?",
  },
  {
    label: "Expiring contracts",
    question: "Show me contracts expiring this quarter",
  },
  {
    label: "Tail spend",
    question: "Analyze our tail spend and consolidation opportunities",
  },
  {
    label: "Duplicate vendors",
    question: "Are there any duplicate vendor records in our system?",
  },
  {
    label: "Copper pricing",
    question: "Should we buy 6 months of copper inventory now?",
  },
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
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
