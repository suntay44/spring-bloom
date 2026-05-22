import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/shared/Footer";
import { NewsCategoryFilter } from "@/components/marketing/NewsCategoryFilter";
import { FEATURED_ARTICLE, LATEST_ARTICLES } from "@/lib/mock/news";

export const metadata: Metadata = {
  title: "News — SpringBloom",
  description: "The latest updates, community spotlights, guides, and announcements from the SpringBloom team.",
};

export default function NewsPage() {
  return (
    <main className="page-shell">
      <Navbar />

      <div className="container news-page">

        {/* ── Featured / Hero article ── */}
        <section className="news-hero">
          <div className="news-hero-text">
            <p className="news-hero-date">{FEATURED_ARTICLE.date}</p>
            <h1 className="news-hero-title">{FEATURED_ARTICLE.title}</h1>
            <p className="news-hero-excerpt">{FEATURED_ARTICLE.excerpt}</p>
            <a className="news-read-more" href={`/news/${FEATURED_ARTICLE.slug}`}>
              Read more <ArrowRight size={15} />
            </a>
          </div>
          <div
            className="news-hero-cover"
            style={{ background: FEATURED_ARTICLE.coverGradient }}
            aria-hidden
          >
            <div className="news-hero-cover-inner">
              <span className="news-hero-cover-label">SpringBloom</span>
            </div>
          </div>
        </section>

        <hr className="news-divider" />

        {/* ── Latest News horizontal strip ── */}
        <section className="news-latest-section">
          <h2 className="news-section-heading">Latest News</h2>
          <div className="news-latest-strip">
            {LATEST_ARTICLES.map((article) => (
              <a className="news-latest-card" href={`/news/${article.slug}`} key={article.id}>
                <div
                  className="news-latest-cover"
                  style={{ background: article.coverGradient }}
                  aria-hidden
                />
                <p className="news-latest-title">{article.title}</p>
                <p className="news-latest-date">{article.date}</p>
              </a>
            ))}
          </div>
        </section>

        <hr className="news-divider" />

        {/* ── Category filter + grid (client component) ── */}
        <section className="news-browse-section">
          <h2 className="news-section-heading">Category</h2>
          <NewsCategoryFilter />
        </section>

      </div>

      <Footer />
    </main>
  );
}
