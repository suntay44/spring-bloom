import Link from "next/link";
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 text-white">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-purple-400">404</p>
        <h1 className="mt-4 text-4xl font-semibold">Page not found</h1>
        <p className="mt-3 text-slate-400">The page you're looking for doesn't exist or was moved.</p>
        <Link className="mt-8 inline-block rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold hover:bg-purple-500" href="/">
          Go home
        </Link>
      </div>
    </main>
  );
}
