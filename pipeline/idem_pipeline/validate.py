"""Étage VALIDATE — SPEC.md §2.4.

Champs obligatoires, cohérence type/domaine/niveau, attributs conformes.
Une entité non conforme part en quarantaine, jamais à la poubelle.
Une entité générée (LLM / liste construite) non relue part en quarantaine
(règle dure §2.4 : une hallucination publiée pollue le vecteur de tout le monde).
"""

from .models import RawEntity

DOMAINS = {
    "cinema", "musique", "bouffe", "lieu", "livre",
    "jeu", "objet", "sport", "abstrait",
}
TYPES = {
    "work", "creator", "track", "album", "artist", "dish", "cuisine",
    "ingredient", "place_type", "place", "object", "brand", "activity",
    "club", "axis_pair",
}
# Niveau attendu par type (SPEC.md §2.3). None = plusieurs niveaux possibles.
EXPECTED_LEVEL: dict[str, int | None] = {
    "work": 1, "creator": 0, "track": 2, "album": 1, "artist": 0,
    "dish": 1, "cuisine": 0, "ingredient": 1, "place_type": 0, "place": 1,
    "object": 1, "brand": 0, "activity": 1, "club": 1, "axis_pair": 0,
}


def _quarantine(e: RawEntity, reason: str) -> None:
    e.status = "quarantine"
    if not e.quarantine_reason:
        e.quarantine_reason = reason


def _validate_one(e: RawEntity) -> None:
    if not e.name or not e.name.strip():
        _quarantine(e, "nom vide")
        return
    if e.domain not in DOMAINS:
        _quarantine(e, f"domaine inconnu: {e.domain}")
        return
    if e.type not in TYPES:
        _quarantine(e, f"type inconnu: {e.type}")
        return
    expected = EXPECTED_LEVEL.get(e.type)
    if expected is not None and e.level != expected:
        _quarantine(e, f"niveau {e.level} incohérent pour {e.type}")
        return

    if e.type == "axis_pair":
        a, b = e.attributes.get("a"), e.attributes.get("b")
        if not a or not b or a == b:
            _quarantine(e, "axis_pair: attributs a/b manquants ou identiques")
            return
    if e.type == "work":
        year = e.attributes.get("year")
        if year is not None and not (1850 <= int(year) <= 2100):
            _quarantine(e, f"année invalide: {year}")
            return

    if not e.reviewed:
        _quarantine(e, "source construite/LLM non relue")


def run(entities: list[RawEntity]) -> list[RawEntity]:
    for e in entities:
        _validate_one(e)
    return entities
