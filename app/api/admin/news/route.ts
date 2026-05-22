import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin/require-admin";

/** Admin: list ALL articles (including drafts), newest first */
export async function GET() {
  const result = await requireAdminApi();
  if ("error" in result) return result.error;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** Admin: create a new article */
export async function POST(req: NextRequest) {
  const result = await requireAdminApi();
  if ("error" in result) return result.error;

  const body = await req.json();
  const { title, slug, category, excerpt, cover_gradient, is_published, published_at } = body;

  if (!title || !slug || !category) {
    return NextResponse.json({ error: "title, slug, and category are required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("news_articles")
    .insert({
      title,
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      category,
      excerpt: excerpt ?? "",
      cover_gradient: cover_gradient ?? "linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#a78bfa 100%)",
      is_published: is_published ?? true,
      published_at: published_at ? new Date(published_at).toISOString() : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
