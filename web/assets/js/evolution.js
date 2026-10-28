import { compact, daily, fdate, fmt, loadHistory, rolling, setStatus, timeChart } from "./core.js";

const $ = (s) => document.querySelector(s);
const RANGES = [
  ["all", "Tout"],
  ["2020", "2020"],
  ["2021", "2021"],
  ["2022", "2022"],
  ["2023", "2023"],
  ["90", "90 j"],
];
const charts = [];
let series = [];
let range = "all";

function slice() {
  if (range === "all") return series;
  if (range === "90") return series.slice(-90);
  return series.filter((p) => p.date.getUTCFullYear() === Number(range));
}

function peak(values, dates) {
  let i = 0;
  values.forEach((v, j) => {
    if ((v ?? 0) > (values[i] ?? 0)) i = j;
  });
  return { value: values[i], date: dates[i] };
}

function kpi(label, value, meta, color) {
  return `<article class="card kpi" style="--kpi-color:var(${color})">
    <div class="kpi__label">${label}</div>
    <div class="kpi__value">${value}</div>
    <div class="kpi__meta">${meta}</div>
  </article>`;
}

function render() {
  charts.splice(0).forEach((c) => c.destroy());
  const data = slice();
  const dates = data.map((p) => p.date);
  const first = data[0];
  const last = data.at(-1);
  const prev = series[series.indexOf(first) - 1];
  const base = prev ? prev.cases : 0;
  const baseDeaths = prev ? prev.deaths : 0;
  const newCases = daily(data, "cases");
  const newDeaths = daily(data, "deaths");
  if (prev) {
    newCases[0] = Math.max(0, first.cases - prev.cases);
    newDeaths[0] = Math.max(0, first.deaths - prev.deaths);
  }
  const avgCases = rolling(newCases);
  const avgDeaths = rolling(newDeaths);
  const pc = peak(avgCases, dates);
  const pd = peak(avgDeaths, dates);

  $("[data-period]").textContent = `Du ${fdate(first.date)} au ${fdate(last.date)}`;
  $("[data-kpis]").innerHTML = [
    kpi("Cas sur la période", compact(last.cases - base), `${fmt(last.cases)} au total`, "--c-cases"),
    kpi(
      "Décès sur la période",
      compact(last.deaths - baseDeaths),
      `${fmt(last.deaths)} au total`,
      "--c-deaths",
    ),
    kpi("Pic de cas (moy. 7 j)", compact(pc.value), `le ${fdate(pc.date)}`, "--c-cases"),
    kpi("Pic de décès (moy. 7 j)", compact(pd.value), `le ${fdate(pd.date)}`, "--c-deaths"),
    kpi("Jours couverts", fmt(data.length), `Dernier point : ${fdate(last.date)}`, "--line-strong"),
  ].join("");

  charts.push(
    timeChart($('[data-chart="cumulative"]'), {
      dates,
      datasets: [{ label: "Cas cumulés", data: data.map((p) => p.cases), color: "--c-cases", fill: true }],
    }),
    timeChart($('[data-chart="cases"]'), {
      dates,
      legend: true,
      datasets: [
        { label: "Nouveaux cas", data: newCases, color: "--c-cases", type: "bar" },
        { label: "Moyenne 7 jours", data: avgCases, color: "--c-cases" },
      ],
    }),
    timeChart($('[data-chart="deaths"]'), {
      dates,
      legend: true,
      datasets: [
        { label: "Décès quotidiens", data: newDeaths, color: "--c-deaths", type: "bar" },
        { label: "Moyenne 7 jours", data: avgDeaths, color: "--c-deaths" },
      ],
    }),
  );
}

function renderRanges() {
  const years = new Set(series.map((p) => String(p.date.getUTCFullYear())));
  $("[data-range]").innerHTML = RANGES.filter(([k]) => k.length !== 4 || years.has(k))
    .map(
      ([k, label]) => `<button type="button" data-k="${k}" aria-pressed="${k === range}">${label}</button>`,
    )
    .join("");
}

$("[data-range]").addEventListener("click", (e) => {
  const k = e.target.closest("[data-k]")?.dataset.k;
  if (!k || k === range) return;
  range = k;
  renderRanges();
  render();
});

try {
  series = await loadHistory("all");
  setStatus({ state: "live", label: `JHU CSSE · jusqu'au ${fdate(series.at(-1).date)}` });
  renderRanges();
  render();
} catch {
  setStatus({ state: "archive", fallback: true });
  document.querySelectorAll(".chart").forEach((el) => {
    el.innerHTML = `<div class="empty">Série temporelle indisponible : l'API disease.sh ne répond pas.</div>`;
  });
}
