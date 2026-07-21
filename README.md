# idem

**Un passeport de goût.** Tu notes ce que tu aimes et détestes dans tous les
domaines de la vie ; l'app construit ta signature et te connecte aux gens qui
te ressemblent vraiment.

- `VISION.md` — pourquoi le produit existe, ce qu'il est, ce qu'il n'est pas.
- `SPECS.md` — modèle de données, algorithmes, périmètre MVP, règles de dev.
- `AGENTS.md` — conventions concrètes du code (agents IA : lire en premier).

## Structure

```
idem/
├── apps/
│   ├── mobile/          Expo (React Native) — le produit
│   └── api/             Hono + tRPC, modules verticaux
├── packages/
│   ├── shared/          types, constantes de tuning (TUNING), schémas Zod
│   ├── contracts/       contrats d'API (frontière mobile ↔ api)
│   └── db/              schéma Drizzle + migrations (Postgres + pgvector)
└── pipeline/            CLI Python d'ingestion (5 étages, SPECS.md §2.4)
```

`apps/web` (passeport public, OG images) arrive en Phase 3.

## Démarrage

```bash
cp .env.example .env          # renseigner TMDB_API_KEY
docker compose up -d          # Postgres + pgvector sur localhost:5433
pnpm install
pnpm db:migrate               # applique les migrations Drizzle

# Catalogue
cd pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
idem-pipeline ingest openlibrary   # livres populaires — aucune clé requise
idem-pipeline ingest tmdb --pages 150   # cinéma — nécessite TMDB_API_KEY
idem-pipeline ingest axes     # → quarantaine tant que le fichier n'est pas relu
idem-pipeline stats
cd ..

# API + mobile
pnpm dev:api                  # http://localhost:3000
pnpm dev:mobile               # Expo — scanner le QR code avec Expo Go

# Dev build (une fois) — toutes les dépendances natives du MVP sont déjà
# installées (dev-client, image, svg, view-shot, sharing, auth Apple,
# secure-store, updates, notifications, location...) :
cd apps/mobile && pnpm exec expo run:ios --device   # ou run:android
# Pour activer l'OTA plus tard : eas update:configure (avant le build).
```

Sur un vrai téléphone, mettre `EXPO_PUBLIC_API_URL=http://<ip-locale>:3000`
dans `.env` (le téléphone doit joindre le Mac sur le réseau local).

## Axes abstraits

`pipeline/sources/axes.fr.json` contient ~40 paires **proposées** — règle dure
SPECS.md §2.4 : rien de généré n'est publié sans relecture humaine. Relire le
fichier, corriger/compléter (cible : 150-300 paires), passer `reviewed` à
`true`, relancer `idem-pipeline ingest axes`.

## État d'avancement (feuille de route SPECS.md §8)

- [x] **Phase 0 — Fondations** : monorepo, schéma, pipeline (livres + cinéma
      + axes), API de notation (duel/verdict/axe/tri), squelette Expo qui
      affiche les questions et enregistre les jugements.
- [x] Phase 1 (partiel) — duel et axes gestuels (swipe + haptique, Reanimated),
      jauge de précision animée, onglet passeport v0 (top/flop par domaine).
      Reste : écran de tri, onboarding dédié, validation du geste sur un vrai
      téléphone (critique — SPECS.md §8).
- [ ] Phase 2 — Catalogue complet : musique, livres, bouffe, lieux.
- [ ] Phase 3 — Passeport : factorisation (batch Python), écran passeport,
      `apps/web` (page publique + OG image).
- [ ] Phase 4 — Recommandations cross-domaines (test de la thèse).
- [ ] Phase 5 — 30 testeurs, critères de sortie SPECS.md §6.
