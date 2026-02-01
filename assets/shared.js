export function fmtTime(d){
  const dt = new Date(d);
  return dt.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
export function fmtDate(d){
  const dt = new Date(d);
  return dt.toLocaleDateString([], {day:"2-digit", month:"short"});
}
export function dow(d){
  const dt = new Date(d);
  return dt.toLocaleDateString([], {weekday:"long"});
}
export function startOfWeek(date){
  // Monday as start
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - day);
  return d;
}
export function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
export function durationHhMm(start, end){
  const ms = new Date(end) - new Date(start);
  const mins = Math.max(0, Math.round(ms/60000));
  const h = Math.floor(mins/60);
  const m = mins % 60;
  const hh = h > 0 ? `${h}h` : "0h";
  return `${hh} ${String(m).padStart(2,"0")}m`;
}
export function toast(msg){
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
export function revealOnScroll(){
  const els = document.querySelectorAll(".card");
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, {threshold: .12});
  els.forEach(el=>io.observe(el));
}