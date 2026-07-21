"""Adaptateur TMDB (cinéma) — étage EXTRACT, aucune logique métier.

Films populaires, triés par popularité décroissante. ~20 films par page ;
150 pages ~ 3 000 entités (cible MVP : 3 000 à 8 000 par domaine, SPEC.md §6).
"""

import os
import time

import httpx

BASE_URL = "https://api.themoviedb.org/3"

from ..models import RawEntity


def _client(api_key: str) -> httpx.Client:
    # Clé v3 (query param) ou token v4 (bearer, commence par "eyJ").
    if api_key.startswith("eyJ"):
        return httpx.Client(
            base_url=BASE_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30,
        )
    return httpx.Client(base_url=BASE_URL, params={"api_key": api_key}, timeout=30)


def extract(pages: int = 25, language: str = "fr-FR") -> list[RawEntity]:
    api_key = os.environ.get("TMDB_API_KEY", "")
    if not api_key:
        raise SystemExit("TMDB_API_KEY manquant (voir .env.example)")

    movies: list[dict] = []
    with _client(api_key) as client:
        for page in range(1, pages + 1):
            resp = client.get(
                "/movie/popular", params={"page": page, "language": language}
            )
            resp.raise_for_status()
            movies.extend(resp.json()["results"])
            time.sleep(0.05)  # courtoisie rate-limit

    total = max(len(movies), 1)
    entities: list[RawEntity] = []
    seen_ids: set[int] = set()
    rank = 0
    for m in movies:
        if m["id"] in seen_ids:
            continue
        seen_ids.add(m["id"])
        title = m.get("title") or m.get("original_title") or ""
        aliases = []
        if m.get("original_title") and m["original_title"] != title:
            aliases.append(m["original_title"])
        attributes: dict = {"original_language": m.get("original_language")}
        release = m.get("release_date") or ""
        if len(release) >= 4 and release[:4].isdigit():
            attributes["year"] = int(release[:4])
        if m.get("overview"):
            # Description conservée : servira à l'embedding (dédup sémantique, cold start).
            attributes["description"] = m["overview"]
        entities.append(
            RawEntity(
                source="tmdb",
                type="work",
                domain="cinema",
                name=title,
                aliases=aliases,
                external_ids={"tmdb": str(m["id"])},
                attributes=attributes,
                popularity=1.0 - rank / total,
                quality_score=0.8,
                language=m.get("original_language"),
                reviewed=True,  # source réelle, pas de règle LLM
            )
        )
        rank += 1
    return entities
