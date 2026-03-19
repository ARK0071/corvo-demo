/**
 * Smart Match Ranker - types for AI-powered grant ranking (legacy module)
 */

export interface SmartMatchResult {
  grantId: string;
  score: number;
  reasoning: string;
  strengths: string[];
  concerns: string[];
  why: string[];
  deadlineNote?: string;
  bestProject?: {
    id: string;
    name: string;
    matchScore: number;
  };
}
