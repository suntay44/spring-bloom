export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "passed";
export type SecurityCategory = "rls" | "secrets" | "validation" | "auth" | "cors" | "dependency" | "env";

export type SecurityFinding = {
  id: string;
  severity: SecuritySeverity;
  title: string;
  file: string;
  line?: number;
  category: SecurityCategory;
  blocksDeployment: boolean;
};

export const MOCK_SECURITY_RUN = {
  status: "needs_attention" as const,
  blocksDeploy: true,
  findings: [
    { id: "s1", severity: "high", title: "Missing RLS policy on team_invites", file: "supabase/migrations/001.sql", category: "rls", blocksDeployment: false },
    { id: "s2", severity: "medium", title: "Unvalidated JSON body in tasks route", file: "app/api/tasks/route.ts", line: 18, category: "validation", blocksDeployment: false },
    { id: "s3", severity: "passed", title: "No committed secrets detected", file: "generated project", category: "secrets", blocksDeployment: false }
  ] satisfies SecurityFinding[]
};
