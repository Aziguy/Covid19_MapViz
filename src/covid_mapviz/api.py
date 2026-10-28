"""Client de l'API publique disease.sh."""

from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
import requests

from covid_mapviz.data import normalize

API_URL = "https://disease.sh/v3/covid-19"
TIMEOUT = 15


class ApiError(RuntimeError):
    """Échec d'appel ou réponse inattendue de l'API."""


def get_json(path: str, session: requests.Session | None = None, **params) -> object:
    http = session or requests.Session()
    try:
        response = http.get(f"{API_URL}/{path}", params=params or None, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise ApiError(f"API indisponible : {exc}") from exc


def parse_countries(payload: list[dict]) -> pd.DataFrame:
    """Convertit la réponse `/countries` vers le schéma commun."""
    if not isinstance(payload, list):
        raise ApiError("Réponse inattendue : liste de pays attendue")
    rows = []
    for item in payload:
        info = item.get("countryInfo") or {}
        updated = item.get("updated")
        rows.append(
            {
                "date": (
                    datetime.fromtimestamp(updated / 1000, tz=timezone.utc).date()
                    if updated
                    else None
                ),
                "country": item.get("country"),
                "cases": item.get("cases", 0),
                "deaths": item.get("deaths", 0),
                "recovered": item.get("recovered", 0),
                "active": item.get("active"),
                "lat": info.get("lat"),
                "lon": info.get("long"),
            }
        )
    df = pd.DataFrame(rows)
    if df.empty:
        raise ApiError("Réponse vide")
    df["date"] = df["date"].map(lambda d: d.strftime("%d/%m/%Y") if d else None)
    if df["active"].isna().all():
        df = df.drop(columns="active")
    return normalize(df)


def fetch_countries(session: requests.Session | None = None) -> pd.DataFrame:
    """Dernières données par pays."""
    return parse_countries(get_json("countries", session))


def fetch_history(session: requests.Session | None = None) -> dict:
    """Série mondiale cumulée brute `{cases, deaths, recovered}` indexée par date."""
    payload = get_json("historical/all", session, lastdays="all")
    if not isinstance(payload, dict) or "cases" not in payload:
        raise ApiError("Réponse inattendue : série temporelle attendue")
    return payload
