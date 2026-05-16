import { MOCK_USER } from "@/lib/mock/user";

export type MockAuthState =
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: typeof MOCK_USER };

export const INITIAL_AUTH_STATE: MockAuthState = { status: "unauthenticated" };
