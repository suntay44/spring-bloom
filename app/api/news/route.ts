import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Public: returns all published articles ordered newest-first */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title, slug, category, excerpt, cover_gradient, published_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
