export type ReviewSeverity = "blocker" | "risk" | "suggestion" | "passed";

export type ReviewFinding = {
  id: string;
  severity: ReviewSeverity;
  title: string;
  file: string;
  line?: number;
  dimension: "correctness" | "maintainability" | "accessibility" | "performance" | "framework";
};

export const MOCK_REVIEW_RUN = {
  score: 86,
  status: "passed_with_risks" as const,
  findings: [
    { id: "r1", severity: "risk", title: "API route still needs rate limiting", file: "app/api/tasks/route.ts", line: 12, dimension: "correctness" },
    { id: "r2", severity: "suggestion", title: "Empty state needs stronger keyboard focus", file: "components/EmptyState.tsx", line: 8, dimension: "accessibility" },
    { id: "r3", severity: "passed", title: "No `any` types detected", file: "generated project", dimension: "correctness" }
  ] satisfies ReviewFinding[]
};
