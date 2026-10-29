import { METRICS, css, esc, fmt, pct } from "./core.js";

const LIB = "https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js";
const WORLD = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
// Antarctique, et Corée du Nord dont le polygone 110m fait échouer h3 (hexPolygons)
const SKIP = new Set(["010", "408"]);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Chargement impossible : ${src}`));
    document.head.append(s);
  });
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function label(c, metric) {
  return `<div class="globe-tip"><strong>${esc(c.name)}</strong>
    ${METRICS[metric].label} : ${fmt(c[metric])}<br>Létalité : ${pct(c.deathRate)}</div>`;
}

export async function createGlobe(el, { onSelect }) {
  if (!window.Globe) await loadScript(LIB);
  const topo = await fetch(WORLD).then((r) => r.json());
  const countries = window.topojson
    .feature(topo, topo.objects.countries)
    .features.filter((f) => !SKIP.has(f.id));

  const globe = window
    .Globe({ animateIn: !reduced })(el)
    .backgroundColor("rgba(0,0,0,0)")
    .showAtmosphere(true)
    .atmosphereAltitude(0.16)
    .hexPolygonsData(countries)
    .hexPolygonResolution(3)
    .hexPolygonMargin(0.35)
    .hexPolygonUseDots(true)
    .pointLat("lat")
    .pointLng("lon")
    .pointRadius(0.42)
    .pointResolution(16)
    .pointsMerge(false)
    .pointsTransitionDuration(reduced ? 0 : 600)
    .onPointClick((d) => onSelect?.(d))
    .ringLat("lat")
    .ringLng("lon")
    .ringMaxRadius(4.5)
    .ringPropagationSpeed(2.2)
    .ringRepeatPeriod(1500);

  const controls = globe.controls();
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.35;
  controls.enableDamping = true;
  globe.pointOfView({ lat: 25, lng: 10, altitude: el.clientWidth < 640 ? 3.2 : 2.45 }, 0);

  const resize = () => globe.width(el.clientWidth).height(el.clientHeight);
  new ResizeObserver(resize).observe(el);
  resize();

  const theme = () => {
    globe.atmosphereColor(css("--globe-glow")).hexPolygonColor(() => css("--globe-land"));
    const mat = globe.globeMaterial();
    mat.color.set(css("--globe-body"));
    mat.emissive?.set(css("--globe-body"));
    mat.emissiveIntensity = 0.35;
    mat.shininess = 6;
  };

  let current = { rows: [], metric: "cases" };
  const update = (rows = current.rows, metric = current.metric) => {
    current = { rows, metric };
    theme();
    const color = css(METRICS[metric].color);
    const max = Math.max(...rows.map((r) => r[metric] || 0), 1);
    const data = rows.filter((r) => r[metric] > 0);
    globe
      .pointsData(data)
      .pointAltitude((d) => 0.01 + 0.3 * Math.sqrt(d[metric] / max))
      .pointColor(() => color)
      .pointLabel((d) => label(d, metric));
    const top = [...data].sort((a, b) => b[metric] - a[metric]).slice(0, reduced ? 0 : 5);
    globe.ringsData(top).ringColor(() => (t) => rgba(color, 0.8 * (1 - t)));
  };

  return {
    update,
    pause: () => {
      controls.autoRotate = false;
      globe.pauseAnimation();
    },
    resume: () => {
      globe.resumeAnimation();
      controls.autoRotate = !reduced;
      resize();
    },
  };
}
