import {
  CONTINENTS,
  CONTINENT_COLORS,
  METRICS,
  compact,
  css,
  esc,
  fmt,
  icon,
  loadCountries,
  onThemeChange,
  pct,
  rate,
  setStatus,
  sourceSwitch,
} from "./core.js";

const $ = (s) => document.querySelector(s);
const d3 = window.d3;
const TOP_WORLD = 10;
const TOP_GROUP = 8;
const SUN_METRICS = ["cases", "deaths"];
const OUTCOMES = [
  { key: "active", label: "Actifs ou non suivis", color: "--c-active" },
  { key: "recovered", label: "Guérisons déclarées", color: "--c-recovered" },
  { key: "deaths", label: "Décès", color: "--c-deaths" },
];

const state = { data: null, metric: "cases", focus: null };
const tip = $("[data-tip]");

const hasContinents = () => state.data.rows.some((r) => r.continent);
const continentName = (k) => CONTINENTS[k] || k;
const continentColor = (k) => css(CONTINENT_COLORS[k] || "--cat-other");

function showTip(e, html) {
  tip.innerHTML = html;
  tip.dataset.show = "true";
  const { innerWidth: w, innerHeight: h } = window;
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(e.clientX + 14, w - r.width - 8)}px`;
  tip.style.top = `${Math.min(e.clientY + 14, h - r.height - 8)}px`;
}

const hideTip = () => (tip.dataset.show = "false");

function sum(rows, key) {
  return rows.reduce((s, r) => s + (r[key] || 0), 0);
}

function topWithOther(rows, key, n, otherLabel) {
  const sorted = [...rows].sort((a, b) => (b[key] || 0) - (a[key] || 0));
  const head = sorted.slice(0, n);
  const tail = sorted.slice(n);
  if (!tail.length) return head;
  return [
    ...head,
    {
      id: `other:${otherLabel}`,
      name: otherLabel,
      other: true,
      count: tail.length,
      ...Object.fromEntries(["cases", "deaths", "recovered", "active"].map((k) => [k, sum(tail, k)])),
    },
  ];
}

/* Groupes : continents, pays d'un continent, ou pays (archive) */
function groups() {
  const rows = state.data.rows;
  if (state.focus) {
    const members = rows.filter((r) => r.continent === state.focus);
    return topWithOther(members, "cases", TOP_GROUP, "Autres pays").map((r) => ({
      ...r,
      color: continentColor(state.focus),
    }));
  }
  if (!hasContinents()) {
    return topWithOther(rows, "cases", TOP_WORLD, "Autres pays").map((r) => ({
      ...r,
      color: r.other ? css("--cat-other") : css("--c-cases"),
    }));
  }
  const by = d3.group(
    rows.filter((r) => r.continent),
    (r) => r.continent,
  );
  return [...by]
    .map(([k, members]) => ({
      id: k,
      name: continentName(k),
      continent: k,
      color: continentColor(k),
      count: members.length,
      members,
      ...Object.fromEntries(["cases", "deaths", "recovered", "active"].map((m) => [m, sum(members, m)])),
    }))
    .sort((a, b) => b.cases - a.cases);
}

function setFocus(continent) {
  if (continent && !hasContinents()) return;
  state.focus = continent;
  renderAll();
}

/* Sunburst */
function hierarchy() {
  const m = state.metric;
  if (state.focus) {
    const members = state.data.rows.filter((r) => r.continent === state.focus);
    return {
      name: continentName(state.focus),
      children: topWithOther(members, m, 12, "Autres pays").map((r) => ({
        name: r.name,
        value: r[m] || 0,
        other: r.other,
        continent: state.focus,
      })),
    };
  }
  if (!hasContinents()) {
    return {
      name: "Monde",
      children: topWithOther(state.data.rows, m, 12, "Autres pays").map((r) => ({
        name: r.name,
        value: r[m] || 0,
        other: r.other,
      })),
    };
  }
  return {
    name: "Monde",
    children: groups().map((g) => ({
      name: g.name,
      continent: g.continent,
      children: topWithOther(g.members, m, 14, `Autres (${g.name})`).map((r) => ({
        name: r.name,
        value: r[m] || 0,
        other: r.other,
        continent: g.continent,
      })),
    })),
  };
}

function renderSunburst() {
  const svg = d3.select("[data-sunburst]");
  const size = 520;
  const radius = size / 2;
  svg.attr("viewBox", `${-radius} ${-radius} ${size} ${size}`).selectAll("*").remove();

  const root = d3
    .hierarchy(hierarchy())
    .sum((d) => d.value || 0)
    .sort((a, b) => (a.data.other ? 1 : 0) - (b.data.other ? 1 : 0) || b.value - a.value);
  d3.partition().size([2 * Math.PI, root.height + 1])(root);

  const depth = root.height;
  const inner = radius * 0.34;
  const ringR = (y) => inner + ((radius - 4 - inner) * (y - 1)) / depth;
  const arc = d3
    .arc()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(0.004)
    .padRadius(radius / 2)
    .innerRadius((d) => ringR(d.y0) + 1)
    .outerRadius((d) => ringR(d.y1) - 1)
    .cornerRadius(2);

  const surface = css("--surface");
  const fill = (d) => {
    if (d.data.other) return css("--cat-other");
    if (d.data.continent) return continentColor(d.data.continent);
    return css(METRICS[state.metric].color);
  };
  const opacity = (d) => {
    if (depth === 2) return d.depth === 2 ? 0.62 : 1;
    const rank = d.parent.children.indexOf(d);
    return 1 - (0.45 * rank) / Math.max(d.parent.children.length - 1, 1);
  };
  const total = root.value || 1;
  const labelColor = (d) => {
    if (d.data.other || (depth === 2 && d.depth === 2) || opacity(d) < 0.75) return css("--ink");
    return d.data.continent === "South America" ? "#0b0b0b" : "#fff";
  };

  const nodes = root.descendants().filter((d) => d.depth > 0 && d.x1 - d.x0 > 0.0015);
  svg
    .append("g")
    .selectAll("path")
    .data(nodes)
    .join("path")
    .attr("d", arc)
    .attr("fill", fill)
    .attr("fill-opacity", opacity)
    .attr("stroke", surface)
    .attr("stroke-width", 1)
    .on("mousemove", (e, d) => {
      const parent =
        d.parent.depth > 0 ? ` · ${pct(rate(d.value, d.parent.value))} de ${esc(d.parent.data.name)}` : "";
      showTip(
        e,
        `<strong>${esc(d.data.name)}</strong>${METRICS[state.metric].label} : ${fmt(d.value)}<br>${pct(
          rate(d.value, total),
        )} ${state.focus ? "du continent" : "du total"}${parent}`,
      );
    })
    .on("mouseleave", hideTip)
    .on("click", (e, d) => {
      hideTip();
      const continent = d.data.continent;
      if (!state.focus && continent) setFocus(continent);
    });

  const labels = nodes.filter((d) => {
    const angle = d.x1 - d.x0;
    const mid = (ringR(d.y0) + ringR(d.y1)) / 2;
    return angle * mid > 16;
  });
  svg
    .append("g")
    .selectAll("text")
    .data(labels)
    .join("text")
    .attr("transform", (d) => {
      const a = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const r = (ringR(d.y0) + ringR(d.y1)) / 2;
      return `rotate(${a - 90}) translate(${r},0) rotate(${a < 180 ? 0 : 180})`;
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .style("fill", labelColor)
    .text((d) => {
      const room = Math.floor((ringR(d.y1) - ringR(d.y0)) / 6.2);
      return d.data.name.length > room ? `${d.data.name.slice(0, Math.max(room - 1, 3))}…` : d.data.name;
    });

  const center = svg.append("g").style("cursor", state.focus ? "pointer" : "default");
  center
    .append("circle")
    .attr("r", inner - 6)
    .attr("fill", state.focus ? css("--surface-2") : "transparent")
    .style("pointer-events", "all")
    .on("click", () => state.focus && setFocus(null));
  center
    .append("text")
    .attr("class", "center-value")
    .attr("text-anchor", "middle")
    .attr("dy", "0.1em")
    .text(compact(root.value));
  center
    .append("text")
    .attr("class", "center-label")
    .attr("text-anchor", "middle")
    .attr("dy", "1.7em")
    .text(state.focus ? `${continentName(state.focus)} · retour` : METRICS[state.metric].label);

  $("[data-sun-sub]").textContent = hasContinents()
    ? state.focus
      ? `Pays de ${continentName(state.focus)}. Cliquez au centre pour revenir au monde.`
      : "Continents au centre, pays à l'extérieur. Cliquez un continent pour zoomer."
    : "Pays les plus touchés et autres pays.";
  svg.attr(
    "aria-label",
    `Sunburst des ${METRICS[state.metric].label.toLowerCase()}, ${state.focus ? continentName(state.focus) : "monde"}`,
  );

  const items = root.children ?? [];
  $("[data-legend]").innerHTML = items
    .map(
      (d) => `<li>
        <i style="background:${fill(d)};opacity:${opacity(d)}"></i>
        ${
          d.data.continent && !state.focus
            ? `<button type="button" data-focus="${esc(d.data.continent)}">${esc(d.data.name)}</button>`
            : `<span class="rank__name"><span>${esc(d.data.name)}</span></span>`
        }
        <span class="num">${compact(d.value)}</span>
        <span class="share">${pct(rate(d.value, total))}</span>
      </li>`,
    )
    .join("");
}

function renderCrumbs() {
  $("[data-crumbs]").innerHTML = state.focus
    ? `<button type="button" data-focus="">Monde</button><span>›</span><span aria-current="page">${esc(
        continentName(state.focus),
      )}</span>`
    : `<span aria-current="page">Monde</span>${
        hasContinents() ? "<span>· cliquez un continent pour zoomer</span>" : ""
      }`;
}

function renderMetric() {
  $("[data-metric]").innerHTML = SUN_METRICS.map(
    (k) =>
      `<button type="button" data-k="${k}" aria-pressed="${k === state.metric}"><span class="swatch" style="background:var(${METRICS[k].color})"></span>${METRICS[k].label}</button>`,
  ).join("");
}

/* Sankey */
function renderSankey() {
  const svg = d3.select("[data-sankey]");
  const width = svg.node().clientWidth || 800;
  const narrow = width < 640;
  const list = groups().filter((g) => g.cases > 0);
  const padding = narrow ? 24 : 28;
  const height = Math.max(340, list.length * (padding + (narrow ? 22 : 30)));
  const margin = { left: narrow ? 104 : 168, right: narrow ? 112 : 180 };
  svg.attr("viewBox", `0 0 ${width} ${height}`).attr("height", height).selectAll("*").remove();

  const nodes = [
    ...list.map((g) => ({ id: g.id, name: g.name, color: g.color, group: g })),
    ...OUTCOMES.map((o) => ({ id: o.key, name: o.label, color: css(o.color), outcome: true })),
  ];
  const links = list.flatMap((g) =>
    OUTCOMES.filter((o) => g[o.key] > 0).map((o) => ({
      source: g.id,
      target: o.key,
      value: g[o.key],
      color: css(o.color),
    })),
  );

  const sankey = d3
    .sankey()
    .nodeId((d) => d.id)
    .nodeWidth(12)
    .nodePadding(padding)
    .nodeSort(null)
    .extent([
      [margin.left, 4],
      [width - margin.right, height - 4],
    ]);
  const graph = sankey({ nodes: nodes.map((d) => ({ ...d })), links: links.map((d) => ({ ...d })) });
  const total = d3.sum(list, (g) => g.cases) || 1;

  svg
    .append("g")
    .selectAll("path")
    .data(graph.links)
    .join("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => d.color)
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .on("mousemove", (e, d) =>
      showTip(
        e,
        `<strong>${esc(d.source.name)} → ${esc(d.target.name)}</strong>${fmt(d.value)} cas<br>${pct(
          rate(d.value, d.source.value),
        )} des cas de ${esc(d.source.name)}`,
      ),
    )
    .on("mouseleave", hideTip)
    .on("click", (e, d) => d.source.group?.continent && !state.focus && setFocus(d.source.group.continent));

  const node = svg.append("g").selectAll("g").data(graph.nodes).join("g");
  node
    .append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => Math.max(1, d.y1 - d.y0))
    .attr("rx", 3)
    .attr("fill", (d) => d.color)
    .on("mousemove", (e, d) =>
      showTip(
        e,
        `<strong>${esc(d.name)}</strong>${fmt(d.value)} cas · ${pct(rate(d.value, total))} du total`,
      ),
    )
    .on("mouseleave", hideTip)
    .on("click", (e, d) => d.group?.continent && !state.focus && setFocus(d.group.continent));

  const label = node
    .append("text")
    .attr("x", (d) => (d.outcome ? d.x1 + 8 : d.x0 - 8))
    .attr("y", (d) => (d.y0 + d.y1) / 2)
    .attr("text-anchor", (d) => (d.outcome ? "start" : "end"));
  label
    .append("tspan")
    .attr("dy", "-0.15em")
    .text((d) => (narrow && d.name.length > 14 ? `${d.name.slice(0, 13)}…` : d.name));
  label
    .append("tspan")
    .attr("class", "value")
    .attr("x", (d) => (d.outcome ? d.x1 + 8 : d.x0 - 8))
    .attr("dy", "1.2em")
    .text((d) => `${compact(d.value)} · ${pct(rate(d.value, total))}`);

  $("[data-sankey-sub]").textContent = state.focus
    ? `Pays de ${continentName(state.focus)} vers l'issue des cas`
    : hasContinents()
      ? "Continents vers l'issue des cas. Cliquez un continent pour détailler ses pays."
      : `Pays les plus touchés vers l'issue des cas`;
  $("[data-sankey-legend]").innerHTML = OUTCOMES.map(
    (o) => `<span><span class="swatch" style="background:var(${o.color})"></span>${o.label}</span>`,
  ).join("");
}

/* Tableau */
function renderTable() {
  const list = groups();
  const total = d3.sum(list, (g) => g.cases) || 1;
  const first = state.focus || !hasContinents() ? "Pays" : "Continent";
  $("[data-table-sub]").textContent = state.focus
    ? `${continentName(state.focus)} : ${TOP_GROUP} pays les plus touchés et autres`
    : `Valeurs par ${first.toLowerCase()}`;
  $("[data-thead]").innerHTML =
    `<tr><th>#</th><th>${first}</th><th>Cas</th><th>Décès</th><th>Guérisons</th><th>Actifs</th><th>Létalité</th><th>Part des cas</th></tr>`;
  $("[data-tbody]").innerHTML = list
    .map(
      (
        g,
        i,
      ) => `<tr${g.continent && !state.focus ? ` data-focus="${esc(g.continent)}"` : ' style="cursor:default"'}>
        <td>${i + 1}</td>
        <td><span class="country-cell"><span class="swatch" style="background:${g.color};margin:0"></span>${esc(g.name)}${
          g.other ? ` <span class="muted">(${g.count})</span>` : ""
        }</span></td>
        <td>${fmt(g.cases)}</td><td>${fmt(g.deaths)}</td><td>${fmt(g.recovered)}</td><td>${fmt(g.active)}</td>
        <td>${pct(rate(g.deaths, g.cases))}</td><td>${pct(rate(g.cases, total))}</td>
      </tr>`,
    )
    .join("");
}

function renderNotice() {
  const el = $("[data-notice]");
  el.hidden = hasContinents();
  el.innerHTML = `${icon("info")}<span>Les continents ne sont pas renseignés pour cette source : les graphiques présentent les pays les plus touchés.</span>`;
}

function renderAll() {
  if (!state.data) return;
  renderMetric();
  renderCrumbs();
  renderSunburst();
  renderSankey();
  renderTable();
  renderNotice();
}

async function load(mode) {
  state.data = await loadCountries(mode);
  state.focus = null;
  setStatus(state.data);
  renderAll();
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-focus]");
  if (el) setFocus(el.dataset.focus || null);
});

$("[data-metric]").addEventListener("click", (e) => {
  const k = e.target.closest("[data-k]")?.dataset.k;
  if (k && k !== state.metric) {
    state.metric = k;
    renderAll();
  }
});

let width = 0;
new ResizeObserver(() => {
  const w = $("[data-sankey]").clientWidth;
  if (state.data && w !== width) {
    width = w;
    renderSankey();
  }
}).observe($("[data-sankey]"));

onThemeChange(renderAll);
sourceSwitch($("[data-source-switch]"), load);
load();
