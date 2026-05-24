"use client"

import { useState } from "react"
import { Check, FileText, Loader2, Pencil, X } from "lucide-react"

export interface PlanCardProps {
  /** The plan markdown produced by the AI */
  initialMarkdown: string
  /** Called when the user clicks "Approve & Build" — receives the (possibly edited) markdown */
  onApprove: (markdown: string) => Promise<void> | void
  /** Called when the user discards the plan */
  onDiscard: () => void
  /** Read-only state after the plan has been approved/executed */
  readOnly?: boolean
  /** Status label shown above the card */
  status?: 'draft' | 'approved' | 'executed' | 'discarded'
}

export function PlanCard({
  initialMarkdown, onApprove, onDiscard, readOnly, status = 'draft',
}: PlanCardProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleApprove() {
    setSubmitting(true)
    try {
      await onApprove(markdown)
    } finally {
      setSubmitting(false)
    }
  }

  const showActions = !readOnly && status === 'draft'

  return (
    <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/30 to-zinc-900/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-violet-500/20 bg-violet-950/20">
        <div className="flex items-center gap-2">
          <FileText size={12} className="text-violet-300" />
          <span className="text-[11px] font-semibold text-violet-200 uppercase tracking-wider">Plan</span>
          {status === 'approved' && (
            <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
              <Check size={10} /> Approved
            </span>
          )}
          {status === 'executed' && (
            <span className="text-[10px] text-zinc-500 font-semibold">Executed</span>
          )}
          {status === 'discarded' && (
            <span className="text-[10px] text-zinc-500 font-semibold">Discarded</span>
          )}
        </div>
        {showActions && (
          <button
            type="button"
            onClick={() => setEditing(e => !e)}
            className="text-[10px] text-violet-300 hover:text-violet-200 flex items-center gap-1"
          >
            <Pencil size={9} /> {editing ? 'Preview' : 'Edit'}
          </button>
        )}
      </div>

      {/* Body — editor or rendered markdown */}
      <div className="p-3">
        {editing ? (
          <textarea
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            rows={12}
            className="w-full font-mono text-[11px] text-zinc-200 bg-black/40 border border-zinc-800 rounded-md p-2.5 leading-relaxed resize-vertical focus:outline-none focus:border-violet-500/40"
            placeholder="Plan markdown…"
          />
        ) : (
          <PlanMarkdownPreview markdown={markdown} />
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-violet-500/15 bg-black/20">
          <button
            type="button"
            onClick={onDiscard}
            disabled={submitting}
            className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors disabled:opacity-50"
          >
            <X size={11} /> Discard
          </button>
          <button
            type="button"
            onClick={() => void handleApprove()}
            disabled={submitting}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Approve &amp; Build
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Minimal markdown renderer (headings + lists + code blocks) ────────────

function PlanMarkdownPreview({ markdown }: { markdown: string }) {
  // Light-weight rendering — split on lines, treat # / ## / - / 1. specially.
  // Avoids pulling in a full markdown lib for what is mostly a plan outline.
  const lines = markdown.split('\n')
  const out: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []
  let listBuffer: React.ReactNode[] = []
  let key = 0

  const flushList = () => {
    if (listBuffer.length === 0) return
    out.push(
      <ul key={`l-${key++}`} className="list-disc pl-5 text-[11.5px] text-zinc-300 space-y-1 my-1">
        {listBuffer}
      </ul>,
    )
    listBuffer = []
  }

  const flushCode = () => {
    if (codeBuffer.length === 0) return
    out.push(
      <pre key={`c-${key++}`} className="bg-black/50 border border-zinc-800 rounded-md p-2 my-2 text-[10.5px] font-mono text-zinc-300 overflow-x-auto">
        {codeBuffer.join('\n')}
      </pre>,
    )
    codeBuffer = []
  }

  for (const raw of lines) {
    const line = raw

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode()
        inCodeBlock = false
      } else {
        flushList()
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }
    if (/^#{1,3}\s/.test(line)) {
      flushList()
      const level = line.match(/^(#+)/)?.[1]?.length ?? 1
      const text = line.replace(/^#+\s*/, '')
      const size = level === 1 ? 'text-sm font-bold' : level === 2 ? 'text-[12.5px] font-bold' : 'text-[11.5px] font-semibold'
      out.push(<p key={`h-${key++}`} className={`${size} text-violet-100 mt-2 mb-1`}>{text}</p>)
      continue
    }
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const text = line.replace(/^\s*([-*]|\d+\.)\s+/, '')
      listBuffer.push(<li key={`li-${key++}`}>{text}</li>)
      continue
    }
    if (line.trim() === '') {
      flushList()
      continue
    }
    flushList()
    out.push(<p key={`p-${key++}`} className="text-[11.5px] text-zinc-300 leading-relaxed my-1">{line}</p>)
  }
  flushList()
  flushCode()

  return <div>{out}</div>
}
