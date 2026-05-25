"use client"

import { useState } from "react"
import { Bot, Brain, FileText, Info, Pencil } from "lucide-react"
import type { BuilderMode } from "@/lib/ai/model-router"

interface ModeToggleProps {
  mode:              BuilderMode
  onChange:          (mode: BuilderMode) => void
  deepThink:         boolean
  onDeepThinkChange: (value: boolean) => void
  disabled?:         boolean
}

const MODES: Array<{
  id:          BuilderMode
  label:       string
  icon:        typeof Bot
  description: string
  costHint:    string
}> = [
  {
    id: 'plan',
    label: 'Plan',
    icon: FileText,
    description: 'Produce an editable plan first. No code is written until you approve.',
    costHint: '1×',
  },
  {
    id: 'agent',
    label: 'Agent',
    icon: Bot,
    description: 'Write code, run tests, iterate on failures. Default.',
    costHint: '1×',
  },
  {
    id: 'code',
    label: 'Code',
    icon: Pencil,
    description: 'Fast diff-only edits. No prose, smallest model.',
    costHint: '~⅕×',
  },
]

export function ModeToggle({
  mode, onChange, deepThink, onDeepThinkChange, disabled,
}: ModeToggleProps) {
  return (
    <div className="inline-flex items-center gap-2">
      {/* Three-segment mode toggle */}
      <div
        className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5"
        role="radiogroup"
        aria-label="Builder mode"
      >
        {MODES.map(m => {
          const Icon = m.icon
          const active = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(m.id)}
              title={`${m.description} (${m.costHint} cost)`}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all",
                active
                  ? m.id === 'plan'
                    ? "bg-violet-600/25 text-violet-200 border border-violet-500/40"
                    : m.id === 'code'
                    ? "bg-amber-600/20 text-amber-200 border border-amber-500/30"
                    : "bg-zinc-700 text-zinc-100 border border-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 border border-transparent",
                disabled && "opacity-50 cursor-not-allowed",
              ].filter(Boolean).join(' ')}
            >
              <Icon size={11} />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Deep think — only visible in Plan mode */}
      {mode === 'plan' && (
        <DeepThinkToggle
          checked={deepThink}
          onChange={onDeepThinkChange}
          disabled={disabled}
        />
      )}
    </div>
  )
}

// ─── Deep Think Toggle ────────────────────────────────────────────────────

function DeepThinkToggle({
  checked, onChange, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="relative inline-flex items-center gap-1">
      <label
        className={[
          "inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md border cursor-pointer select-none transition-colors",
          checked
            ? "border-violet-500/40 bg-violet-600/15 text-violet-200"
            : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700",
          disabled && "opacity-50 cursor-not-allowed",
        ].filter(Boolean).join(' ')}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        <Brain size={11} />
        Deep think
      </label>

      {/* Info icon — click or hover to show tooltip */}
      <button
        type="button"
        aria-label="What is Deep think?"
        onClick={() => setShowInfo(s => !s)}
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        onBlur={() => setShowInfo(false)}
        className="text-zinc-500 hover:text-violet-300 p-0.5 rounded transition-colors"
      >
        <Info size={11} />
      </button>

      {showInfo && (
        <div
          role="tooltip"
          className="absolute bottom-full right-0 mb-2 w-64 z-50 rounded-lg border border-violet-500/30 bg-zinc-900 shadow-xl p-3 text-[11px] leading-relaxed text-zinc-300"
        >
          <p className="font-semibold text-violet-200 mb-1 flex items-center gap-1">
            <Brain size={11} /> Deep think
          </p>
          <p className="mb-2">
            Routes your plan through a <strong>reasoning-tier model</strong> (Claude Opus / GPT-5 / Gemini 2.5 Pro)
            for deeper architectural thinking.
          </p>
          <p className="text-amber-300 font-medium">
            ⚠ Costs ~5× a normal message — only use for non-trivial planning.
          </p>
          <p className="mt-2 text-zinc-500 text-[10.5px]">
            Off by default. Use it when the plan really matters (DB schema design, migrations, refactors).
          </p>
          <span className="absolute -bottom-1 right-3 w-2 h-2 rotate-45 bg-zinc-900 border-r border-b border-violet-500/30" />
        </div>
      )}
    </div>
  )
}
