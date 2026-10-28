"""Construction de la carte Folium."""

from __future__ import annotations

import math
from html import escape

import folium
import pandas as pd
from folium.plugins import Fullscreen

LAYERS = {
    "cases": ("Infections", "#2a78d6"),
    "deaths": ("Décès", "#e34948"),
    "recovered": ("Guérisons", "#1baf7a"),
    "active": ("Cas actifs", "#6250d6"),
}
MIN_RADIUS = 3
MAX_RADIUS = 40


def radius(value: float, max_value: float) -> float:
    """Rayon proportionnel à la surface, borné entre MIN_RADIUS et MAX_RADIUS."""
    if max_value <= 0 or value <= 0:
        return MIN_RADIUS
    return max(MIN_RADIUS, MAX_RADIUS * math.sqrt(value / max_value))


def fmt(value: float) -> str:
    return f"{int(value):,}".replace(",", " ")


def popup_html(row: pd.Series) -> str:
    return (
        f"<div style='font-family:system-ui,sans-serif;min-width:180px'>"
        f"<h4 style='margin:0 0 6px'>{escape(str(row['country']))}</h4>"
        f"<b>Infections :</b> {fmt(row['cases'])}<br>"
        f"<b style='color:#c0392b'>Décès :</b> {fmt(row['deaths'])} ({row['death_rate']} %)<br>"
        f"<b style='color:#1e8449'>Guérisons :</b> {fmt(row['recovered'])} "
        f"({row['recovery_rate']} %)<br>"
        f"<b>Cas actifs :</b> {fmt(row['active'])} ({row['active_rate']} %)"
        f"</div>"
    )


def title_html(title: str, subtitle: str = "") -> str:
    sub = f"<div style='font-size:12px;color:#52514e'>{escape(subtitle)}</div>" if subtitle else ""
    return (
        "<div style='position:fixed;top:12px;left:56px;z-index:1000;background:#fff;"
        "padding:8px 14px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.25);"
        "font-family:system-ui,sans-serif'>"
        f"<div style='font-size:16px;font-weight:600'>{escape(title)}</div>{sub}</div>"
    )


def build_map(
    df: pd.DataFrame,
    title: str = "COVID-19 dans le monde",
    subtitle: str = "",
    tiles: str = "OpenStreetMap",
) -> folium.Map:
    """Carte avec une couche de cercles par métrique et un popup détaillé par pays."""
    fmap = folium.Map(location=[20, 0], zoom_start=2, min_zoom=2, tiles=tiles, world_copy_jump=True)
    for metric, (label, color) in LAYERS.items():
        layer = folium.FeatureGroup(name=label, show=metric == "cases")
        peak = df[metric].max() if len(df) else 0
        for _, row in df.iterrows():
            folium.CircleMarker(
                location=[row["lat"], row["lon"]],
                radius=radius(row[metric], peak),
                color=color,
                weight=1,
                fill=True,
                fill_color=color,
                fill_opacity=0.45,
                tooltip=f"{row['country']} : {fmt(row[metric])}",
                popup=folium.Popup(popup_html(row), max_width=260),
            ).add_to(layer)
        layer.add_to(fmap)
    folium.LayerControl(collapsed=False).add_to(fmap)
    Fullscreen().add_to(fmap)
    fmap.get_root().html.add_child(folium.Element(title_html(title, subtitle)))
    return fmap
