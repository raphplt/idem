# SPEC.md

> Spécification technique et périmètre. À lire après `VISION.md`.
> Ce document est prescriptif : il définit le modèle de données, les algorithmes, le périmètre du MVP et les règles de développement.
> **Instructions pour tout agent IA travaillant sur ce repo : voir §9 avant d'écrire une ligne de code.**

---

## 1. Principes d'architecture

1. **Les données de goût sont l'actif. Le code est remplaçable.** Toute décision qui dégrade la qualité des données pour simplifier le code est refusée.
2. **Le catalogue est une dépendance de build, pas de runtime.** Les entités sont ingérées, normalisées et stockées en base. Aucune API tierce n'est appelée pendant une session utilisateur.
3. **Tout est append-only sur les jugements.** On n'écrase jamais une note : on ajoute un événement daté. La trajectoire de goût dans le temps est une fonctionnalité, donc l'historique est de la donnée métier.
4. **Le profil est dérivé, jamais saisi.** L'utilisateur n'écrit jamais son profil, il ne fait que juger. Toute vue du profil est un calcul.
5. **Monolithe.** Un seul service, une seule base. Pas de microservices, pas de queue, pas de Kubernetes. Le projet est développé par une personne.

---

## 2. Modèle d'entité — le point dur du projet

C'est là que le projet se gagne ou se perd. Le reste (vecteurs, similarité, feed) est du travail connu.

### 2.1 Le problème

Une entité est un objet ambigu :

- **Granularité** : « Radiohead » (artiste), « OK Computer » (album), « Paranoid Android » (morceau) sont trois entités différentes, à trois niveaux, avec trois signaux différents. Les gens veulent noter aux trois niveaux.
- **Doublons** : la même entité arrive de plusieurs sources sous des noms différents.
- **Flou** : « pizza » vs « pizza napolitaine » — si les deux existent comme entités distinctes non liées, le vecteur devient du bruit.

Multiplié par douze domaines, c'est **le** problème d'architecture.

### 2.2 La solution : entité canonique typée et hiérarchique

```
Entity
  id              uuid
  type            enum        -- voir §2.3
  domain          enum        -- cinema, musique, bouffe, lieu, livre, jeu, objet, sport, abstrait...
  canonical_name  text
  parent_id       uuid?       -- hiérarchie : morceau -> album -> artiste
  level           smallint    -- 0 = racine du domaine, croissant vers le spécifique
  aliases         text[]      -- toutes les graphies connues
  external_ids    jsonb       -- { tmdb: "123", musicbrainz: "abc-..." }
  attributes      jsonb       -- typé par `type`, schéma validé à l'ingestion
  embedding       vector(768) -- description textuelle encodée, sert à la dédup et au cold start entité
  popularity      real        -- 0..1, sert à pondérer la rareté
  quality_score   real        -- 0..1, confiance dans la propreté de l'entité
  status          enum        -- active, merged, quarantine
  merged_into     uuid?
  source          text
  created_at      timestamptz
```

**Règles dures :**

- Une entité n'entre en base que par le pipeline d'ingestion (§2.4). Jamais de création directe par un utilisateur au MVP.
- Une entité `quarantine` n'est jamais proposée à la notation, mais reste en base.
- Un merge ne supprime jamais : `status = merged`, `merged_into` pointe vers la canonique, et les jugements sont réattribués.
- `attributes` est validé contre un schéma JSON par `type`. Un attribut non conforme → quarantaine.

### 2.3 Types d'entité

| Type                         | Domaine                | Niveau    | Exemple                                    |
| ---------------------------- | ---------------------- | --------- | ------------------------------------------ |
| `work`                       | cinéma, livre, jeu, BD | 1         | Blade Runner                               |
| `creator`                    | tous                   | 0         | Denis Villeneuve                           |
| `track` / `album` / `artist` | musique                | 2 / 1 / 0 | Paranoid Android / OK Computer / Radiohead |
| `dish`                       | bouffe                 | 1         | Pizza napolitaine                          |
| `cuisine`                    | bouffe                 | 0         | Cuisine libanaise                          |
| `ingredient`                 | bouffe                 | 1         | Coriandre                                  |
| `place_type`                 | lieu                   | 0         | Village de bord de mer                     |
| `place`                      | lieu                   | 1         | Lisbonne                                   |
| `object`                     | objet                  | 1         | Chaise Eames                               |
| `brand`                      | objet                  | 0         | Patagonia                                  |
| `activity`                   | sport, loisir          | 1         | Escalade en salle                          |
| `club`                       | sport                  | 1         | OM                                         |
| `axis_pair`                  | abstrait               | —         | ville / campagne                           |

**Note sur la granularité :** les jugements se propagent le long de la hiérarchie avec un facteur d'atténuation. Noter « OK Computer » informe partiellement le score de « Radiohead » et faiblement celui de chaque morceau. Voir §4.3.

### 2.4 Pipeline d'ingestion

Cinq étages, dans l'ordre, sans exception.

```
SOURCE → EXTRACT → NORMALIZE → DEDUP → VALIDATE → PUBLISH
```

**1. Source.** Par domaine, par ordre de préférence :

| Domaine              | Sources                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cinéma / séries      | TMDB (gratuit, propre, multilingue)                                                                                                                              |
| Musique              | MusicBrainz + Discogs (dumps complets téléchargeables)                                                                                                           |
| Livres               | OpenLibrary (dump complet)                                                                                                                                       |
| Jeux vidéo           | IGDB                                                                                                                                                             |
| Jeux de société      | BoardGameGeek XML API                                                                                                                                            |
| Lieux                | OpenStreetMap (extraits Geofabrik) + Wikidata                                                                                                                    |
| BD / manga / anime   | AniList, MangaDex                                                                                                                                                |
| Podcasts             | index RSS publics                                                                                                                                                |
| **Bouffe**           | **construit** : ~2 000 plats + ~150 cuisines + ~300 ingrédients couvrent 95 % des cas. Généré par LLM puis relu à la main. Petit, fini, faisable en un week-end. |
| **Objets / marques** | **construit** : listes par catégorie, générées puis relues. Priorité : vêtements, mobilier, tech, voitures, cosmétiques.                                         |
| **Sport**            | **construit** : disciplines + grands clubs. Catalogue fini et petit.                                                                                             |
| **Abstrait**         | **écrit à la main** : 150 à 300 paires d'axes. C'est le liant du système, il mérite un soin manuel total.                                                        |

> **Règle sur la génération par LLM :** un LLM peut _proposer_ des entités, jamais les publier. Toute entité générée passe en `quarantine` et nécessite une validation (relecture humaine, ou recoupement avec au moins deux sources externes). Une hallucination publiée est une pollution permanente du vecteur de tous les utilisateurs.

**2. Extract.** Vers un format intermédiaire unique (`RawEntity`), un adaptateur par source. Aucune logique métier ici.

**3. Normalize.** Casse, accents, ponctuation, articles initiaux, translittération, espaces. Génération de la clé de blocage (`blocking_key`) pour la dédup.

**4. Dedup.** Trois passes successives :

- **Bloc exact** : `external_ids` identiques → même entité.
- **Bloc flou** : même `blocking_key` + distance de Levenshtein normalisée > 0.9 → candidat merge.
- **Bloc sémantique** : similarité cosinus des embeddings > 0.93 + même `type` → candidat merge.
  Un candidat merge au-dessus du seuil est fusionné automatiquement ; entre deux seuils, il part en `quarantine` pour revue.

**5. Validate.** Schéma JSON par type, complétude des champs obligatoires, cohérence de la hiérarchie (`parent_id` du bon type et du bon domaine), détection de langue.

**6. Publish.** `status = active`. À partir de là l'entité est proposable.

**Le pipeline est idempotent et rejouable.** Il tourne hors ligne, en CLI, jamais dans le chemin d'une requête utilisateur.

---

## 3. Modèle de jugement

```
Judgment
  id            uuid
  user_id       uuid
  entity_id     uuid
  kind          enum   -- duel, sort, verdict, axis
  value         jsonb  -- dépend de kind, voir ci-dessous
  context       jsonb  -- session_id, position dans la session, temps de réponse (ms)
  created_at    timestamptz
```

| `kind`    | `value`                                                                          |
| --------- | -------------------------------------------------------------------------------- |
| `duel`    | `{ opponent_id, winner_id }`                                                     |
| `sort`    | `{ ordered_ids: [...] }`                                                         |
| `verdict` | `{ level: "loved" \| "liked" \| "meh" \| "hated" \| "unknown" \| "not_for_me" }` |
| `axis`    | `{ pair_id, side: "a" \| "b", strength: 1..3 }`                                  |

**Le temps de réponse est stocké.** Une réponse en 400 ms et une réponse en 12 s n'ont pas la même valeur de confiance. C'est gratuit à collecter et précieux plus tard.

---

## 4. Moteur de préférence

### 4.1 Score par entité

Un score latent par (utilisateur, entité), mis à jour en ligne.

- **Duel** : mise à jour Elo classique, K adaptatif décroissant avec le nombre de jugements de l'utilisateur dans le domaine.
- **Tri** : décomposé en duels par paires ordonnées, avec un K réduit.
- **Verdict** : ancrage direct sur une échelle fixe, avec une incertitude plus large que le duel.
- **`unknown`** : n'affecte pas le score, mais est stocké (alimente la découverte et exclut l'entité des propositions futures de duel).

Chaque score porte une **incertitude** (variance). Un système de type Glicko / TrueSkill est plus adapté qu'un Elo simple, parce que l'incertitude est ce qui pilote la sélection active (§5).

### 4.2 Vecteur utilisateur

C'est la représentation centrale.

- **Vecteur par domaine** : factorisation matricielle (ALS ou SGD) sur la matrice utilisateur × entité, ~64 dimensions par domaine.
- **Vecteur global** : concaténation des vecteurs de domaine + vecteur des axes abstraits, réduit à ~128 dimensions par une seconde factorisation apprise sur l'ensemble des utilisateurs. **C'est ce vecteur global qui porte la thèse cross-domaine.**
- Recalcul par batch (nocturne au début), mise à jour incrémentale approximative en ligne entre deux batchs.
- Stockage en `pgvector`, index HNSW.

**Cold start utilisateur :** les axes abstraits sont notés en premier (onboarding), donnent immédiatement un vecteur grossier, qui suffit à proposer des jumeaux approximatifs et des recommandations dès la première session.

### 4.3 Propagation hiérarchique

Un jugement sur une entité de niveau `n` met à jour partiellement ses ancêtres et descendants, avec un facteur d'atténuation `α` par saut (valeur de départ : `α = 0.35` vers le parent, `0.15` vers les enfants). Les valeurs sont à calibrer empiriquement.

### 4.4 Pondération par rareté

Dans le calcul de similarité entre utilisateurs, chaque entité est pondérée par une fonction inverse de sa popularité (logique IDF).

> Deux personnes qui adorent le même film obscur sont bien plus semblables que deux personnes qui adorent le même blockbuster.

C'est ce qui empêche le biais de popularité de rendre tout le monde identique.

### 4.5 Similarité entre utilisateurs

- **Score global** : cosinus pondéré des vecteurs globaux, borné à `[0,1]`, exposé en pourcentage.
- **Score par domaine** : même calcul, restreint au vecteur du domaine. C'est ce qui produit les **jumeaux partiels** (« identique en musique, opposé en bouffe »).
- **Confiance** : fonction du nombre d'entités jugées en commun. **Un score de similarité n'est jamais affiché en dessous d'un seuil de confiance minimum** — afficher « 97 % » sur la base de 4 entités communes détruirait la crédibilité du produit.
- **Anti-jumeau** : le cosinus le plus négatif, avec la même contrainte de confiance.

---

## 5. Sélection active des questions

Le moteur qui décide quoi demander. C'est ce qui rend la boucle addictive et non fatigante.

À chaque question, un candidat est scoré sur :

```
score = w1 · gain_information
      + w2 · probabilite_de_connaissance
      + w3 · nouveaute_de_domaine
      + w4 · pouvoir_discriminant_social
      - w5 · fatigue_de_domaine
```

- **gain_information** : réduction attendue de la variance du profil (le cœur : apprentissage actif).
- **probabilite_de_connaissance** : estimée à partir de la popularité de l'entité et du profil connu. Proposer un duel entre deux entités inconnues de l'utilisateur est la principale cause d'abandon d'une session.
- **nouveaute_de_domaine** : bonus pour explorer les zones vierges de la carte.
- **pouvoir_discriminant_social** : entités qui séparent le plus fortement la population d'utilisateurs. Une entité clivante vaut dix entités consensuelles.
- **fatigue_de_domaine** : malus si on vient de poser 8 questions sur le même domaine. **La variété est un impératif de rétention** : la session doit sauter de la bouffe au cinéma aux axes abstraits.

**Rythme de session recommandé :** environ 60 % duels, 20 % verdicts, 15 % axes abstraits, 5 % tris. À ajuster après mesure.

---

## 6. Périmètre du MVP (v0.1)

Le MVP a **un seul objectif** : vérifier que la boucle de notation est agréable et que le passeport a de la valeur pour un utilisateur seul. Le social vient en v0.2.

### Dans le périmètre

- **6 domaines au lancement** : cinéma/séries, musique, bouffe, lieux, livres, abstrait.
  _(6 domaines suffisent pour l'effet de transfert et restent tenables côté catalogue. Objectif v0.3 : 12.)_
- **Catalogue** : 3 000 à 8 000 entités actives par domaine, sélectionnées par popularité décroissante. Pas plus — mieux vaut 5 000 entités impeccables que 500 000 sales.
- **Onboarding** : 60 à 90 secondes. Axes abstraits d'abord, puis duels multi-domaines. Une jauge de précision visible qui monte à chaque réponse. Aucune inscription demandée avant la fin de l'onboarding.
- **Session de notation** : les 4 modes, sélection active, infinie.
- **Le passeport** : carte de goût, axes dominants, rareté, top et flop par domaine, zones vierges. **Doit être beau.** Export image, lien public.
- **Recommandations personnelles** : « à découvrir », par domaine, y compris dans les domaines non notés (démonstration du transfert — c'est le test de la thèse).
- **Compte + auth** minimal.

### Hors périmètre v0.1 (explicitement)

Jumeaux, feed, prescription, décision de groupe, « quoi ce soir ? », commentaires, notifications, mobile natif, monétisation, i18n.

### Critère de sortie du MVP

Sur 30 testeurs recrutés hors cercle proche :

- ≥ 70 % terminent l'onboarding ;
- ≥ 40 % reviennent au moins une fois dans les 7 jours ;
- ≥ 50 % valident au moins une recommandation dans un domaine non noté (**validation de la thèse §3**) ;
- ≥ 30 % partagent leur passeport spontanément.

Si le troisième critère échoue, la thèse cross-domaine est fausse et **il faut repenser le produit, pas ajouter des fonctionnalités.**

---

## 7. Stack

**Le produit est mobile-first.** La boucle de notation est faite de micro-sessions courtes, tactiles, dans les temps morts de la journée — c'est un usage de téléphone, pas de bureau. Le web n'existe que pour une chose : rendre le passeport partageable par lien (moteur de croissance §10 de `VISION.md`).

### 7.1 Monorepo

Turborepo + pnpm workspaces.

```
idem/
├── apps/
│   ├── mobile/          Expo (React Native) — le produit
│   ├── api/             backend
│   └── web/             Next.js minimal : passeport public, landing, OG images
├── packages/
│   ├── shared/          types, schémas Zod, constantes de tuning
│   ├── contracts/       contrats d'API partagés (source de vérité des types)
│   ├── db/              schéma Drizzle + migrations
│   └── ui/              primitives partagées mobile/web (optionnel, à ne pas forcer)
└── pipeline/            CLI Python d'ingestion + calcul batch (hors workspace JS)
```

**Règle :** `packages/shared` et `packages/contracts` sont la seule frontière entre le mobile et l'API. Aucun type dupliqué à la main.

### 7.2 Choix par couche

| Couche       | Choix                                         | Raison                                                                                                   |
| ------------ | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Mobile       | Expo (SDK récent) + Expo Router + TypeScript  | Le produit. Un seul codebase iOS/Android, OTA updates pour itérer sans passer par les stores             |
| Style        | NativeWind                                    | Tailwind côté natif, cohérence avec le web                                                               |
| État / cache | TanStack Query + Zustand                      | Cache réseau + état local de session de notation                                                         |
| Animations   | Reanimated + Gesture Handler                  | **Critique** : la boucle de duel doit être fluide et gestuelle (swipe). C'est le cœur du plaisir d'usage |
| Backend      | **Hono ou Nest à décider + tRPC** (voir §7.3) | Léger, typé de bout en bout avec le client Expo                                                          |
| Base         | PostgreSQL + `pgvector`                       | Relationnel, vecteurs, plein texte, dans un seul système                                                 |
| ORM          | Drizzle                                       | Typé, léger, migrations lisibles, partagé via `packages/db`                                              |
| Auth         | Better Auth (magic link + Apple + Google)     | Sign in with Apple obligatoire sur iOS si un autre OAuth est proposé                                     |
| Web          | Next.js minimal                               | Passeport public + OG images dynamiques. **Pas de duplication du produit**                               |
| Batch / ML   | Python (numpy, `implicit`, scikit-learn)      | Factorisation matricielle. Pas d'équivalent sérieux en JS                                                |
| Ingestion    | CLI Python dans `pipeline/`                   | Hors ligne, rejouable, indépendante de l'app                                                             |
| Hébergement  | VPS unique + Docker Compose                   | Coût maîtrisé, pas de vendor lock-in                                                                     |

### 7.3 Sur le choix du backend

**Recommandation : Hono + tRPC.**

Le critère décisif ici n'est pas la structure du backend, c'est **la typage de bout en bout entre l'API et le client Expo**. Avec tRPC, une modification de route casse la compilation du mobile immédiatement ; c'est ce qui fait gagner du temps quand on développe seul. Hono apporte le routage, les middlewares et la portabilité de runtime sans imposer d'architecture.

**Si tu préfères NestJS, c'est défendable — mais pour une seule raison.** NestJS reste en 2026 le choix par défaut des backends TypeScript structurés de taille moyenne à grande, et son intérêt réel dans ce projet est ailleurs que la performance : **ses conventions rigides (modules / contrôleurs / services / DI) sont exactement ce qui empêche un agent IA de produire une architecture incohérente au fil des sessions.** Un agent qui écrit du Hono invente sa propre organisation ; un agent qui écrit du NestJS suit un rail.

Les deux contre-arguments, en revanche, pèsent lourd ici :

- **Verbosité et boilerplate** disproportionnés pour une API dont le vrai travail est ailleurs (le pipeline de données et le batch Python) ;
- **La DI et les décorateurs ne résolvent aucun problème que tu as**, puisqu'il n'y a ni équipe à coordonner ni longue durée de vie multi-mainteneurs à protéger.

**Arbitrage :** Hono + tRPC, et on compense le risque « architecture qui dérive » par une convention de dossiers écrite noir sur blanc dans `AGENTS.md` (§9). La discipline vient du document, pas du framework.

Si tu veux le meilleur des deux : Hono comme serveur HTTP, tRPC pour le contrat, et une organisation en modules verticaux (`modules/judgment/`, `modules/passport/`, `modules/entity/` — chacun avec `router.ts`, `service.ts`, `repository.ts`). C'est NestJS sans les décorateurs.

---

## 8. Feuille de route

**Phase 0 — Fondations (semaines 1-2)**
Monorepo Turborepo, schéma de base, pipeline d'ingestion, 2 domaines ingérés (cinéma, musique) pour valider le pipeline de bout en bout. Squelette Expo qui affiche une entité. Aucune UI travaillée.

**Phase 1 — La boucle (semaines 3-4)**
Écran de notation sur mobile, les 4 modes, moteur Elo/Glicko, sélection active (version simple : gain d'information + popularité).
**Le duel doit être gestuel et fluide dès cette phase** — swipe, retour haptique, transitions. Ce n'est pas du polish reporté à plus tard : si le geste n'est pas agréable, tout le produit s'effondre, et on le saura seulement en le testant sur un vrai téléphone. Testable sur soi en continu via Expo Go / dev build.

**Phase 2 — Le catalogue complet (semaine 5)**
Les 4 domaines restants, dont les catalogues construits (bouffe, abstrait) qui demandent du travail manuel.

**Phase 3 — Le passeport (semaines 6-7)**
Factorisation, vecteurs, calcul de rareté, l'écran passeport sur mobile, l'export image. Mise en place de `apps/web` : page publique du passeport + OG image dynamique, rien d'autre. C'est ici que le produit devient montrable et partageable.

**Phase 4 — Le transfert (semaine 8)**
Recommandations cross-domaines. **C'est le test de la thèse.** Ne pas passer à la suite avant de l'avoir validé.

**Phase 5 — Test utilisateurs (semaine 9)**
30 testeurs, mesure des critères §6. Décision : itérer, ou pivoter.

**Phase 6 — Le social (v0.2)**
Jumeaux, feed de verdicts, prescription. Seulement une fois la valeur solo prouvée.

---

## 9. Règles pour les agents IA travaillant sur ce repo

À lire avant toute contribution.

1. **Lire `VISION.md` en entier avant d'écrire du code.** Les décisions produit y sont justifiées. Ne pas les réinventer.
2. **Ne jamais ajouter de fonctionnalité listée en anti-objectif (`VISION.md` §8).** En particulier : pas de followers, pas de compteurs de popularité, pas de texte libre au centre du produit, pas de notation de personnes, pas de données politiques ou religieuses.
3. **Ne jamais insérer une entité en base hors du pipeline d'ingestion.** Aucun script ponctuel, aucun seed manuel en production.
4. **Ne jamais publier une entité générée par LLM sans validation.** Elle entre en `quarantine`.
5. **Ne jamais écraser un jugement.** Les jugements sont append-only. La correction se fait par ajout d'un nouvel événement.
6. **Ne pas afficher un score de similarité sous le seuil de confiance.** Préférer « pas encore assez de données » à un chiffre faux.
7. **Respecter le périmètre du MVP (§6).** Ne pas construire le social en v0.1, même si c'est tentant et facile.
8. **Préférer la simplicité au clever.** Monolithe, pas de service supplémentaire, pas d'abstraction anticipée.
9. **Tout paramètre de tuning (seuils, poids, α, K) est une constante nommée dans un fichier de config unique.** Ils seront tous recalibrés empiriquement.
10. **En cas de doute entre deux implémentations : choisir celle qui préserve le mieux la qualité des données de goût.** C'est l'actif.
11. **Aucun type ne doit être dupliqué entre `apps/mobile` et `apps/api`.** Toute forme de donnée partagée passe par `packages/shared` ou `packages/contracts`.
12. **`apps/web` ne reçoit jamais de fonctionnalité produit.** Son périmètre est strictement : passeport public, OG images, landing. Toute logique de notation ou de profil qui y apparaît est un bug de périmètre.
13. **Organisation du backend en modules verticaux** : `modules/<domaine>/{router,service,repository}.ts`. Pas de dossier `controllers/` global, pas de dossier `services/` global.
14. **Ne pas dégrader la fluidité de l'écran de notation** pour ajouter une fonctionnalité. 60 fps sur l'interaction de duel est une contrainte, pas un objectif.

---

## 10. Questions ouvertes

À trancher, mais qui ne bloquent pas le démarrage.

- Notes publiques ou privées par défaut ? (Recommandation : privées, agrégées seulement, avec passage en public opt-in par domaine.)
- Faut-il un mode « je ne veux plus voir ce domaine » ? (Probablement oui, mais après mesure.)
- Comment gérer un goût qui change ? Fenêtre glissante pondérée par le temps vs. historique complet. (Recommandation : demi-vie longue, ~3 ans, et exposer explicitement la trajectoire comme fonctionnalité.)
- Modèle économique : abonnement pour quoi exactement ? (Pistes : nombre de jumeaux visibles, historique de trajectoire, décision de groupe, domaines avancés.)
- Nom de domaine et identité visuelle.
