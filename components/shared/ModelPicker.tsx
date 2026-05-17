"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import type { AIModel } from "@/lib/mock/data";

// ── Provider logos (PNG) ───────────────────────────────────────────────────

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: "/logos/anthropic.png",
  openai:    "/logos/openai.png",
  google:    "/logos/gemini.png",
};

function ProviderLogo({ providerId, size = 16 }: { providerId: string; size?: number }) {
  const src = PROVIDER_LOGOS[providerId];
  if (!src) return null;
  return (
    <img
      alt={providerId}
      className="object-contain"
      src={src}
      style={{ width: size, height: size }}
    />
  );
}

// ── Provider config ────────────────────────────────────────────────────────

type Provider = { id: string; label: string };

const PROVIDERS: Provider[] = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai",    label: "OpenAI" },
  { id: "google",    label: "Gemini" },
];

// ── Badge colours ──────────────────────────────────────────────────────────

function badgeClass(caption: string): string {
  const c = caption.toLowerCase();
  if (c.includes("most capable"))   return "bg-violet-600/20 text-violet-300";
  if (c.includes("highly capable")) return "bg-violet-500/15 text-violet-400";
  if (c.includes("capable"))        return "bg-indigo-600/20 text-indigo-300";
  if (c.includes("latest"))         return "bg-blue-600/20 text-blue-300";
  if (c.includes("balanced"))       return "bg-slate-600/30 text-slate-300";
  if (c.includes("code"))           return "bg-amber-600/20 text-amber-300";
  if (c.includes("fast"))           return "bg-emerald-600/20 text-emerald-300";
  return "bg-zinc-700/40 text-zinc-400";
}

// ── Component ──────────────────────────────────────────────────────────────

type Props = { model: AIModel; models: AIModel[]; onChange: (model: AIModel) => void };

export function ModelPicker({ model, models, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveProvider(null);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const grouped = models.reduce<Record<string, AIModel[]>>((acc, m) => {
    acc[m.provider] = [...(acc[m.provider] ?? []), m];
    return acc;
  }, {});

  function select(m: AIModel) {
    onChange(m);
    setOpen(false);
    setActiveProvider(null);
  }

  const currentProvider = PROVIDERS.find((p) => p.id === model.provider);

  return (
    <div className="relative" ref={ref}>

      {/* ── Trigger ── */}
      <button
        className="pill flex cursor-pointer items-center gap-1.5"
        onClick={() => { setOpen((v) => !v); setActiveProvider(null); }}
        type="button"
      >
        {currentProvider ? <ProviderLogo providerId={currentProvider.id} size={13} /> : null}
        <span>{model.label}</span>
      </button>

      {/* ── Dropdown ── */}
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">

          {!activeProvider ? (
            /* Level 1 — provider list */
            <div className="p-1">
              <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Select provider
              </p>
              {PROVIDERS.filter((p) => (grouped[p.id]?.length ?? 0) > 0).map((p) => {
                const count = grouped[p.id]?.length ?? 0;
                const isCurrent = model.provider === p.id;
                return (
                  <button
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${isCurrent ? "bg-zinc-800/60" : ""}`}
                    key={p.id}
                    onClick={() => setActiveProvider(p.id)}
                    type="button"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800">
                      <ProviderLogo providerId={p.id} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-xs text-zinc-500">{count} {count === 1 ? "model" : "models"}</p>
                    </div>
                    <ChevronRight className="shrink-0 text-zinc-600" size={14} />
                  </button>
                );
              })}
            </div>
          ) : (
            /* Level 2 — model list */
            <div className="p-1">
              {/* Back button */}
              {(() => {
                const p = PROVIDERS.find((pr) => pr.id === activeProvider);
                return (
                  <button
                    className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                    onClick={() => setActiveProvider(null)}
                    type="button"
                  >
                    <ArrowLeft size={13} />
                    {p ? (
                      <span className="flex items-center gap-1.5">
                        <ProviderLogo providerId={p.id} size={12} /> {p.label}
                      </span>
                    ) : null}
                  </button>
                );
              })()}

              <div className="border-t border-zinc-800 pt-1">
                {(grouped[activeProvider] ?? []).map((m) => {
                  const isSelected = model.id === m.id;
                  return (
                    <button
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${isSelected ? "bg-zinc-800" : ""}`}
                      key={m.id}
                      onClick={() => select(m)}
                      type="button"
                    >
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-tight ${badgeClass(m.caption)}`}>
                        {m.caption}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.label}</span>
                      {isSelected ? <Check className="shrink-0 text-violet-400" size={14} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
