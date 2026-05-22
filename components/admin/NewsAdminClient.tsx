"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, X, Check, Loader2, Globe, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  cover_gradient: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ["Community", "Talents", "FAQs", "Updates", "Policy"] as const;

const GRADIENT_PRESETS = [
  { label: "Purple", value: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#a78bfa 100%)" },
  { label: "Blue",   value: "linear-gradient(135deg,#0c4a6e 0%,#0284c7 50%,#38bdf8 100%)" },
  { label: "Green",  value: "linear-gradient(135deg,#064e3b 0%,#059669 50%,#34d399 100%)" },
  { label: "Orange", value: "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#fb923c 100%)" },
  { label: "Indigo", value: "linear-gradient(135deg,#1e1b4b 0%,#4f46e5 50%,#818cf8 100%)" },
  { label: "Sky",    value: "linear-gradient(135deg,#172554 0%,#1d4ed8 50%,#60a5fa 100%)" },
  { label: "Gray",   value: "linear-gradient(135deg,#3f3f46 0%,#71717a 50%,#d4d4d8 100%)" },
  { label: "Pink",   value: "linear-gradient(135deg,#4a044e 0%,#a21caf 50%,#e879f9 100%)" },
  { label: "Teal",   value: "linear-gradient(135deg,#052e16 0%,#16a34a 50%,#86efac 100%)" },
];

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type FormState = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  cover_gradient: string;
  is_published: boolean;
  published_at: string;
};

const BLANK: FormState = {
  title: "",
  slug: "",
  category: "Updates",
  excerpt: "",
  cover_gradient: GRADIENT_PRESETS[0]!.value,
  is_published: true,
  published_at: new Date().toISOString().slice(0, 16),
};

type PanelMode = "create" | "edit";

type Props = { initialArticles: NewsArticle[] };

export function NewsAdminClient({ initialArticles }: Props) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...BLANK, published_at: new Date().toISOString().slice(0, 16) });
    setSlugManual(false);
    setEditingId(null);
    setPanelMode("create");
    setError(null);
    setPanelOpen(true);
  }

  function openEdit(article: NewsArticle) {
    setForm({
      title: article.title,
      slug: article.slug,
      category: article.category,
      excerpt: article.excerpt,
      cover_gradient: article.cover_gradient,
      is_published: article.is_published,
      published_at: new Date(article.published_at).toISOString().slice(0, 16),
    });
    setSlugManual(true);
    setEditingId(article.id);
    setPanelMode("edit");
    setError(null);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: slugManual ? f.slug : slugify(title),
    }));
  }

  // ── submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (panelMode === "create") {
        const res = await fetch("/api/admin/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create article");
        const created: NewsArticle = await res.json();
        setArticles((prev) => [created, ...prev]);
      } else {
        const res = await fetch(`/api/admin/news/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update article");
        const updated: NewsArticle = await res.json();
        setArticles((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
      }
      closePanel();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  // ── toggle publish ────────────────────────────────────────────────────────

  async function togglePublish(article: NewsArticle) {
    const res = await fetch(`/api/admin/news/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !article.is_published }),
    });
    if (res.ok) {
      const updated: NewsArticle = await res.json();
      setArticles((prev) => prev.map((a) => (a.id === article.id ? updated : a)));
    }
  }

  // ── delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) closePanel();
    }
    setDeleting(null);
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">News Articles</h1>
          <p className="text-sm text-zinc-500">{articles.length} article{articles.length !== 1 ? "s" : ""} total</p>
        </div>
        <Button onClick={openCreate} type="button">
          <Plus size={14} /> New Article
        </Button>
      </div>

      {/* Article list */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileText size={32} className="text-zinc-700" />
            <p className="text-sm text-zinc-500">No articles yet. Create your first one.</p>
            <Button onClick={openCreate} type="button" variant="outline">
              <Plus size={14} /> New Article
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 w-8" />
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Title</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Category</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Published</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {articles.map((article) => (
                <tr key={article.id} className="group hover:bg-zinc-800/40 transition-colors">
                  {/* Color swatch */}
                  <td className="px-4 py-3">
                    <div
                      className="w-5 h-5 rounded"
                      style={{ background: article.cover_gradient }}
                      title={article.cover_gradient}
                    />
                  </td>
                  {/* Title + slug */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-white truncate max-w-xs" title={article.title}>
                      {article.title}
                    </p>
                    <p className="text-xs text-zinc-600 truncate max-w-xs">/{article.slug}</p>
                  </td>
                  {/* Category */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                      {article.category}
                    </span>
                  </td>
                  {/* Date */}
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {formatDate(article.published_at)}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    {article.is_published ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 inline-block" />
                        Draft
                      </span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                        onClick={() => togglePublish(article)}
                        title={article.is_published ? "Unpublish" : "Publish"}
                        type="button"
                      >
                        {article.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                        onClick={() => openEdit(article)}
                        title="Edit"
                        type="button"
                      >
                        <Pencil size={14} />
                      </button>
                      <a
                        className="rounded p-1.5 text-zinc-500 hover:bg-zinc-700 hover:text-white transition-colors"
                        href={`/news`}
                        rel="noopener noreferrer"
                        target="_blank"
                        title="View on site"
                      >
                        <Globe size={14} />
                      </a>
                      <button
                        className="rounded p-1.5 text-zinc-500 hover:bg-red-900/60 hover:text-red-400 transition-colors"
                        disabled={deleting === article.id}
                        onClick={() => handleDelete(article.id)}
                        title="Delete"
                        type="button"
                      >
                        {deleting === article.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Slide-over panel ── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closePanel}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-base font-semibold text-white">
                {panelMode === "create" ? "New Article" : "Edit Article"}
              </h2>
              <button
                className="rounded p-1.5 text-zinc-500 hover:text-white transition-colors"
                onClick={closePanel}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form className="flex flex-1 flex-col overflow-y-auto" onSubmit={handleSubmit}>
              <div className="flex flex-1 flex-col gap-5 px-6 py-5">

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Title *
                  </label>
                  <input
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none"
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Launching SpringBloom: From Idea to Production"
                    required
                    type="text"
                    value={form.title}
                  />
                </div>

                {/* Slug */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Slug *
                  </label>
                  <div className="flex items-center gap-0 rounded-md border border-zinc-700 bg-zinc-900 focus-within:border-purple-500 overflow-hidden">
                    <span className="px-3 py-2 text-sm text-zinc-600 border-r border-zinc-700 bg-zinc-800 select-none">
                      /news/
                    </span>
                    <input
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none"
                      onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
                      placeholder="my-article-slug"
                      required
                      type="text"
                      value={form.slug}
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Category *
                  </label>
                  <select
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    value={form.category}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Excerpt */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Excerpt
                  </label>
                  <textarea
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none resize-none"
                    onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                    placeholder="A short description shown in article cards…"
                    rows={3}
                    value={form.excerpt}
                  />
                </div>

                {/* Cover gradient */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Cover Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GRADIENT_PRESETS.map((g) => (
                      <button
                        key={g.label}
                        className={[
                          "relative h-8 w-8 rounded-full border-2 transition-all",
                          form.cover_gradient === g.value
                            ? "border-white scale-110"
                            : "border-transparent hover:scale-105",
                        ].join(" ")}
                        onClick={() => setForm((f) => ({ ...f, cover_gradient: g.value }))}
                        style={{ background: g.value }}
                        title={g.label}
                        type="button"
                      >
                        {form.cover_gradient === g.value && (
                          <Check size={12} className="absolute inset-0 m-auto text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Preview */}
                  <div
                    className="mt-1 h-14 rounded-md flex items-end p-3"
                    style={{ background: form.cover_gradient }}
                  >
                    <span className="text-xs font-semibold text-white/80">Preview</span>
                  </div>
                </div>

                {/* Published at */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Publish Date
                  </label>
                  <input
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                    onChange={(e) => setForm((f) => ({ ...f, published_at: e.target.value }))}
                    type="datetime-local"
                    value={form.published_at}
                  />
                </div>

                {/* Published toggle */}
                <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Publish immediately</p>
                    <p className="text-xs text-zinc-500">Visible on the public /news page</p>
                  </div>
                  <button
                    className={[
                      "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
                      form.is_published ? "bg-purple-600" : "bg-zinc-700",
                    ].join(" ")}
                    onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                    role="switch"
                    aria-checked={form.is_published}
                    type="button"
                  >
                    <span
                      className={[
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200",
                        form.is_published ? "translate-x-5" : "translate-x-0",
                      ].join(" ")}
                    />
                  </button>
                </div>

                {error && (
                  <p className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                    {error}
                  </p>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 border-t border-zinc-800 px-6 py-4">
                <Button onClick={closePanel} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={saving} type="submit">
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  ) : (
                    <><Check size={14} /> {panelMode === "create" ? "Create Article" : "Save Changes"}</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
