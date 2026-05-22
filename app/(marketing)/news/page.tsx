import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/shared/Footer";
import { NewsCategoryFilter } from "@/components/marketing/NewsCategoryFilter";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News — SpringBloom",
  description: "The latest updates, community spotlights, guides, and announcements from the SpringBloom team.",
};

export type NewsArticleRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  cover_gradient: string;
  published_at: string;
};

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("id, title, slug, category, excerpt, cover_gradient, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const rows: NewsArticleRow[] = articles ?? [];

  const featured = rows[0];
  const latest = rows.slice(1, 5);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  }

  return (
    <main className="page-shell">
      <Navbar />

      <div className="container news-page">

        {/* ── Featured / Hero article ── */}
        {featured ? (
          <section className="news-hero">
            <div className="news-hero-text">
              <p className="news-hero-date">{formatDate(featured.published_at)}</p>
              <h1 className="news-hero-title">{featured.title}</h1>
              <p className="news-hero-excerpt">{featured.excerpt}</p>
              <a className="news-read-more" href={`/news/${featured.slug}`}>
                Read more <ArrowRight size={15} />
              </a>
            </div>
            <div
              aria-hidden
              className="news-hero-cover"
              style={{ background: featured.cover_gradient }}
            >
              <div className="news-hero-cover-inner">
                <span className="news-hero-cover-label">SpringBloom</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="news-hero">
            <div className="news-hero-text">
              <h1 className="news-hero-title">No articles yet.</h1>
              <p className="news-hero-excerpt">Check back soon — announcements and guides are on the way.</p>
            </div>
          </section>
        )}

        {latest.length > 0 && (
          <>
            <hr className="news-divider" />
            {/* ── Latest News horizontal strip ── */}
            <section className="news-latest-section">
              <h2 className="news-section-heading">Latest News</h2>
              <div className="news-latest-strip">
                {latest.map((article) => (
                  <a className="news-latest-card" href={`/news/${article.slug}`} key={article.id}>
                    <div
                      aria-hidden
                      className="news-latest-cover"
                      style={{ background: article.cover_gradient }}
                    />
                    <p className="news-latest-title">{article.title}</p>
                    <p className="news-latest-date">{formatDate(article.published_at)}</p>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}

        {rows.length > 0 && (
          <>
            <hr className="news-divider" />
            {/* ── Category filter + grid (client component) ── */}
            <section className="news-browse-section">
              <h2 className="news-section-heading">Category</h2>
              <NewsCategoryFilter articles={rows} />
            </section>
          </>
        )}

      </div>

      <Footer />
    </main>
  );
}
