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
- modèle de référence : `models/bust-photo-symptoms.glb` ;
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

Le script n'accepte que les noms déclarés dans `config/bust-models.ts`. Cette
liste blanche empêche l'envoi accidentel d'une photo ou d'un GLB intermédiaire.

```bash
# Charge le modèle final de référence.
pnpm models:upload -- bust-photo-symptoms.glb

# Charge les modèles du catalogue qui existent localement.
pnpm models:upload -- --all-configured
```

Le fichier local doit rester dans `public/models/`, dossier ignoré par Git. Le
script appelle Wrangler et publie vers `models/<nom-du-fichier>.glb`.

## Récupérer le modèle sur une nouvelle machine

```bash
mkdir -p public/models
curl --fail \
  --output public/models/bust-photo-symptoms.glb \
  https://pub-43370cee5bda403fb0a2206c460fe804.r2.dev/models/bust-photo-symptoms.glb
```

Le fichier téléchargé reste ignoré par Git. Son SHA-256 de référence est :

```text
e0f9918b45ecd463411e7c81252e3789bfc9e6f9fc301aa82d61f60b2ca7a14f
```

## Vérifier la publication

```bash
curl -I \
  -H 'Origin: http://localhost:3000' \
  https://pub-43370cee5bda403fb0a2206c460fe804.r2.dev/models/bust-photo-symptoms.glb
```

La réponse doit être `200`, avec `Content-Type: model/gltf-binary` et
`Access-Control-Allow-Origin: *`.

La démo de production se trouve à :

```text
https://main--nenes.netlify.app/?preview3d=photo&model=bust-photo-symptoms.glb
```

## Ajouter un nouveau modèle

1. Générer et inspecter le GLB localement selon `PHOTO_TO_3D_WORKFLOW.md`.
2. Déclarer son nom final et son label dans `config/bust-models.ts`.
3. Le téléverser avec `pnpm models:upload -- <nom>.glb`.
4. Vérifier son URL publique.
5. Déployer ensuite le catalogue vers `main`.

Pour éviter toute ambiguïté de cache lors d'une refonte importante, utiliser
un nouveau nom versionné, par exemple `bust-photo-symptoms-v2.glb`.

## Ingestion des photos

Le formulaire `https://main--nenes.netlify.app/studio-3d` envoie les photos
vers le bucket `nenes-3d-inputs`. Il ne doit jamais recevoir les GLB de
démonstration.

Pour activer l'envoi sur Netlify, créer dans Cloudflare un jeton d'API R2 avec
lecture/écriture limitée exclusivement à `nenes-3d-inputs`, puis définir ces
variables **secrètes** dans Netlify :

```env
CLOUDFLARE_ACCOUNT_ID=<compte-cloudflare>
CLOUDFLARE_R2_INPUTS_BUCKET_NAME=nenes-3d-inputs
CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID=<clé-r2-limitée>
CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY=<secret-r2-limité>
```

Ne jamais préfixer ces variables par `NUXT_PUBLIC_`. L’API vérifie le
consentement et limite les envois à quatre images (JPG, PNG ou WebP), de 12 Mo
maximum chacune. Avant d’ouvrir ce formulaire à un public large, ajoutez une
protection anti-abus adaptée (par exemple Turnstile et une limite de débit)
pour éviter les dépôts automatisés.

Le endpoint serveur n'accepte que 1 à 4 fichiers JPEG, PNG ou WebP de 12 Mo au
maximum. Il les enregistre sous une clé anonyme de soumission et retourne une
référence, jamais une URL de photo. Mettre ensuite en place une règle de cycle
de vie R2 pour supprimer automatiquement les entrées après la génération et
la validation du GLB.
