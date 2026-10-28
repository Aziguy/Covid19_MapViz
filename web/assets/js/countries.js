import {
  CONTINENTS,
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
  sourceSwitch,
  timeChart,
} from "./core.js";

const $ = (s) => document.querySelector(s);
const state = { data: null, sort: "cases", dir: -1, query: "", continent: "", selected: null, view: "daily" };
let chart = null;

const COLUMNS = [
  { key: "rank", label: "#", sortable: false },
  { key: "name", label: "Pays" },
  { key: "cases", label: "Cas", format: fmt },
  { key: "deaths", label: "Décès", format: fmt },
  { key: "recovered", label: "Guéris", format: fmt },
  { key: "active", label: "Actifs", format: fmt },
  { key: "deathRate", label: "Létalité", format: pct },
  { key: "casesPerMillion", label: "Cas / 1 M", format: fmt, live: true },
];

const columns = () => COLUMNS.filter((c) => !c.live || state.data?.state === "live");

function renderHead() {
  $("[data-thead]").innerHTML = columns()
    .map((c) => {
      if (c.sortable === false) return `<th scope="col">${c.label}</th>`;
      const sort = state.sort === c.key ? (state.dir > 0 ? "ascending" : "descending") : "none";
      return `<th scope="col" aria-sort="${sort}"><button type="button" data-sort="${c.key}">${c.label}</button></th>`;
    })
    .join("");
}

function filtered() {
  const q = state.query
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const norm = (s) =>
    String(s)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  return state.data.rows
    .filter((r) => !state.continent || r.continent === state.continent)
    .filter((r) => !q || norm(r.name).includes(q) || norm(r.nameEn).includes(q))
    .sort((a, b) => {
      const k = state.sort;
      if (k === "name") return state.dir * a.name.localeCompare(b.name, "fr");
      return state.dir * ((a[k] ?? -1) - (b[k] ?? -1));
    });
}

function renderBody() {
  const rows = filtered();
  const cols = columns();
  $("[data-count]").textContent = `${rows.length} pays`;
  $("[data-tbody]").innerHTML = rows.length
    ? rows
        .map(
          (r, i) => `<tr data-id="${esc(r.id)}" tabindex="0" aria-selected="${r.id === state.selected}">
          ${cols
            .map((c) => {
              if (c.key === "rank") return `<td>${i + 1}</td>`;
              if (c.key === "name")
                return `<td><span class="country-cell">${flag(r)}${esc(r.name)}</span></td>`;
              return `<td>${c.format(r[c.key])}</td>`;
            })
            .join("")}
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="${cols.length}" class="empty">Aucun pays ne correspond à la recherche.</td></tr>`;
}

function renderContinents() {
  const present = new Set(state.data.rows.map((r) => r.continent).filter(Boolean));
  const select = $("[data-continent]");
  select.disabled = !present.size;
  select.innerHTML =
    `<option value="">Tous les continents</option>` +
    Object.entries(CONTINENTS)
      .filter(([k]) => present.has(k))
      .map(([k, v]) => `<option value="${k}"${k === state.continent ? " selected" : ""}>${v}</option>`)
      .join("");
}

function stat(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

async function renderDetail() {
  const el = $("[data-detail]");
  const c = state.data.rows.find((r) => r.id === state.selected);
  chart?.destroy();
  chart = null;
  if (!c) {
    el.innerHTML = `<div class="empty">Sélectionnez un pays dans le tableau.</div>`;
    return;
  }
  const live = state.data.state === "live";
  el.innerHTML = `
    <div class="detail__head">
      ${flag(c)}
      <div>
        <h2>${esc(c.name)}</h2>
        <p>${esc(live ? CONTINENTS[c.continent] || c.continent || "Pays ou territoire" : "Archive du 1er avril 2020")}${c.population ? ` · ${compact(c.population)} habitants` : ""}</p>
      </div>
    </div>
    <dl class="mini">
      ${stat("Cas confirmés", fmt(c.cases))}
      ${stat("Décès", fmt(c.deaths))}
      ${stat("Guérisons", fmt(c.recovered))}
      ${stat("Cas actifs", fmt(c.active))}
      ${stat("Létalité", pct(c.deathRate))}
      ${live ? stat("Décès / 1 M hab.", fmt(c.deathsPerMillion)) : stat("Taux de guérison", pct(c.recoveryRate))}
    </dl>
    <div class="card__head">
      <div><h2>Historique</h2><p>Cas confirmés, données JHU CSSE</p></div>
      ${
        live
          ? `<div class="segmented" role="group" aria-label="Vue" data-view>
        <button type="button" data-v="daily" aria-pressed="${state.view === "daily"}">Quotidien</button>
        <button type="button" data-v="cumulative" aria-pressed="${state.view === "cumulative"}">Cumul</button>
      </div>`
          : ""
      }
    </div>
    <div class="card__body"><div class="chart chart--sm" data-history><div class="skeleton" style="height:100%"></div></div></div>`;

  const box = el.querySelector("[data-history]");
  if (!live) {
    box.innerHTML = `<div class="empty">L'historique par pays est disponible avec la source « Dernières données ».</div>`;
    return;
  }
  try {
    const series = await loadHistory(c.id.length === 3 ? c.id : c.nameEn);
    if (state.selected !== c.id) return;
    const dates = series.map((p) => p.date);
    const datasets =
      state.view === "daily"
        ? [
            { label: "Nouveaux cas", data: daily(series, "cases"), color: "--c-cases", type: "bar" },
            { label: "Moyenne 7 j", data: rolling(daily(series, "cases")), color: "--c-cases" },
          ]
        : [{ label: "Cas cumulés", data: series.map((p) => p.cases), color: "--c-cases", fill: true }];
    box.innerHTML = "<canvas></canvas>";
    chart = timeChart(box.firstChild, { dates, datasets });
  } catch {
    box.innerHTML = `<div class="empty">Historique indisponible pour ce territoire.</div>`;
  }
}

function select(id) {
  state.selected = id;
  history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  document
    .querySelectorAll("[data-tbody] tr")
    .forEach((tr) => tr.setAttribute("aria-selected", tr.dataset.id === id));
  renderDetail();
  if (matchMedia("(max-width: 1180px)").matches)
    $("[data-detail]").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function load(mode) {
  $("[data-tbody]").innerHTML =
    `<tr><td colspan="8"><div class="skeleton" style="height:240px"></div></td></tr>`;
  state.data = await loadCountries(mode);
  setStatus(state.data);
  if (state.data.state !== "live" && state.sort === "casesPerMillion") state.sort = "cases";
  if (!state.data.rows.some((r) => r.continent === state.continent)) state.continent = "";
  const hash = decodeURIComponent(location.hash.slice(1));
  const match = state.data.rows.find((r) => r.id === hash || r.name === hash || r.nameEn === hash);
  state.selected = match?.id ?? state.data.rows[0]?.id;
  renderContinents();
  renderHead();
  renderBody();
  renderDetail();
}

$("[data-thead]").addEventListener("click", (e) => {
  const key = e.target.closest("[data-sort]")?.dataset.sort;
  if (!key) return;
  state.dir = state.sort === key ? -state.dir : key === "name" ? 1 : -1;
  state.sort = key;
  renderHead();
  renderBody();
});

$("[data-tbody]").addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (tr) select(tr.dataset.id);
});

$("[data-tbody]").addEventListener("keydown", (e) => {
  const tr = e.target.closest("tr[data-id]");
  if (tr && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    select(tr.dataset.id);
  }
});

$("[data-detail]").addEventListener("click", (e) => {
  const v = e.target.closest("[data-v]")?.dataset.v;
  if (v && v !== state.view) {
    state.view = v;
    renderDetail();
  }
});

$("[data-search]").addEventListener("input", (e) => {
  state.query = e.target.value.trim();
  renderBody();
});

$("[data-continent]").addEventListener("change", (e) => {
  state.continent = e.target.value;
  renderBody();
});

sourceSwitch($("[data-source-switch]"), load);
load();
