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
- Pour 2 à 4 photos cohérentes du même sujet, utiliser Hunyuan3D-2mv. Il
  fusionne les vues dans une même génération et sera normalement plus précis
  sur les côtés et l'arrière qu'un modèle mono-image.
- Hunyuan3D-Paint 2.1 ajoute la texture PBR après validation de la forme.
- Il n'y a pas de prompt texte pour retirer la tête ou les mains : on les
  retire par le cadrage ou un masque avant l'inférence.
- Les symptômes sont ajoutés ensuite par un traitement procédural. Ils ne
  nécessitent ni nouveau prompt LLM ni une génération IA complète par symptôme.
- Le premier prototype du projet a été produit par Hunyuan3D depuis une seule
  photo. Sa variante exacte n'ayant pas été consignée, ne pas l'inventer dans
  la documentation.

Stable Fast 3D et TripoSR ne sont que des solutions de secours si Hunyuan3D est
indisponible sur une machine.

## Choisir une ou plusieurs photos

Pour un contrôle rapide du rendu, une photo suffit. Pour le modèle final,
prendre si possible quatre vues : face, dos, profil gauche et profil droit.
Conserver le même éclairage, la même distance focale, la même hauteur de caméra
et une posture immobile. Des vues incohérentes peuvent être moins bonnes
qu'une seule photo propre.

Ne jamais faire tourner indépendamment le modèle mono-image sur quatre photos
en espérant que les résultats se fusionnent. Passer les vues ensemble à
Hunyuan3D-2mv.

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

## Générer rapidement le GLB depuis une photo

La commande refuse d'écraser un résultat existant :

    HUNYUAN3D_DIR=/chemin/absolu/vers/Hunyuan3D-Swift \
    pnpm model:photo -- \
      private-3d-inputs/bust-02/source.png \
      public/models/bust-02-base.glb

Sans autre variable, le wrapper utilise `weights/shape-small`, donc
Hunyuan3D-2mini en mode géométrie seule. C'est le chemin recommandé pour tester
rapidement le cadrage et la silhouette dans le viewer.

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

Utiliser l'application ou l'API officielle Hunyuan3D-2 avec le modèle
`tencent/Hunyuan3D-2mv`. Charger ensemble jusqu'à quatre vues dans les champs
face, dos, gauche et droite, puis exporter le GLB sous
`public/models/bust-02-mv.glb`.

Le wrapper Swift actuel n'accepte qu'une photo. Ne concaténer ni ne fusionner
manuellement les GLB mono-image. La commande d'installation du serveur
multivue se trouve dans `docs/PHOTO_TO_3D_INSTALLATION.md`.

## Ajouter les variantes de symptômes

Le générateur actuel ajoute deux morph targets, `asymmetry` et `dimpling`, plus
une couche de rougeur intégrée :

    pnpm model:symptoms -- \
      public/models/bust-02-base.glb \
      public/models/bust-02-symptoms.glb

Le placement automatique suppose un modèle debout avec X horizontal, Y
vertical et Z orienté vers l'avant. Toujours contrôler visuellement le
résultat. Des variantes complètes du modèle ne sont pas nécessaires pour ces
trois symptômes ; les morph targets et les matériaux suffisent.

## Nommer les variantes de volume par fruit

Le catalogue suivi par Git se trouve dans `config/bust-models.ts`. Les fruits
sont des repères visuels et non des équivalences médicales ou des tailles de
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
automatiquement `bust-photo-symptoms.glb`, le modèle de référence. Il n'est
donc pas nécessaire de créer des fichiers factices pour compléter le catalogue.

## Tester sans modifier le code

Construire puis servir le site :

    pnpm exec nuxi build
    python3 -m http.server 4173 -d dist

Ouvrir :

    http://localhost:4173/?preview3d=photo&model=bust-02-symptoms.glb

Le switcher de matière propose `original`, `glass`, `glow` et `iridescent`.
Pour ouvrir directement un rendu, ajouter par exemple :

    &material=glass

Ces matières sont appliquées au rendu Three.js et ne créent pas quatre copies
du GLB. Les matériaux propres aux annotations de symptômes restent préservés.

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
