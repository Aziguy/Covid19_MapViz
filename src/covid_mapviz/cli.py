"""Interface en ligne de commande."""

from __future__ import annotations

import argparse
from pathlib import Path

from covid_mapviz import api
from covid_mapviz.data import load_archive, load_csv, summarize, top
from covid_mapviz.maps import build_map
from covid_mapviz.site import build_site


def _load(args: argparse.Namespace):
    if args.input:
        return load_csv(args.input), f"Fichier {Path(args.input).name}"
    if args.source == "api":
        try:
            return api.fetch_countries(), "disease.sh (temps réel)"
        except api.ApiError as exc:
            print(f"{exc}, repli sur l'archive")
    return load_archive(), "Archive du 1er avril 2020"


def cmd_map(args: argparse.Namespace) -> int:
    df, label = _load(args)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    build_map(df, subtitle=label).save(str(output))
    print(f"Carte générée : {output} ({len(df)} pays, {label})")
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    df, label = _load(args)
    s = summarize(df)
    print(f"{label} | {s['countries']} pays | date {s['date']}")
    print(
        f"Infections {s['cases']:,} | Décès {s['deaths']:,} ({s['death_rate']} %) | "
        f"Guérisons {s['recovered']:,} ({s['recovery_rate']} %)"
    )
    for i, row in top(df, args.metric, args.top).iterrows():
        print(f"{i + 1:>2}. {row['country']:<30} {row[args.metric]:>12,}")
    return 0


def cmd_site(args: argparse.Namespace) -> int:
    built = build_site(Path(args.output), live=not args.offline)
    print(f"Site généré dans {args.output} ({', '.join(built)})")
    return 0


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="covid-mapviz", description=__doc__)
    sub = p.add_subparsers(dest="command", required=True)

    source = argparse.ArgumentParser(add_help=False)
    source.add_argument("--source", choices=("archive", "api"), default="archive")
    source.add_argument("--input", help="CSV personnalisé (prioritaire sur --source)")

    m = sub.add_parser("map", parents=[source], help="Génère une carte Folium HTML")
    m.add_argument("-o", "--output", default="output/covid_map.html")
    m.set_defaults(func=cmd_map)

    s = sub.add_parser("stats", parents=[source], help="Affiche les statistiques clés")
    s.add_argument("--metric", choices=("cases", "deaths", "recovered", "active"), default="cases")
    s.add_argument("--top", type=int, default=10)
    s.set_defaults(func=cmd_stats)

    w = sub.add_parser("site", help="Construit le site GitHub Pages")
    w.add_argument("-o", "--output", default="_site")
    w.add_argument("--offline", action="store_true", help="Sans appel à l'API")
    w.set_defaults(func=cmd_site)
    return p


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    return args.func(args)
