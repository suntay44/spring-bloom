import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-8">
      <div className="container flex flex-wrap items-center justify-between gap-4 text-sm font-bold text-slate-500">
        <span>Wild Cupcake</span>
        <span className="flex items-center gap-2">
          <ShieldCheck size={16} /> Review, security, analytics, and credits in one flow.
        </span>
      </div>
    </footer>
  );
}
