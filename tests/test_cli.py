import pytest

from covid_mapviz import api, cli


def test_map_archive(tmp_path, capsys):
    out = tmp_path / "sub" / "map.html"
    assert cli.main(["map", "-o", str(out)]) == 0
    assert out.exists()
    assert "191 pays" in capsys.readouterr().out


def test_map_from_csv(tmp_path, raw_df):
    path = tmp_path / "in.csv"
    raw_df.to_csv(path, index=False)
    out = tmp_path / "map.html"
    assert cli.main(["map", "--input", str(path), "-o", str(out)]) == 0
    assert out.exists()


def test_stats_api_fallback(monkeypatch, capsys):
    def fail():
        raise api.ApiError("down")

    monkeypatch.setattr(api, "fetch_countries", fail)
    assert cli.main(["stats", "--source", "api", "--top", "3"]) == 0
    out = capsys.readouterr().out
    assert "repli sur l'archive" in out
    assert " 1. États-Unis" in out and " 4." not in out


def test_stats_api(monkeypatch, capsys, df):
    monkeypatch.setattr(api, "fetch_countries", lambda: df)
    assert cli.main(["stats", "--source", "api", "--metric", "deaths"]) == 0
    assert "temps réel" in capsys.readouterr().out


def test_site(monkeypatch, tmp_path):
    calls = {}
    monkeypatch.setattr(cli, "build_site", lambda out, live: calls.update(live=live) or ["a"])
    assert cli.main(["site", "-o", str(tmp_path), "--offline"]) == 0
    assert calls == {"live": False}


def test_requires_command():
    with pytest.raises(SystemExit):
        cli.main([])
