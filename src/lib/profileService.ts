import { supabase } from "./supabase";

export async function getMyProfile() {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    return {
      profile: null,
      error: authError ?? new Error("User belum login."),
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", authData.user.id)
    .single();

  return {
    profile: data,
    error,
  };
}
