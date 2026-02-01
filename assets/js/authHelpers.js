import { getSupabase } from "./supabaseClient.js";

export async function fetchMyProfile(){
  const sb = getSupabase();
  const { data: sessionData, error: sErr } = await sb.auth.getSession();
  if(sErr) throw sErr;
  const session = sessionData.session;
  if(!session) return null;

  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, display_name, roblox_username, departments, is_staff, is_occ, is_instructor, is_admin")
    .eq("id", session.user.id)
    .maybeSingle();

  if(error) throw error;
  return { session, profile: data };
}

export function routeByProfile(profile){
  if(!profile) return "/login.html";
  if(profile.is_admin || profile.is_occ) return "/occ/index.html";
  if(profile.is_instructor) return "/instructors/index.html";
  if(profile.is_staff) return "/staff/index.html";
  return "/not-authorised.html";
}
