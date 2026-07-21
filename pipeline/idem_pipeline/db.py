"""Connexion Postgres. Lit DATABASE_URL depuis l'environnement ou le .env racine."""

import os
from pathlib import Path

import psycopg

DEFAULT_URL = "postgres://idem:idem@localhost:5433/idem"


def _load_dotenv() -> None:
    for directory in [Path.cwd(), *Path.cwd().parents]:
        env_file = directory / ".env"
        if env_file.is_file():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())
            return


def connect() -> psycopg.Connection:
    _load_dotenv()
    url = os.environ.get("DATABASE_URL", DEFAULT_URL)
    return psycopg.connect(url)
