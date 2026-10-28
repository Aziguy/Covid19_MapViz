"""Génération du site statique (GitHub Pages)."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pandas as pd

from covid_mapviz import api
from covid_mapviz.data import load_archive, summarize, to_records
from covid_mapviz.maps import build_map

WEB_DIR = Path(__file__).resolve().parents[2] / "web"


def write_dataset(df: pd.DataFrame, path: Path, source: str) -> None:
    payload = {"source": source, "summary": summarize(df), "countries": to_records(df)}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def build_site(out_dir: Path, web_dir: Path = WEB_DIR, live: bool = True) -> list[str]:
    """Copie le dashboard, exporte l'archive en JSON et génère les cartes Folium."""
    out_dir = Path(out_dir)
    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.copytree(web_dir, out_dir)

    (out_dir / "maps").mkdir(exist_ok=True)
    archive = load_archive()
    write_dataset(archive, out_dir / "data" / "archive-2020-04-01.json", "archive")
    build_map(archive, subtitle="Archive du 1er avril 2020").save(
        str(out_dir / "maps" / "archive-2020-04-01.html")
    )
    built = ["archive"]

    if live:
        try:
            latest = api.fetch_countries()
        except api.ApiError as exc:
            print(f"Carte live ignorée : {exc}")
        else:
            date = summarize(latest)["date"]
            write_dataset(latest, out_dir / "data" / "latest.json", "disease.sh")
            build_map(latest, subtitle=f"disease.sh, mise à jour {date}").save(
                str(out_dir / "maps" / "latest.html")
            )
            built.append("latest")
    return built
