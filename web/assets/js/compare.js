import {
  compact,
  daily,
  esc,
  flag,
  fmt,
  loadCountries,
  loadHistory,
  pct,
  rolling,
  setStatus,
  timeChart,
} from "./core.js";

const $ = (s) => document.querySelector(s);
const MAX = 3;
const SLOTS = ["--c-s1", "--c-s2", "--c-s3"];
const DEFAULTS = ["FRA", "ITA", "USA"];
const METRICS = {
  cases: { label: "Cas cumulés", key: "cases" },
  deaths: { label: "Décès cumulés", key: "deaths" },
  daily: { label: "Nouveaux cas", key: "cases", daily: true },
};
const SCALES = { capita: "Pour 1 M hab.", absolute: "Valeur absolue" };

const params = new URLSearchParams(location.search);
const state = {
  rows: [],
  picked: (params.get("c") || DEFAULTS.join(",")).split(",").filter(Boolean).slice(0, MAX),
  metric: METRICS[params.get("m")] ? params.get("m") : "cases",
  scale: SCALES[params.get("s")] ? params.get("s") : "capita",
  history: new Map(),
};
let chart = null;

const byId = (id) => state.rows.find((r) => r.id === id);

function syncUrl() {
  const url = new URL(location.href);
  url.searchParams.set("c", state.picked.join(","));
  url.searchParams.set("m", state.metric);
  url.searchParams.set("s", state.scale);
  history.replaceState(null, "", url);
}

function segmented(el, options, current) {
  el.innerHTML = Object.entries(options)
    .map(
      ([k, v]) =>
        `<button type="button" data-k="${k}" aria-pressed="${k === current}">${v.label || v}</button>`,
    )
    .join("");
}

function renderControls() {
  $("[data-chips]").innerHTML = state.picked
    .map((id, i) => {
      const c = byId(id);
      return `<span class="chip"><span class="swatch" style="background:var(${SLOTS[i]});margin:0"></span>${esc(c?.name ?? id)}
        <button type="button" data-remove="${esc(id)}" aria-label="Retirer ${esc(c?.name ?? id)}"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>`;
    })
    .join("");
  const add = $("[data-add]");
  add.disabled = state.picked.length >= MAX;
  add.innerHTML =
    `<option value="">${state.picked.length >= MAX ? "3 pays maximum" : "+ Ajouter un pays"}</option>` +
    [...state.rows]
      .filter((r) => r.id.length === 3 && !state.picked.includes(r.id))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map((r) => `<option value="${esc(r.id)}">${esc(r.name)}</option>`)
      .join("");
  segmented($("[data-metric]"), METRICS, state.metric);
  segmented($("[data-scale]"), SCALES, state.scale);
}

async function historyOf(id) {
  if (!state.history.has(id))
    state.history.set(
      id,
      loadHistory(id).catch(() => null),
    );
  return state.history.get(id);
}

function values(series, c) {
  const m = METRICS[state.metric];
  let v = m.daily ? rolling(daily(series, m.key)) : series.map((p) => p[m.key]);
  if (state.scale === "capita" && c.population)
    v = v.map((x) => (x == null ? null : (x / c.population) * 1e6));
  return v;
}

function renderCards() {
  $("[data-cards]").innerHTML = state.picked
    .map((id, i) => {
      const c = byId(id);
      if (!c) return "";
      return `<article class="card">
        <div class="detail__head" style="border-bottom:0;padding-bottom:4px">
          ${flag(c)}
          <div><h2 style="font-size:16px"><span class="swatch" style="background:var(${SLOTS[i]})"></span>${esc(c.name)}</h2>
          <p>${c.population ? `${compact(c.population)} habitants` : "Population inconnue"}</p></div>
        </div>
        <dl class="mini" style="border-bottom:0">
          <div><dt>Cas / 1 M hab.</dt><dd>${fmt(c.casesPerMillion)}</dd></div>
          <div><dt>Décès / 1 M hab.</dt><dd>${fmt(c.deathsPerMillion)}</dd></div>
          <div><dt>Cas confirmés</dt><dd>${compact(c.cases)}</dd></div>
          <div><dt>Létalité</dt><dd>${pct(c.deathRate)}</dd></div>
        </dl>
      </article>`;
    })
    .join("");
}

async function renderChart() {
  const token = Symbol();
  renderChart.token = token;
  const box = $("[data-chart]").parentElement;
  const all = await Promise.all(state.picked.map(historyOf));
  if (renderChart.token !== token) return;
  chart?.destroy();
  chart = null;
  const ok = state.picked.map((id, i) => ({ id, i, s: all[i], c: byId(id) })).filter((x) => x.s && x.c);
  if (!ok.length) {
    box.innerHTML = `<div class="empty">Ajoutez un pays pour lancer la comparaison.</div><canvas data-chart hidden></canvas>`;
    return;
  }
  if (!box.querySelector("canvas:not([hidden])"))
    box.innerHTML = `<canvas data-chart role="img" aria-label="Comparaison entre pays"></canvas>`;
  const ref = ok.reduce((a, b) => (b.s.length > a.s.length ? b : a)).s;
  const dates = ref.map((p) => p.date);
  const datasets = ok.map(({ s, c, i }) => {
    const v = values(s, c);
    const map = new Map(s.map((p, j) => [p.date.getTime(), v[j]]));
    return { label: c.name, data: dates.map((d) => map.get(d.getTime()) ?? null), color: SLOTS[i] };
  });
  const capita = state.scale === "capita";
  chart = timeChart($("[data-chart]"), {
    dates,
    datasets,
    legend: true,
    format: (v) => (v == null ? "n/d" : capita ? `${fmt(v)} / 1 M hab.` : fmt(v)),
  });
  const missing = state.picked.filter((id) => !ok.some((x) => x.id === id));
  $("[data-foot]").textContent =
    `${METRICS[state.metric].label}${METRICS[state.metric].daily ? " (moyenne 7 jours)" : ""}${capita ? " pour 1 million d'habitants" : ""}. Source : JHU CSSE via disease.sh.` +
    (missing.length ? ` Historique indisponible : ${missing.join(", ")}.` : "");
}

function update() {
  syncUrl();
  renderControls();
  renderCards();
  renderChart();
}

$("[data-chips]").addEventListener("click", (e) => {
  const id = e.target.closest("[data-remove]")?.dataset.remove;
  if (!id) return;
  state.picked = state.picked.filter((x) => x !== id);
  update();
});

$("[data-add]").addEventListener("change", (e) => {
  if (e.target.value && state.picked.length < MAX) state.picked.push(e.target.value);
  update();
});

$("[data-metric]").addEventListener("click", (e) => {
  const k = e.target.closest("[data-k]")?.dataset.k;
  if (k && k !== state.metric) {
    state.metric = k;
    update();
  }
});

$("[data-scale]").addEventListener("click", (e) => {
  const k = e.target.closest("[data-k]")?.dataset.k;
  if (k && k !== state.scale) {
    state.scale = k;
    update();
  }
});

const data = await loadCountries("live");
setStatus(data);
if (data.state !== "live") {
  $("[data-chart]").parentElement.innerHTML =
    `<div class="empty">La comparaison nécessite l'API disease.sh, actuellement injoignable.</div>`;
} else {
  state.rows = data.rows;
  state.picked = state.picked.filter(byId);
  update();
}
