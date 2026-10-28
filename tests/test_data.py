import json
from datetime import date

import pandas as pd
import pytest

from covid_mapviz.data import (
    SCHEMA,
    DataError,
    load_archive,
    load_csv,
    normalize,
    read_table,
    summarize,
    to_records,
    top,
)


def test_normalize_schema_and_order(df):
    assert list(df.columns) == SCHEMA
    assert df["country"].tolist() == ["Italie", "France", "Tuvalu"]
    assert df.loc[0, "date"] == date(2020, 4, 1)


def test_normalize_derived_values(df):
    france = df.set_index("country").loc["France"]
    assert france["active"] == 60
    assert france["death_rate"] == 10.0
    assert france["recovery_rate"] == 30.0
    assert france["active_rate"] == 60.0


def test_normalize_zero_cases_has_zero_rates(df):
    tuvalu = df.set_index("country").loc["Tuvalu"]
    assert tuvalu[["death_rate", "recovery_rate", "active_rate"]].tolist() == [0, 0, 0]


def test_normalize_drops_missing_coordinates(raw_df):
    raw_df.loc[0, "Latitudes"] = None
    assert len(normalize(raw_df)) == 2


def test_normalize_without_date(raw_df):
    assert normalize(raw_df.drop(columns="Date"))["date"].isna().all()


def test_normalize_missing_columns(raw_df):
    with pytest.raises(DataError, match="lat"):
        normalize(raw_df.drop(columns="Latitudes"))


def test_normalize_rejects_negative(raw_df):
    raw_df.loc[0, "Deces"] = -1
    with pytest.raises(DataError):
        normalize(raw_df)


@pytest.mark.parametrize(
    ("encoding", "sep"), [("utf-8-sig", ";"), ("utf-16", "\t"), ("utf-8", ",")]
)
def test_read_table_encodings(raw_df, encoding, sep):
    raw = raw_df.to_csv(sep=sep, index=False).encode(encoding)
    assert read_table(raw).equals(raw_df)


def test_load_csv(tmp_path, raw_df):
    path = tmp_path / "data.csv"
    raw_df.to_csv(path, sep=";", index=False)
    assert len(load_csv(path)) == 3


def test_load_archive():
    archive = load_archive()
    assert len(archive) == 191
    assert archive.loc[0, "country"] == "États-Unis"
    assert summarize(archive)["cases"] == 883_208


def test_summarize(df):
    s = summarize(df)
    assert s == {
        "cases": 300,
        "deaths": 30,
        "recovered": 70,
        "active": 200,
        "countries": 3,
        "death_rate": 10.0,
        "recovery_rate": 23.33,
        "date": "2020-04-01",
    }


def test_summarize_empty():
    s = summarize(
        normalize(
            pd.DataFrame(
                columns=["Pays", "Infections", "Deces", "Guerisons", "Latitudes", "Longitudes"]
            )
        )
    )
    assert s["cases"] == 0 and s["death_rate"] == 0.0 and s["date"] is None


def test_top(df):
    assert top(df, "deaths", 1)["country"].tolist() == ["Italie"]
    with pytest.raises(DataError):
        top(df, "unknown")


def test_to_records_is_json_serializable(df):
    records = to_records(df)
    assert records[0]["date"] == "2020-04-01"
    json.dumps(records)
