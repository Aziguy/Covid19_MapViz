import pandas as pd
import pytest

from covid_mapviz.data import normalize


@pytest.fixture
def raw_df():
    return pd.DataFrame(
        {
            "Date": ["01/04/2020", "01/04/2020", "01/04/2020"],
            "Pays": ["France", "Italie", "Tuvalu"],
            "Infections": [100, 200, 0],
            "Deces": [10, 20, 0],
            "Guerisons": [30, 40, 0],
            "Latitudes": [46.6, 42.6, -8.5],
            "Longitudes": [2.2, 12.6, 179.2],
        }
    )


@pytest.fixture
def df(raw_df):
    return normalize(raw_df)


@pytest.fixture
def api_payload():
    return [
        {
            "updated": 1700000000000,
            "country": "France",
            "continent": "Europe",
            "countryInfo": {"lat": 46, "long": 2},
            "cases": 1000,
            "deaths": 10,
            "recovered": 900,
            "active": 90,
        },
        {
            "updated": 1700000000000,
            "country": "Japan",
            "countryInfo": {"lat": 36, "long": 138},
            "cases": 500,
            "deaths": 5,
            "recovered": 0,
            "active": 495,
        },
    ]
