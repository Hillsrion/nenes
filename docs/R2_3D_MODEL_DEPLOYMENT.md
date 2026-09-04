# Publication des modèles 3D avec Cloudflare R2

Les GLB finaux produits depuis des photos ne sont jamais ajoutés à Git. Ils
sont publiés séparément dans le bucket dédié `nenes-3d-models`, sous le préfixe
`models/`. Les photos originales, masques, prompts et historiques de
conversation restent exclusivement locaux.

## Configuration active

- bucket : `nenes-3d-models` ;
- région : Europe de l'Ouest ;
- URL publique : `https://pub-43370cee5bda403fb0a2206c460fe804.r2.dev` ;
- CORS : `GET` et `HEAD` depuis toutes les origines ;
- modèle de référence : `models/bust-multiview-v2-symptoms.glb` ;
- type MIME : `model/gltf-binary` ;
- cache : une heure avec revalidation.

Netlify définit aussi cette URL dans `NUXT_PUBLIC_3D_MODELS_URL`. Le projet
utilise la même URL par défaut sur une nouvelle machine, sans secret local.
Lorsqu'un domaine Cloudflare dédié sera disponible, définir cette variable sur
le nouveau domaine permettra de remplacer l'URL `r2.dev` sans changer le code.

## Authentifier Wrangler sur une nouvelle machine

Wrangler utilise OAuth : aucune clé S3 ne doit être copiée dans le dépôt.

```bash
pnpm dlx wrangler login
pnpm dlx wrangler whoami
pnpm dlx wrangler r2 bucket info nenes-3d-models
```

Le compte authentifié doit avoir accès au bucket. Les identifiants OAuth sont
conservés par Wrangler sur la machine et ne sont pas committés.

## Publier un GLB validé

Le script n'accepte que des GLB finaux nommés `bust-… .glb`, présents dans
`public/models/`. Les photos et les fichiers intermédiaires `-base.glb` sont
refusés.

```bash
# Charge le modèle final de référence.
pnpm models:upload -- bust-multiview-v2-symptoms.glb

# Charge tous les GLB finaux présents localement.
pnpm models:upload -- --all-local
```

Le fichier local doit rester dans `public/models/`, dossier ignoré par Git. Le
script appelle Wrangler et publie vers `models/<nom-du-fichier>.glb`.

## Récupérer le modèle sur une nouvelle machine

```bash
mkdir -p public/models
curl --fail \
  --output public/models/bust-multiview-v2-symptoms.glb \
  https://pub-43370cee5bda403fb0a2206c460fe804.r2.dev/models/bust-multiview-v2-symptoms.glb
```

Le fichier téléchargé reste ignoré par Git. Son SHA-256 de référence est :

```text
06779dfcbde22a07d27395d205106afcdf8e6f048c0c8885248328ba391a5ba9
```

## Vérifier la publication

```bash
curl -I \
  -H 'Origin: http://localhost:3000' \
  https://pub-43370cee5bda403fb0a2206c460fe804.r2.dev/models/bust-multiview-v2-symptoms.glb
```

La réponse doit être `200`, avec `Content-Type: model/gltf-binary` et
`Access-Control-Allow-Origin: *`.

La démo de production se trouve à :

```text
https://main--nenes.netlify.app/?preview3d=photo&model=bust-multiview-v2-symptoms.glb
```

Le catalogue public se trouve sur `/models-3d`. La comparaison avec les photos
sources reste exclue de ce déploiement ; sa configuration locale et sa variante
pour une branche Netlify protégée sont décrites dans
`PHOTO_TO_3D_WORKFLOW.md`.

Le bucket privé configuré pour les inputs contient aussi `catalog/models.json`. Ce
manifeste relie chaque GLB au manifeste de ses images et conserve sa catégorie
fruit. Il ne doit jamais être déplacé dans le bucket public des modèles.

## Ajouter un nouveau modèle

1. Générer et inspecter le GLB localement selon `PHOTO_TO_3D_WORKFLOW.md`.
2. Le téléverser avec `pnpm models:upload -- <nom>.glb`.
3. Vérifier son URL publique.
4. Déployer ensuite le catalogue vers `main`.

Les cartes non-référence sont indexées automatiquement depuis le préfixe
`models/` du bucket : aucune modification de catalogue n’est nécessaire. Les
références restent déclarées dans `referenceBustModels` de
`config/bust-models.ts`. Pour activer cet index sur Netlify, définir ces
variables serveur (jamais préfixées par `NUXT_PUBLIC_`) avec un jeton R2 en
lecture/listage limité au bucket des modèles :

```env
CLOUDFLARE_R2_3D_ACCOUNT_ID=<compte-cloudflare>
CLOUDFLARE_R2_3D_BUCKET_NAME=nenes-3d-models
CLOUDFLARE_R2_3D_ACCESS_KEY_ID=<clé-r2-limitée>
CLOUDFLARE_R2_3D_SECRET_ACCESS_KEY=<secret-r2-limité>
```

Pour éviter toute ambiguïté de cache lors d'une refonte importante, utiliser
un nouveau nom versionné, par exemple `bust-multiview-v3-symptoms.glb`.

## Ingestion des photos

Le formulaire `https://main--nenes.netlify.app/studio-3d` envoie les photos
vers le bucket configuré pour les entrées. Il ne doit jamais recevoir les GLB de
démonstration.

Pour activer l'envoi sur Netlify, créer dans Cloudflare un jeton d'API R2 avec
lecture/écriture limitée exclusivement à ce bucket, puis définir ces
variables **secrètes** dans Netlify :

```env
CLOUDFLARE_ACCOUNT_ID=<compte-cloudflare>
CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID=<clé-r2-limitée>
CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY=<secret-r2-limité>
```

Le nom du bucket doit être disponible côté serveur. Dans Netlify, le définir
comme variable d’environnement privée (sa valeur ne doit pas être publiée) :

```env
CLOUDFLARE_R2_INPUTS_BUCKET_NAME=<nom-du-bucket>
```

Ne jamais préfixer les identifiants, clés privées ou le nom du bucket de
production par `NUXT_PUBLIC_`. L’API
vérifie la configuration R2 côté serveur et limite les envois à quatre images
(JPG, PNG ou WebP), de 12 Mo maximum chacune. Après avoir ajouté ou modifié
ces variables, supprimer l’ancienne variable secrète
du bucket, puis redéployer le site Netlify.
Avant d’ouvrir ce formulaire à un public large, ajoutez une protection anti-abus
adaptée (par exemple Turnstile et une limite de débit) pour éviter les dépôts
automatisés.

Le endpoint serveur n'accepte que 1 à 4 fichiers JPEG, PNG ou WebP de 12 Mo au
maximum. Il les enregistre sous `submissions/<uuid>/images/input-001…` avec un
`manifest.json` anonyme, puis retourne une référence, jamais une URL de photo.
Cette structure est identique à celle des archives manuelles, à l'exception du
préfixe qui indique l'origine. Mettre ensuite en place une règle de cycle de
vie R2 pour supprimer automatiquement les entrées après la génération et la
validation du GLB.

Le nom du bucket est lu au runtime depuis l’environnement serveur. Les trois
variables sensibles restent obligatoires. Ainsi, aucune valeur de bucket privée
ne se retrouve dans le bundle public.

### Diagnostic et observabilité

Chaque tentative produit une ligne structurée dans les logs de fonction
Netlify, préfixée par `[3d-upload]`, et — dès que R2 est joignable — un audit
JSON dans Cloudflare R2 sous `observability/3d-uploads/YYYY-MM-DD/`. Ces traces
contiennent un identifiant de requête, un identifiant anonyme de soumission,
l'étape, le nombre de photos et leur taille totale. Les noms de fichiers, URL,
contenu et empreintes des photos ne sont jamais consignés. En cas d'échec qui
atteint la fonction, l'interface affiche la référence de requête ; rechercher
cette référence dans Netlify ou R2 pour connaître l'étape en cause
(`configuration_unavailable`, `multipart_unreadable`,
`r2_photo_write_failed`, etc.).

Les écritures réussies sont également visibles dans Cloudflare R2 sous
`submissions/<uuid>/manifest.json`. Configurer une règle de cycle de vie sur
`submissions/` et `observability/3d-uploads/` afin que ces données privées
soient purgées après le délai opérationnel choisi.

### Envoi direct vers R2

Pour éviter la limite de taille des fonctions Netlify, le navigateur demande
d'abord une session très légère à `/api/3d/upload-session`, puis envoie chaque
photo directement vers R2 avec une URL signée valable quinze minutes. Une
dernière requête valide les tailles et les types MIME avant d'écrire le
manifest. Les photos ne traversent donc jamais Netlify.

Appliquer une seule fois la règle CORS versionnée dans ce dépôt, en étant
connecté à Cloudflare :

```sh
pnpm exec wrangler r2 bucket cors set nenes-3d-inputs --file config/r2-inputs-cors.json
```

La règle autorise uniquement les domaines de production listés dans
`config/r2-inputs-cors.json`, avec `PUT` pour l'envoi signé. Ajouter un domaine
d'aperçu explicitement à ce fichier avant de l'utiliser.

### Photos reçues hors formulaire

Les photos reçues directement restent dans `breast-images/<dossier-prive>/`,
qui est ignoré par Git. Pour les archiver dans le même bucket d'entrées privé,
sans les limites du formulaire, exécuter :

```sh
pnpm inputs:upload-manual
```

Le script importe chaque sous-dossier sous `manual/<uuid>/images/`. Le nom du
dossier local n'est jamais envoyé à R2 : le mapping local vers l'UUID est
conservé dans `breast-images/.r2-manual-uploads.json`, lui aussi ignoré par
Git. Chaque collection R2 contient un `manifest.json` anonyme, afin qu'un
workflow IA privé puisse inventorier toutes les images. Ces archives ne sont
ni publiques ni traitées automatiquement par `models:process-r2`, qui est
réservé aux soumissions du formulaire.

Par défaut, l'import utilise la connexion OAuth de Wrangler et cible
explicitement le bucket d’inputs configuré. Vérifier ou créer cette connexion avec
`pnpm dlx wrangler login`. Une authentification par clé S3 est disponible en
secours avec `pnpm inputs:upload-manual -- --auth s3` et les variables R2
d'entrées décrites plus haut.

## Traiter les inputs R2 par hash

La commande batch suivante parcourt `submissions/`, calcule un SHA-256 du
contenu et de l'ordre des photos, puis publie les modèles finis sous
`models/generated/<sha256>.glb`. Une soumission identique est donc ignorée si
son GLB existe déjà, même si elle possède un autre UUID R2 :

```sh
HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift \
HUNYUAN3D_MV_DIR=/chemin/vers/Hunyuan3D-2 \
pnpm models:process-r2
```

Variables requises : `CLOUDFLARE_ACCOUNT_ID`,
`NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME`,
`CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID` et
`CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY`. Le bucket de sortie est
`CLOUDFLARE_R2_3D_BUCKET_NAME` ou `nenes-3d-models`; les credentials inputs
sont réutilisés par défaut, sauf si les variables `CLOUDFLARE_R2_3D_*` sont
définies.

Pour inspecter sans lancer Hunyuan3D :

```sh
pnpm models:process-r2 -- --dry-run
```

Pour reprendre une génération précise :

```sh
pnpm models:process-r2 -- --hash <sha256-ou-prefixe>
```

Une photo utilise le pipeline rapide Swift/MLX. Les soumissions de 2 à 4
photos passent automatiquement par Hunyuan3D-2mv après détourage local. Leur
ordre est significatif et doit être : face, profil gauche, dos, profil droit.
Ne fournir que les premières vues réellement disponibles ; le formulaire
affiche cet ordre au moment de la sélection.

Après publication, le batch ajoute ou actualise automatiquement l'entrée du
modèle dans `catalog/models.json`, sans effacer une classification fruit déjà
présente. L'API authentifiée de classification et son format de requête sont
décrits dans `PHOTO_TO_3D_WORKFLOW.md`.
