import { initTheme } from "./theme.js";
import { qs, qsa, toast, startOfWeek, addDays, fmtRange, isoDay, fmtDay, dowName, fmtTime, minutesBetween, fmtDuration, setLoading, setupReveal } from "./utils.js";
import { getSupabase, requireAuth, signOut } from "./supabaseClient.js";
import { fetchMyProfile, routeByProfile } from "./authHelpers.js";
const ROOT = (window.location.pathname.includes("/staff/") || window.location.pathname.includes("/occ/") || window.location.pathname.includes("/instructors/")) ? "../" : "./";

const sb = getSupabase();

let weekStart = startOfWeek(new Date());
let selectedDay = isoDay(new Date());
let flights = [];
let flightsByDay = new Map();
let selectedFlightId = null;
let staffList = [];

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[m]);
}

function toLocalInput(iso){
  if(!iso) return "";
  const d = new Date(iso);
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toISOFromLocal(value){
  if(!value) return null;
  const d = new Date(value);
  return d.toISOString();
}

async function ensureAccess(){
  await requireAuth();
  const me = await fetchMyProfile();
  if(!me?.profile){
    window.location.href = ROOT + "not-authorised.html";
    return null;
  }
  if(!(me.profile.is_occ || me.profile.is_admin)){
    window.location.href = routeByProfile(me.profile);
    return null;
  }
  qs("#who").textContent = me.profile.display_name || me.profile.full_name || "OCC";
  return me.profile;
}

function renderWeek(){
  qs("#weekLabel").value = fmtRange(weekStart);

  const strip = qs("#dayStrip");
  strip.innerHTML = "";
  for(let i=0;i<7;i++){
    const d = addDays(weekStart, i);
    const key = isoDay(d);
    const count = (flightsByDay.get(key) || []).length;
    const tile = document.createElement("div");
    tile.className = "day-tile" + (key === selectedDay ? " active" : "");
    tile.style.minWidth = "150px";
    tile.innerHTML = `
      <div class="date">${fmtDay(d)}</div>
      <div class="dow">${dowName(d)}</div>
      <div class="count">${count} flights</div>
    `;
    tile.addEventListener("click", ()=>{
      selectedDay = key;
      renderWeek();
      renderFlightList();
    });
    strip.appendChild(tile);
  }
}

function flightListCard(f){
  const mins = minutesBetween(f.std, f.sta);
  const el = document.createElement("div");
  el.className = "flight-card";
  el.style.cursor = "pointer";
  el.style.gridTemplateColumns = "1.4fr .9fr .9fr .8fr";
  if(f.id === selectedFlightId){
    el.style.borderColor = "rgba(225,27,34,.65)";
    el.style.background = "rgba(225,27,34,.10)";
  }
  el.innerHTML = `
    <div class="flight-main">
      <div class="logo"><img src="/assets/img/logo.png" alt=""></div>
      <div class="meta">
        <b>${escapeHtml(f.flight_number || "—")} · ${escapeHtml(f.origin||"—")} → ${escapeHtml(f.destination||"—")}</b>
        <span>${escapeHtml(f.visibility || "staff").toUpperCase()} · ${escapeHtml(f.note||"")}</span>
      </div>
    </div>
    <div class="kv"><b>${fmtTime(f.std)}</b><span>STD</span></div>
    <div class="kv"><b>${fmtTime(f.sta)}</b><span>STA</span></div>
    <div class="badges right">
      <span class="badge stage"><span class="mini"></span>${escapeHtml(f.stage||"Scheduled")}</span>
      <span class="badge"><span class="mini"></span>${fmtDuration(mins)}</span>
    </div>
  `;
  el.addEventListener("click", ()=> selectFlight(f.id));
  return el;
}

function renderFlightList(){
  const list = flightsByDay.get(selectedDay) || [];
  const wrap = qs("#flightList");
  wrap.innerHTML = "";
  if(list.length === 0){
    qs("#flightEmpty").style.display = "block";
  }else{
    qs("#flightEmpty").style.display = "none";
    for(const f of list){
      wrap.appendChild(flightListCard(f));
    }
  }
}

async function loadWeek(){
  const start = new Date(weekStart); start.setHours(0,0,0,0);
  const end = addDays(start, 7);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const { data, error } = await sb
    .from("flights")
    .select("id, flight_number, origin, destination, std, sta, stage, status, note, visibility")
    .gte("std", startISO)
    .lt("std", endISO)
    .order("std", { ascending:true });

  if(error){
    console.error(error);
    toast("Could not load flights.");
    flights = [];
  }else{
    flights = data || [];
  }

  flightsByDay = new Map();
  for(const f of flights){
    const key = isoDay(new Date(f.std));
    if(!flightsByDay.has(key)) flightsByDay.set(key, []);
    flightsByDay.get(key).push(f);
  }

  const keys = new Set(Array.from({length:7}, (_,i)=> isoDay(addDays(weekStart,i))));
  if(!keys.has(selectedDay)) selectedDay = isoDay(weekStart);

  renderWeek();
  renderFlightList();
}

async function loadStaff(){
  const { data, error } = await sb
    .from("profiles")
    .select("id, display_name, full_name, departments, is_staff")
    .eq("is_staff", true)
    .order("display_name", { ascending:true });

  if(error){
    console.error(error);
    toast("Could not load staff directory.");
    staffList = [];
  }else{
    staffList = data || [];
  }
}

function staffName(id){
  const p = staffList.find(x=> x.id === id);
  if(!p) return "";
  return p.display_name || p.full_name || p.id.slice(0,8);
}

function buildStaffSelect(selectedId){
  const sel = document.createElement("select");
  sel.style.width = "100%";
  sel.style.border = "none";
  sel.style.outline = "none";
  sel.style.background = "transparent";
  sel.style.color = "inherit";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Unassigned";
  sel.appendChild(opt0);

  for(const p of staffList){
    const o = document.createElement("option");
    o.value = p.id;
    o.textContent = (p.display_name || p.full_name || p.id.slice(0,8));
    sel.appendChild(o);
  }
  sel.value = selectedId || "";
  return sel;
}

async function selectFlight(id){
  selectedFlightId = id;
  renderFlightList();

  const f = flights.find(x=> x.id === id);
  if(!f){
    toast("Flight not found.");
    return;
  }

  qs("#flightDetailEmpty").style.display = "none";
  qs("#flightDetail").style.display = "block";

  qs("#fd_number").value = f.flight_number || "";
  qs("#fd_origin").value = f.origin || "";
  qs("#fd_destination").value = f.destination || "";
  qs("#fd_std").value = toLocalInput(f.std);
  qs("#fd_sta").value = toLocalInput(f.sta);
  qs("#fd_stage").value = f.stage || "Scheduled";
  qs("#fd_status").value = f.status || "On time";
  qs("#fd_note").value = f.note || "";
  qs("#fd_visibility").value = f.visibility || "staff";

  await loadSlots();
}

async function loadSlots(){
  if(!selectedFlightId) return;
  const { data, error } = await sb
    .from("roster_slots")
    .select("id, slot_role, assigned_user, response, response_note, locked, responded_at")
    .eq("flight_id", selectedFlightId)
    .order("created_at", { ascending:true });

  if(error){
    console.error(error);
    toast("Could not load roster slots.");
    return;
  }

  const slots = data || [];
  qs("#slotCount").textContent = `${slots.length} slots`;
  const body = qs("#slotsBody");
  body.innerHTML = "";
  if(slots.length === 0){
    qs("#slotsEmpty").style.display = "block";
  }else{
    qs("#slotsEmpty").style.display = "none";
  }

  for(const s of slots){
    const tr = document.createElement("tr");
    const assignedCell = document.createElement("td");
    const resp = s.response || "Pending";
    const respCell = document.createElement("td");
    respCell.textContent = resp + (s.response_note ? ` · ${s.response_note}` : "");
    const actCell = document.createElement("td");
    actCell.className = "actions";

    const sel = buildStaffSelect(s.assigned_user);
    sel.addEventListener("change", async ()=>{
      const val = sel.value || null;
      await updateSlot(s.id, { assigned_user: val, response: val ? "Pending" : "Pending", response_note: null });
    });
    assignedCell.appendChild(sel);

    const lockBtn = document.createElement("button");
    lockBtn.className = "btn";
    lockBtn.textContent = s.locked ? "Unlock" : "Lock";
    lockBtn.addEventListener("click", async ()=>{
      await updateSlot(s.id, { locked: !s.locked });
      await loadSlots();
    });

    const clearBtn = document.createElement("button");
    clearBtn.className = "btn";
    clearBtn.textContent = "Clear";
    clearBtn.addEventListener("click", async ()=>{
      await updateSlot(s.id, { assigned_user: null, response: "Pending", response_note: null });
      await loadSlots();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async ()=>{
      if(!confirm("Delete this roster slot?")) return;
      await deleteSlot(s.id);
      await loadSlots();
    });

    actCell.append(lockBtn, clearBtn, delBtn);

    tr.innerHTML = `
      <td>${escapeHtml(s.slot_role || "—")}</td>
    `;
    tr.appendChild(assignedCell);
    tr.appendChild(respCell);
    tr.appendChild(actCell);
    body.appendChild(tr);
  }
}

async function updateSlot(id, patch){
  try{
    const { error } = await sb.from("roster_slots").update(patch).eq("id", id);
    if(error) throw error;
    toast("Slot updated.");
  }catch(e){
    console.error(e);
    toast(e.message || "Could not update slot.");
  }
}

async function deleteSlot(id){
  try{
    const { error } = await sb.from("roster_slots").delete().eq("id", id);
    if(error) throw error;
    toast("Slot deleted.");
  }catch(e){
    console.error(e);
    toast(e.message || "Could not delete slot.");
  }
}

async function addSlot(){
  if(!selectedFlightId){
    toast("Select a flight first.", "warn");
    return;
  }
  const role = qs("#newSlotRole").value;
  try{
    const { error } = await sb.from("roster_slots").insert({
      flight_id: selectedFlightId,
      slot_role: role,
      response: "Pending",
      locked: false
    });
    if(error) throw error;
    toast("Slot added.");
    await loadSlots();
  }catch(e){
    console.error(e);
    toast(e.message || "Could not add slot.");
  }
}

async function saveFlight(){
  if(!selectedFlightId){
    toast("Select a flight first.", "warn");
    return;
  }
  const btn = qs("#saveFlightBtn");
  setLoading(btn, true, "Saving…");
  try{
    const patch = {
      flight_number: qs("#fd_number").value.trim() || null,
      origin: qs("#fd_origin").value.trim() || null,
      destination: qs("#fd_destination").value.trim() || null,
      std: toISOFromLocal(qs("#fd_std").value),
      sta: toISOFromLocal(qs("#fd_sta").value),
      stage: qs("#fd_stage").value,
      status: qs("#fd_status").value,
      note: qs("#fd_note").value.trim() || null,
      visibility: qs("#fd_visibility").value
    };
    const { error } = await sb.from("flights").update(patch).eq("id", selectedFlightId);
    if(error) throw error;
    toast("Flight saved.");
    await loadWeek();
    // reselect to refresh details
    await selectFlight(selectedFlightId);
  }catch(e){
    console.error(e);
    toast(e.message || "Could not save flight.");
  }finally{
    setLoading(btn, false);
  }
}

async function cancelFlight(){
  if(!selectedFlightId){
    toast("Select a flight first.", "warn");
    return;
  }
  if(!confirm("Cancel this flight?")) return;
  const btn = qs("#cancelFlightBtn");
  setLoading(btn, true, "Cancelling…");
  try{
    const { error } = await sb.from("flights")
      .update({ status: "Cancelled", stage: "Scheduled", note: "Cancelled by OCC" })
      .eq("id", selectedFlightId);
    if(error) throw error;
    toast("Flight cancelled.");
    await loadWeek();
    await selectFlight(selectedFlightId);
  }catch(e){
    console.error(e);
    toast(e.message || "Could not cancel flight.");
  }finally{
    setLoading(btn, false);
  }
}

function showCreate(){
  // clear detail form and set state "new"
  selectedFlightId = null;
  renderFlightList();
  qs("#flightDetailEmpty").style.display = "none";
  qs("#flightDetail").style.display = "block";
  qs("#fd_number").value = "";
  qs("#fd_origin").value = "";
  qs("#fd_destination").value = "";
  qs("#fd_std").value = "";
  qs("#fd_sta").value = "";
  qs("#fd_stage").value = "Scheduled";
  qs("#fd_status").value = "On time";
  qs("#fd_note").value = "";
  qs("#fd_visibility").value = "public";

  qs("#slotCount").textContent = "—";
  qs("#slotsBody").innerHTML = "";
  qs("#slotsEmpty").style.display = "block";

  toast("Fill the form then click Save changes to create.", "info");
}

async function createFlight(){
  const btn = qs("#saveFlightBtn");
  setLoading(btn, true, "Creating…");
  try{
    const payload = {
      flight_number: qs("#fd_number").value.trim(),
      origin: qs("#fd_origin").value.trim(),
      destination: qs("#fd_destination").value.trim(),
      std: toISOFromLocal(qs("#fd_std").value),
      sta: toISOFromLocal(qs("#fd_sta").value),
      stage: qs("#fd_stage").value,
      status: qs("#fd_status").value,
      note: qs("#fd_note").value.trim() || null,
      visibility: qs("#fd_visibility").value
    };
    if(!payload.flight_number || !payload.origin || !payload.destination || !payload.std || !payload.sta){
      toast("Flight number, origin, destination, STD and STA are required.", "warn");
      return;
    }
    const { data, error } = await sb.from("flights").insert(payload).select("id").single();
    if(error) throw error;
    selectedFlightId = data.id;
    toast("Flight created.");
    await loadWeek();
    await selectFlight(selectedFlightId);
  }catch(e){
    console.error(e);
    toast(e.message || "Could not create flight.");
  }finally{
    setLoading(btn, false);
  }
}

function wire(){
  qs("#prevWeek").addEventListener("click", async ()=>{ weekStart = addDays(weekStart, -7); await loadWeek(); });
  qs("#nextWeek").addEventListener("click", async ()=>{ weekStart = addDays(weekStart, 7); await loadWeek(); });
  qs("#goThisWeek").addEventListener("click", async ()=>{ weekStart = startOfWeek(new Date()); selectedDay = isoDay(new Date()); await loadWeek(); });

  qs("#signOutBtn").addEventListener("click", signOut);
  qs("#addSlotBtn").addEventListener("click", addSlot);

  qs("#saveFlightBtn").addEventListener("click", async ()=>{
    if(selectedFlightId) await saveFlight();
    else await createFlight();
  });
  qs("#cancelFlightBtn").addEventListener("click", cancelFlight);
  qs("#createFlightBtn").addEventListener("click", showCreate);
}

(async function init(){
  initTheme();
  setupReveal();
  qs("#year").textContent = new Date().getFullYear();
  await ensureAccess();
  await loadStaff();
  wire();
  await loadWeek();
})();