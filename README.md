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
idem-pipeline ingest openlibrary       # livres populaires — aucune clé requise
idem-pipeline ingest wikidata-places   # grandes villes — aucune clé requise
idem-pipeline ingest tmdb --pages 150  # cinéma — nécessite TMDB_API_KEY
idem-pipeline ingest food     # → quarantaine tant que le fichier n'est pas relu
idem-pipeline ingest axes     # → quarantaine tant que le fichier n'est pas relu
idem-pipeline stats
cd ..

# API + mobile
pnpm dev:api                  # http://localhost:3210
pnpm dev:mobile               # Expo — scanner le QR code avec Expo Go

# Dev build (une fois) — toutes les dépendances natives du MVP sont déjà
# installées (dev-client, image, svg, view-shot, sharing, auth Apple,
# secure-store, updates, notifications, location...) :
cd apps/mobile && pnpm exec expo run:ios --device   # ou run:android
# Pour activer l'OTA plus tard : eas update:configure (avant le build).
```

Sur un vrai téléphone, mettre `EXPO_PUBLIC_API_URL=http://<ip-locale>:3210`
dans `.env` (le téléphone doit joindre le Mac sur le réseau local).

## Catalogues construits — relecture obligatoire

Règle dure SPECS.md §2.4 : rien de généré n'est publié sans relecture humaine.
Deux fichiers attendent la tienne — relire, corriger/compléter, passer
`reviewed` à `true`, relancer l'ingestion :

- `pipeline/sources/axes.fr.json` — ~40 paires d'axes (cible : 150-300).
  C'est le liant du système, il mérite le plus de soin.
- `pipeline/sources/food.fr.json` — 45 cuisines, 128 plats (liés à leur
  cuisine), 85 ingrédients (cible : ~150 cuisines, ~2000 plats, ~300
  ingrédients).

## État d'avancement (feuille de route SPECS.md §8)

- [x] **Phase 0 — Fondations** : monorepo, schéma, pipeline (livres + cinéma
      + axes), API de notation (duel/verdict/axe/tri), squelette Expo qui
      affiche les questions et enregistre les jugements.
- [x] Phase 1 — duel et axes gestuels (swipe + haptique, Reanimated), écran de
      tri (tap-to-rank), les 4 modes servis (mix 60/20/15/5), jauge de
      précision animée, onboarding (axes d'abord, duels très connus, aucune
      inscription), images sur les cartes, onglet passeport v0. Reste :
      validation du geste sur un vrai téléphone (critique — SPECS.md §8).
- [ ] Phase 2 — Catalogue : livres ✓ (672), lieux ✓ (448 villes Wikidata),
      musique ✓ (1637 artistes/albums Deezer, interim avant MusicBrainz),
      bouffe (258 en quarantaine, à relire), cinéma (clé TMDB à fournir).
- [ ] Phase 3 — Passeport : factorisation (batch Python), écran passeport,
      `apps/web` (page publique + OG image).
- [ ] Phase 4 — Recommandations cross-domaines (test de la thèse).
- [ ] Phase 5 — 30 testeurs, critères de sortie SPECS.md §6.
