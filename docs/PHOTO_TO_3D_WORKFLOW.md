# Workflow photo vers buste 3D

Ce document est la procédure canonique à relire avant de créer un nouveau
buste. Les photos, les modèles générés et l'historique de conversation restent
locaux et ne doivent jamais être ajoutés à Git.

Pour préparer une nouvelle machine, lire d'abord
`docs/PHOTO_TO_3D_INSTALLATION.md`.

## Ce qu'il faut retenir

- Hunyuan3D est la famille de modèles canonique du projet.
- Pour itérer rapidement depuis une photo, utiliser Hunyuan3D-2mini via le
  port Swift/MLX et générer d'abord la géométrie seule.
- Pour le buste final, utiliser Hunyuan3D-2mv avec 2 à 4 vues cohérentes. La
  commande canonique est `pnpm model:bust`.
- Hunyuan3D-Paint 2.1 ajoute la texture PBR après validation de la forme.
- Il n'y a pas de prompt texte pour retirer la tête ou les mains : on les
  retire par le cadrage ou un masque avant l'inférence.
- Les symptômes sont ajoutés ensuite par un traitement procédural. Ils ne
  nécessitent ni nouveau prompt LLM ni une génération IA complète par symptôme.
- Le premier prototype exploitable du projet a été produit depuis une seule
  photo avec `shape-small`, quantification 4 bits, 20 étapes, octree 192 et
  seed 7. `pnpm model:photo` reproduit désormais exactement ce préréglage.

Stable Fast 3D et TripoSR ne sont que des solutions de secours si Hunyuan3D est
indisponible sur une machine.

## Choisir une ou plusieurs photos

Pour un contrôle rapide du rendu, une photo suffit. Pour le modèle final,
prendre si possible quatre vues : face, profil gauche à 90°, dos, puis profil
droit à 90°.
Conserver le même éclairage, la même distance focale, la même hauteur de caméra
et une posture immobile. Des vues incohérentes peuvent être moins bonnes
qu'une seule photo propre.

Ne jamais faire tourner indépendamment le modèle mono-image sur quatre photos
en espérant que les résultats se fusionnent. Passer les vues ensemble à
Hunyuan3D-2mv.

Hunyuan3D-2mv associe chaque nom à un angle de caméra exact. Une photo trois
quarts à 45° ne doit jamais être fournie dans un emplacement de profil à 90°.

## Préparer les entrées

1. Créer un dossier local tel que `private-3d-inputs/bust-02/`. Ce dossier est
   ignoré par Git.
2. Y placer la ou les photos originales sans les renommer avec une donnée
   personnelle.
3. Recadrer des épaules aux hanches. La tête et les mains doivent être hors du
   cadre si elles ne doivent pas apparaître dans le modèle.
4. Utiliser un fond simple ou produire un PNG propre avec transparence. Le
   masque est plus fiable qu'une instruction textuelle pour exclure une zone.
5. Ne pas retoucher la forme anatomique avant l'inférence.
6. Créer dans ce même dossier privé un `RUN.md` indiquant la date, le modèle,
   les poids, les vues et la commande. Ce fichier est ignoré avec les photos.

Après le recadrage, appliquer l'orientation EXIF et détourer localement chaque
vue avec Vision/macOS :

    pnpm model:view:mask -- \
      private-3d-inputs/bust-02/front-cropped.jpg \
      private-3d-inputs/bust-02/front.png

Répéter pour chaque angle, puis ouvrir les PNG pour vérifier que le sujet est
debout, que le fond est transparent et que le visage est hors cadre. La
commande est locale : elle n'envoie pas la photo à un service distant.

## Générer rapidement le GLB depuis une photo

La commande refuse d'écraser un résultat existant :

    HUNYUAN3D_DIR=/chemin/absolu/vers/Hunyuan3D-Swift \
    HUNYUAN3D_BUILD_DIR=/chemin/absolu/vers/le-dossier-de-build \
    pnpm model:photo -- \
      private-3d-inputs/bust-02/source.png \
      public/models/bust-02-base.glb

Sans autre variable, le wrapper utilise `weights/shape-small`, donc
Hunyuan3D-2mini en mode géométrie seule, avec le préréglage validé `q4`, 20
étapes, octree 192 et seed 7. Le runtime doit avoir été produit avec
`pnpm model:build`, pas avec `swift build` seul.

Pour choisir d'autres poids de géométrie :

    HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift \
    HUNYUAN3D_SHAPE_WEIGHTS=/chemin/vers/shape-large \
    pnpm model:photo -- \
      private-3d-inputs/bust-02/source.png \
      public/models/bust-02-base-large.glb

## Ajouter la texture Hunyuan3D-Paint

Définir les poids de peinture fait passer automatiquement le wrapper de
`hy3d shape` à `hy3d generate` :

    HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift \
    HUNYUAN3D_PAINT_WEIGHTS=/chemin/vers/Hunyuan3D-Swift/weights/paint-large \
    pnpm model:photo -- \
      private-3d-inputs/bust-02/source.png \
      public/models/bust-02-pbr.glb

Cette étape est nettement plus lente et plus gourmande en mémoire. Ne la
lancer qu'après avoir validé la géométrie rapide.

## Générer depuis plusieurs vues

Le multivue est le pipeline par défaut des bustes finaux :

    HUNYUAN3D_MV_DIR=/chemin/absolu/vers/Hunyuan3D-2 \
      pnpm model:bust -- \
      --front private-3d-inputs/bust-02/front.png \
      --left private-3d-inputs/bust-02/left.png \
      --back private-3d-inputs/bust-02/back.png \
      --right private-3d-inputs/bust-02/right.png \
      --output public/models/bust-02-base.glb

Deux vues suffisent pour lancer la commande ; `front` reste obligatoire. Ne
fournir que les angles réellement disponibles. La commande refuse les images
sans transparence et les résultats déjà présents afin d'éviter de masquer une
erreur de préparation ou d'écraser un GLB validé.

Le préréglage validé sur Apple Silicon est : 30 étapes, octree 320, chunks
12000 et seed 12345. Il peut être ajusté avec `--steps`, `--octree`, `--chunks`
et `--seed`, mais chaque changement doit être consigné dans le `RUN.md` privé.

## Ajouter les variantes de symptômes

Le générateur ajoute trois morph targets, `asymmetry`, `skin` et `dimpling`.
`skin` déforme réellement le maillage pour créer le microrelief de peau
d'orange ; `dimpling` crée les rétractions et leurs bords en relief. Les
normales de chaque morph sont exportées afin que ces détails réagissent à la
lumière :

    pnpm model:symptoms -- \
      public/models/bust-02-base.glb \
      public/models/bust-02-symptoms.glb

Le placement automatique suppose un modèle debout avec X horizontal, Y
vertical et Z orienté vers l'avant. Toujours contrôler visuellement le
résultat. Des variantes complètes du modèle ne sont pas nécessaires pour ces
trois symptômes ; les morph targets et les couleurs de sommets suffisent. Les
petites croûtes 3D et les gouttes animées sont ajoutées par le viewer et ne
créent pas de copie supplémentaire du GLB.

Pour régénérer les symptômes du modèle multivue d’Anaïs, utiliser ses repères
calibrés, enregistrés dans le GLB et relus par le viewer pour les couleurs et
l'écoulement :

    pnpm model:symptoms -- \
      public/models/bust-anais-multiview-base.glb \
      public/models/bust-anais-multiview.glb \
      "Modèle multivue Anaïs" config/anais-symptoms.json

Conserver auparavant une copie du résultat précédent dans `private-3d-inputs/`.
Les coordonnées du profil sont relatives au centre et aux demi-dimensions du
maillage neutre. Ce profil est propre au modèle d’Anaïs : ne pas l'appliquer
automatiquement à un autre buste.

## Nommer les variantes de volume par fruit

Le catalogue n’est pas suivi par Git : il est découvert depuis les GLB locaux
dans `public/models/` en développement et depuis le bucket R2 en production.
Les fruits sont des repères visuels et non des équivalences médicales ou des tailles de
soutien-gorge.

| Fruit | Label du modèle | GLB final local |
| --- | --- | --- |
| Citron | `Poitrine · Citron` | `public/models/bust-citron.glb` |
| Orange | `Poitrine · Orange` | `public/models/bust-orange.glb` |
| Pamplemousse | `Poitrine · Pamplemousse` | `public/models/bust-pamplemousse.glb` |
| Melon | `Poitrine · Melon` | `public/models/bust-melon.glb` |
| Pastèque | `Poitrine · Pastèque` | `public/models/bust-pasteque.glb` |

Pour produire par exemple la variante Orange :

    HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift \
    pnpm model:photo -- \
      private-3d-inputs/orange/source.png \
      public/models/bust-orange-base.glb

    pnpm model:symptoms -- \
      public/models/bust-orange-base.glb \
      public/models/bust-orange.glb \
      "Poitrine · Orange"

Le troisième argument de `model:symptoms` est enregistré dans les métadonnées
du GLB. Tant que `bust-orange.glb` n'existe pas, le sélecteur affiche
automatiquement `bust-anais-multiview.glb`, le modèle de démonstration. Il n'est
donc pas nécessaire de créer des fichiers factices pour compléter le catalogue.
Les noms finaux déclarés dans le catalogue doivent toujours être produits par
`model:symptoms` : ne pas renommer directement un fichier `*-base.glb`, car il
ne contiendrait ni l'asymétrie ni les fossettes.

## Tester sans modifier le code

Servir le site en forçant la source locale des modèles :

    NUXT_PUBLIC_3D_MODELS_URL=http://localhost:3000 pnpm dev

Ouvrir :

    http://localhost:3000/?preview3d=photo&model=bust-02-symptoms.glb

Le switcher de matière propose `original`, `glass`, `glow` et `iridescent`.
Pour ouvrir directement un rendu, ajouter par exemple :

    &material=glass

Ces matières sont appliquées au rendu Three.js et ne créent pas quatre copies
du GLB. Les matériaux propres aux annotations de symptômes restent préservés.

Le catalogue public des bustes est disponible à l'adresse :

    http://localhost:3000/models-3d

Les cartes sont découvertes automatiquement dans `models/` du bucket R2, ou
dans `public/models/` en développement. Un modèle n’est donc proposé que
lorsque son GLB est réellement disponible. Chaque carte ouvre le modèle
correspondant dans le viewer.

## Comparer un modèle à sa photo source

Cette fonction est désactivée par défaut et n'apparaît jamais en production
publique. Le mapping ne vit plus dans une variable locale : sa source de vérité
est le manifeste privé `catalog/models.json` dans le bucket d’inputs configuré. Chaque
entrée de modèle référence le `manifest.json` de sa collection et l'index de la
photo à afficher. Le serveur résout ensuite la clé de l'image depuis ce second
manifeste.

Pour activer la comparaison en local, authentifier Wrangler une fois puis
lancer :

    pnpm dlx wrangler login

    NUXT_PUBLIC_ENABLE_3D_SOURCE_COMPARISON=true \
    NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME=<nom-du-bucket-prive> \
    pnpm dev

En développement, le serveur utilise automatiquement le CLI Wrangler et sa
session OAuth lorsque les clés S3 ne sont pas définies. Cette voie est plus
lente, mais adaptée à une revue occasionnelle. Sur Netlify, le CLI n'est pas
utilisé : les clés dédiées `CLOUDFLARE_R2_INPUTS_*`, limitées au bucket
d'inputs, restent obligatoires.

Quand la case « Comparer à la photo source » est cochée, le viewer place la
photo et le modèle côte à côte. `rotationY` définit l'orientation initiale du
modèle, en radians. Valeurs de départ usuelles à ajuster visuellement :

- face : `0` ;
- profil gauche : `1.5707963268` ;
- dos : `3.1415926536` ;
- profil droit : `-1.5707963268`.

La commande `pnpm models:process-r2` ajoute automatiquement chaque modèle
généré au manifeste central. Une entrée ressemble à ceci :

    {
      "modelKey": "models/generated/<sha256>.glb",
      "source": {
        "manifestKey": "submissions/<uuid>/manifest.json",
        "imageIndex": 1,
        "rotationY": 0,
        "label": "Vue de face"
      },
      "pipeline": "hunyuan3d-2mv"
    }

Une branche Netlify de revue utilise les mêmes variables et doit impérativement
être protégée par le contrôle d'accès Netlify. La photo est lue côté serveur,
transmise sans URL R2 publique et avec `Cache-Control: private, no-store`. Ne
jamais définir `NUXT_PUBLIC_ENABLE_3D_SOURCE_COMPARISON=true` dans le contexte
de production publique.

## Classifier le volume avec un LLM local

Définir côté serveur un jeton long et aléatoire, jamais préfixé par
`NUXT_PUBLIC_` :

    NUXT_3D_CLASSIFICATION_API_TOKEN=<jeton-prive>

Après avoir inspecté le modèle généré, le LLM local peut modifier uniquement sa
catégorie fruit dans le manifeste Cloudflare :

    curl --request PATCH http://localhost:3000/api/3d/model-classification \
      --header "Authorization: Bearer <jeton-prive>" \
      --header "Content-Type: application/json" \
      --data '{"model":"<sha256>.glb","fruitId":"orange","confidence":0.87,"classifier":"modele-local/version"}'

Les valeurs autorisées sont `citron`, `orange`, `pamplemousse`, `melon` et
`pasteque`. L'API refuse les modèles absents du manifeste central et ne permet
pas au classifieur de modifier les clés R2, le manifeste source ou
l'orientation. Elle enregistre aussi la date, la confiance facultative et le
nom du classifieur.

Vérifier successivement :

1. modèle neutre ;
2. asymétrie, de face et de profil ;
3. rougeur, en faisant tourner le buste ;
4. fossettes, de face et en vue trois quarts ;
5. console navigateur sans erreur.

## Données et versionnement

Ne jamais committer :

- `private-3d-inputs/` ;
- `breast-images/` ;
- `public/models/` ;
- les photos `0D2A*.jpg` ou `0D2A*.jpeg` à la racine ;
- `session-ses_*.md`.

Seuls les scripts, la documentation et le code du viewer sont versionnés.
