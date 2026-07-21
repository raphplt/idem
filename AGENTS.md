# AGENTS.md

Règles pour tout agent IA travaillant sur ce repo. **Les règles complètes et
non négociables sont dans `SPECS.md` §9 — les lire avant d'écrire du code,
ainsi que `VISION.md` en entier.** Ce fichier ne fait qu'ajouter les
conventions concrètes du code.

## Organisation

- Monorepo Turborepo + pnpm. `packages/shared` et `packages/contracts` sont la
  seule frontière de types entre `apps/mobile` et `apps/api`.
- Backend : Hono + tRPC, **modules verticaux** :
  `apps/api/src/modules/<domaine>/{router,service,repository}.ts`.
  Pas de dossier `controllers/` ou `services/` global.
  - `router.ts` : procédures tRPC, validation d'input via `@idem/contracts`.
  - `service.ts` : logique métier, transactions.
  - `repository.ts` : accès données uniquement.
- Tout paramètre de tuning vit dans `packages/shared/src/config.ts` (TUNING).
  Miroir Python des seuils de dédup : `pipeline/idem_pipeline/config.py`.
- Le pipeline Python (`pipeline/`) est le SEUL chemin d'écriture vers la table
  `entities`. La table `judgments` est append-only : aucun UPDATE/DELETE, jamais.

## Commandes

```bash
docker compose up -d        # Postgres + pgvector (port 5433)
pnpm install
pnpm db:generate            # génère les migrations Drizzle
pnpm db:migrate             # les applique
pnpm dev:api                # API sur :3000
pnpm dev:mobile             # Expo
pnpm typecheck              # tout le monorepo
cd pipeline && pip install -e . && idem-pipeline ingest tmdb
```

## Pièges connus

- `apps/web` n'existe pas encore (Phase 3) — son périmètre sera strictement :
  passeport public, OG images, landing. Aucune fonctionnalité produit.
- Le mode `sort` est implémenté côté API mais `SESSION_MIX.sort = 0` tant que
  l'écran de tri mobile n'existe pas (Phase 1).
- Les axes abstraits restent en quarantaine tant que
  `pipeline/sources/axes.fr.json` n'a pas `reviewed: true` (relecture humaine
  obligatoire, SPECS.md §2.4).
