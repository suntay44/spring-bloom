"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import type { AIModel } from "@/lib/mock/data";

// ── Provider logos (PNG) ───────────────────────────────────────────────────

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: "/logos/anthropic.png",
  openai:    "/logos/openai.png",
  google:    "/logos/gemini.png",
};

// OpenAI's logo is black — needs a white background to be visible on dark UI
const PROVIDER_ICON_BG: Record<string, string> = {
  anthropic: "bg-zinc-800",
  openai:    "bg-white",
  google:    "bg-zinc-800",
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

// ── Component ──────────────────────────────────────────────────────────────

type Props = { model: AIModel; models: AIModel[]; onChange: (model: AIModel) => void };

export function ModelPicker({ model, models, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  // Position of the fixed dropdown relative to the trigger button
  const [dropPos, setDropPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Recalculate position whenever we open
  const recalc = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 6, left: r.left });
  }, []);

  function handleToggle() {
    if (!open) recalc();
    setOpen((v) => !v);
    setActiveProvider(null);
  }

  // Close on outside click or scroll/resize
  useEffect(() => {
    if (!open) return;
    function close() { setOpen(false); setActiveProvider(null); }
    function onOutside(e: MouseEvent) {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return;
      // Allow clicks inside the portal dropdown
      const portal = document.getElementById("model-picker-portal");
      if (portal && portal.contains(e.target as Node)) return;
      close();
    }
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

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

  const dropdown = open ? (
    <div
      id="model-picker-portal"
      className="fixed z-[9999] w-64 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
      style={{ top: dropPos.top, left: dropPos.left }}
    >
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
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${PROVIDER_ICON_BG[p.id] ?? "bg-zinc-800"}`}>
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
                    <span className={`inline-flex items-center justify-center rounded ${PROVIDER_ICON_BG[p.id] ?? "bg-zinc-800"} p-0.5`}>
                      <ProviderLogo providerId={p.id} size={12} />
                    </span>
                    {p.label}
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.label}</span>
                  {isSelected ? <Check className="shrink-0 text-violet-400" size={14} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="relative">
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        className="pill flex cursor-pointer items-center gap-1.5"
        onClick={handleToggle}
        type="button"
      >
        {currentProvider ? <ProviderLogo providerId={currentProvider.id} size={13} /> : null}
        <span>{model.label}</span>
      </button>

      {/* ── Dropdown rendered in a portal so no overflow:hidden can clip it ── */}
      {typeof document !== "undefined" ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
