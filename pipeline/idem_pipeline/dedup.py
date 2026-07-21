"""Étage DEDUP — SPEC.md §2.4, trois passes.

1. Bloc exact   : external_ids identiques -> même entité.
2. Bloc flou    : même blocking_key + Levenshtein normalisé -> merge auto ou quarantaine.
3. Bloc sémantique (embeddings) : Phase 3, non câblé en v0 — les colonnes existent.
"""

import json

import psycopg

from .config import LEV_AUTO_MERGE, LEV_REVIEW
from .models import RawEntity
from .normalize import normalize_name


def levenshtein_ratio(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = curr
    return 1.0 - prev[-1] / max(len(a), len(b))


def _dedup_within_batch(entities: list[RawEntity]) -> list[RawEntity]:
    seen_ext: dict[tuple[str, str], RawEntity] = {}
    seen_key: dict[str, RawEntity] = {}
    result: list[RawEntity] = []
    for e in entities:
        ext_keys = [(k, v) for k, v in e.external_ids.items()]
        winner = None
        for pair in ext_keys:
            if pair in seen_ext:
                winner = seen_ext[pair]
                break
        if winner is None and e.blocking_key in seen_key:
            winner = seen_key[e.blocking_key]
        if winner is not None:
            # Fusion dans le lot : on garde le premier, on absorbe les alias.
            winner.aliases = sorted(set(winner.aliases) | {e.name} | set(e.aliases))
            continue
        for pair in ext_keys:
            seen_ext[pair] = e
        if e.blocking_key:
            seen_key[e.blocking_key] = e
        result.append(e)
    return result


def _match_existing(conn: psycopg.Connection, e: RawEntity) -> None:
    with conn.cursor() as cur:
        # Passe 1 : external_ids identiques.
        for key, value in e.external_ids.items():
            cur.execute(
                "select id from entities where external_ids @> %s::jsonb limit 1",
                (json.dumps({key: value}),),
            )
            row = cur.fetchone()
            if row:
                e.existing_id = str(row[0])
                return
        # Passe 2 : même blocking_key + distance de Levenshtein.
        cur.execute(
            """
            select id, canonical_name from entities
            where blocking_key = %s and type = %s and status <> 'merged'
            """,
            (e.blocking_key, e.type),
        )
        for row in cur.fetchall():
            # Les deux côtés passent par la même normalisation, sinon la
            # ponctuation du canonical_name fausse la distance.
            ratio = levenshtein_ratio(
                e.normalized_name or "", normalize_name(row[1] or "")
            )
            if ratio >= LEV_AUTO_MERGE:
                e.existing_id = str(row[0])
                return
            if ratio >= LEV_REVIEW:
                e.status = "quarantine"
                e.quarantine_reason = f"dedup_review: proche de {row[0]}"
                return


def run(conn: psycopg.Connection, entities: list[RawEntity]) -> list[RawEntity]:
    entities = _dedup_within_batch(entities)
    for e in entities:
        _match_existing(conn, e)
    return entities
