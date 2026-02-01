import { initTheme } from "./theme.js";
import { getSupabase } from "./supabaseClient.js";
import { qs, qsa, toast, startOfWeek, addDays, fmtRange, fmtDay, dowName, isoDay, fmtTime, minutesBetween, fmtDuration, setupReveal } from "./utils.js";

const sb = getSupabase();

let weekStart = startOfWeek(new Date());
let selectedDay = isoDay(new Date());
let flights = []; // all flights in week
let flightsByDay = new Map();

function toISOStart(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x.toISOString();
}
function toISOEndNext(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  x.setDate(x.getDate()+1);
  return x.toISOString();
}

function classifyStatus(f){
  const s = (f.status || "").toLowerCase();
  if(s.includes("cancel")) return "cancelled";
  if(s.includes("delay")) return "delayed";
  if(s.includes("gate")) return "active";
  if(s.includes("resched")) return "upcoming";
  const stage = (f.stage || "").toLowerCase();
  if(stage.includes("completed")) return "completed";
  if(stage.includes("in flight") || stage.includes("boarding") || stage.includes("taxi") || stage.includes("takeoff") || stage.includes("descending") || stage.includes("landing") || stage.includes("deboard")) return "active";
  return "upcoming";
}

function badgeForOperational(status){
  if(status === "cancelled") return { cls:"bad", dot:"bad", label:"Cancelled" };
  if(status === "delayed") return { cls:"warn", dot:"warn", label:"Delayed" };
  if(status === "completed") return { cls:"good", dot:"good", label:"Completed" };
  if(status === "active") return { cls:"warn", dot:"warn", label:"Active" };
  return { cls:"good", dot:"good", label:"Upcoming" };
}

function render(){
  qs("#weekRange").textContent = fmtRange(weekStart);
  qs("#year").textContent = new Date().getFullYear();

  // build day tiles
  const strip = qs("#dayStrip");
  strip.innerHTML = "";
  for(let i=0;i<7;i++){
    const d = addDays(weekStart, i);
    const dayKey = isoDay(d);
    const count = (flightsByDay.get(dayKey) || []).length;
    const tile = document.createElement("div");
    tile.className = "day-tile" + (dayKey === selectedDay ? " active" : "");
    tile.innerHTML = `
      <div class="date">${fmtDay(d)}</div>
      <div class="dow">${dowName(d)}</div>
      <div class="count">${count} flights</div>
    `;
    tile.addEventListener("click", ()=>{
      selectedDay = dayKey;
      render();
    });
    strip.appendChild(tile);
  }

  const dayFlights = (flightsByDay.get(selectedDay) || []);
  qs("#selectedDayTitle").textContent = `${dowName(new Date(selectedDay))}, ${selectedDay}`;
  qs("#flightCount").textContent = `${dayFlights.length} flights`;

  const search = (qs("#searchBox").value || "").trim().toLowerCase();
  const filter = qs("#statusFilter").value;

  let shown = dayFlights.filter(f=>{
    const hay = `${f.flight_number||""} ${f.origin||""} ${f.destination||""}`.toLowerCase();
    if(search && !hay.includes(search)) return false;
    if(filter !== "all"){
      const c = classifyStatus(f);
      if(c !== filter) return false;
    }
    return true;
  });

  const cards = qs("#cards");
  cards.innerHTML = "";
  if(shown.length === 0){
    qs("#emptyState").style.display = "block";
  } else {
    qs("#emptyState").style.display = "none";
    for(const f of shown){
      const mins = minutesBetween(f.std, f.sta);
      const op = classifyStatus(f);
      const opBadge = badgeForOperational(op);

      const stageLabel = f.stage || "Scheduled";
      const statusLabel = f.status || "On time";

      const el = document.createElement("div");
      el.className = "flight-card fade-in";
      el.innerHTML = `
        <div class="flight-main">
          <div class="logo"><img src="/assets/img/logo.png" alt=""></div>
          <div class="meta">
            <b>${escapeHtml(f.flight_number || "—")} · ${escapeHtml(f.origin || "—")} → ${escapeHtml(f.destination || "—")}</b>
            <span>${escapeHtml(f.note || "")}</span>
          </div>
        </div>

        <div class="kv">
          <b>${fmtTime(f.std)}</b>
          <span>Departure</span>
        </div>

        <div class="kv">
          <b>${fmtTime(f.sta)}</b>
          <span>Arrival</span>
        </div>

        <div class="badges right">
          <span class="badge stage"><span class="mini"></span>${escapeHtml(stageLabel)}</span>
          <span class="badge ${opBadge.cls}"><span class="mini"></span>${escapeHtml(statusLabel)}</span>
          <span class="badge"><span class="mini"></span>${fmtDuration(mins)}</span>
        </div>
      `;
      cards.appendChild(el);
    }
  }

  setupReveal();
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[m]);
}

async function loadWeek(){
  const start = new Date(weekStart);
  const end = addDays(weekStart, 7);
  const startISO = toISOStart(start);
  const endISO = toISOStart(end);

  qs("#weekSub").textContent = "Loading…";

  const { data, error } = await sb
    .from("flights")
    .select("id, flight_number, origin, destination, std, sta, stage, status, note, visibility")
    .eq("visibility", "public")
    .gte("std", startISO)
    .lt("std", endISO)
    .order("std", { ascending: true });

  if(error){
    console.error(error);
    toast("Could not load flights. Check Supabase + RLS.", "bad");
    qs("#weekSub").textContent = "Failed to load flights.";
    flights = [];
  } else {
    flights = data || [];
    qs("#weekSub").textContent = "Select a day to view flights";
  }

  flightsByDay = new Map();
  for(const f of flights){
    const key = isoDay(new Date(f.std));
    if(!flightsByDay.has(key)) flightsByDay.set(key, []);
    flightsByDay.get(key).push(f);
  }
  // ensure selectedDay inside week; else use weekStart
  const keys = new Set(Array.from({length:7}, (_,i)=> isoDay(addDays(weekStart,i))));
  if(!keys.has(selectedDay)) selectedDay = isoDay(weekStart);

  render();
}

function rotateBanner(){
  const imgs = qsa(".hero .banner img");
  if(imgs.length < 2) return;
  let idx = 0;
  setInterval(()=>{
    imgs[idx].classList.remove("active");
    idx = (idx+1)%imgs.length;
    imgs[idx].classList.add("active");
  }, 6500);
}

function wire(){
  qs("#prevWeek").addEventListener("click", async ()=>{
    weekStart = addDays(weekStart, -7);
    await loadWeek();
  });
  qs("#nextWeek").addEventListener("click", async ()=>{
    weekStart = addDays(weekStart, 7);
    await loadWeek();
  });
  qs("#goThisWeek").addEventListener("click", async ()=>{
    weekStart = startOfWeek(new Date());
    selectedDay = isoDay(new Date());
    await loadWeek();
  });
  qs("#searchBox").addEventListener("input", render);
  qs("#statusFilter").addEventListener("change", render);
}

(async function init(){
  initTheme();
  rotateBanner();
  wire();
  await loadWeek();
})();
