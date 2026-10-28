"""Cartographie interactive de la COVID-19."""

from covid_mapviz.data import load_archive, load_csv, summarize
from covid_mapviz.maps import build_map

__all__ = ["build_map", "load_archive", "load_csv", "summarize"]
__version__ = "1.0.0"
