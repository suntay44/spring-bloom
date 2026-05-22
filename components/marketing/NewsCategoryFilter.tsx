"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { NEWS_ARTICLES, NEWS_CATEGORIES, type NewsCategory } from "@/lib/mock/news";

export function NewsCategoryFilter() {
  const [active, setActive] = useState<NewsCategory | "All">("All");

  const filtered = active === "All"
    ? NEWS_ARTICLES
    : NEWS_ARTICLES.filter((a) => a.category === active);

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
      <div className="news-grid">
        {filtered.map((article) => (
          <article className="news-card" key={article.id}>
            <div
              className="news-card-cover"
              style={{ background: article.coverGradient }}
              aria-hidden
            />
            <div className="news-card-body">
              <span className="news-card-cat">{article.category}</span>
              <h3 className="news-card-title">{article.title}</h3>
              <p className="news-card-date">{article.date}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
