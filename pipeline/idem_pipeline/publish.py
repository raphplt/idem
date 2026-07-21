"""Étage PUBLISH — SPEC.md §2.4.

Insert des nouvelles entités, update idempotent de celles déjà en base
(matchées par la dédup). C'est le SEUL chemin d'écriture vers `entities`
(SPEC.md §9.3) : aucun seed manuel, nulle part.
"""

from dataclasses import dataclass

import psycopg
from psycopg.types.json import Json

from .models import RawEntity


@dataclass
class PublishStats:
    inserted: int = 0
    updated: int = 0
    quarantined: int = 0


def run(
    conn: psycopg.Connection, entities: list[RawEntity], dry_run: bool = False
) -> PublishStats:
    stats = PublishStats()
    with conn.cursor() as cur:
        for e in entities:
            if e.status == "quarantine":
                stats.quarantined += 1
            if e.existing_id:
                stats.updated += 1
                if not dry_run:
                    cur.execute(
                        """
                        update entities set
                          popularity = %s,
                          aliases = (
                            select array(select distinct unnest(aliases || %s::text[]))
                          ),
                          attributes = attributes || %s::jsonb,
                          external_ids = external_ids || %s::jsonb
                        where id = %s
                        """,
                        (
                            e.popularity,
                            e.aliases,
                            Json(e.attributes),
                            Json(e.external_ids),
                            e.existing_id,
                        ),
                    )
                continue
            stats.inserted += 1
            if not dry_run:
                cur.execute(
                    """
                    insert into entities
                      (type, domain, canonical_name, level, aliases, external_ids,
                       attributes, blocking_key, popularity, quality_score, status, source)
                    values
                      (%s::entity_type, %s::"domain", %s, %s, %s, %s::jsonb,
                       %s::jsonb, %s, %s, %s, %s::entity_status, %s)
                    """,
                    (
                        e.type,
                        e.domain,
                        e.name,
                        e.level,
                        e.aliases,
                        Json(e.external_ids),
                        Json(
                            {**e.attributes, "_quarantine_reason": e.quarantine_reason}
                            if e.quarantine_reason
                            else e.attributes
                        ),
                        e.blocking_key,
                        e.popularity,
                        e.quality_score,
                        e.status,
                        e.source,
                    ),
                )
    if not dry_run:
        conn.commit()
    return stats
