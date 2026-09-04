import { supabase } from "./supabase";

export type NewsRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  featured_image?: string | null;
  category?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  status: "draft" | "published";
  author_id?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

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

  if (!value) return getPublishedNews();

  return supabase
    .from("news")
    .select("*")
    .eq("status", "published")
    .or(`title.ilike.%${value}%,excerpt.ilike.%${value}%,content.ilike.%${value}%`)
    .order("published_at", { ascending: false });
}

export async function getAdminNews() {
  return supabase
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });
}

export async function createNews(input: Omit<NewsRecord, "id" | "created_at" | "updated_at">) {
  return supabase.from("news").insert(input).select().single();
}

export async function updateNews(
  id: string,
  input: Partial<Omit<NewsRecord, "id" | "created_at" | "updated_at">>,
) {
  return supabase.from("news").update(input).eq("id", id).select().single();
}

export async function deleteNews(id: string) {
  return supabase.from("news").delete().eq("id", id);
}
