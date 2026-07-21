"""Adaptateur OpenLibrary (livres) — étage EXTRACT, aucune clé API requise.

Œuvres les plus lues (readinglog) par grand sujet, fusionnées puis classées
par popularité globale. Le dump complet OpenLibrary prendra le relais quand
il faudra plus de profondeur (SPEC.md §2.4).
"""

import time

import httpx

from ..models import RawEntity

BASE_URL = "https://openlibrary.org"
FIELDS = "key,title,author_name,first_publish_year,readinglog_count"
SUBJECTS = [
    "fiction",
    "fantasy",
    "science_fiction",
    "mystery",
    "romance",
    "historical_fiction",
    "thriller",
    "horror",
    "biography",
    "history",
    "philosophy",
    "poetry",
    "classic_literature",
    "young_adult",
    "graphic_novels",
]
PAGE_SIZE = 100


def extract(per_subject: int = 200) -> list[RawEntity]:
    docs: dict[str, dict] = {}
    pages = max(1, per_subject // PAGE_SIZE)
    with httpx.Client(
        base_url=BASE_URL,
        headers={"User-Agent": "idem-pipeline/0.1 (dev)"},
        timeout=30,
    ) as client:
        for subject in SUBJECTS:
            for page in range(1, pages + 1):
                resp = client.get(
                    "/search.json",
                    params={
                        "q": f"subject:{subject}",
                        "sort": "readinglog",
                        "limit": PAGE_SIZE,
                        "page": page,
                        "fields": FIELDS,
                    },
                )
                resp.raise_for_status()
                for doc in resp.json().get("docs", []):
                    key = doc.get("key")
                    if key and doc.get("title"):
                        docs.setdefault(key, doc)
                time.sleep(0.3)  # courtoisie : API publique sans clé

    ranked = sorted(
        docs.values(), key=lambda d: d.get("readinglog_count") or 0, reverse=True
    )
    total = max(len(ranked), 1)
    entities: list[RawEntity] = []
    for rank, doc in enumerate(ranked):
        attributes: dict = {}
        if doc.get("first_publish_year"):
            attributes["year"] = int(doc["first_publish_year"])
        if doc.get("author_name"):
            attributes["author"] = doc["author_name"][0]
        entities.append(
            RawEntity(
                source="openlibrary",
                type="work",
                domain="livre",
                name=doc["title"],
                external_ids={"openlibrary": doc["key"]},
                attributes=attributes,
                popularity=1.0 - rank / total,
                quality_score=0.7,
                reviewed=True,  # source réelle
            )
        )
    return entities
