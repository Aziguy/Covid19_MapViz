"""Chargement, validation et agrégation des données."""

from __future__ import annotations

import io
from importlib import resources
from pathlib import Path

import pandas as pd

ARCHIVE_FILE = "covid19-countries-2020-04-01.csv"

SOURCE_COLUMNS = {
    "Date": "date",
    "Pays": "country",
    "Infections": "cases",
    "Deces": "deaths",
    "Guerisons": "recovered",
    "Latitudes": "lat",
    "Longitudes": "lon",
}

SCHEMA = [
    "date",
    "country",
    "cases",
    "deaths",
    "recovered",
    "active",
    "death_rate",
    "recovery_rate",
    "active_rate",
    "lat",
    "lon",
]

METRICS = ("cases", "deaths", "recovered", "active")


class DataError(ValueError):
    """Données invalides ou incomplètes."""


def _decode(raw: bytes) -> str:
    if raw.startswith((b"\xff\xfe", b"\xfe\xff")):
        return raw.decode("utf-16")
    return raw.decode("utf-8-sig")


def read_table(raw: bytes) -> pd.DataFrame:
    """Lit un CSV en UTF-8 ou UTF-16, séparateur détecté automatiquement."""
    return pd.read_csv(io.StringIO(_decode(raw)), sep=None, engine="python")


def _rate(part: pd.Series, total: pd.Series) -> pd.Series:
    return (part / total.where(total > 0) * 100).fillna(0).round(2)


def normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Convertit un tableau source vers le schéma commun `SCHEMA`."""
    df = df.rename(columns=SOURCE_COLUMNS)
    missing = sorted({"country", "cases", "deaths", "recovered", "lat", "lon"} - set(df.columns))
    if missing:
        raise DataError(f"Colonnes manquantes : {', '.join(missing)}")

    out = df.dropna(subset=["country", "lat", "lon"]).copy()
    for col in ("cases", "deaths", "recovered"):
        out[col] = pd.to_numeric(out[col], errors="coerce").fillna(0).astype("int64")
    if (out[["cases", "deaths", "recovered"]] < 0).any().any():
        raise DataError("Les compteurs doivent être positifs")

    if "date" in out.columns:
        out["date"] = pd.to_datetime(out["date"], dayfirst=True, errors="coerce").dt.date
    else:
        out["date"] = None
    if "active" not in out.columns:
        out["active"] = out["cases"] - out["deaths"] - out["recovered"]
    out["active"] = pd.to_numeric(out["active"], errors="coerce").fillna(0).clip(lower=0)
    out["active"] = out["active"].astype("int64")
    out["death_rate"] = _rate(out["deaths"], out["cases"])
    out["recovery_rate"] = _rate(out["recovered"], out["cases"])
    out["active_rate"] = _rate(out["active"], out["cases"])
    out["lat"] = out["lat"].astype(float)
    out["lon"] = out["lon"].astype(float)
    return out[SCHEMA].sort_values("cases", ascending=False).reset_index(drop=True)


def load_csv(path: str | Path) -> pd.DataFrame:
    """Charge et normalise un fichier CSV."""
    return normalize(read_table(Path(path).read_bytes()))


def load_archive() -> pd.DataFrame:
    """Charge l'archive embarquée du 1er avril 2020."""
    raw = resources.files("covid_mapviz").joinpath("data", ARCHIVE_FILE).read_bytes()
    return normalize(read_table(raw))


def summarize(df: pd.DataFrame) -> dict:
    """Totaux mondiaux et taux dérivés."""
    totals = {m: int(df[m].sum()) for m in METRICS}
    cases = totals["cases"]
    dates = df["date"].dropna()
    return {
        **totals,
        "countries": int(len(df)),
        "death_rate": round(totals["deaths"] / cases * 100, 2) if cases else 0.0,
        "recovery_rate": round(totals["recovered"] / cases * 100, 2) if cases else 0.0,
        "date": max(dates).isoformat() if len(dates) else None,
    }


def top(df: pd.DataFrame, metric: str = "cases", n: int = 10) -> pd.DataFrame:
    """Les `n` pays les plus touchés selon `metric`."""
    if metric not in METRICS:
        raise DataError(f"Métrique inconnue : {metric}")
    return df.nlargest(n, metric).reset_index(drop=True)


def to_records(df: pd.DataFrame) -> list[dict]:
    """Sérialisation JSON compatible."""
    out = df.copy()
    out["date"] = out["date"].map(lambda d: d.isoformat() if d else None)
    return out.to_dict(orient="records")
