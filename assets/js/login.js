import { initTheme } from "./theme.js";
import { qs, toast, setLoading, setupReveal } from "./utils.js";
import { getSupabase } from "./supabaseClient.js";
import { fetchMyProfile, routeByProfile } from "./authHelpers.js";

const sb = getSupabase();

async function go(){
  const me = await fetchMyProfile();
  if(me?.profile){
    window.location.href = routeByProfile(me.profile);
  }
}

async function login(){
  const email = qs("#email").value.trim();
  const password = qs("#password").value;
  if(!email || !password){
    toast("Enter email and password.", "warn");
    return;
  }
  const btn = qs("#loginBtn");
  setLoading(btn, true, "Logging in…");
  try{
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if(error) throw error;

    const me = await fetchMyProfile();
    if(!me?.profile){
      window.location.href = "/not-authorised.html";
      return;
    }
    window.location.href = routeByProfile(me.profile);
  }catch(e){
    console.error(e);
    toast(e.message || "Login failed.");
  }finally{
    setLoading(btn, false);
  }
}

async function reset(){
  const email = qs("#email").value.trim();
  if(!email){
    toast("Enter your email first.", "warn");
    return;
  }
  const btn = qs("#resetBtn");
  setLoading(btn, true, "Sending…");
  try{
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login.html"
    });
    if(error) throw error;
    toast("Password reset email sent.");
  }catch(e){
    console.error(e);
    toast(e.message || "Could not send reset email.");
  }finally{
    setLoading(btn, false);
  }
}

(async function init(){
  initTheme();
  setupReveal();
  qs("#year").textContent = new Date().getFullYear();
  qs("#loginBtn").addEventListener("click", login);
  qs("#resetBtn").addEventListener("click", reset);

  qs("#password").addEventListener("keydown", (e)=>{ if(e.key === "Enter") login(); });

  await go();
})();
