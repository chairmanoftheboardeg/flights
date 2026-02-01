import { supabase } from "./supabaseClient.js";

const daychips = document.getElementById("daychips");
const cards = document.getElementById("cards");
const empty = document.getElementById("empty");
const dayTitle = document.getElementById("dayTitle");
const dayMeta = document.getElementById("dayMeta");

const prevWeek = document.getElementById("prevWeek");
const nextWeek = document.getElementById("nextWeek");

let weekStart = startOfWeek(new Date()); // Monday start
let selectedDate = new Date();

function startOfWeek(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
  x.setDate(x.getDate() - day);
  return x;
}

function fmtDay(d){
  return d.toLocaleDateString(undefined, { day:"2-digit", month:"short" });
}
function fmtWeekday(d){
  return d.toLocaleDateString(undefined, { weekday:"short" });
}
function fmtLong(d){
  return d.toLocaleDateString(undefined, { weekday:"long", day:"numeric", month:"short" });
}
function fmtTime(ts){
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
}

function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function countFlightsForDay(date){
  const start = new Date(date); start.setHours(0,0,0,0);
  const end = new Date(date); end.setHours(23,59,59,999);

  const { count, error } = await supabase
    .from("flights")
    .select("id", { count: "exact", head: true })
    .gte("std", start.toISOString())
    .lte("std", end.toISOString())
    .eq("visibility", "public");

  if (error) return 0;
  return count ?? 0;
}

async function renderWeek(){
  daychips.innerHTML = "";

  const days = [...Array(7)].map((_, i) => addDays(weekStart, i));

  // build chips with counts
  for (const d of days){
    const c = await countFlightsForDay(d);

    const btn = document.createElement("button");
    btn.className = "daychip" + (sameDay(d, selectedDate) ? " active" : "");
    btn.innerHTML = `
      <div class="d">${fmtDay(d)}</div>
      <div class="n">${fmtWeekday(d)}</div>
      <div class="c">${c} flights</div>
    `;
    btn.addEventListener("click", () => {
      selectedDate = d;
      renderWeek();
      loadFlightsForSelectedDay();
    });
    daychips.appendChild(btn);
  }
}

function sameDay(a,b){
  return a.getFullYear()===b.getFullYear() &&
         a.getMonth()===b.getMonth() &&
         a.getDate()===b.getDate();
}

function stageLabel(s){
  return String(s).replaceAll("_"," ");
}
function statusLabel(s){
  return String(s).replaceAll("_"," ");
}

function cardHTML(f){
  const dep = f.etd ?? f.std;
  const arr = f.eta ?? f.sta;

  return `
    <article class="flightcard">
      <div class="cardrow">
        <div class="airline">
          <div class="airicon" aria-hidden="true"></div>
          <div class="airmeta">
            <div class="fn">${escapeHTML(f.flight_number)}</div>
            <div class="rt">${escapeHTML(f.origin)} → ${escapeHTML(f.destination)}</div>
          </div>
        </div>

        <div class="mapwrap">
          <div class="line"></div>
          <div class="route">
            <div class="node"></div>
            <div class="node"></div>
          </div>
          <div class="times">
            <div class="timeblock">
              <div class="t">${fmtTime(dep)}</div>
              <div class="l">${escapeHTML(f.origin)} • DEP</div>
            </div>
            <div class="timeblock" style="text-align:right">
              <div class="t">${fmtTime(arr)}</div>
              <div class="l">${escapeHTML(f.destination)} • ARR</div>
            </div>
          </div>
        </div>

        <div class="badges">
          <div class="badge stage">${stageLabel(f.stage)}</div>
          <div class="badge status">${statusLabel(f.status)}</div>
          ${f.status_note ? `<div class="note">${escapeHTML(f.status_note)}</div>` : `<div class="note"></div>`}
        </div>
      </div>
    </article>
  `;
}

function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function loadFlightsForSelectedDay(){
  cards.innerHTML = "";
  empty.hidden = true;

  const start = new Date(selectedDate); start.setHours(0,0,0,0);
  const end = new Date(selectedDate); end.setHours(23,59,59,999);

  dayTitle.textContent = fmtLong(selectedDate);
  dayMeta.textContent = "Loading…";

  const { data, error } = await supabase
    .from("flights")
    .select("*")
    .gte("std", start.toISOString())
    .lte("std", end.toISOString())
    .eq("visibility", "public")
    .order("std", { ascending: true });

  if (error){
    dayMeta.textContent = "Could not load flights.";
    empty.hidden = false;
    empty.textContent = "Board unavailable. Check Supabase keys and RLS policies.";
    return;
  }

  dayMeta.textContent = `${data.length} flights`;

  if (!data.length){
    empty.hidden = false;
    return;
  }

  cards.innerHTML = data.map(cardHTML).join("");
}

prevWeek.addEventListener("click", async () => {
  weekStart = addDays(weekStart, -7);
  selectedDate = weekStart;
  await renderWeek();
  await loadFlightsForSelectedDay();
});

nextWeek.addEventListener("click", async () => {
  weekStart = addDays(weekStart, 7);
  selectedDate = weekStart;
  await renderWeek();
  await loadFlightsForSelectedDay();
});

(async function init(){
  selectedDate = new Date();
  weekStart = startOfWeek(selectedDate);
  await renderWeek();
  await loadFlightsForSelectedDay();
})();
