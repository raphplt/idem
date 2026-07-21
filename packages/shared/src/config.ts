/**
 * TOUS les paramètres de tuning du produit (SPEC.md §9 règle 9).
 * Chaque valeur est un point de départ à recalibrer empiriquement — ne jamais
 * disperser une constante de tuning ailleurs dans le code.
 *
 * Le pipeline Python a son propre miroir dans pipeline/idem_pipeline/config.py :
 * toute modification des seuils de dédup doit être répercutée des deux côtés.
 */

export const TUNING = {
  /** Moteur de score par (utilisateur, entité) — SPEC.md §4.1. Glicko-1 simplifié. */
  rating: {
    INITIAL_RATING: 1500,
    /** Incertitude initiale (RD Glicko). C'est elle qui pilote la sélection active. */
    INITIAL_RD: 350,
    /** Plancher d'incertitude : on ne devient jamais totalement sûr d'un goût. */
    MIN_RD: 60,
    /** q = ln(10)/400, constante Glicko. */
    Q: Math.LN10 / 400,
    /** Le tri est décomposé en duels par paires ordonnées avec un impact réduit (SPEC.md §4.1). */
    SORT_UPDATE_SCALE: 0.5,
    /** Ancres de rating pour les verdicts (échelle asymétrique vers le négatif, VISION.md §6.3). */
    VERDICT_ANCHORS: {
      loved: 1850,
      liked: 1620,
      meh: 1400,
      hated: 1000,
      not_for_me: 1200,
    } as Record<string, number>,
    /** Pas maximal d'un verdict vers son ancre (fraction du chemin restant, pondérée par RD/INITIAL_RD). */
    VERDICT_STEP: 0.5,
    /** Un verdict réduit moins l'incertitude qu'un duel (SPEC.md §4.1). */
    VERDICT_RD_DECAY: 0.92,
  },

  /** Propagation hiérarchique des jugements — SPEC.md §4.3. */
  propagation: {
    /** Atténuation vers le parent, par saut. */
    ALPHA_PARENT: 0.35,
    /** Atténuation vers les enfants directs (un seul saut : au-delà, l'effet est négligeable). */
    ALPHA_CHILD: 0.15,
    /** Profondeur max de remontée (morceau → album → artiste). */
    MAX_ANCESTOR_HOPS: 3,
  },

  /** Sélection active des questions — SPEC.md §5, version simple de Phase 1. */
  selection: {
    /** Poids incertitude (gain d'information, proxy : RD normalisé). */
    W_UNCERTAINTY: 1.0,
    /** Poids popularité (probabilité que l'utilisateur connaisse l'entité). */
    W_POPULARITY: 1.2,
    /** Malus par occurrence du domaine dans les questions récentes (fatigue de domaine). */
    W_FATIGUE: 0.35,
    /** Taille du vivier de candidats parmi lesquels on échantillonne. */
    CANDIDATE_POOL: 40,
    /** Nombre de domaines récents transmis par le client pour la fatigue. */
    RECENT_DOMAINS_WINDOW: 8,
    /**
     * Répartition des modes dans une session (SPEC.md §5 : 60/20/15/5).
     * Le tri est à 0 tant que l'écran de tri mobile n'existe pas (Phase 1) —
     * le remonter à 0.05 ensuite, en redescendant le duel à 0.60.
     */
    SESSION_MIX: {
      duel: 0.65,
      verdict: 0.2,
      axis: 0.15,
      sort: 0,
    } as Record<string, number>,
    /** Nombre d'entités dans un tri. */
    SORT_SIZE: 5,
  },

  /** Similarité entre utilisateurs — SPEC.md §4.5. (v0.2, constantes posées dès maintenant.) */
  similarity: {
    /** Jamais afficher un score de similarité sous ce nombre d'entités jugées en commun. */
    MIN_COMMON_ENTITIES: 25,
  },

  /** Passeport. */
  passport: {
    /** Nombre minimal de jugements sur une entité pour l'afficher en top/flop. */
    MIN_GAMES_FOR_DISPLAY: 2,
    TOP_N: 5,
    /**
     * Saturation de la jauge de précision : n/(n+SAT) — monte vite au début,
     * ralentit, n'atteint jamais 1 (VISION.md §6.5).
     */
    PRECISION_SATURATION: 25,
  },

  /** Dédup à l'ingestion — SPEC.md §2.4. Miroir : pipeline/idem_pipeline/config.py. */
  dedup: {
    /** Levenshtein normalisé ≥ ce seuil (même blocking_key) → merge automatique. */
    LEV_AUTO_MERGE: 0.95,
    /** Entre REVIEW et AUTO → quarantaine pour revue. */
    LEV_REVIEW: 0.9,
    /** Similarité cosinus des embeddings ≥ ce seuil + même type → candidat merge. */
    COSINE_MERGE: 0.93,
  },

  /** Vecteurs — SPEC.md §4.2. (Batch Python, Phase 3.) */
  vectors: {
    DOMAIN_DIM: 64,
    GLOBAL_DIM: 128,
    EMBEDDING_DIM: 768,
  },
} as const;
