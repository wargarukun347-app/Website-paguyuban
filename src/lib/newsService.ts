import { supabase } from "./supabase";

export async function getPublishedNews() {
  return supabase
    .from("news")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
}

export async function getNewsBySlug(slug: string) {
  return supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
}

export async function searchPublishedNews(query: string) {
  const value = query.trim();

  if (!value) {
    return getPublishedNews();
  }

  return supabase
    .from("news")
    .select("*")
    .eq("status", "published")
    .or(
      `title.ilike.%${value}%,excerpt.ilike.%${value}%,content.ilike.%${value}%`
    )
    .order("published_at", { ascending: false });
}
