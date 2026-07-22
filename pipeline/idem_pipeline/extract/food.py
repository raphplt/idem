"""Adaptateur du catalogue bouffe — étage EXTRACT.

Source construite : pipeline/sources/food.fr.json. Même règle que les axes :
tant que `reviewed` est false, tout part en quarantaine (SPEC.md §2.4).
Hiérarchie : plat -> cuisine (parent_ref résolu à la publication).
"""

import json
from pathlib import Path

from ..models import RawEntity

DEFAULT_FILE = Path(__file__).resolve().parents[2] / "sources" / "food.fr.json"


def _rank_pop(index: int, total: int) -> float:
    return 1.0 - index / max(total, 1)


def extract(path: Path | None = None) -> list[RawEntity]:
    data = json.loads((path or DEFAULT_FILE).read_text(encoding="utf-8"))
    reviewed = bool(data.get("reviewed", False))
    entities: list[RawEntity] = []

    cuisines = data.get("cuisines", [])
    for i, cuisine in enumerate(cuisines):
        entities.append(
            RawEntity(
                source="curated-food",
                type="cuisine",
                domain="bouffe",
                name=f"Cuisine {cuisine}",
                level=0,
                aliases=[cuisine],
                popularity=_rank_pop(i, len(cuisines)),
                quality_score=0.9,
                language="fr",
                reviewed=reviewed,
            )
        )

    dishes = data.get("dishes", [])
    for i, dish in enumerate(dishes):
        entities.append(
            RawEntity(
                source="curated-food",
                type="dish",
                domain="bouffe",
                name=dish["name"],
                level=1,
                popularity=_rank_pop(i, len(dishes)),
                quality_score=0.9,
                language="fr",
                reviewed=reviewed,
                parent_ref=("cuisine", f"Cuisine {dish['cuisine']}")
                if dish.get("cuisine")
                else None,
            )
        )

    ingredients = data.get("ingredients", [])
    for i, ingredient in enumerate(ingredients):
        entities.append(
            RawEntity(
                source="curated-food",
                type="ingredient",
                domain="bouffe",
                name=ingredient,
                level=1,
                popularity=_rank_pop(i, len(ingredients)),
                quality_score=0.9,
                language="fr",
                reviewed=reviewed,
            )
        )
    return entities
