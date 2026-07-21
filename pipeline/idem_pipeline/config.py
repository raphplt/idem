"""Seuils de dédup — MIROIR de packages/shared/src/config.ts (TUNING.dedup).

Toute modification ici doit être répercutée côté TypeScript, et inversement.
"""

# Levenshtein normalisé >= ce seuil (même blocking_key) -> merge automatique.
LEV_AUTO_MERGE = 0.95
# Entre REVIEW et AUTO -> quarantaine pour revue humaine.
LEV_REVIEW = 0.90
# Similarité cosinus des embeddings (passe sémantique, Phase 3 — non câblée en v0).
COSINE_MERGE = 0.93

# Longueur du segment compacté dans la clé de blocage.
BLOCKING_KEY_LEN = 24
