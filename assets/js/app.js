/* global EGR_CONFIG, fmtTime, fmtDate, statusClass, prettyStatus, escapeHtml */
let supabaseClient = null;

async function initSupabase(){
  const { createClient } = window.supabase;
  supabaseClient = createClient(EGR_CONFIG.SUPABASE_URL, EGR_CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  return supabaseClient;
}

async function rpcPublicFlights(selectedDate){
  // Try with date parameter first (if your RPC supports it),
  // then fall back to calling without parameters.
  const name = EGR_CONFIG.RPC_PUBLIC_FLIGHTS;
  let res;
  if(selectedDate){
    res = await supabaseClient.rpc(name, { p_date: selectedDate });
    if(!res.error) return res;
  }
  res = await supabaseClient.rpc(name);
  return res;
}

function applyFilters(rows){
  const q = document.querySelector("#q").value.trim().toLowerCase();
  const status = document.querySelector("#status").value;
  const origin = document.querySelector("#origin").value.trim().toUpperCase();
  const dest = document.querySelector("#dest").value.trim().toUpperCase();
  const date = document.querySelector("#date").value;

  return rows.filter(r=>{
    const flight = String(r.flight_number || r.flightNo || "").toLowerCase();
    const from = String(r.origin || r.from || "").toUpperCase();
    const to = String(r.destination || r.to || "").toUpperCase();
    const st = String(r.status || "").toUpperCase();
    const fd = fmtDate(r.flight_date || r.flightDate || r.flight_day);

    if(date && fd !== date) return false;
    if(status && st !== status) return false;
    if(origin && from !== origin) return false;
    if(dest && to !== dest) return false;

    if(q){
      const hay = [
        flight,
        from.toLowerCase(),
        to.toLowerCase(),
        String(r.gate || "").toLowerCase(),
        String(r.terminal || "").toLowerCase()
      ].join(" ");
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function computeKpis(rows){
  const total = rows.length;
  const byStatus = rows.reduce((acc, r)=>{
    const s = String(r.status||"UNKNOWN").toUpperCase();
    acc[s] = (acc[s]||0)+1;
    return acc;
  }, {});
  const delayed = (byStatus["DELAYED"]||0);
  const cancelled = (byStatus["CANCELLED"]||0);
  const boarding = (byStatus["BOARDING"]||0);
  const checkin = (byStatus["CHECKIN_OPEN"]||0);
  return { total, delayed, cancelled, boarding, checkin };
}

function render(rows){
  const tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  if(rows.length === 0){
    tbody.innerHTML = `<tr><td colspan="9"><div class="notice">No flights match your filters.</div></td></tr>`;
    return;
  }

  for(const r of rows){
    const flightId = r.flight_id || r.flightId || "";
    const tr = document.createElement("tr");
    tr.dataset.flightId = flightId;
    tr.innerHTML = `
      <td><b>${escapeHtml(r.flight_number || r.flightNo || "—")}</b></td>
      <td>${escapeHtml(fmtDate(r.flight_date || r.flightDate || "—"))}</td>
      <td>${escapeHtml(r.origin || r.from || "—")}</td>
      <td>${escapeHtml(r.destination || r.to || "—")}</td>
      <td>${escapeHtml(fmtTime(r.sched_dep || r.std || r.scheduled_departure))}</td>
      <td>${escapeHtml(fmtTime(r.sched_arr || r.sta || r.scheduled_arrival))}</td>
      <td>
        <span class="status ${statusClass(r.status)}">
          <span class="s-dot"></span>
          ${escapeHtml(prettyStatus(r.status))}
        </span>
      </td>
      <td>${escapeHtml(r.gate || "—")}</td>
      <td>${escapeHtml(r.terminal || "—")}</td>
    `;
    tr.addEventListener("click", ()=>{
      if(!flightId) return;
      window.location.href = `flight.html?flight_id=${encodeURIComponent(flightId)}`;
    });
    tbody.appendChild(tr);
  }
}

function renderKpis(k){
  document.querySelector("#k_total").textContent = String(k.total);
  document.querySelector("#k_checkin").textContent = String(k.checkin);
  document.querySelector("#k_boarding").textContent = String(k.boarding);
  document.querySelector("#k_delayed").textContent = String(k.delayed);
  document.querySelector("#k_cancelled").textContent = String(k.cancelled);
}

async function load(){
  document.querySelector("#lastUpdated").textContent = "Updating…";
  const date = document.querySelector("#date").value;

  const { data, error } = await rpcPublicFlights(date || null);

  if(error){
    console.error(error);
    const tbody = document.querySelector("#tbody");
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="notice">
          <b>Cannot load flights.</b><br/>
          This site expects a public RPC called <code>${escapeHtml(EGR_CONFIG.RPC_PUBLIC_FLIGHTS)}</code>.<br/>
          Error: <code>${escapeHtml(error.message || String(error))}</code>
        </div>
      </td></tr>
    `;
    document.querySelector("#lastUpdated").textContent = "Update failed";
    renderKpis({total:0, delayed:0, cancelled:0, boarding:0, checkin:0});
    return;
  }

  const all = Array.isArray(data) ? data : [];
  const filtered = applyFilters(all);
  render(filtered);
  renderKpis(computeKpis(filtered));

  document.querySelector("#lastUpdated").textContent = new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}

function bind(){
  const qs = new URLSearchParams(window.location.search);
  const dateParam = qs.get("date");
  const dateInput = document.querySelector("#date");
  if(dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) dateInput.value = dateParam;
  else dateInput.value = new Date().toISOString().slice(0,10);

  for(const id of ["q","status","origin","dest","date"]){
    document.querySelector("#"+id).addEventListener("input", ()=>load());
    document.querySelector("#"+id).addEventListener("change", ()=>load());
  }
  document.querySelector("#refresh").addEventListener("click", ()=>load());

  // Auto refresh every 60s (public-safe alternative to Realtime)
  setInterval(()=>load(), 60000);
}

window.addEventListener("DOMContentLoaded", async ()=>{
  document.querySelector("[data-airline]").textContent = EGR_CONFIG.DEFAULT_AIRLINE_NAME;
  await initSupabase();
  bind();
  await load();
});
