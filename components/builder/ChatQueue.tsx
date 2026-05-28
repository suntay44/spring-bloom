"use client"

/**
 * R4-7: Chat Queue (Lovable-style).
 *
 * Sits above the composer. Users can stack messages while the AI is streaming.
 * When the current run finishes (status='ready' && queue.length > 0), the
 * head is shifted and dispatched automatically.
 *
 * Per-item context menu: Edit, Copy, Repeat, Remove.
 * Header controls: clear-all, play-now, minimize.
 *
 * State is owned by the parent (ChatPanel) — this component is presentational
 * + handler-driven. Persistence is the parent's job (localStorage in ChatPanel).
 */

import { useEffect, useRef, useState } from "react"
import {
  ArrowDown, ArrowUp, ChevronDown, ChevronUp, Copy, GripVertical, MoreVertical,
  Pencil, Play, RotateCw, Trash2, X,
} from "lucide-react"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export interface QueueItem {
  id:   string
  text: string
}

interface ChatQueueProps {
  items:           QueueItem[]
  // Mutation handlers — parent owns state
  onRemove:        (id: string) => void
  onEdit:          (id: string, newText: string) => void
  onMoveUp:        (id: string) => void
  onMoveDown:      (id: string) => void
  onReorder:       (newIds: string[]) => void
  onClear:         () => void
  /** Play-now: pop the head NOW (interrupting current?) — caller decides. */
  onPlayNow:       () => void
  /** Repeat: re-queue this item as a new entry at the tail. */
  onRepeat:        (id: string) => void
}

export function ChatQueue({
  items, onRemove, onEdit, onMoveUp, onMoveDown, onReorder, onClear, onPlayNow, onRepeat,
}: ChatQueueProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = [...items]
    const [moved] = next.splice(oldIndex, 1)
    if (moved) next.splice(newIndex, 0, moved)
    onReorder(next.map((i) => i.id))
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 mb-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-200">Queue</span>
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-200 px-1.5">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button" title="Clear queue"
            onClick={() => { if (confirm(`Clear ${items.length} queued message${items.length === 1 ? '' : 's'}?`)) onClear() }}
            className="text-zinc-500 hover:text-red-300 p-1 rounded transition-colors"
          >
            <X size={11} />
          </button>
          <button
            type="button" title="Play next now"
            onClick={onPlayNow}
            className="text-zinc-500 hover:text-emerald-300 p-1 rounded transition-colors"
          >
            <Play size={11} />
          </button>
          <button
            type="button" title={collapsed ? 'Expand' : 'Minimize'}
            onClick={() => setCollapsed((c) => !c)}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded transition-colors"
          >
            {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
        </div>
      </div>

      {/* List */}
      {!collapsed && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="max-h-44 overflow-y-auto">
              {items.map((item, idx) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  isFirst={idx === 0}
                  isLast={idx === items.length - 1}
                  editing={editingId === item.id}
                  onStartEdit={() => setEditingId(item.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={(newText) => { onEdit(item.id, newText); setEditingId(null) }}
                  onRemove={() => onRemove(item.id)}
                  onMoveUp={() => onMoveUp(item.id)}
                  onMoveDown={() => onMoveDown(item.id)}
                  onRepeat={() => onRepeat(item.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ─── Queue Row ──────────────────────────────────────────────────────────────

function QueueRow({
  item, isFirst, isLast, editing, onStartEdit, onCancelEdit, onSaveEdit,
  onRemove, onMoveUp, onMoveDown, onRepeat,
}: {
  item:         QueueItem
  isFirst:      boolean
  isLast:       boolean
  editing:      boolean
  onStartEdit:  () => void
  onCancelEdit: () => void
  onSaveEdit:   (newText: string) => void
  onRemove:     () => void
  onMoveUp:     () => void
  onMoveDown:   () => void
  onRepeat:     () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [draft, setDraft]       = useState(item.text)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // R5-5: drag-reorder via @dnd-kit
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  // Reset draft when entering edit mode
  useEffect(() => { if (editing) setDraft(item.text) }, [editing, item.text])

  function copyToClipboard() {
    void navigator.clipboard.writeText(item.text)
    setMenuOpen(false)
  }

  if (editing) {
    return (
      <li ref={setNodeRef} style={dragStyle} className="px-2 py-2 border-b border-zinc-800/60 last:border-0 bg-violet-500/5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          rows={3}
          className="w-full px-2 py-1.5 text-[12px] bg-black/40 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-violet-500/40 resize-vertical"
        />
        <div className="flex items-center justify-end gap-2 mt-1.5">
          <button type="button" onClick={onCancelEdit}
            className="text-[11px] text-zinc-500 hover:text-zinc-200 px-2 py-0.5 rounded">Cancel</button>
          <button type="button" onClick={() => onSaveEdit(draft)}
            disabled={!draft.trim()}
            className="text-[11px] font-semibold text-white bg-violet-600 hover:bg-violet-500 px-2.5 py-0.5 rounded disabled:opacity-50">Save</button>
        </div>
      </li>
    )
  }

  return (
    <li ref={setNodeRef} style={dragStyle} className="flex items-center gap-1.5 px-2 py-1.5 border-b border-zinc-800/60 last:border-0 hover:bg-white/[0.02] group">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-zinc-700 group-hover:text-zinc-500 shrink-0 cursor-grab active:cursor-grabbing p-0.5"
        aria-label="Drag to reorder"
      >
        <GripVertical size={11} />
      </button>
      <span className="flex-1 min-w-0 text-[11.5px] text-zinc-300 truncate">{item.text}</span>
      <div className="relative shrink-0" ref={menuRef}>
        <button type="button" onClick={() => setMenuOpen((m) => !m)}
          className="text-zinc-500 hover:text-zinc-200 p-1 rounded transition-colors"
          title="Actions"
        >
          <MoreVertical size={11} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 bottom-full mb-1 z-20 w-36 rounded-md border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
            <MenuItem icon={<Pencil size={10} />} label="Edit"   onClick={() => { onStartEdit(); setMenuOpen(false) }} />
            <MenuItem icon={<Copy size={10} />}   label="Copy"   onClick={copyToClipboard} />
            <MenuItem icon={<RotateCw size={10} />} label="Repeat" onClick={() => { onRepeat(); setMenuOpen(false) }} />
            {!isFirst && <MenuItem icon={<ArrowUp size={10} />}   label="Move up"   onClick={() => { onMoveUp(); setMenuOpen(false) }} />}
            {!isLast  && <MenuItem icon={<ArrowDown size={10} />} label="Move down" onClick={() => { onMoveDown(); setMenuOpen(false) }} />}
            <MenuItem icon={<Trash2 size={10} />} label="Remove" onClick={() => { onRemove(); setMenuOpen(false) }} danger />
          </div>
        )}
      </div>
    </li>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-left transition-colors ${
        danger ? 'text-red-300 hover:bg-red-500/10' : 'text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      <span className={danger ? 'text-red-400' : 'text-zinc-500'}>{icon}</span>
      {label}
    </button>
  )
}
