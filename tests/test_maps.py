import folium

from covid_mapviz.maps import MAX_RADIUS, MIN_RADIUS, build_map, fmt, popup_html, radius


def test_radius_bounds():
    assert radius(0, 100) == MIN_RADIUS
    assert radius(10, 0) == MIN_RADIUS
    assert radius(100, 100) == MAX_RADIUS
    assert radius(25, 100) == MAX_RADIUS / 2


def test_fmt_uses_narrow_space():
    assert fmt(1234567) == "1 234 567"


def test_popup_escapes_html(df):
    row = df.iloc[0].copy()
    row["country"] = "<script>"
    html = popup_html(row)
    assert "&lt;script&gt;" in html
    assert "Décès" in html


def test_build_map(df):
    fmap = build_map(df, title="Titre", subtitle="Sous-titre")
    assert isinstance(fmap, folium.Map)
    html = fmap.get_root().render()
    assert html.count("L.circleMarker") == len(df) * 4
    assert "Sous-titre" in html and "Cas actifs" in html


def test_build_map_empty(df):
    html = build_map(df.iloc[0:0]).get_root().render()
    assert "L.circleMarker" not in html
