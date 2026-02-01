import { initTheme } from "./theme.js";
import { qs, toast, fmtDateTime, setLoading, setupReveal } from "./utils.js";
import { getSupabase, requireAuth, signOut } from "./supabaseClient.js";
import { fetchMyProfile, routeByProfile } from "./authHelpers.js";

const sb = getSupabase();

let selectedReq = null;
let meId = null;

async function ensureAccess(){
  const session = await requireAuth();
  meId = session.user.id;

  const me = await fetchMyProfile();
  if(!me?.profile){
    window.location.href = "/not-authorised.html";
    return null;
  }
  if(!(me.profile.is_instructor || me.profile.is_admin || me.profile.is_occ)){
    // Instructors only
    window.location.href = routeByProfile(me.profile);
    return null;
  }
  qs("#who").textContent = me.profile.display_name || me.profile.full_name || "Instructor";
  return me.profile;
}

function shortId(id){ return (id || "").slice(0,8); }

async function loadQueue(){
  const filter = qs("#queueFilter").value;
  let q = sb.from("training_requests").select("id, requester, requested_role, status, instructor, note, scheduled_for, location, updated_at, created_at").order("created_at", { ascending:false });

  if(filter === "open"){
    q = q.is("instructor", null).neq("status", "completed");
  }else if(filter === "mine"){
    q = q.eq("instructor", meId).neq("status", "completed");
  }else if(filter === "completed"){
    q = q.eq("status", "completed");
  }else{
    // all
  }

  const { data, error } = await q;
  if(error){
    console.error(error);
    toast("Could not load queue.");
    return;
  }

  const rows = data || [];
  const body = qs("#queueBody");
  body.innerHTML = "";
  if(rows.length === 0){
    qs("#queueEmpty").style.display = "block";
    return;
  }
  qs("#queueEmpty").style.display = "none";

  for(const r of rows){
    const tr = document.createElement("tr");
    const isMine = r.instructor === meId;
    const isOpen = !r.instructor;
    const actions = [];
    actions.push(`<button class="btn" data-act="view">View</button>`);
    if(isOpen) actions.push(`<button class="btn" data-act="claim">Claim</button>`);
    if(isMine && r.status !== "completed") actions.push(`<button class="btn" data-act="complete">Complete</button>`);

    tr.innerHTML = `
      <td>${escapeHtml(r.requester ? shortId(r.requester) : "—")}</td>
      <td>${escapeHtml(r.requested_role || "—")}</td>
      <td>${escapeHtml(r.status || "submitted")}${r.scheduled_for ? " · "+escapeHtml(fmtDateTime(r.scheduled_for)) : ""}</td>
      <td class="actions">${actions.join(" ")}</td>
    `;
    tr.querySelector('[data-act="view"]').addEventListener("click", ()=> selectReq(r));
    if(isOpen){
      tr.querySelector('[data-act="claim"]').addEventListener("click", ()=> claim(r.id));
    }
    if(isMine && r.status !== "completed"){
      const btn = tr.querySelector('[data-act="complete"]');
      if(btn) btn.addEventListener("click", ()=> { selectReq(r); completeSelected(); });
    }
    body.appendChild(tr);
  }
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[m]);
}

function selectReq(r){
  selectedReq = r;
  qs("#reqDetailEmpty").style.display = "none";
  qs("#reqDetail").style.display = "block";
  qs("#rd_requester").value = r.requester || "—";
  qs("#rd_role").value = r.requested_role || "—";
  qs("#rd_when").value = r.scheduled_for ? toLocalInput(r.scheduled_for) : "";
  qs("#rd_where").value = r.location || "";
  qs("#rd_notes").value = r.note || "";
}

function toLocalInput(iso){
  const d = new Date(iso);
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toISOFromLocal(value){
  if(!value) return null;
  const d = new Date(value);
  return d.toISOString();
}

async function claim(id){
  try{
    const { error } = await sb.from("training_requests")
      .update({ instructor: meId, status: "claimed", updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("instructor", null);
    if(error) throw error;
    toast("Request claimed.");
    await loadQueue();
  }catch(e){
    console.error(e);
    toast(e.message || "Could not claim request.");
  }
}

async function scheduleSelected(){
  if(!selectedReq){ toast("Select a request first."); return; }
  const when = qs("#rd_when").value;
  const where = qs("#rd_where").value.trim();
  const notes = qs("#rd_notes").value.trim();
  const btn = qs("#scheduleBtn");
  setLoading(btn, true, "Saving…");
  try{
    const payload = {
      instructor: selectedReq.instructor || meId,
      status: "scheduled",
      scheduled_for: toISOFromLocal(when),
      location: where || null,
      instructor_notes: notes || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from("training_requests").update(payload).eq("id", selectedReq.id);
    if(error) throw error;
    toast("Scheduled.");
    await loadQueue();
  }catch(e){
    console.error(e);
    toast(e.message || "Could not schedule.");
  }finally{
    setLoading(btn, false);
  }
}

async function completeSelected(){
  if(!selectedReq){ toast("Select a request first."); return; }
  const notes = qs("#rd_notes").value.trim();
  const btn = qs("#completeBtn");
  setLoading(btn, true, "Saving…");
  try{
    const payload = {
      status: "completed",
      completed_at: new Date().toISOString(),
      instructor_notes: notes || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from("training_requests").update(payload).eq("id", selectedReq.id);
    if(error) throw error;
    toast("Completed.");
    selectedReq = null;
    qs("#reqDetail").style.display = "none";
    qs("#reqDetailEmpty").style.display = "block";
    await loadQueue();
  }catch(e){
    console.error(e);
    toast(e.message || "Could not complete.");
  }finally{
    setLoading(btn, false);
  }
}

(async function init(){
  initTheme();
  setupReveal();
  qs("#year").textContent = new Date().getFullYear();
  qs("#signOutBtn").addEventListener("click", signOut);

  await ensureAccess();

  qs("#refreshBtn").addEventListener("click", loadQueue);
  qs("#queueFilter").addEventListener("change", loadQueue);
  qs("#scheduleBtn").addEventListener("click", scheduleSelected);
  qs("#completeBtn").addEventListener("click", completeSelected);

  await loadQueue();
})();
