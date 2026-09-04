# Installation du pipeline IA photo vers 3D

Ce document permet de reconstruire l'environnement sur une nouvelle machine.
Il complète `PHOTO_TO_3D_WORKFLOW.md`, qui décrit les étapes à répéter pour
chaque buste.

## Décision sur les modèles

Hunyuan3D est la famille canonique du projet. On change éventuellement de
variante Hunyuan3D selon le nombre de photos et le compromis vitesse/qualité ;
on ne change pas de famille de modèles à chaque essai.

| Besoin | Modèle ou traitement | Usage dans le projet |
| --- | --- | --- |
| Essai rapide avec une photo sur Apple Silicon | Hunyuan3D-2mini, port Swift/MLX | Boucle rapide avec `pnpm model:photo` |
| Géométrie plus détaillée avec une photo | Hunyuan3D v2.0 Turbo, port Swift/MLX | Remplacer les poids `shape-small` par `shape-large` |
| Texture PBR | Hunyuan3D-Paint 2.1, port Swift/MLX | Activer avec `HUNYUAN3D_PAINT_WEIGHTS` |
| Buste final issu de 2 à 4 vues | `tencent/Hunyuan3D-2mv` | Pipeline par défaut avec `pnpm model:bust` |
| Asymétrie, rougeur et fossettes | `scripts/generate-symptom-model.mjs` | Post-traitement procédural ; ce n'est pas un LLM |
| Secours seulement | Stable Fast 3D ou TripoSR | À utiliser si Hunyuan3D est bloqué sur une machine donnée |

Le premier GLB exploitable du projet a été généré depuis une seule photo avec
le port Swift/MLX, les poids `shape-small`, une quantification 4 bits, 20 étapes,
un octree de 192 et la seed 7. Ces paramètres ont été retrouvés dans l'historique
d'exécution d'origine et sont maintenant les valeurs par défaut de
`pnpm model:photo`.

Références :

- https://github.com/Tencent-Hunyuan/Hunyuan3D-2
- https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- https://github.com/ZimengXiong/Hunyuan3D-Swift
- https://huggingface.co/docs/huggingface_hub/guides/cli

Lire les licences des poids Hunyuan3D avant toute utilisation commerciale.
Le code Swift du port est sous licence MIT, mais les poids et les algorithmes
conservent leurs licences propres.

## Configuration vérifiée sur la machine actuelle

État vérifié le 4 septembre 2026 :

- macOS 15.6.1 sur Apple Silicon arm64 ;
- Xcode 26.0.1, build 17A400 ;
- Apple Clang 17.0.0 et compilateur Metal disponibles ;
- Homebrew 6.0.20 ;
- Node 22.18.0 et pnpm 10.14.0.

Le pipeline Swift/MLX n'a pas besoin de l'environnement Python, de CUDA, de
libomp ou de CMake précédemment documenté pour SF3D. Xcode fournit Swift,
Swift Package Manager, clang, le SDK macOS et Metal.

Le dépôt Hunyuan3D-Swift publie à titre indicatif environ 21 secondes et
5,6 Go de mémoire de pointe pour la géométrie `shape-small`. La peinture est
beaucoup plus lourde : environ 25 Go pour la chaîne small/RGB et davantage pour
le PBR. Ces chiffres dépendent de la machine et servent seulement à choisir le
mode d'essai.

## 1. Installer et sélectionner Xcode

Installer Xcode complet depuis l'App Store, l'ouvrir une première fois, puis :

    sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
    sudo xcodebuild -license accept
    sudo xcodebuild -runFirstLaunch

Vérifier :

    xcode-select -p
    xcodebuild -version
    swift --version
    xcrun --find clang
    xcrun --find metal
    xcrun --show-sdk-path

La première commande doit idéalement retourner :

    /Applications/Xcode.app/Contents/Developer

Les Command Line Tools seuls peuvent suffire pour certains paquets Swift, mais
Xcode complet est retenu ici afin de disposer d'un toolchain Swift/Metal
cohérent. Documentation Apple :
https://developer.apple.com/documentation/xcode/installing-the-command-line-tools

## 2. Installer les outils de téléchargement

Avec Homebrew :

    brew install git hf

Puis vérifier :

    git --version
    hf --help

Les poids utilisés ci-dessous sont volumineux. Les garder hors du dépôt
`nenes`, tout comme les caches Hugging Face.

## 3. Installer Hunyuan3D-Swift/MLX

Cloner le runtime hors du dépôt `nenes` :

    git clone https://github.com/ZimengXiong/Hunyuan3D-Swift.git
    cd Hunyuan3D-Swift

Puis, depuis le dépôt `nenes`, compiler avec Xcode :

    HUNYUAN3D_DIR=/chemin/absolu/vers/Hunyuan3D-Swift \
      pnpm model:build

Ne pas remplacer cette commande par `swift build -c release`. SwiftPM produit
alors un exécutable, mais il peut omettre les ressources Metal nécessaires à
MLX et échouer au premier calcul avec `Failed to load the default metallib`.
La compilation Xcode place le binaire, les frameworks et la bibliothèque Metal
dans le même dossier de produits.

Le port contient une commande `hy3d` native et utilise MLX/Metal sur Apple
Silicon. Il est vérifié par comparaison avec le port Python MLX, lui-même
comparé à l'implémentation PyTorch d'origine.

## 4. Télécharger les poids

Depuis le dossier `Hunyuan3D-Swift` :

    mkdir -p weights
    hf download zimengxiong/hunyuan3d-mlx-shape-small \
      --local-dir weights/shape-small
    hf download zimengxiong/hunyuan3d-mlx-paint-large \
      --local-dir weights/paint-large

`shape-small` suffit pour la boucle rapide et correspond au modèle de forme
Hunyuan3D-2mini. `paint-large` ajoute Hunyuan3D-Paint 2.1 PBR, mais augmente
fortement le temps et la mémoire nécessaires.

Pour utiliser les autres emplacements de poids supportés par le port, suivre
son README. Ne jamais écrire un token Hugging Face dans le dépôt ou dans cette
documentation.

### Runtime multivue officiel

Installer une seule copie du runtime Python, hors du dépôt `nenes` :

    git clone https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git
    cd Hunyuan3D-2
    python3.12 -m venv .venv
    .venv/bin/pip install torch torchvision
    .venv/bin/pip install -r requirements.txt
    .venv/bin/pip install -e .

Télécharger uniquement la variante `safetensors`. Le fichier CKPT de 4,6 Go
contient les mêmes poids et n'est pas utilisé par la commande du projet :

    mkdir -p weights/hunyuan3d-2mv
    hf download tencent/Hunyuan3D-2mv \
      hunyuan3d-dit-v2-mv/config.yaml \
      hunyuan3d-dit-v2-mv/model.fp16.safetensors \
      --local-dir weights/hunyuan3d-2mv

Les extensions de rendu nécessaires à la texture ne sont pas requises pour la
géométrie de `pnpm model:bust`.

## 5. Installer et vérifier le projet web

Depuis la racine de `nenes` :

    corepack enable
    pnpm install
    HUNYUAN3D_DIR=/chemin/absolu/vers/Hunyuan3D-Swift \
    HUNYUAN3D_BUILD_DIR=/chemin/absolu/vers/le-dossier-de-build \
      pnpm model:check

Le diagnostic est en lecture seule. Il vérifie Apple Silicon, Xcode, Swift,
clang, Metal, le SDK macOS, le CLI Hugging Face, Node, pnpm, le binaire `hy3d`
et les poids locaux.

## 6. Tester Hunyuan3D sans le projet

Géométrie rapide :

    HUNYUAN3D_DIR=/chemin/absolu/vers/Hunyuan3D-Swift \
    HUNYUAN3D_BUILD_DIR=/chemin/absolu/vers/le-dossier-de-build \
      pnpm model:photo -- photo.png public/models/mesh.glb

Cette commande reproduit le préréglage validé : `shape-small`, quantification
4 bits, 20 étapes, octree 192 et seed 7. Les quatre paramètres peuvent être
surchargés avec `HUNYUAN3D_QUANTIZE`, `HUNYUAN3D_STEPS`,
`HUNYUAN3D_OCTREE` et `HUNYUAN3D_SEED`.

Géométrie et peinture PBR :

    .build/release/hy3d generate photo.png -o modele-pbr.glb \
      --shape-weights weights/shape-small \
      --paint-weights weights/paint-large

Pour les itérations de cadrage, commencer par la géométrie seule. Ne lancer la
peinture qu'une fois la silhouette validée.

## 7. Plusieurs photos avec Hunyuan3D-2mv

Le modèle officiel `tencent/Hunyuan3D-2mv` accepte 1 à 4 vues et génère une
seule forme conditionnée par ces vues. C'est différent de lancer quatre fois
un modèle mono-image.

Le wrapper `pnpm model:photo` reste mono-image. Les bustes finaux passent par
la commande officielle multivue :

    HUNYUAN3D_MV_DIR=/chemin/vers/Hunyuan3D-2 \
      pnpm model:bust -- \
      --front private-3d-inputs/bust-02/front.png \
      --left private-3d-inputs/bust-02/left.png \
      --output public/models/bust-02-base.glb

Les entrées doivent être des PNG détourés. La commande demande au moins deux
vues, force les poids `safetensors`, utilise MPS par défaut, refuse d'écraser un
GLB existant et reproduit le préréglage validé : 30 étapes, octree 320, chunks
12000 et seed 12345.

Les noms de vues sont des positions de caméra strictes : `front`, puis
`left` à 90° dans le sens horaire, `back` à 180°, et `right` à 270°. Ne pas
étiqueter une photo à 45° comme `left` ou `right`.

## Erreurs fréquentes

### `xcrun: invalid active developer path`

    sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
    sudo xcodebuild -runFirstLaunch

### `xcrun` ne trouve pas `metal`

Xcode complet n'est pas installé ou n'est pas sélectionné. Vérifier
`xcode-select -p`, puis relancer les commandes de la section 1.

### Le binaire Xcode `hy3d` est absent

    HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift \
      pnpm model:build

Ne pas lancer `pnpm model:photo` tant que cette compilation Xcode n'est pas
terminée.

### `Failed to load the default metallib`

Le runtime a été compilé avec `swift build` ou lancé sans son dossier de
produits Xcode. Relancer `pnpm model:build`, puis fournir le même
`HUNYUAN3D_BUILD_DIR` à `pnpm model:photo`. Ne pas compiler manuellement les
kernels NAX : leur disponibilité dépend de la version du SDK Metal.

### Les poids ne sont pas trouvés

Relancer `hf download` ou fournir un chemin explicite :

    HUNYUAN3D_SHAPE_WEIGHTS=/chemin/vers/shape-small \
    HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift \
    pnpm model:check

### La génération texturée manque de mémoire

Ne pas définir `HUNYUAN3D_PAINT_WEIGHTS` afin de lancer uniquement
`hy3d shape`. Valider d'abord la géométrie, puis effectuer la peinture sur la
machine la plus puissante disponible.

### Le multivue produit une dalle ou un sujet couché

Les causes observées étaient une rotation EXIF ignorée et un fond encore
opaque. Recadrer d'abord, puis produire chaque PNG transparent avec
`pnpm model:view:mask`. Vérifier visuellement les PNG avant de relancer
`pnpm model:bust`.
