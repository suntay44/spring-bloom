import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell bg-zinc-950">
      <div className="container flex min-h-screen flex-col items-center justify-center gap-6 text-center">
        <span className="pill">404</span>
        <h1 className="text-5xl font-semibold">Page not found.</h1>
        <p className="section-lede">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
        <Link className="button blue" href="/">Go home</Link>
      </div>
    </main>
  );
}
