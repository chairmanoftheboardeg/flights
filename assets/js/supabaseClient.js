import { toast } from "./utils.js";

export function getSupabase(){
  if(window.__supabase) return window.__supabase;
  const cfg = window.EGR_CONFIG;
  if(!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY){
    toast("Supabase config missing.", "bad");
    throw new Error("Missing Supabase config");
  }
  // window.supabase is provided by CDN
  window.__supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return window.__supabase;
}

export async function getSession(){
  const sb = getSupabase();
  const { data, error } = await sb.auth.getSession();
  if(error) throw error;
  return data.session;
}

export async function requireAuth(){
  const sb = getSupabase();
  const { data, error } = await sb.auth.getSession();
  if(error) throw error;
  if(!data.session) window.location.href = "/login.html";
  return data.session;
}

export async function signOut(){
  const sb = getSupabase();
  await sb.auth.signOut();
  window.location.href = "/";
}
