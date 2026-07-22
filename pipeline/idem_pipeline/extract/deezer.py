"""Adaptateur Deezer (musique) — étage EXTRACT, aucune clé requise.

Charts par genre : artistes populaires + albums populaires (hiérarchie
album -> artiste). Source intérimaire pratique et propre pour le MVP ;
les dumps MusicBrainz/Discogs (SPEC.md §2.4) prendront le relais pour la
profondeur (morceaux, discographies complètes).
"""

import time

import httpx

from ..models import RawEntity

BASE_URL = "https://api.deezer.com"
CHART_LIMIT = 50


def extract(max_genres: int = 20) -> list[RawEntity]:
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        genres = client.get("/genre").json()["data"]
        genre_ids = [0] + [g["id"] for g in genres if g["id"] != 0][:max_genres]

        artists: dict[int, dict] = {}
        artist_hits: dict[int, int] = {}
        albums: dict[int, dict] = {}
        for gid in genre_ids:
            for kind in ("artists", "albums"):
                resp = client.get(f"/chart/{gid}/{kind}", params={"limit": CHART_LIMIT})
                resp.raise_for_status()
                for item in resp.json().get("data", []):
                    if kind == "artists":
                        artists.setdefault(item["id"], item)
                        artist_hits[item["id"]] = artist_hits.get(item["id"], 0) + 1
                    else:
                        albums.setdefault(item["id"], item)
                        a = item.get("artist")
                        if a:
                            artists.setdefault(a["id"], a)
                            artist_hits[a["id"]] = artist_hits.get(a["id"], 0)
                time.sleep(0.15)  # courtoisie : quota public ~50 req / 5 s

    entities: list[RawEntity] = []

    ranked_artists = sorted(
        artists.values(), key=lambda a: artist_hits.get(a["id"], 0), reverse=True
    )
    total_a = max(len(ranked_artists), 1)
    for rank, a in enumerate(ranked_artists):
        attributes: dict = {}
        if a.get("picture_medium"):
            attributes["image"] = a["picture_medium"]
        entities.append(
            RawEntity(
                source="deezer",
                type="artist",
                domain="musique",
                name=a["name"],
                level=0,
                external_ids={"deezer": str(a["id"])},
                attributes=attributes,
                popularity=1.0 - rank / total_a,
                quality_score=0.7,
                reviewed=True,  # source réelle
            )
        )

    ranked_albums = list(albums.values())
    total_al = max(len(ranked_albums), 1)
    for rank, al in enumerate(ranked_albums):
        artist_name = (al.get("artist") or {}).get("name")
        attributes = {}
        if al.get("cover_medium"):
            attributes["image"] = al["cover_medium"]
        if artist_name:
            attributes["artist"] = artist_name
        entities.append(
            RawEntity(
                source="deezer",
                type="album",
                domain="musique",
                name=al["title"],
                level=1,
                external_ids={"deezer": f"album:{al['id']}"},
                attributes=attributes,
                popularity=1.0 - rank / total_al,
                quality_score=0.7,
                reviewed=True,
                parent_ref=("artist", artist_name) if artist_name else None,
            )
        )
    return entities
