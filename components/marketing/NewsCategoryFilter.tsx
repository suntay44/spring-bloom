"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { NewsArticleRow } from "@/app/(marketing)/news/page";

const NEWS_CATEGORIES = ["Community", "Talents", "FAQs", "Updates", "Policy"] as const;
type NewsCategory = typeof NEWS_CATEGORIES[number];

type Props = {
  articles: NewsArticleRow[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export function NewsCategoryFilter({ articles }: Props) {
  const [active, setActive] = useState<NewsCategory | "All">("All");

  const filtered = active === "All"
    ? articles
    : articles.filter((a) => a.category === active);

  return (
    <>
      {/* ── Category tabs ── */}
      <div className="news-cat-tabs">
        <button
          className={`news-cat-tab ${active === "All" ? "news-cat-tab--active" : ""}`}
          onClick={() => setActive("All")}
          type="button"
        >
          All
        </button>
        {NEWS_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`news-cat-tab ${active === cat ? "news-cat-tab--active" : ""}`}
            onClick={() => setActive(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Article grid ── */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">No articles in this category yet.</p>
      ) : (
        <div className="news-grid">
          {filtered.map((article) => (
            <article className="news-card" key={article.id}>
              <div
                aria-hidden
                className="news-card-cover"
                style={{ background: article.cover_gradient }}
              />
              <div className="news-card-body">
                <span className="news-card-cat">{article.category}</span>
                <h3 className="news-card-title">{article.title}</h3>
                <p className="news-card-date">{formatDate(article.published_at)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
