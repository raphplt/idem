"""Adaptateur Wikidata (lieux) — étage EXTRACT, aucune clé requise.

Grandes villes (Q1549591) classées par population, libellés français.
La popularité est le rang de population — proxy raisonnable de notoriété.
Les extraits OSM/Geofabrik prendront le relais pour la profondeur (SPEC.md §2.4).
"""

import httpx

from ..models import RawEntity

ENDPOINT = "https://query.wikidata.org/sparql"
QUERY = """
SELECT ?city ?cityLabel ?pop ?countryLabel ?img WHERE {
  ?city wdt:P31 wd:Q1549591 ; wdt:P1082 ?pop .
  OPTIONAL { ?city wdt:P17 ?country . }
  OPTIONAL { ?city wdt:P18 ?img . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
ORDER BY DESC(?pop)
LIMIT %(limit)d
"""


def extract(limit: int = 600) -> list[RawEntity]:
    resp = httpx.get(
        ENDPOINT,
        params={"query": QUERY % {"limit": limit}, "format": "json"},
        headers={"User-Agent": "idem-pipeline/0.1 (dev; contact via repo)"},
        timeout=120,
    )
    resp.raise_for_status()
    rows = resp.json()["results"]["bindings"]

    entities: list[RawEntity] = []
    seen: set[str] = set()
    total = max(len(rows), 1)
    rank = 0
    for row in rows:
        qid = row["city"]["value"].rsplit("/", 1)[-1]
        if qid in seen:
            continue
        seen.add(qid)
        name = row["cityLabel"]["value"]
        if name == qid:  # pas de libellé -> entité trop obscure, on saute
            continue
        attributes: dict = {"population": int(float(row["pop"]["value"]))}
        if "countryLabel" in row:
            attributes["country"] = row["countryLabel"]["value"]
        if "img" in row:
            attributes["image"] = row["img"]["value"] + "?width=400"
        entities.append(
            RawEntity(
                source="wikidata",
                type="place",
                domain="lieu",
                name=name,
                external_ids={"wikidata": qid},
                attributes=attributes,
                popularity=1.0 - rank / total,
                quality_score=0.7,
                reviewed=True,  # source réelle
            )
        )
        rank += 1
    return entities
