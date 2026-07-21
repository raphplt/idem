"""Adaptateur des paires d'axes abstraits — étage EXTRACT.

Source construite : pipeline/sources/axes.fr.json. Le fichier porte un champ
`reviewed` : tant qu'il est false, les paires partent en QUARANTAINE
(règle §2.4 — proposé par LLM, jamais publié sans relecture humaine).
La relecture consiste à lire/corriger le fichier puis passer reviewed à true.
"""

import json
from pathlib import Path

from ..models import RawEntity

DEFAULT_FILE = Path(__file__).resolve().parents[2] / "sources" / "axes.fr.json"


def extract(path: Path | None = None) -> list[RawEntity]:
    file = path or DEFAULT_FILE
    data = json.loads(file.read_text(encoding="utf-8"))
    reviewed = bool(data.get("reviewed", False))
    entities: list[RawEntity] = []
    for pair in data["pairs"]:
        a, b = pair["a"], pair["b"]
        entities.append(
            RawEntity(
                source="curated-axes",
                type="axis_pair",
                domain="abstrait",
                name=f"{a} / {b}",
                level=0,
                attributes={"a": a, "b": b},
                popularity=1.0,  # universel par construction (VISION.md §6.4)
                quality_score=0.9,
                language="fr",
                reviewed=reviewed,
            )
        )
    return entities
