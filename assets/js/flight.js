/* global EGR_CONFIG, fmtTime, fmtDate, statusClass, prettyStatus, escapeHtml */
let supabaseClient = null;

async function initSupabase(){
  const { createClient } = window.supabase;
  supabaseClient = createClient(EGR_CONFIG.SUPABASE_URL, EGR_CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  return supabaseClient;
}

async function rpcPublicFlight(flightId){
  const name = EGR_CONFIG.RPC_PUBLIC_FLIGHT;
  // Try direct single-flight RPC if it exists
  let res = await supabaseClient.rpc(name, { p_flight_id: flightId });
  if(!res.error) return res;

  // Fallback: load all and filter
  const list = await supabaseClient.rpc(EGR_CONFIG.RPC_PUBLIC_FLIGHTS);
  if(list.error) return list;
  const found = (list.data || []).find(r => (r.flight_id || r.flightId) === flightId);
  return { data: found ? [found] : [], error: null };
}

function renderFlight(r){
  const flightNo = r.flight_number || "—";
  const date = fmtDate(r.flight_date);
  const from = r.origin || "—";
  const to = r.destination || "—";
  const std = fmtTime(r.sched_dep);
  const sta = fmtTime(r.sched_arr);
  const gate = r.gate || "—";
  const terminal = r.terminal || "—";
  const status = r.status || "UNKNOWN";

  document.querySelector("#title").textContent = `${flightNo} • ${from} → ${to}`;
  document.querySelector("#sub").textContent = `${date} • STD ${std} • STA ${sta}`;

  document.querySelector("#f_flight").textContent = flightNo;
  document.querySelector("#f_date").textContent = date;
  document.querySelector("#f_from").textContent = from;
  document.querySelector("#f_to").textContent = to;
  document.querySelector("#f_std").textContent = std;
  document.querySelector("#f_sta").textContent = sta;
  document.querySelector("#f_gate").textContent = gate;
  document.querySelector("#f_terminal").textContent = terminal;

  const el = document.querySelector("#f_status");
  el.className = `status ${statusClass(status)}`;
  el.innerHTML = `<span class="s-dot"></span>${escapeHtml(prettyStatus(status))}`;
}

window.addEventListener("DOMContentLoaded", async ()=>{
  document.querySelector("[data-airline]").textContent = EGR_CONFIG.DEFAULT_AIRLINE_NAME;
  await initSupabase();

  const qs = new URLSearchParams(window.location.search);
  const flightId = qs.get("flight_id");
  if(!flightId){
    document.querySelector("#box").innerHTML = `<div class="notice"><b>Missing flight_id.</b></div>`;
    return;
  }

  const { data, error } = await rpcPublicFlight(flightId);
  if(error){
    document.querySelector("#box").innerHTML = `
      <div class="notice">
        <b>Cannot load flight.</b><br/>
        Error: <code>${escapeHtml(error.message || String(error))}</code>
      </div>`;
    return;
  }

  const r = Array.isArray(data) ? data[0] : data;
  if(!r){
    document.querySelector("#box").innerHTML = `<div class="notice">Flight not found.</div>`;
    return;
  }
  renderFlight(r);
});
