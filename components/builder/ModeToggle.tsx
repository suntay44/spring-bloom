"use client"

import { Bot, FileText, Pencil } from "lucide-react"
import type { BuilderMode } from "@/lib/ai/model-router"

interface ModeToggleProps {
  mode:        BuilderMode
  onChange:    (mode: BuilderMode) => void
  disabled?:   boolean
}

const MODES: Array<{
  id:         BuilderMode
  label:      string
  icon:       typeof Bot
  description: string
  costHint:   string
}> = [
  {
    id: 'plan',
    label: 'Plan',
    icon: FileText,
    description: 'Produce an editable plan first. No code is written until you approve.',
    costHint: '~4×',
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

export function ModeToggle({ mode, onChange, disabled }: ModeToggleProps) {
  return (
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
  )
}
