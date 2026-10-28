import { icon, setStatus } from "./core.js";

const frame = document.querySelector("[data-frame]");
const open = document.querySelector("[data-open]");
const tabs = [...document.querySelectorAll("[data-map]")];

function show(tab) {
  tabs.forEach((t) => t.setAttribute("aria-selected", t === tab));
  frame.src = tab.dataset.map;
  open.href = tab.dataset.map;
}

open.innerHTML = `${icon("external")}Ouvrir en plein écran`;
tabs.forEach((t) => t.addEventListener("click", () => !t.disabled && show(t)));

const latest = tabs.find((t) => t.dataset.map.includes("latest"));
fetch(latest.dataset.map, { method: "HEAD" })
  .then((r) => {
    if (!r.ok) throw new Error();
    setStatus({ state: "live", label: "Cartes du dernier déploiement" });
  })
  .catch(() => {
    latest.disabled = true;
    latest.title = "Non générée lors du dernier déploiement (API injoignable)";
    setStatus({ state: "archive", label: "Archive du 1er avril 2020" });
  });
