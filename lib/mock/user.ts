export const MOCK_USER = {
  id: "user_mock_001",
  name: "Christian Suntay",
  initials: "C",
  email: "christian@example.com",
  workspace: "Christian's Workspace",
  plan: "Pro" as const,
  credits: 1415,
  maxCredits: 1500
} as const;

export type MockUser = typeof MOCK_USER;

export function creditPercent() {
  return `${Math.round((MOCK_USER.credits / MOCK_USER.maxCredits) * 100)}%`;
}
