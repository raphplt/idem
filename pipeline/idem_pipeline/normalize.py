"""Étage NORMALIZE — SPEC.md §2.4.

Casse, accents, ponctuation, articles initiaux, espaces, puis génération
de la clé de blocage pour la dédup. Aucune logique métier.
"""

import re
import unicodedata

from .config import BLOCKING_KEY_LEN
from .models import RawEntity

_ARTICLES = {
    "le", "la", "les", "l", "un", "une", "des", "du", "de",
    "the", "a", "an",
    "el", "los", "las", "il", "lo", "gli", "i",
    "der", "die", "das",
}


def normalize_name(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.casefold()
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    tokens = s.split(" ")
    if len(tokens) > 1 and tokens[0] in _ARTICLES:
        tokens = tokens[1:]
    return " ".join(tokens)


def blocking_key(domain: str, type_: str, normalized: str) -> str:
    compact = re.sub(r"\s", "", normalized)[:BLOCKING_KEY_LEN]
    return f"{domain}:{type_}:{compact}"


def run(entities: list[RawEntity]) -> list[RawEntity]:
    for e in entities:
        e.normalized_name = normalize_name(e.name)
        e.blocking_key = blocking_key(e.domain, e.type, e.normalized_name)
    return entities
