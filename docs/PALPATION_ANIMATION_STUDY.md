# Essai local de palpation

L'animation est calibrée pour `bust-zou-full-multiview-hi3d.glb`. Le scan
original est conservé. Les copies de travail, les anciennes versions et les
GLB animés restent dans les dossiers ignorés.

## Séquence issue du contenu du site

`config/self-examination-steps.json` contient les textes partagés par le site
et les chapitres de l'aperçu. L'étape d'observation visuelle reste dans le site ;
les quatre étapes de palpation sont animées dans le GLB :

1. Sein gauche avec la main droite : neuf positions allant de l'extérieur
   vers le mamelon, avec trois pressions progressives par position.
2. Aisselle et zone de liaison : trois positions du pli axillaire antérieur
   vers le haut du sein.
3. Mamelon : rapprochement du pouce et de l'index, autres doigts repliés.
4. Sein droit avec la main gauche : répétition des trois séquences précédentes.

La boucle dure 94,4 secondes. Le sélecteur d'étape permet d'accéder directement
à chaque chapitre, tout en conservant lecture/pause et progression. Le libellé
indique le côté, la main et le niveau de pression en cours. Les niveaux sont
visuels ; ils ne représentent pas des forces mesurées.

Le scan a les bras baissés et ne contient pas de squelette. La séquence axillaire
montre donc le pli antérieur accessible et sa liaison avec le sein. Elle ne
simule pas un bras levé ni l'exploration du creux axillaire dégagé. La phase
d'observation devant le miroir avec changements de posture n'est pas animée.

## Préparer et générer

```sh
pnpm model:palpation:prepare
pnpm model:palpation
pnpm model:palpation:check
```

Les scripts refusent d'écraser un fichier existant. Pour une nouvelle itération,
fournir explicitement le fichier d'entrée puis une nouvelle sortie :

```sh
node scripts/prepare-palpation-mesh.mjs public/models/bust-zou-full-multiview-hi3d.glb private-3d-inputs/palpation-study/bust-zou-animation-base-v2.glb
node scripts/generate-palpation-model.mjs private-3d-inputs/palpation-study/bust-zou-animation-base-v2.glb private-3d-inputs/palpation-study/bust-zou-palpation-complete-v2.glb
```

La préparation utilise Meshoptimizer pour passer de 994 588 à 142 391 sommets,
avec une erreur relative maximale demandée de 0,0008. Les normales neutres sont
recalculées sur cette topologie pour que les morphs n'encodent que leurs
changements locaux. Les coordonnées, l'échelle et la hiérarchie restent celles
du scan. Le fichier source complet n'est jamais modifié.

Après validation, conserver l'ancienne version dans le dossier privé et copier
la nouvelle vers `public/models/bust-zou-full-multiview-hi3d-palpation.glb`.
Ouvrir le serveur local avec :

`/?preview3d=photo&model=bust-zou-full-multiview-hi3d-palpation.glb&material=original`

## Déformation et collisions

Chaque position possède un morph de contact et un morph de redistribution du
volume, soit 52 morphs pour les 26 positions. Le premier comprime sous les
pulpes ou resserre localement la zone du mamelon. Le second déplace le tissu
dans les trois axes ; un ressort-amortisseur intégré à 240 Hz assure le retour
progressif après l'appui. Les animations sont exportées à 30 Hz.

La main s'oriente selon un plan ajusté à la surface. Après le placement initial
des doigts, toute sa surface est comparée aux triangles du buste réellement
déformés : sommets, milieux d'arêtes et centres des triangles de la paume, du
poignet et des cinq doigts. Une correction rigide commune vers l'avant élimine
les intersections sans détacher les parties de la main. La marge est de 0,0012
dans les coordonnées source. La pose statique reprend la première pose corrigée.
Le changement de main se fait pendant un retrait éloigné du buste.
Une seconde passe vérifie aussi le quart, la moitié et les trois quarts de
chaque intervalle entre clés. Si nécessaire, elle relève les deux clés
voisines ensemble, ce qui préserve les collisions déjà corrigées.

Il s'agit d'une approximation visuelle de tissu souple avec collisions, sans
solveur volumétrique ni conservation exacte du volume. Ce n'est pas une
simulation biomécanique ni un protocole médical complet.

Le viewer n'ajoute pas de morph procédural de peau aux GLB animés : modifier la
longueur de leur tableau de poids invaliderait la liaison du clip glTF. La
préférence système de réduction des animations démarre l'aperçu en pause.

## Vérification

```sh
node scripts/validate-palpation-collisions.mjs public/models/bust-zou-full-multiview-hi3d-palpation.glb 60
```

Le contrôle recharge le GLB exporté et teste la main entière à 60 Hz, y compris
les demi-images entre clés, les retraits, les changements de zone et de main.
Les cas les plus proches de la peau sont recoupés avec les rayons de Three.js.
C'est un contrôle discret dense, pas une preuve de collision continue.

La V2 initiale ne vérifiait que les trois origines des pulpes et laissait passer
leurs bords, les phalanges et la paume. La V3 de 16 s corrigeait ce défaut ; la
séquence complète réutilise ce contrôle avec une région couvrant les deux côtés.
Le viewer émet déjà un avertissement de dépréciation de PCFSoftShadowMap.
