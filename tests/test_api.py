from datetime import date

import pytest
import requests
import responses

from covid_mapviz import api


@responses.activate
def test_fetch_countries(api_payload):
    responses.get(f"{api.API_URL}/countries", json=api_payload)
    df = api.fetch_countries()
    assert df["country"].tolist() == ["France", "Japan"]
    assert df.loc[0, "date"] == date(2023, 11, 14)
    assert df.loc[1, "active"] == 495


@responses.activate
def test_fetch_countries_http_error():
    responses.get(f"{api.API_URL}/countries", status=503)
    with pytest.raises(api.ApiError):
        api.fetch_countries()


@responses.activate
def test_fetch_countries_network_error():
    responses.get(f"{api.API_URL}/countries", body=requests.ConnectionError("down"))
    with pytest.raises(api.ApiError, match="indisponible"):
        api.fetch_countries(session=requests.Session())


@responses.activate
def test_fetch_countries_invalid_json():
    responses.get(f"{api.API_URL}/countries", body="not json")
    with pytest.raises(api.ApiError):
        api.fetch_countries()


@pytest.mark.parametrize("payload", [{"message": "error"}, []])
def test_parse_countries_invalid(payload):
    with pytest.raises(api.ApiError):
        api.parse_countries(payload)


def test_parse_countries_without_active_or_date(api_payload):
    for item in api_payload:
        del item["active"]
        del item["updated"]
    df = api.parse_countries(api_payload)
    assert df.loc[0, "active"] == 90
    assert df["date"].isna().all()


@responses.activate
def test_fetch_history():
    payload = {"cases": {"1/22/20": 1}, "deaths": {"1/22/20": 0}, "recovered": {"1/22/20": 0}}
    responses.get(f"{api.API_URL}/historical/all", json=payload)
    assert api.fetch_history() == payload
    assert responses.calls[0].request.params == {"lastdays": "all"}


@responses.activate
def test_fetch_history_invalid():
    responses.get(f"{api.API_URL}/historical/all", json=["x"])
    with pytest.raises(api.ApiError):
        api.fetch_history()
