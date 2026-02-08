/* global EGR_CONFIG, fmtTime, fmtDate, statusClass, prettyStatus, escapeHtml, durationMinutes, fmtDuration */
let supabaseClient = null;
let cachedRows = [];

async function initSupabase(){
  const { createClient } = window.supabase;
  supabaseClient = createClient(EGR_CONFIG.SUPABASE_URL, EGR_CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  return supabaseClient;
}

async function rpcPublicFlights(pDate){
  const name = EGR_CONFIG.RPC_PUBLIC_FLIGHTS;
  const param = EGR_CONFIG.RPC_PUBLIC_FLIGHTS_DATE_PARAM || "p_date";
  const args = {};
  args[param] = pDate ?? null; // IMPORTANT: always call the parameterised signature
  return await supabaseClient.rpc(name, args);
}

function startOfWeek(d){
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  x.setHours(0,0,0,0);
  return x;
}
function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isoDate(d){ return d.toISOString().slice(0,10); }

function computeCounts(rows){
  const counts = {};
  for(const r of rows){
    const fd = fmtDate(r.flight_date);
    counts[fd] = (counts[fd] || 0) + 1;
  }
  return counts;
}

function renderWeekStrip(rows){
  const dateInput = document.querySelector("#date");
  const selected = dateInput.value;
  const weekStart = startOfWeek(new Date(selected));
  const strip = document.querySelector("#weekStrip");
  const counts = computeCounts(rows);

  strip.innerHTML = "";
  for(let i=0;i<7;i++){
    const d = addDays(weekStart, i);
    const dayIso = isoDate(d);
    const weekday = d.toLocaleDateString([], { weekday: "long" });
    const label = d.toLocaleDateString([], { day: "2-digit", month: "short" });

    const el = document.createElement("div");
    el.className = "daycard" + (dayIso === selected ? " active" : "");
    el.innerHTML = `
      <div class="d2">${escapeHtml(label)}</div>
      <div class="d1">${escapeHtml(weekday)}</div>
      <div class="d3">${counts[dayIso] || 0} flights</div>
    `;
    el.addEventListener("click", ()=>{
      dateInput.value = dayIso;
      render();
    });
    strip.appendChild(el);
  }

  const header = document.querySelector("#dayHeader");
  header.textContent = new Date(selected).toLocaleDateString([], { weekday:"long", day:"2-digit", month:"short" });
}

function applyFilters(rows){
  const q = document.querySelector("#q").value.trim().toLowerCase();
  const status = document.querySelector("#status").value;
  const origin = document.querySelector("#origin").value.trim().toUpperCase();
  const dest = document.querySelector("#dest").value.trim().toUpperCase();
  const date = document.querySelector("#date").value;

  return rows.filter(r=>{
    const flight = String(r.flight_number || "").toLowerCase();
    const from = String(r.origin || "").toUpperCase();
    const to = String(r.destination || "").toUpperCase();
    const st = String(r.status || "").toUpperCase();
    const fd = fmtDate(r.flight_date);

    if(date && fd !== date) return false;
    if(status && st !== status) return false;
    if(origin && from !== origin) return false;
    if(dest && to !== dest) return false;

    if(q){
      const hay = [flight, from.toLowerCase(), to.toLowerCase(), String(r.gate||"").toLowerCase(), String(r.terminal||"").toLowerCase()].join(" ");
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderFlights(rows){
  const list = document.querySelector("#flightList");
  list.innerHTML = "";

  if(rows.length === 0){
    list.innerHTML = `<div class="notice">No flights match your filters for this day.</div>`;
    return;
  }

  for(const r of rows){
    const flightId = r.flight_id || "";
    const mins = durationMinutes(r.sched_dep, r.sched_arr);
    const dur = fmtDuration(mins);
    const card = document.createElement("div");
    card.className = "flightcard";
    card.innerHTML = `
      <div class="flightrow">
        <div class="side">
          <img class="logo" src="${escapeHtml(EGR_CONFIG.BRAND_LOGO_URL)}" alt="${escapeHtml(EGR_CONFIG.BRAND_NAME)}"/>
          <div class="meta">
            <b>${escapeHtml(r.flight_number || "—")}</b>
            <span>Flight</span>
          </div>
        </div>

        <div class="mid">
          <div class="route" style="width:100%;">
            <div class="airport">
              <div class="time">${escapeHtml(fmtTime(r.sched_dep))}</div>
              <div class="code">${escapeHtml(r.origin || "—")} <span style="opacity:.65;">Departure</span></div>
            </div>

            <div style="flex:1; padding:0 16px;">
              <div class="line" aria-hidden="true"></div>
            </div>

            <div class="airport" style="text-align:right;">
              <div class="time">${escapeHtml(fmtTime(r.sched_arr))}</div>
              <div class="code">${escapeHtml(r.destination || "—")} <span style="opacity:.65;">Arrival</span></div>
            </div>
          </div>
        </div>

        <div class="right">
          <div class="chip">${escapeHtml(dur)}</div>
          <div class="status ${statusClass(r.status)}"><span class="s-dot"></span>${escapeHtml(prettyStatus(r.status))}</div>
          <div class="chip">Gate ${escapeHtml(r.gate || "—")} • T${escapeHtml(r.terminal || "—")}</div>
        </div>
      </div>
    `;
    card.addEventListener("click", ()=>{
      if(!flightId) return;
      window.location.href = `flight.html?flight_id=${encodeURIComponent(flightId)}`;
    });
    list.appendChild(card);
  }
}

function render(){
  renderWeekStrip(cachedRows);
  const filtered = applyFilters(cachedRows);
  renderFlights(filtered);
  document.querySelector("#lastUpdated").textContent = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}

async function load(){
  document.querySelector("#lastUpdated").textContent = "Updating…";
  const { data, error } = await rpcPublicFlights(null);

  if(error){
    console.error(error);
    document.querySelector("#flightList").innerHTML = `
      <div class="notice">
        <b>Cannot load flights.</b><br/>
        Your backend must expose a public RPC named <code>${escapeHtml(EGR_CONFIG.RPC_PUBLIC_FLIGHTS)}</code> with a date parameter.<br/>
        Error: <code>${escapeHtml(error.message || String(error))}</code>
      </div>`;
    return;
  }

  cachedRows = Array.isArray(data) ? data : [];
  render();
}

function bind(){
  const dateInput = document.querySelector("#date");
  dateInput.value = new Date().toISOString().slice(0,10);

  for(const id of ["q","status","origin","dest","date"]){
    const el = document.querySelector("#"+id);
    el.addEventListener("input", ()=>render());
    el.addEventListener("change", ()=>render());
  }

  document.querySelector("#prevWeek").addEventListener("click", ()=>{
    const d = new Date(dateInput.value);
    d.setDate(d.getDate() - 7);
    dateInput.value = isoDate(d);
    render();
  });
  document.querySelector("#nextWeek").addEventListener("click", ()=>{
    const d = new Date(dateInput.value);
    d.setDate(d.getDate() + 7);
    dateInput.value = isoDate(d);
    render();
  });

  document.querySelector("#refresh").addEventListener("click", ()=>load());

  // Auto refresh every 60s
  setInterval(()=>load(), 60000);
}

window.addEventListener("DOMContentLoaded", async ()=>{
  document.querySelector("[data-brand-name]").textContent = EGR_CONFIG.BRAND_NAME;
  document.querySelector("[data-brand-sub]").textContent = EGR_CONFIG.BRAND_SUBTITLE;

  const logos = document.querySelectorAll("[data-brand-logo]");
  logos.forEach(img => img.src = EGR_CONFIG.BRAND_LOGO_URL);

  await initSupabase();
  bind();
  await load();
});
