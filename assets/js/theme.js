import { qs } from "./utils.js";

export function initTheme(){
  const saved = localStorage.getItem("egr_theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  const btn = qs("#themeToggle");
  if(btn){
    btn.textContent = saved === "light" ? "Dark" : "Light";
    btn.addEventListener("click", ()=>{
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      const next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("egr_theme", next);
      btn.textContent = next === "light" ? "Dark" : "Light";
    });
  }
}
