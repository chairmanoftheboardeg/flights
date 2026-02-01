export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function toast(msg, type="info"){
  let el = document.querySelector(".toast");
  if(!el){
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> el.classList.remove("show"), 2600);
}

export function startOfWeek(d){
  const x = new Date(d);
  const day = (x.getDay()+6)%7; // Monday=0
  x.setHours(0,0,0,0);
  x.setDate(x.getDate()-day);
  return x;
}
export function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate()+n);
  return x;
}
export function fmtRange(weekStart){
  const a = new Date(weekStart);
  const b = addDays(a,6);
  const opts = { month:"short", day:"2-digit" };
  const left = a.toLocaleDateString(undefined, opts);
  const right = b.toLocaleDateString(undefined, opts);
  return `${left} – ${right}`;
}
export function fmtDay(d){
  return d.toLocaleDateString(undefined, { month:"short", day:"2-digit" });
}
export function dowName(d){
  return d.toLocaleDateString(undefined, { weekday:"long" });
}
export function isoDay(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x.toISOString().slice(0,10);
}

export function parseTS(ts){
  if(!ts) return null;
  return new Date(ts);
}
export function fmtTime(ts){
  const d = parseTS(ts);
  if(!d) return "—";
  return d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
}
export function fmtDateTime(ts){
  const d = parseTS(ts);
  if(!d) return "—";
  return d.toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}
export function minutesBetween(a,b){
  const da = parseTS(a); const db = parseTS(b);
  if(!da || !db) return null;
  return Math.max(0, Math.round((db-da)/60000));
}
export function fmtDuration(mins){
  if(mins==null) return "—";
  const h = Math.floor(mins/60);
  const m = mins%60;
  return `${h}h ${String(m).padStart(2,"0")}m`;
}

export function setupReveal(){
  const els = document.querySelectorAll(".fade-in");
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.08 });
  els.forEach(el=> io.observe(el));
}

export function setLoading(btn, isLoading, text="Working…"){
  if(!btn) return;
  btn.disabled = !!isLoading;
  btn.dataset._old = btn.dataset._old || btn.textContent;
  btn.textContent = isLoading ? text : btn.dataset._old;
}
