"""Format intermédiaire unique du pipeline (SPEC.md §2.4, étage EXTRACT)."""

from dataclasses import dataclass, field


@dataclass
class RawEntity:
    source: str
    type: str
    domain: str
    name: str
    level: int = 1
    aliases: list[str] = field(default_factory=list)
    external_ids: dict[str, str] = field(default_factory=dict)
    attributes: dict = field(default_factory=dict)
    popularity: float = 0.0
    quality_score: float = 0.5
    language: str | None = None
    # True si la source est fiable (API réelle) ou si la liste construite/LLM
    # a été relue par un humain. False -> quarantaine obligatoire (SPEC.md §2.4).
    reviewed: bool = True

    # Rempli par NORMALIZE
    normalized_name: str | None = None
    blocking_key: str | None = None

    # Rempli par DEDUP / VALIDATE
    status: str = "active"
    quarantine_reason: str | None = None
    # uuid d'une entité existante en base -> UPDATE au lieu d'INSERT (idempotence)
    existing_id: str | None = None
