import { css, onThemeChange } from "./core.js";

const WORLD = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

function unwrap(ring) {
  const lons = ring.map((p) => p[0]);
  if (Math.max(...lons) - Math.min(...lons) <= 180) return ring;
  return ring.map(([x, y]) => [x < 0 ? x + 360 : x, y]);
}

function land(topo) {
  const geo = window.topojson.feature(topo, topo.objects.countries);
  geo.features = geo.features
    .filter((f) => f.id !== "010")
    .map((f) => {
      const g = f.geometry;
      if (g.type === "Polygon") g.coordinates = g.coordinates.map(unwrap);
      if (g.type === "MultiPolygon") g.coordinates = g.coordinates.map((poly) => poly.map(unwrap));
      return f;
    });
  return geo;
}

const BOUNDS = [
  [-48, -150],
  [72, 170],
];

export function createWorldMap(el) {
  const L = window.L;
  const map = L.map(el, {
    minZoom: 0,
    maxZoom: 7,
    zoomSnap: 0.25,
    worldCopyJump: true,
    attributionControl: true,
  });
  map.attributionControl.setPrefix(false).addAttribution("Fond : Natural Earth · Données : disease.sh");
  const fit = () => map.fitBounds(BOUNDS, { animate: false });
  fit();
  let width = el.clientWidth;
  new ResizeObserver(() => {
    if (el.clientWidth === width) return;
    width = el.clientWidth;
    map.invalidateSize();
    fit();
  }).observe(el);

  let layer;
  const landStyle = () => ({
    color: css("--map-border"),
    weight: 0.6,
    fillColor: css("--map-land"),
    fillOpacity: 1,
    interactive: false,
  });
  fetch(WORLD)
    .then((r) => r.json())
    .then((topo) => {
      layer = L.geoJSON(land(topo), { style: landStyle });
      layer.addTo(map).bringToBack();
    })
    .catch(() => {});
  onThemeChange(() => layer?.setStyle(landStyle()));

  return { map, fit };
}

export function bubbleRadius(value, max, maxRadius = 32) {
  if (!max || value <= 0) return 0;
  return Math.max(2.5, maxRadius * Math.sqrt(value / max));
}
