import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/admin/require-admin";

type Params = { params: Promise<{ id: string }> };

/** Admin: update an article */
export async function PATCH(req: NextRequest, { params }: Params) {
  const result = await requireAdminApi();
  if ("error" in result) return result.error;

  const { id } = await params;
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined)          patch.title = body.title;
  if (body.slug !== undefined)           patch.slug = body.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (body.category !== undefined)       patch.category = body.category;
  if (body.excerpt !== undefined)        patch.excerpt = body.excerpt;
  if (body.cover_gradient !== undefined) patch.cover_gradient = body.cover_gradient;
  if (body.is_published !== undefined)   patch.is_published = body.is_published;
  if (body.published_at !== undefined)   patch.published_at = new Date(body.published_at).toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("news_articles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** Admin: delete an article */
export async function DELETE(req: NextRequest, { params }: Params) {
  const result = await requireAdminApi();
  if ("error" in result) return result.error;

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("news_articles")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
