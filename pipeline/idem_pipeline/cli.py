"""CLI du pipeline d'ingestion — hors ligne, idempotent, rejouable (SPEC.md §2.4).

    idem-pipeline ingest tmdb --pages 150
    idem-pipeline ingest axes
    idem-pipeline stats
"""

import click

from . import db, dedup, normalize, publish, validate
from .extract import axes as axes_extract
from .extract import openlibrary as openlibrary_extract
from .extract import tmdb as tmdb_extract


@click.group()
def main() -> None:
    """Pipeline d'ingestion d'entités idem."""


@main.command()
@click.argument("source", type=click.Choice(["tmdb", "openlibrary", "axes"]))
@click.option("--pages", default=150, help="Pages TMDB (20 films/page).")
@click.option("--per-subject", default=200, help="Livres par sujet OpenLibrary.")
@click.option("--dry-run", is_flag=True, help="Ne rien écrire en base.")
def ingest(source: str, pages: int, per_subject: int, dry_run: bool) -> None:
    """SOURCE → EXTRACT → NORMALIZE → DEDUP → VALIDATE → PUBLISH."""
    click.echo(f"[extract] source={source}")
    if source == "tmdb":
        entities = tmdb_extract.extract(pages=pages)
    elif source == "openlibrary":
        entities = openlibrary_extract.extract(per_subject=per_subject)
    else:
        entities = axes_extract.extract()
    click.echo(f"[extract] {len(entities)} entités brutes")

    entities = normalize.run(entities)
    click.echo("[normalize] ok")

    with db.connect() as conn:
        entities = dedup.run(conn, entities)
        click.echo(f"[dedup] {len(entities)} après dédup intra-lot")

        entities = validate.run(entities)
        quarantined = sum(1 for e in entities if e.status == "quarantine")
        click.echo(f"[validate] {quarantined} en quarantaine")

        stats = publish.run(conn, entities, dry_run=dry_run)
        mode = " (dry-run)" if dry_run else ""
        click.echo(
            f"[publish]{mode} {stats.inserted} insérées, "
            f"{stats.updated} mises à jour, {stats.quarantined} en quarantaine"
        )
        if quarantined and source == "axes":
            click.echo(
                "→ Les axes restent en quarantaine tant que `reviewed` est false "
                "dans pipeline/sources/axes.fr.json. Relire le fichier, passer "
                "reviewed à true, puis relancer l'ingestion."
            )


@main.command()
def stats() -> None:
    """Compte les entités par domaine et statut."""
    with db.connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select domain, status, count(*)
            from entities
            group by domain, status
            order by domain, status
            """
        )
        rows = cur.fetchall()
    if not rows:
        click.echo("Base vide.")
        return
    for domain, status, count in rows:
        click.echo(f"{domain:10s} {status:12s} {count}")


if __name__ == "__main__":
    main()
