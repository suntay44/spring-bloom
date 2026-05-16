import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="page-shell bg-zinc-950">
      <div className="container flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <Badge variant="secondary">404</Badge>
        <h1 className="text-5xl font-semibold">Page not found.</h1>
        <p className="section-lede">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
        <Button render={<Link href="/" />}>Go home</Button>
      </div>
    </main>
  );
}
