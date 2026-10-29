import {
  CONTINENTS,
  METRICS,
  css,
  esc,
  flag,
  fmt,
  compact,
  getPref,
  icon,
  loadCountries,
  onThemeChange,
  pct,
  setPref,
  setStatus,
  sourceSwitch,
  totals,
} from "./core.js";
import { bubbleRadius, createWorldMap } from "./worldmap.js";
import { createGlobe, webglAvailable } from "./globe.js";

const $ = (s) => document.querySelector(s);
const state = { data: null, metric: getPref("metric", "cases"), view: getPref("view", "2d") };
if (!METRICS[state.metric]) state.metric = "cases";
if (state.view !== "3d" || !webglAvailable()) state.view = "2d";
let globe = null;

const { map } = createWorldMap($("#map"));
const bubbles = window.L.layerGroup().addTo(map);

function kpi(label, value, meta, color) {
  return `<article class="card kpi" style="--kpi-color:var(${color})">
    <div class="kpi__label"><span class="swatch" style="background:var(${color})"></span>${label}</div>
    <div class="kpi__value">${value}</div>
    <div class="kpi__meta">${meta}</div>
  </article>`;
}

function renderKpis(rows, live) {
  const t = totals(rows);
  const today = (n) => (live && n ? `<span class="delta-up">+${fmt(n)}</span> aujourd'hui` : "");
  $("[data-kpis]").innerHTML = [
    kpi(
      "Cas confirmés",
      fmt(t.cases),
      today(t.todayCases) || `${fmt(t.countries)} pays et territoires`,
      "--c-cases",
    ),
    kpi("Décès", fmt(t.deaths), `Létalité <strong>${pct(t.deathRate)}</strong>`, "--c-deaths"),
    kpi("Guérisons", fmt(t.recovered), `Taux <strong>${pct(t.recoveryRate)}</strong>`, "--c-recovered"),
    kpi(
      "Cas actifs",
      fmt(t.active),
      `<strong>${pct((t.active / t.cases) * 100)}</strong> des cas`,
      "--c-active",
    ),
    live && t.population
      ? kpi("Incidence", fmt((t.cases / t.population) * 1e6), "cas pour 1 M d'habitants", "--line-strong")
      : kpi(
          "Pays touchés",
          fmt(t.countries),
          `Plus touché : <strong>${esc(rows[0]?.name)}</strong>`,
          "--line-strong",
        ),
  ].join("");
}

function popup(c) {
  return `<div class="pop">
    <h3>${flag(c)}${esc(c.name)}</h3>
    <dl>
      <dt>Cas confirmés</dt><dd>${fmt(c.cases)}</dd>
      <dt>Décès</dt><dd>${fmt(c.deaths)}</dd>
      <dt>Guérisons</dt><dd>${fmt(c.recovered)}</dd>
      <dt>Cas actifs</dt><dd>${fmt(c.active)}</dd>
      <dt>Létalité</dt><dd>${pct(c.deathRate)}</dd>
      ${c.population ? `<dt>Population</dt><dd>${compact(c.population)}</dd>` : ""}
    </dl>
    <a href="pays.html#${encodeURIComponent(c.id)}">Voir la fiche pays →</a>
  </div>`;
}

function renderMap() {
  const { rows } = state.data;
  const m = state.metric;
  const color = css(METRICS[m].color);
  const max = Math.max(...rows.map((r) => r[m] || 0));
  const maxRadius = Math.min(32, $("#map").clientWidth / 16);
  bubbles.clearLayers();
  [...rows]
    .sort((a, b) => (b[m] || 0) - (a[m] || 0))
    .forEach((c) => {
      const r = bubbleRadius(c[m] || 0, max, maxRadius);
      if (!r) return;
      window.L.circleMarker([c.lat, c.lon], {
        radius: r,
        color: css("--surface"),
        weight: 1,
        fillColor: color,
        fillOpacity: 0.55,
      })
        .bindTooltip(`<strong>${esc(c.name)}</strong><br>${METRICS[m].label} : ${fmt(c[m])}`, {
          direction: "top",
          offset: [0, -r],
        })
        .bindPopup(popup(c), { maxWidth: 280 })
        .on("mouseover", (e) => e.target.setStyle({ fillOpacity: 0.85 }))
        .on("mouseout", (e) => e.target.setStyle({ fillOpacity: 0.55 }))
        .addTo(bubbles);
    });

  if (state.view === "3d") return renderLegend();
  const steps = [max, max / 4, max / 25].map((v) => [v, bubbleRadius(v, max, maxRadius)]);
  $("[data-legend]").innerHTML = `<div class="legend__title">${METRICS[m].label}</div>
    <div class="legend__sizes" style="--legend-color:${color}">
      ${steps
        .map(
          ([v, r]) =>
            `<div class="legend__size"><i style="width:${r * 2}px;height:${r * 2}px"></i>${compact(Math.round(v))}</div>`,
        )
        .join("")}
    </div>`;
}

function renderLegend() {
  if (state.view !== "3d") return;
  $("[data-legend]").innerHTML = `<div class="legend__title">${METRICS[state.metric].label}</div>
    <div>Hauteur des barres proportionnelle à la valeur.<br>Glisser pour tourner, molette pour zoomer.</div>`;
}

async function renderGlobe() {
  if (state.view !== "3d" || !state.data) return;
  const el = $("[data-globe]");
  if (!globe) {
    el.innerHTML = `<div class="globe-status">Chargement du globe…</div>`;
    globe = createGlobe(el, {
      onSelect: (c) => (location.href = `pays.html#${encodeURIComponent(c.id)}`),
    }).catch((err) => {
      console.warn(err);
      el.innerHTML = `<div class="globe-status">Globe 3D indisponible sur cet appareil.</div>`;
      return null;
    });
    const g = await globe;
    el.querySelector(".globe-status")?.remove();
    if (!g) return;
  }
  const g = await globe;
  g?.update(state.data.rows, state.metric);
  renderLegend();
}

function applyView() {
  const is3d = state.view === "3d";
  $("#map").hidden = is3d;
  $("[data-globe]").hidden = !is3d;
  $("[data-legend]").classList.toggle("legend--3d", is3d);
  $("[data-map-sub]").textContent = is3d
    ? "Hauteur des barres proportionnelle à la valeur. Cliquez sur une barre pour la fiche pays."
    : "Surface des cercles proportionnelle à la valeur. Cliquez sur un pays pour le détail.";
  document
    .querySelectorAll("[data-view] [data-v]")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === state.view));
}

function setView(view) {
  state.view = view;
  setPref("view", view);
  applyView();
  if (!state.data) return;
  if (view === "3d") {
    globe?.then((g) => g?.resume());
    renderGlobe();
  } else {
    globe?.then((g) => g?.pause());
    map.invalidateSize();
    renderMap();
  }
}

function renderMetricSwitch() {
  $("[data-metric]").innerHTML = Object.entries(METRICS)
    .map(
      ([k, v]) =>
        `<button type="button" data-k="${k}" aria-pressed="${k === state.metric}"><span class="swatch" style="background:var(${v.color})"></span>${v.short}</button>`,
    )
    .join("");
}

function renderTop() {
  const m = state.metric;
  const rows = [...state.data.rows].sort((a, b) => (b[m] || 0) - (a[m] || 0)).slice(0, 10);
  const max = rows[0]?.[m] || 1;
  $("[data-top-title]").textContent = "Pays les plus touchés";
  $("[data-top-sub]").textContent = `Top 10 · ${METRICS[m].label.toLowerCase()}`;
  $("[data-top]").innerHTML = rows
    .map(
      (c, i) => `<li>
        <span class="rank__pos">${i + 1}</span>
        <a class="rank__name" href="pays.html#${encodeURIComponent(c.id)}">${flag(c)}<span>${esc(c.name)}</span></a>
        <span class="rank__value">${compact(c[m])}</span>
        <span class="rank__bar"><span style="width:${((c[m] / max) * 100).toFixed(1)}%;--bar-color:var(${METRICS[m].color})"></span></span>
      </li>`,
    )
    .join("");
}

function bars(items, color, format) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return items
    .map(
      (i) => `<div class="bars__row">
        <span>${esc(i.label)}</span><span>${format(i)}</span>
        <div class="bars__track"><span style="width:${((i.value / max) * 100).toFixed(1)}%;--bar-color:var(${color})"></span></div>
      </div>`,
    )
    .join("");
}

function renderContinents() {
  const { rows } = state.data;
  const el = $("[data-continents]");
  const total = totals(rows).cases;
  if (!rows.some((r) => r.continent)) {
    $("[data-continent-title]").textContent = "Concentration des cas";
    $("[data-continent-sub]").textContent = "Part des cas confirmés détenue par les pays les plus touchés";
    const items = [1, 3, 5, 10, 20].map((n) => ({
      label: n === 1 ? "Pays le plus touché" : `${n} pays les plus touchés`,
      value: rows.slice(0, n).reduce((s, r) => s + r.cases, 0),
    }));
    el.innerHTML = bars(items, "--c-cases", (i) => `${pct((i.value / total) * 100)} · ${compact(i.value)}`);
    return;
  }
  $("[data-continent-title]").textContent = "Répartition par continent";
  $("[data-continent-sub]").textContent = "Part des cas confirmés";
  const groups = {};
  for (const r of rows) if (r.continent) groups[r.continent] = (groups[r.continent] || 0) + r.cases;
  const items = Object.entries(groups)
    .map(([k, v]) => ({ label: CONTINENTS[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);
  el.innerHTML = bars(items, "--c-cases", (i) => `${compact(i.value)} · ${pct((i.value / total) * 100)}`);
}

function renderLethality() {
  const min = state.data.state === "archive" ? 1000 : 100000;
  $("[data-lethality-sub]").textContent =
    `Pays de plus de ${fmt(min)} cas, décès rapportés aux cas confirmés`;
  const items = state.data.rows
    .filter((r) => r.cases >= min)
    .sort((a, b) => b.deathRate - a.deathRate)
    .slice(0, 6)
    .map((r) => ({ label: r.name, value: r.deathRate, r }));
  $("[data-lethality]").innerHTML = items.length
    ? bars(items, "--c-deaths", (i) => `${pct(i.value)} · ${compact(i.r.deaths)} décès`)
    : `<div class="empty">Aucun pays éligible.</div>`;
}

function renderNotice() {
  const el = $("[data-notice]");
  const { state: s, fallback } = state.data;
  const msg = {
    snapshot:
      "L'API disease.sh est injoignable : affichage de l'instantané généré lors du dernier déploiement.",
    archive: fallback
      ? "Les données en ligne sont indisponibles : affichage de l'archive du 1er avril 2020."
      : "Vous consultez l'archive historique du 1er avril 2020, à l'origine du projet.",
    live: "Les sources amont (JHU CSSE, Worldometers) ont arrêté leur suivi en 2023-2024 : les valeurs affichées sont les derniers cumuls publiés.",
  }[s];
  el.innerHTML = `${icon("info")}<span>${msg}</span>`;
  el.hidden = false;
}

function renderAll() {
  renderKpis(state.data.rows, state.data.state === "live");
  renderMetricSwitch();
  renderMap();
  renderGlobe();
  renderTop();
  renderContinents();
  renderLethality();
  renderNotice();
  setStatus(state.data);
}

function skeleton() {
  $("[data-kpis]").innerHTML = Array.from({ length: 5 }, () =>
    kpi(
      '<span class="skeleton">Chargement</span>',
      '<span class="skeleton">0 000 000</span>',
      '<span class="skeleton">Chargement en cours</span>',
      "--line",
    ),
  ).join("");
}

async function load(mode) {
  skeleton();
  state.data = await loadCountries(mode);
  renderAll();
}

$("[data-metric]").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-k]");
  if (!btn) return;
  state.metric = btn.dataset.k;
  setPref("metric", state.metric);
  renderMetricSwitch();
  renderMap();
  renderGlobe();
  renderTop();
});

if (!webglAvailable()) $("[data-view]").hidden = true;
applyView();
$("[data-view]").addEventListener("click", (e) => {
  const v = e.target.closest("[data-v]")?.dataset.v;
  if (v && v !== state.view) setView(v);
});

sourceSwitch($("[data-source-switch]"), load);
onThemeChange(() => {
  if (!state.data) return;
  renderMap();
  globe?.then((g) => g?.update());
});
load();
