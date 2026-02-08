function fmtTime(iso){
  if(!iso) return "—";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
function fmtDate(isoOrDate){
  if(!isoOrDate) return "—";
  // supports YYYY-MM-DD
  if(/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  const d = new Date(isoOrDate);
  if(Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0,10);
}
function statusClass(status){
  const s = String(status||"").toUpperCase();
  if(["LANDED","ARRIVED","COMPLETED"].includes(s)) return "good";
  if(["DELAYED","DIVERTED"].includes(s)) return "warn";
  if(["CANCELLED"].includes(s)) return "bad";
  return "neut";
}
function prettyStatus(status){
  const s = String(status||"").replaceAll("_"," ").trim();
  if(!s) return "UNKNOWN";
  return s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
}
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}
