import json

import pytest

from covid_mapviz import api, site


@pytest.fixture
def web_dir(tmp_path):
    web = tmp_path / "web"
    web.mkdir()
    (web / "index.html").write_text("<html></html>")
    return web


def test_build_site_offline(tmp_path, web_dir):
    out = tmp_path / "out"
    out.mkdir()
    (out / "stale.txt").write_text("x")
    assert site.build_site(out, web_dir, live=False) == ["archive"]
    assert not (out / "stale.txt").exists()
    assert (out / "index.html").exists()
    assert (out / "maps" / "archive-2020-04-01.html").exists()
    data = json.loads((out / "data" / "archive-2020-04-01.json").read_text())
    assert data["summary"]["countries"] == len(data["countries"]) == 191


def test_build_site_live(tmp_path, web_dir, df, monkeypatch):
    monkeypatch.setattr(api, "fetch_countries", lambda: df)
    assert site.build_site(tmp_path / "out", web_dir) == ["archive", "latest"]
    assert (tmp_path / "out" / "maps" / "latest.html").exists()
    assert json.loads((tmp_path / "out" / "data" / "latest.json").read_text())["source"]


def test_build_site_live_failure(tmp_path, web_dir, monkeypatch, capsys):
    def fail():
        raise api.ApiError("down")

    monkeypatch.setattr(api, "fetch_countries", fail)
    assert site.build_site(tmp_path / "out", web_dir) == ["archive"]
    assert "down" in capsys.readouterr().out
