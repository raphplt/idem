# VISION.md

> Document fondateur. Il décrit **pourquoi** ce produit existe, **ce qu'il est**, et surtout **ce qu'il n'est pas**.
> Toute décision de produit ou d'implémentation doit pouvoir être justifiée par une section de ce document.
> Si une décision le contredit, c'est ce document qu'il faut modifier explicitement — pas le contourner.

---

## 1. Pitch

**Un passeport de goût.**

Tu notes ce que tu aimes et ce que tu détestes, dans tous les domaines de la vie — films, musique, bouffe, lieux, objets, sports, livres, jeux, esthétiques, façons de vivre. L'app construit ta signature. Puis elle te connecte aux gens dont la signature ressemble à la tienne, où qu'ils soient dans le monde, et te laisse voir la vie à travers eux.

En une phrase : **« Les 20 personnes au monde qui te ressemblent le plus, et tout ce qu'elles aiment. »**

---

## 2. Le problème

Trois problèmes distincts, tous non résolus, tous très grand public.

**a. La recommandation algorithmique est devenue une moyenne.**
Netflix, Spotify, Google Maps, Amazon recommandent ce qui plaît statistiquement au plus grand nombre, biaisé par des enjeux commerciaux. Résultat : de la hype, du consensus, de la fadeur. Personne ne fait confiance à une recommandation algorithmique ; tout le monde fait confiance à la recommandation d'une personne dont il sait qu'elle a le même goût. Ce lien n'existe nulle part à l'échelle.

**b. Les réseaux sociaux connectent par proximité sociale, pas par affinité réelle.**
On est connecté aux gens de son lycée, de son travail, de sa ville. C'est-à-dire à des gens qui nous ressemblent par accident géographique. Les gens qui nous ressemblent _vraiment_ sont statistiquement ailleurs, et on ne les rencontrera jamais.

**c. Personne ne dispose d'une représentation de son propre goût.**
On sait dire « j'aime bien le rock » et « je déteste la coriandre ». On n'a aucune vue d'ensemble, aucune structure, aucune évolution dans le temps, rien à montrer. Le goût est ce qu'il y a de plus identitaire chez l'humain et c'est le seul aspect de l'identité qui n'a jamais été instrumenté.

---

## 3. La thèse

C'est le pari scientifique du produit, et son avantage défendable.

**Les préférences humaines ont une structure latente commune à travers les domaines.**

Autrement dit : ton goût en cinéma prédit statistiquement ton goût en musique, en nourriture, en design d'objet, en type de lieu. Ce n'est pas une intuition — c'est un fait mesurable et abondamment documenté (psychologie des préférences, recommandation cross-domaine, transfer learning en systèmes de recommandation). Les mêmes axes profonds — recherche de nouveauté vs. familiarité, intensité vs. douceur, ordre vs. chaos, densité vs. épure, ironie vs. sincérité — se réexpriment dans chaque domaine.

Personne n'a exploité ça en produit grand public, pour une seule raison : **personne ne détient les données des deux côtés.** Spotify ne sait pas ce que tu manges. Letterboxd ne sait pas où tu voyages. Google le sait mais ne peut pas en faire un objet social.

Deux conséquences, et ce sont les deux piliers du projet.

### 3.1 Le cold start se résout par transfert

Tu notes 30 films, et l'app te recommande déjà des restaurants, des livres, des lieux, des objets — sans que tu aies rien noté dans ces domaines. C'est un effet « comment tu sais ça ? » que **aucun acteur mono-domaine ne peut répliquer**. C'est l'argument de lancement, la démo, et le moteur de bouche-à-oreille.

### 3.2 La couverture large est ce qui rend le graphe dense

Sur un seul domaine, il faut des millions d'utilisateurs pour que quelqu'un trouve un vrai jumeau. Sur douze domaines, quelques milliers suffisent : deux personnes qui ne partagent aucun film peuvent être identiques sur la bouffe, les lieux et les objets.

> **Conséquence directe et non négociable : le produit est multi-domaines dès le jour 1.**
> Restreindre le lancement à un seul domaine détruirait à la fois l'effet de transfert et la densité du graphe, c'est-à-dire les deux seuls avantages structurels du produit. La largeur n'est pas une ambition, c'est la solution technique au problème qui tue 95 % des réseaux sociaux.

---

## 4. Les quatre couches

Tout réseau social qui a duré remplit quatre fonctions indépendantes. La plupart des projets morts en remplissaient une ou deux. Voici comment chacune est servie ici.

### Couche 1 — Dopamine : pourquoi j'ouvre l'app

Récompense sociale variable + feedback immédiat quantifié.

- Chaque session de notation fait bouger une jauge de précision du profil.
- Chaque notation peut faire apparaître un nouveau jumeau, ou déplacer un score d'affinité existant.
- Le moment « quelqu'un est à 94 % de toi » est le pic dopaminergique du produit. Il est rare, imprévisible, et il arrive _à cause d'une action que tu viens de faire_.
- Les verdicts de tes jumeaux arrivent en continu et te concernent directement.

**Règle de conception : aucune action de l'utilisateur ne doit rester sans conséquence visible en moins d'une seconde.**

### Couche 2 — Consommation : pourquoi je reste

Le feed n'est pas alimenté par la production des utilisateurs, mais par **le catalogue mondial d'entités vu à travers les gens.** Il est donc infini par construction et plein dès le premier jour.

Trois flux se mélangent :

1. Les **verdicts** de tes jumeaux (« ton jumeau à 94 % vient de détruire le film que tu voulais voir »).
2. Les **découvertes** : ce que les gens comme toi aiment et que tu ne connais pas.
3. Les **sessions de notation** elles-mêmes, qui sont un contenu consommable (le duel est jouable indéfiniment).

**Règle : noter, c'est publier.** Il n'y a pas d'écriture libre obligatoire, donc pas d'asymétrie créateurs/consommateurs, donc pas de feed vide. C'est la faille structurelle qui tue les réseaux sociaux classiques, et elle est neutralisée à la racine.

### Couche 3 — Capital : pourquoi je ne pars pas

Le passeport accumule et ne peut pas être reconstruit ailleurs :

- des milliers de jugements, impossibles à ressaisir ;
- un historique de goût daté, donc une trajectoire personnelle ;
- un réseau de jumeaux dont la valeur croît avec l'ancienneté ;
- des tampons : ce que tu as découvert, consommé, validé, sur recommandation de qui.

**Règle : rien n'expire, rien ne se supprime silencieusement.** Le capital est la rétention.

### Couche 4 — Statut : pourquoi j'y investis du travail

Volontairement **non hiérarchique et non compétitif** — c'est un choix de différenciation, pas de la timidité. Pas de followers, pas de karma, pas de classement général.

Les axes de statut sont :

- la **rareté** de ton goût (à quel point tu es statistiquement singulier) ;
- l'**autorité de niche** (tu es la référence pour un micro-domaine) ;
- la **précision** de ton profil (une jauge d'effort, visible) ;
- le **taux de prescription réussie** : quand tu recommandes, les gens aiment.

Aucun de ces axes ne peut être acheté ni farmé par le volume. Ils récompensent la sincérité et la constance, pas la performance.

---

## 5. Le passeport

C'est l'objet central du produit, et la métaphore directrice de toute l'UI.

Un passeport a exactement trois propriétés, et elles se traduisent une par une :

**Il te décrit.**
Un objet visuel, lisible en 3 secondes, esthétique, et partageable hors de l'app (image, lien public). C'est le principal moteur de croissance organique — le mécanisme Spotify Wrapped, mais permanent au lieu d'annuel. Le passeport doit être beau au point qu'on ait envie de le poster ailleurs.

**Il te donne accès.**
Il ouvre des portes : les jumeaux, les recommandations calibrées, les groupes, les compatibilités, les décisions collectives. Sans passeport rempli, rien ne s'ouvre — ce qui rend la construction du profil désirable plutôt que corvéable.

**Il se tamponne.**
Il garde la trace de tout ce que tu as découvert, consommé, validé, et par qui ça t'a été prescrit. Chaque tampon est une preuve de vécu, pas une déclaration.

---

## 6. Le mécanisme de notation

C'est le cœur technique et le cœur addictif. Quatre modes, quatre rôles distincts. **Aucun ne peut être supprimé sans casser le système.**

### 6.1 Le duel

Deux entités, tu choisis. Rating de type Elo, personnel.

- Zéro calibration nécessaire (pas de « c'est quoi un 4 sur 5 pour moi ? »).
- Très haute information par interaction.
- Intrinsèquement ludique.
- **Ne s'épuise jamais** : le nombre de paires croît au carré de la taille du catalogue.

C'est le mode par défaut : celui de l'onboarding, et celui de la session quotidienne.

### 6.2 Le tri

On te donne 5 à 7 entités, tu les ordonnes. Beaucoup plus d'information qu'un duel pour un effort à peine supérieur. Réservé aux sessions plus longues et aux domaines déjà bien couverts.

### 6.3 Le verdict

Sur une entité précise : réaction rapide et polarisée.

`adoré` · `bien` · `bof` · `détesté` · `connais pas` · `pas pour moi`

Deux points critiques :

- **Le rejet est le signal le plus discriminant.** Tout le monde aime les Beatles ; ce sont les détestations qui séparent les gens. L'échelle est donc délibérément asymétrique vers le négatif.
- **`connais pas` est un état stocké**, pas une absence de donnée. C'est ce qui alimente la découverte et distingue « je ne connais pas » de « je n'ai pas envie ».

### 6.4 La paire abstraite

« Plutôt A ou plutôt B », sur des axes non catalogables :
ville / campagne · chaos / ordre · nouveauté / familiarité · intensité / douceur · ironie / sincérité · densité / épure · vitesse / lenteur · brut / raffiné...

Rôle capital, souvent sous-estimé :

- **100 % universel** : aucune culture, aucun savoir, aucun équipement requis. Ma mère, un lycéen et un maçon peuvent tous répondre au premier écran.
- C'est le **liant entre les domaines** : ce sont les items qui portent la structure latente commune.
- Ça permet de te profiler **avant** que tu aies noté la moindre entité — donc de personnaliser dès la 30ᵉ seconde.

### 6.5 La règle qui tient l'ensemble

> **L'app choisit toujours quoi te demander. Jamais un champ vide, jamais « cherche un film ».**

Un moteur d'incertitude sélectionne en permanence la question dont la réponse réduira le plus l'incertitude sur ton profil (apprentissage actif). Conséquences :

- L'effort cognitif de l'utilisateur tombe à zéro : il n'a jamais à _penser à quoi noter_.
- Chaque réponse _compte_ réellement, et c'est ressenti.
- La session ne se termine jamais naturellement — elle se termine quand l'utilisateur décide d'arrêter.

Le compteur affiché n'est **pas** le nombre de notes, c'est la **précision du profil** : une jauge qui monte vite au début, ralentit progressivement, et **n'atteint jamais 100 %**. Chaque nouveau domaine ouvert rouvre une zone vierge sur la carte. On gamifie la connaissance de soi, pas le volume de travail.

---

## 7. Les objets sociaux

Ce qui est construit à partir du profil. Classé par fonction.

### Identité

- **Le passeport** : portrait de goût généré, axes, carte, signature partageable.
- **La rareté** : à quel point ton goût est commun ou singulier. Métrique de statut inédite et non hiérarchique.
- **La trajectoire** : comment ton goût a bougé sur 6 mois, 2 ans, 10 ans.
- **Les zones vierges** : les domaines où l'app ne te connaît pas encore. Moteur d'engagement.

### Le lien

- **Les jumeaux** : les N personnes au monde dont le vecteur est le plus proche du tien, tous domaines confondus. C'est la promesse centrale du produit.
- **L'anti-jumeau** : la personne la plus opposée. Drôle, addictif, et utile — c'est un filtre à recommandation négative parfaitement fiable (« il a adoré, donc fuis »).
- **Les jumeaux partiels** : « identique en musique, opposé en bouffe ». Beaucoup plus riche et conversationnel qu'un score unique.
- **La compatibilité** : mesurable et partageable entre deux personnes qui se connaissent déjà (couple, amis, collègues). Usage viral majeur.

### L'utilité — ce qui sauve du « j'ouvre plus l'app »

- **« Quoi ce soir ? »** : un bouton, une réponse, calculée sur tes jumeaux, contextualisée par le lieu, l'heure, la météo, le temps disponible. C'est le cas d'usage qui justifie l'existence quotidienne du produit.
- **La décision de groupe** : 3 à 8 personnes, l'app trouve le film / le resto / l'activité qui maximise la satisfaction du groupe (et minimise le rejet maximal). Usage social viral, importe des utilisateurs par grappes entières.
- **La prescription** : un jumeau t'envoie quelque chose, tu le consommes, tu rends un verdict. Boucle sociale à obligation douce, très forte rétention, et alimentation du score de prescription.
- **Le filtre anti-hype** : ce qui plaît aux gens comme toi, pas ce qui plaît à tout le monde. Le delta entre les deux est en soi une information intéressante.

### Le feed

Composé de **verdicts**, pas de posts. Court, universel, infini, sans effort de production.

Format type : `[Jumeau 94 %] a détesté [Entité] — que tu voulais voir.`

**Règle absolue : la découverte n'est jamais anonyme.**
Jamais « recommandé pour toi ». Toujours « 3 de tes jumeaux ont adoré, aucun ne l'a détesté ». Une recommandation portée par des personnes est plus crédible ET socialement génératrice — elle crée un prétexte de contact.

---

## 8. Anti-objectifs

Ce que le produit ne fera **jamais**. Ces exclusions sont des décisions de conception, pas des manques.

**Pas d'opinions politiques ni religieuses dans le profil.**
Trois raisons dures :

1. **Juridique** : en Europe, les opinions politiques, convictions religieuses, données de santé, orientation sexuelle et origine ethnique sont des catégories particulières au sens du RGPD (art. 9). Traitement interdit par principe, dérogation par consentement explicite, avec un régime de conformité intenable pour une petite structure.
2. **Produit** : l'affinité politique écrase tout le reste. Dès qu'elle entre dans le vecteur, elle devient _le_ critère, le réseau de goût devient un réseau d'appartenance politique, le contenu se polarise et la modération explose.
3. **Marché** : un produit clivant perd la moitié de ses inscrits potentiels d'entrée de jeu.

**Pas de notation de personnes.**
Ni apparence, ni « type de personne que j'aime ». Ça transformerait le produit en app de rencontre, avec la modération, le harcèlement et les problèmes de réputation associés. L'affinité interpersonnelle doit être **un effet émergent du goût**, jamais un input.

**Pas d'écriture libre au centre du produit.**
Le texte libre ramène l'asymétrie créateurs/consommateurs, la performance sociale, et la modération de masse. Le commentaire existe, mais en périphérie et attaché à une entité — jamais comme atome principal.

**Pas de followers, pas de compteurs d'audience, pas de classement général.**
Toute métrique de popularité transforme la sincérité en stratégie. Or le produit ne vaut **que** si les notes sont sincères : une note stratégique est une donnée empoisonnée qui dégrade le moteur pour tout le monde.

**Pas de recommandation payée, jamais.**
Le produit est une machine à confiance. Une seule recommandation sponsorisée détruit l'actif entier. Monétisation par abonnement uniquement.

**Pas d'exclusivité culturelle.**
Aucun domaine ne doit exiger un capital culturel, un budget ou un équipement. Test permanent à appliquer à toute nouvelle fonctionnalité :

> _Est-ce qu'une personne de 60 ans sans culture cinéphile et sans argent peut produire du contenu ici dès le premier jour, sans effort et sans honte ?_
> Si non, la fonctionnalité est refusée.

---

## 9. Risques et parades

| Risque                                                         | Gravité                                                        | Parade                                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Catalogue d'entités sale (doublons, granularité incohérente)   | **Critique** — détruit silencieusement toutes les corrélations | Pipeline d'ingestion strict, entités canoniques, dédup obligatoire. Voir SPEC.md §2                         |
| Trop peu d'utilisateurs → jumeaux médiocres                    | Élevé                                                          | Multi-domaines dès J1 (densité) + seuil de confiance affiché + jumeaux partiels quand pas de jumeau global  |
| L'utilisateur se lasse de noter                                | Élevé                                                          | Sélection active des questions + variété des modes + utilité immédiate (« quoi ce soir ? ») dès la 50ᵉ note |
| Le lien social ne se matérialise pas (jumeaux = profils morts) | Élevé                                                          | Prescription à obligation douce + décision de groupe + notification quand un jumeau bouge                   |
| Biais de popularité (tout le monde a le même goût mainstream)  | Moyen                                                          | Pondération par rareté : une note sur une entité rare vaut beaucoup plus dans le calcul de similarité       |
| Notes stratégiques / posture sociale                           | Moyen                                                          | Aucun compteur de popularité, aucune audience mesurable. Notes privées par défaut, agrégées seulement       |
| Coût des API de catalogues                                     | Faible                                                         | Sources ouvertes prioritaires, mise en cache locale complète, aucune dépendance runtime                     |

---

## 10. Métriques de succès

Pour ne pas se raconter d'histoires. Par ordre de priorité.

1. **Taux de complétion de l'onboarding** (cible : > 70 %). S'il est bas, tout le reste est inutile.
2. **Notes par utilisateur à J+7** (cible : > 200). Mesure la qualité de la boucle de notation.
3. **Rétention J+7 et J+30** (cible : 30 % / 15 %). La seule métrique honnête d'un réseau social.
4. **Taux de « waouh » du transfert** : proportion d'utilisateurs qui valident une recommandation dans un domaine où ils n'ont rien noté. C'est la validation de la thèse §3.
5. **Interactions inter-utilisateurs par semaine** (prescriptions, décisions de groupe, consultations de profil). Mesure si le lien se matérialise vraiment.
6. **Taux de partage du passeport hors app.** Mesure le moteur de croissance.

---

## 11. Ce qu'on construit d'abord

L'ordre est dicté par une seule chose : **la thèse doit être vérifiable le plus tôt possible.**

1. Le pipeline d'entités et le moteur de notation. Sans données propres et sans boucle de notation agréable, rien d'autre n'a de sens.
2. Le passeport. C'est la valeur solo — le produit doit être bon **pour un utilisateur seul**, sans réseau. C'est la seule façon de survivre aux 1 000 premiers utilisateurs.
3. Les jumeaux et le feed de verdicts. Le produit devient social.
4. L'utilité (« quoi ce soir ? », décision de groupe). Le produit devient quotidien.

Détail d'implémentation, périmètre exact et modèle de données : voir `SPEC.md`.
