export function getTheme(){
  const stored = localStorage.getItem("egr_theme");
  if(stored === "dark" || stored === "light") return stored;
  // default: match OS preference
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? "light" : "dark";
}

export function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("egr_theme", theme);
}

export function toggleTheme(){
  const next = getTheme() === "light" ? "dark" : "light";
  setTheme(next);
  return next;
}

export function initThemeToggle(btn){
  setTheme(getTheme());
  if(!btn) return;
  const refreshLabel = () => {
    const t = getTheme();
    btn.querySelector(".label").textContent = t === "light" ? "Light" : "Dark";
    btn.querySelector(".dot").style.background = t === "light" ? "#1957ff" : "var(--accent)";
    btn.querySelector(".moon").textContent = t === "light" ? "☀︎" : "☾";
  };
  refreshLabel();
  btn.addEventListener("click", () => {
    toggleTheme();
    refreshLabel();
  });
}