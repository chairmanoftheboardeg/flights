/* global EGR_CONFIG, fmtTime, fmtDate, statusClass, prettyStatus, escapeHtml, durationMinutes, fmtDuration */
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
  const param = EGR_CONFIG.RPC_PUBLIC_FLIGHT_ID_PARAM || "p_flight_id";
  const args = {};
  args[param] = flightId;
  return await supabaseClient.rpc(name, args);
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
  const mins = durationMinutes(r.sched_dep, r.sched_arr);

  document.querySelector("#title").textContent = `${flightNo} • ${from} → ${to}`;
  document.querySelector("#sub").textContent = `${date} • STD ${std} • STA ${sta} • ${fmtDuration(mins)}`;

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
  document.querySelector("[data-brand-name]").textContent = EGR_CONFIG.BRAND_NAME;
  document.querySelector("[data-brand-logo]").src = EGR_CONFIG.BRAND_LOGO_URL;

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
        Your backend must expose <code>${escapeHtml(EGR_CONFIG.RPC_PUBLIC_FLIGHT)}</code>.<br/>
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
