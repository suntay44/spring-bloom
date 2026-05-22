import { requireAdminPage } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewsAdminClient } from "@/components/admin/NewsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  await requireAdminPage();

  const supabase = createAdminClient();
  const { data: articles } = await supabase
    .from("news_articles")
    .select("*")
    .order("published_at", { ascending: false });

  return <NewsAdminClient initialArticles={articles ?? []} />;
}
