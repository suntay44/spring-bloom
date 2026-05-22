export type NewsCategory = "Community" | "Talents" | "FAQs" | "Updates" | "Policy";

export interface NewsArticle {
  id: string;
  title: string;
  date: string;          // display string
  isoDate: string;       // for sorting
  category: NewsCategory;
  excerpt: string;
  slug: string;
  /** Gradient used as placeholder cover image */
  coverGradient: string;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  "Community",
  "Talents",
  "FAQs",
  "Updates",
  "Policy",
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "1",
    title: "Launching SpringBloom: From Idea to Production in Minutes",
    date: "May 21, 2026",
    isoDate: "2026-05-21",
    category: "Updates",
    excerpt: "Today we're publicly launching SpringBloom — the AI builder that briefs, builds, reviews, and ships alongside you. Here's what we built and why.",
    slug: "launching-springbloom",
    coverGradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)",
  },
  {
    id: "2",
    title: "Meet Agent SP 1: Your AI Development Partner",
    date: "May 20, 2026",
    isoDate: "2026-05-20",
    category: "Updates",
    excerpt: "Agent SP 1 is not a chatbot — it's a senior developer that briefs, builds, reviews, and ships production-ready code. Learn how it works under the hood.",
    slug: "meet-agent-sp1",
    coverGradient: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)",
  },
  {
    id: "3",
    title: "Guide for Independent Developers on SpringBloom",
    date: "May 19, 2026",
    isoDate: "2026-05-19",
    category: "Talents",
    excerpt: "Everything a solo developer needs to go from blank canvas to shipped app — scaffolding, auth, payments, and analytics in one platform.",
    slug: "guide-for-independent-developers",
    coverGradient: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)",
  },
  {
    id: "4",
    title: "How to Create Your Agency on SpringBloom",
    date: "May 18, 2026",
    isoDate: "2026-05-18",
    category: "Community",
    excerpt: "Agencies can now onboard clients, share live previews, manage credit attribution, and export to GitHub — all from a single SpringBloom workspace.",
    slug: "create-your-agency",
    coverGradient: "linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fb923c 100%)",
  },
  {
    id: "5",
    title: "SpringBloom Help Center: Top 10 Questions Answered",
    date: "May 17, 2026",
    isoDate: "2026-05-17",
    category: "FAQs",
    excerpt: "From credit estimates to Supabase RLS policies — the ten questions we get most from builders, answered in plain English.",
    slug: "help-center-top-questions",
    coverGradient: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 50%, #818cf8 100%)",
  },
  {
    id: "6",
    title: "Security Scanning: What Gets Checked and When",
    date: "May 16, 2026",
    isoDate: "2026-05-16",
    category: "Updates",
    excerpt: "A deep dive into how SpringBloom's security pipeline checks every diff for exposed secrets, missing RLS policies, CORS issues, and unsafe API patterns.",
    slug: "security-scanning-explained",
    coverGradient: "linear-gradient(135deg, #172554 0%, #1d4ed8 50%, #60a5fa 100%)",
  },
  {
    id: "7",
    title: "Acceptable Use Policy — What's Allowed on SpringBloom",
    date: "May 15, 2026",
    isoDate: "2026-05-15",
    category: "Policy",
    excerpt: "Our acceptable use policy sets clear boundaries for what SpringBloom can be used to build — and what it can't. Here's the full breakdown.",
    slug: "acceptable-use-policy",
    coverGradient: "linear-gradient(135deg, #3f3f46 0%, #71717a 50%, #d4d4d8 100%)",
  },
  {
    id: "8",
    title: "Credit Receipts: Full Transparency on Every Generation",
    date: "May 14, 2026",
    isoDate: "2026-05-14",
    category: "FAQs",
    excerpt: "Every SpringBloom task shows an estimate before it runs and a receipt after. Learn exactly how credits are calculated and where they go.",
    slug: "credit-receipts-explained",
    coverGradient: "linear-gradient(135deg, #4a044e 0%, #a21caf 50%, #e879f9 100%)",
  },
  {
    id: "9",
    title: "Community Spotlight: Apps Built This Month",
    date: "May 13, 2026",
    isoDate: "2026-05-13",
    category: "Community",
    excerpt: "A showcase of real apps shipped by the SpringBloom community this month — from SaaS dashboards to booking systems to e-commerce stores.",
    slug: "community-spotlight-may",
    coverGradient: "linear-gradient(135deg, #052e16 0%, #16a34a 50%, #86efac 100%)",
  },
];

/** The most recently published article is the featured hero item */
export const FEATURED_ARTICLE = NEWS_ARTICLES[0]!;
/** Next 4 for the "Latest News" horizontal strip */
export const LATEST_ARTICLES = NEWS_ARTICLES.slice(1, 5);
