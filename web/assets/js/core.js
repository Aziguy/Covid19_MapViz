export const API = "https://disease.sh/v3/covid-19";
const CACHE_TTL = 10 * 60 * 1000;
const REPO = "https://github.com/Aziguy/Covid19_MapViz";

export const METRICS = {
  cases: { label: "Cas confirmés", short: "Cas", color: "--c-cases" },
  deaths: { label: "Décès", short: "Décès", color: "--c-deaths" },
  recovered: { label: "Guérisons", short: "Guéris", color: "--c-recovered" },
  active: { label: "Cas actifs", short: "Actifs", color: "--c-active" },
};

export const CONTINENTS = {
  Europe: "Europe",
  Asia: "Asie",
  "North America": "Amérique du Nord",
  "South America": "Amérique du Sud",
  Africa: "Afrique",
  "Australia-Oceania": "Océanie",
};

export const CONTINENT_COLORS = {
  Europe: "--cat-1",
  Asia: "--cat-2",
  "North America": "--cat-3",
  "South America": "--cat-4",
  Africa: "--cat-5",
  "Australia-Oceania": "--cat-6",
};

const PAGES = [
  ["index.html", "Vue d'ensemble"],
  ["pays.html", "Pays"],
  ["evolution.html", "Évolution"],
  ["comparer.html", "Comparer"],
  ["analyses.html", "Analyses"],
  ["cartes.html", "Cartes Folium"],
  ["a-propos.html", "À propos"],
];

const ICONS = {
  logo: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
  auto: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  github:
    '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  api: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16"/>',
  external: '<path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/* Storage */
function store(kind) {
  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function getPref(key, fallback) {
  try {
    return store("localStorage")?.getItem(`cmv:${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setPref(key, value) {
  try {
    store("localStorage")?.setItem(`cmv:${key}`, value);
  } catch {
    /* stockage indisponible */
  }
}

/* Theme */
const THEMES = ["auto", "light", "dark"];
const THEME_LABEL = { auto: "Thème : système", light: "Thème : clair", dark: "Thème : sombre" };

function applyTheme(theme) {
  if (theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = theme;
  const btn = document.querySelector("[data-theme-toggle]");
  if (btn) {
    btn.innerHTML = icon(theme === "auto" ? "auto" : theme === "dark" ? "moon" : "sun");
    btn.setAttribute("aria-label", THEME_LABEL[theme]);
    btn.title = THEME_LABEL[theme];
  }
  document.dispatchEvent(new CustomEvent("themechange"));
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () =>
  document.dispatchEvent(new CustomEvent("themechange")),
);

export function onThemeChange(cb) {
  document.addEventListener("themechange", cb);
}

export function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* Formatting */
const nf = new Intl.NumberFormat("fr-FR");
const cf = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
const pf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const df = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const dtf = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });
const regions = (() => {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" });
  } catch {
    return null;
  }
})();

const missing = (n) => n == null || Number.isNaN(n);
export const fmt = (n) => (missing(n) ? "n/d" : nf.format(Math.round(n)));
export const compact = (n) => (missing(n) ? "n/d" : cf.format(n));
export const pct = (n) => (missing(n) ? "n/d" : `${pf.format(n)} %`);
export const fdate = (d) => (d ? df.format(new Date(d)) : "n/d");
export const fdatetime = (d) => (d ? dtf.format(new Date(d)) : "n/d");
export const rate = (part, total) => (total > 0 ? (part / total) * 100 : 0);

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function flag(c, cls = "flag") {
  return c.flag
    ? `<img class="${cls}" src="${esc(c.flag)}" alt="" loading="lazy" width="22" height="15" onerror="this.remove()">`
    : `<span class="${cls} flag--empty" aria-hidden="true"></span>`;
}

/* Data */
async function fetchJSON(url, timeout = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function cached(key, loader) {
  const ss = store("sessionStorage");
  try {
    const hit = JSON.parse(ss?.getItem(`cmv:${key}`) ?? "null");
    if (hit && Date.now() - hit.t < CACHE_TTL) return hit.v;
  } catch {
    /* cache illisible */
  }
  const value = await loader();
  try {
    ss?.setItem(`cmv:${key}`, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    /* quota atteint */
  }
  return value;
}

function fromApi(c) {
  const info = c.countryInfo ?? {};
  const name = (info.iso2 && regions?.of(info.iso2)) || c.country;
  return {
    id: info.iso3 || c.country,
    name,
    nameEn: c.country,
    flag: info.flag,
    continent: c.continent,
    lat: info.lat,
    lon: info.long,
    cases: c.cases,
    deaths: c.deaths,
    recovered: c.recovered,
    active: c.active,
    todayCases: c.todayCases,
    todayDeaths: c.todayDeaths,
    population: c.population || null,
    casesPerMillion: c.casesPerOneMillion,
    deathsPerMillion: c.deathsPerOneMillion,
    tests: c.tests,
    updated: c.updated,
  };
}

function fromSnapshot(c) {
  return {
    id: c.country,
    name: c.country,
    nameEn: c.country,
    flag: null,
    continent: c.continent ?? null,
    lat: c.lat,
    lon: c.lon,
    cases: c.cases,
    deaths: c.deaths,
    recovered: c.recovered,
    active: c.active,
    population: null,
    updated: c.date,
  };
}

function finish(rows) {
  return rows
    .filter((r) => r.lat != null && r.lon != null)
    .map((r) => ({ ...r, deathRate: rate(r.deaths, r.cases), recoveryRate: rate(r.recovered, r.cases) }))
    .sort((a, b) => b.cases - a.cases);
}

const ARCHIVE_URL = "data/archive-2020-04-01.json";

async function loadArchive() {
  const data = await fetchJSON(ARCHIVE_URL);
  return { state: "archive", updated: "2020-04-01", rows: finish(data.countries.map(fromSnapshot)) };
}

export async function loadCountries(mode = getSource()) {
  if (mode === "archive") return loadArchive();
  try {
    const raw = await cached("countries", () => fetchJSON(`${API}/countries`));
    const rows = finish(raw.map(fromApi));
    return { state: "live", updated: Math.max(...rows.map((r) => r.updated || 0)), rows };
  } catch (err) {
    console.warn("API indisponible, repli sur l'instantané", err);
  }
  try {
    const data = await fetchJSON("data/latest.json");
    return { state: "snapshot", updated: data.summary.date, rows: finish(data.countries.map(fromSnapshot)) };
  } catch {
    return { ...(await loadArchive()), fallback: true };
  }
}

function toSeries(timeline) {
  return Object.keys(timeline.cases).map((k) => {
    const [m, d, y] = k.split("/").map(Number);
    return {
      date: new Date(Date.UTC(2000 + y, m - 1, d)),
      cases: timeline.cases[k],
      deaths: timeline.deaths?.[k] ?? null,
      recovered: timeline.recovered?.[k] ?? null,
    };
  });
}

export async function loadHistory(country = "all") {
  if (country === "all") {
    try {
      return toSeries(await cached("history:all", () => fetchJSON(`${API}/historical/all?lastdays=all`)));
    } catch {
      return toSeries(await fetchJSON("data/history.json"));
    }
  }
  const data = await cached(`history:${country}`, () =>
    fetchJSON(`${API}/historical/${encodeURIComponent(country)}?lastdays=all`),
  );
  return toSeries(data.timeline);
}

export function daily(series, key) {
  return series.map((p, i) => (i === 0 || p[key] == null ? 0 : Math.max(0, p[key] - series[i - 1][key])));
}

export function rolling(values, size = 7) {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= size) sum -= values[i - size];
    return i >= size - 1 ? sum / size : null;
  });
}

export function totals(rows) {
  const t = { cases: 0, deaths: 0, recovered: 0, active: 0, todayCases: 0, todayDeaths: 0, population: 0 };
  for (const r of rows) for (const k of Object.keys(t)) t[k] += r[k] || 0;
  return {
    ...t,
    countries: rows.length,
    deathRate: rate(t.deaths, t.cases),
    recoveryRate: rate(t.recovered, t.cases),
  };
}

/* Source */
export function getSource() {
  const q = new URLSearchParams(location.search).get("source");
  if (q === "archive" || q === "live") return q;
  return getPref("source", "live");
}

export function sourceSwitch(container, onChange) {
  const current = getSource();
  container.innerHTML = `
    <div class="segmented" role="group" aria-label="Source des données">
      <button type="button" data-source="live" aria-pressed="${current === "live"}">Dernières données</button>
      <button type="button" data-source="archive" aria-pressed="${current === "archive"}">Archive 01/04/2020</button>
    </div>`;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-source]");
    if (!btn || btn.getAttribute("aria-pressed") === "true") return;
    setPref("source", btn.dataset.source);
    const url = new URL(location.href);
    url.searchParams.delete("source");
    history.replaceState(null, "", url);
    container.querySelectorAll("[data-source]").forEach((b) => b.setAttribute("aria-pressed", b === btn));
    onChange(btn.dataset.source);
  });
}

export function setStatus(data) {
  const el = document.querySelector("[data-status]");
  if (!el) return;
  const text = {
    live: `disease.sh · ${fdatetime(data.updated)}`,
    snapshot: `Instantané du ${fdate(data.updated)}`,
    archive: data.fallback ? "Hors ligne · archive 2020" : "Archive du 1er avril 2020",
  }[data.state];
  el.dataset.state = data.state;
  el.innerHTML = `<span class="status__dot"></span><span>${esc(data.label || text)}</span>`;
  el.title = {
    live: "Données servies en direct par l'API publique disease.sh",
    snapshot: "API injoignable : instantané généré lors du dernier déploiement",
    archive: "Jeu de données historique embarqué",
  }[data.state];
}

/* Shell */
function renderShell() {
  const page = location.pathname.split("/").pop() || "index.html";
  const nav = PAGES.map(
    ([href, label]) => `<a href="${href}"${href === page ? ' aria-current="page"' : ""}>${label}</a>`,
  ).join("");
  document.querySelector("[data-header]").outerHTML = `
    <header class="header">
      <div class="container header__inner">
        <a class="brand" href="index.html">
          <span class="brand__logo">${icon("logo")}</span>
          <span>Covid19 MapViz<small>Tableau de bord mondial</small></span>
        </a>
        <nav class="nav" aria-label="Navigation principale">${nav}</nav>
        <div class="header__actions">
          <span class="status" data-status><span class="status__dot"></span><span>Chargement…</span></span>
          <button class="icon-btn" type="button" data-theme-toggle></button>
          <a class="icon-btn" href="${REPO}" aria-label="Code source sur GitHub" title="Code source">${icon("github")}</a>
        </div>
      </div>
    </header>`;
  document.querySelector("[data-footer]").outerHTML = `
    <footer class="footer">
      <div class="container">
        <span>Données : <a href="https://disease.sh">disease.sh</a> (JHU CSSE, Worldometers) et archive du 01/04/2020.</span>
        <span>Licence MIT · <a href="${REPO}">GitHub</a> · <a href="a-propos.html">Méthodologie</a></span>
      </div>
    </footer>`;
  const theme = getPref("theme", "auto");
  applyTheme(THEMES.includes(theme) ? theme : "auto");
  document.querySelector("[data-theme-toggle]").addEventListener("click", () => {
    const next = THEMES[(THEMES.indexOf(getPref("theme", "auto")) + 1) % THEMES.length];
    setPref("theme", next);
    applyTheme(next);
  });
}

renderShell();

/* Charts */
const crosshair = {
  id: "crosshair",
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.();
    if (!active?.length) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.strokeStyle = css("--line-strong");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

const tickDate = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });
const tipDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function timeChart(canvas, { dates, datasets, legend = false, format = fmt }) {
  const Chart = window.Chart;
  const build = () => ({
    type: "line",
    data: {
      labels: dates,
      datasets: datasets.map((d) => {
        const color = css(d.color);
        return {
          label: d.label,
          data: d.data,
          type: d.type || "line",
          borderColor: color,
          backgroundColor: d.type === "bar" ? `${color}55` : d.fill ? `${color}1f` : color,
          fill: !!d.fill,
          borderWidth: d.type === "bar" ? 0 : 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: css("--surface"),
          pointHoverBackgroundColor: color,
          tension: 0.25,
          spanGaps: true,
          barPercentage: 1,
          categoryPercentage: 1,
          order: d.type === "bar" ? 2 : 1,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 4, right: 4 } },
      plugins: {
        legend: {
          display: legend,
          position: "top",
          align: "start",
          labels: {
            color: css("--ink-2"),
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            boxHeight: 8,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: css("--surface"),
          titleColor: css("--ink"),
          bodyColor: css("--ink-2"),
          borderColor: css("--line"),
          borderWidth: 1,
          padding: 10,
          cornerRadius: 10,
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          callbacks: {
            title: (items) => tipDate.format(dates[items[0].dataIndex]),
            label: (item) => ` ${item.dataset.label} : ${format(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: css("--line-strong") },
          ticks: {
            color: css("--ink-3"),
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: canvas.parentElement.clientWidth < 520 ? 4 : 7,
            callback: (_, i) => tickDate.format(dates[i]),
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: css("--grid") },
          border: { display: false },
          ticks: { color: css("--ink-3"), maxTicksLimit: 6, callback: (v) => compact(v) },
        },
      },
    },
    plugins: [crosshair],
  });
  let chart = new Chart(canvas, build());
  const refresh = () => {
    chart.destroy();
    chart = new Chart(canvas, build());
  };
  onThemeChange(refresh);
  return {
    destroy() {
      document.removeEventListener("themechange", refresh);
      chart.destroy();
    },
  };
}
