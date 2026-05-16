export const MOCK_BUILD_ANALYTICS = {
  creditsUsed: 85,
  buildTimeSeconds: 372,
  reviewScore: 86,
  reviewPassRate: 0.91,
  openSecurityIssues: 3,
  filesChanged: 12,
  linesAdded: 842,
  linesRemoved: 119
};

export const MOCK_APP_ANALYTICS = {
  sessions: 124,
  signups: 18,
  activationRate: 0.42,
  runtimeErrors: 2,
  keyFeatureUsed: 67,
  signupConversionRate: 0.145
};

export type CreditUsageItem = {
  label: string;
  value: string;
  detail: string;
};

export const MOCK_CREDIT_USAGE: CreditUsageItem[] = [
  { label: "Initial builds", value: "65 credits", detail: "3 projects" },
  { label: "Follow-up prompts", value: "20 credits", detail: "12 prompts" },
  { label: "Review and security", value: "14 credits", detail: "4 runs" },
  { label: "Deployments", value: "0 credits", detail: "mock only" }
];
