import { AuthGuard } from "@/components/shared/AuthGuard";

export default function BuilderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthGuard>{children}</AuthGuard>;
}
