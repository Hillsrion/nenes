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
| Essai rapide avec une photo sur Apple Silicon | Hunyuan3D-2mini, port Swift/MLX | Pipeline par défaut de `pnpm model:photo` |
| Géométrie plus détaillée avec une photo | Hunyuan3D v2.0 Turbo, port Swift/MLX | Remplacer les poids `shape-small` par `shape-large` |
| Texture PBR | Hunyuan3D-Paint 2.1, port Swift/MLX | Activer avec `HUNYUAN3D_PAINT_WEIGHTS` |
| Une forme issue de 2 à 4 vues | `tencent/Hunyuan3D-2mv` | Pipeline officiel multivue, séparé du wrapper Swift actuel |
| Asymétrie, rougeur et fossettes | `scripts/generate-symptom-model.mjs` | Post-traitement procédural ; ce n'est pas un LLM |
| Secours seulement | Stable Fast 3D ou TripoSR | À utiliser si Hunyuan3D est bloqué sur une machine donnée |

Le premier GLB du projet a été généré avec Hunyuan3D depuis une seule photo.
La variante et les paramètres exacts n'ont pas été enregistrés lors de cet
essai : il ne faut donc pas les déduire de la topologie du GLB. Pour chaque
nouvelle génération, conserver un petit `RUN.md` dans le dossier privé de la
photo avec la variante, les poids et la commande utilisés.

Références :

- https://github.com/Tencent-Hunyuan/Hunyuan3D-2
- https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1
- https://github.com/ZimengXiong/Hunyuan3D-Swift
- https://huggingface.co/docs/huggingface_hub/guides/cli

Lire les licences des poids Hunyuan3D avant toute utilisation commerciale.
Le code Swift du port est sous licence MIT, mais les poids et les algorithmes
conservent leurs licences propres.

## Configuration vérifiée sur la machine actuelle

État constaté le 4 août 2026 :

- macOS 15.6.1 sur Apple Silicon arm64 ;
- Xcode 26.0.1, build 17A400 ;
- Apple Clang 17.0.0 et compilateur Metal disponibles ;
- Homebrew 5.1.1 ;
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
    swift build -c release
    .build/release/hy3d --help

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

## 5. Installer et vérifier le projet web

Depuis la racine de `nenes` :

    corepack enable
    pnpm install
    HUNYUAN3D_DIR=/chemin/absolu/vers/Hunyuan3D-Swift pnpm model:check

Le diagnostic est en lecture seule. Il vérifie Apple Silicon, Xcode, Swift,
clang, Metal, le SDK macOS, le CLI Hugging Face, Node, pnpm, le binaire `hy3d`
et les poids locaux.

## 6. Tester Hunyuan3D sans le projet

Géométrie rapide :

    .build/release/hy3d shape photo.png -o mesh.glb \
      --weights weights/shape-small

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

Le wrapper `pnpm model:photo` reste volontairement mono-image et optimisé pour
le port Swift/MLX. Pour le multivue, utiliser l'implémentation officielle
Hunyuan3D-2 dans un environnement compatible avec ses dépendances PyTorch,
puis sélectionner :

    python3 gradio_app.py \
      --model_path tencent/Hunyuan3D-2mv \
      --subfolder hunyuan3d-dit-v2-mv \
      --texgen_model_path tencent/Hunyuan3D-2 \
      --low_vram_mode

L'implémentation officielle documente macOS, Windows et Linux, mais ses
extensions de texture et ses besoins mémoire sont plus exigeants que le port
Swift/MLX. Sur le Mac, tester d'abord la génération de forme ; utiliser une
machine CUDA séparée si l'étape texture n'est pas fiable ou trop lente.

## Erreurs fréquentes

### `xcrun: invalid active developer path`

    sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
    sudo xcodebuild -runFirstLaunch

### `xcrun` ne trouve pas `metal`

Xcode complet n'est pas installé ou n'est pas sélectionné. Vérifier
`xcode-select -p`, puis relancer les commandes de la section 1.

### Le binaire `.build/release/hy3d` est absent

    cd /chemin/vers/Hunyuan3D-Swift
    swift build -c release

Ne pas lancer `pnpm model:photo` tant que cette compilation n'est pas terminée.

### Les poids ne sont pas trouvés

Relancer `hf download` ou fournir un chemin explicite :

    HUNYUAN3D_SHAPE_WEIGHTS=/chemin/vers/shape-small \
    HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift \
    pnpm model:check

### La génération texturée manque de mémoire

Ne pas définir `HUNYUAN3D_PAINT_WEIGHTS` afin de lancer uniquement
`hy3d shape`. Valider d'abord la géométrie, puis effectuer la peinture sur la
machine la plus puissante disponible.
