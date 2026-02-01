import { initTheme } from "./theme.js";
import { qs, toast, fmtTime, fmtDuration, minutesBetween, fmtDateTime, setLoading, setupReveal } from "./utils.js";
import { getSupabase, requireAuth, signOut } from "./supabaseClient.js";
import { fetchMyProfile, routeByProfile } from "./authHelpers.js";

const sb = getSupabase();

async function ensureAccess(){
  await requireAuth();
  const me = await fetchMyProfile();
  if(!me?.profile){
    window.location.href = "/not-authorised.html";
    return null;
  }
  // allow staff + instructors + occ/admin to open this page
  if(!(me.profile.is_staff || me.profile.is_instructor || me.profile.is_occ || me.profile.is_admin)){
    window.location.href = "/not-authorised.html";
    return null;
  }
  qs("#who").textContent = me.profile.display_name || me.profile.full_name || "Staff";
  return me.profile;
}

function rosterCard(slot){
  const f = slot.flight || {};
  const mins = minutesBetween(f.std, f.sta);
  const resp = slot.response || "Pending";
  const locked = !!slot.locked;

  const el = document.createElement("div");
  el.className = "flight-card";
  el.style.gridTemplateColumns = "1.4fr 1fr .9fr .9fr";
  el.innerHTML = `
    <div class="flight-main">
      <div class="logo"><img src="/assets/img/logo.png" alt=""></div>
      <div class="meta">
        <b>${escapeHtml(slot.slot_role || "Assignment")} · ${escapeHtml(f.flight_number || "—")}</b>
        <span>${escapeHtml(f.origin||"—")} → ${escapeHtml(f.destination||"—")} · ${fmtTime(f.std)}–${fmtTime(f.sta)} · ${fmtDuration(mins)}</span>
      </div>
    </div>

    <div class="kv">
      <b>${escapeHtml(resp)}</b>
      <span>Response</span>
    </div>

    <div class="kv">
      <b>${locked ? "Locked" : "Open"}</b>
      <span>Slot</span>
    </div>

    <div class="badges right" style="justify-content:flex-end;">
      <button class="btn" data-act="accept"${locked ? " disabled" : ""}>Accept</button>
      <button class="btn" data-act="decline"${locked ? " disabled" : ""}>Decline</button>
      <button class="btn" data-act="remove"${locked ? " disabled" : ""}>Request removal</button>
    </div>
  `;

  el.querySelector('[data-act="accept"]').addEventListener("click", ()=> updateResponse(slot.id, "Accepted"));
  el.querySelector('[data-act="decline"]').addEventListener("click", async ()=>{
    const note = prompt("Decline reason (optional):") || "";
    await updateResponse(slot.id, "Declined", note);
  });
  el.querySelector('[data-act="remove"]').addEventListener("click", async ()=>{
    const note = prompt("Removal reason (optional):") || "";
    await requestRemoval(slot.id, note);
  });

  return el;
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[m]);
}

async function loadRoster(){
  const session = await requireAuth();
  const { data, error } = await sb
    .from("roster_slots")
    .select("id, slot_role, response, response_note, responded_at, locked, flight:flights(id, flight_number, origin, destination, std, sta, stage, status, note)")
    .eq("assigned_user", session.user.id)
    .order("responded_at", { ascending: false, nullsFirst: true });

  if(error){
    console.error(error);
    toast("Could not load roster assignments.");
    return;
  }
  const wrap = qs("#rosterCards");
  wrap.innerHTML = "";
  const list = data || [];
  if(list.length === 0){
    qs("#rosterEmpty").style.display = "block";
    return;
  }
  qs("#rosterEmpty").style.display = "none";
  for(const slot of list){
    wrap.appendChild(rosterCard(slot));
  }
}

async function updateResponse(slotId, response, note=""){
  try{
    const session = await requireAuth();
    const { error } = await sb
      .from("roster_slots")
      .update({ response, response_note: note || null, responded_at: new Date().toISOString() })
      .eq("id", slotId)
      .eq("assigned_user", session.user.id);
    if(error) throw error;
    toast("Response updated.");
    await loadRoster();
  }catch(e){
    console.error(e);
    toast(e.message || "Could not update response.");
  }
}

async function requestRemoval(slotId, note=""){
  try{
    const session = await requireAuth();
    // Set request fields; keep assignment for OCC to action, or set response = Removal Requested
    const { error } = await sb
      .from("roster_slots")
      .update({ response: "Removal Requested", response_note: note || null, responded_at: new Date().toISOString() })
      .eq("id", slotId)
      .eq("assigned_user", session.user.id);
    if(error) throw error;
    toast("Removal requested. OCC will review.");
    await loadRoster();
  }catch(e){
    console.error(e);
    toast(e.message || "Could not request removal.");
  }
}

async function loadRequests(){
  const session = await requireAuth();
  const { data, error } = await sb
    .from("training_requests")
    .select("id, requested_role, status, updated_at, created_at, scheduled_for, location")
    .eq("requester", session.user.id)
    .order("created_at", { ascending: false });

  if(error){
    console.error(error);
    toast("Could not load training requests.");
    return;
  }
  const rows = data || [];
  qs("#reqCount").textContent = `${rows.length} total`;
  const body = qs("#reqBody");
  body.innerHTML = "";
  if(rows.length === 0){
    qs("#reqEmpty").style.display = "block";
    qs("#reqTable").style.display = "none";
    return;
  }
  qs("#reqEmpty").style.display = "none";
  qs("#reqTable").style.display = "table";

  for(const r of rows){
    const tr = document.createElement("tr");
    const updated = r.updated_at || r.created_at;
    let status = r.status || "submitted";
    let extra = "";
    if(status === "scheduled" && r.scheduled_for){
      extra = ` · ${fmtDateTime(r.scheduled_for)}${r.location ? " · "+escapeHtml(r.location) : ""}`;
    }
    tr.innerHTML = `
      <td>${escapeHtml(r.requested_role || "—")}</td>
      <td>${escapeHtml(status)}${extra}</td>
      <td>${fmtDateTime(updated)}</td>
    `;
    body.appendChild(tr);
  }
}

async function submitTraining(){
  const role = qs("#trainingRole").value;
  const note = qs("#trainingNote").value.trim();
  const btn = qs("#trainingSubmit");
  setLoading(btn, true, "Submitting…");
  try{
    const session = await requireAuth();
    const payload = {
      requester: session.user.id,
      requested_role: role,
      note: note || null,
      status: "submitted"
    };
    const { error } = await sb.from("training_requests").insert(payload);
    if(error) throw error;
    qs("#trainingNote").value = "";
    toast("Training request submitted.");
    await loadRequests();
  }catch(e){
    console.error(e);
    toast(e.message || "Could not submit request.");
  }finally{
    setLoading(btn, false);
  }
}

(async function init(){
  initTheme();
  setupReveal();
  qs("#year").textContent = new Date().getFullYear();
  qs("#signOutBtn").addEventListener("click", signOut);

  const profile = await ensureAccess();
  // If user is OCC/admin/instructor, route to their main console instead of staff
  if(profile && (profile.is_occ || profile.is_admin)){
    // let them stay if they want, but provide direct route
  }

  qs("#trainingSubmit").addEventListener("click", submitTraining);

  await loadRoster();
  await loadRequests();
})();
