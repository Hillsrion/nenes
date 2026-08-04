# Publication des modèles 3D avec Cloudflare R2

Les GLB produits depuis des photos sont des fichiers dérivés sensibles : ils ne
doivent pas être ajoutés au dépôt Git ni au bundle Netlify. Ils sont publiés
séparément dans le bucket R2 existant, sous le préfixe `models/`.

## Une fois dans Cloudflare

1. Dans le bucket R2 déjà utilisé pour les vidéos, connecter un domaine public
   dédié, par exemple `models.nenes.fr`. Ne pas utiliser l'URL `r2.dev` en
   production.
2. Ajouter la règle CORS suivante, en remplaçant les origines par les domaines
   réellement utilisés. Ajouter aussi l'URL Netlify de préproduction si elle
   doit charger les modèles :

   ```json
   {
     "rules": [
       {
         "allowed": {
           "origins": [
             "https://ton-site.netlify.app",
             "https://www.ton-domaine.fr"
           ],
           "methods": ["GET", "HEAD"]
         }
       }
     ]
   }
   ```

3. Définir dans les variables Netlify de production :

   ```env
   NUXT_PUBLIC_3D_MODELS_URL=https://models.nenes.fr
   ```

   `NUXT_PUBLIC_R2_PUBLIC_URL` reste la variable des vidéos. Si la variable
   dédiée est absente, le viewer utilise cette dernière par compatibilité.

Les clés R2 (`CLOUDFLARE_R2_ACCESS_KEY_ID` et
`CLOUDFLARE_R2_SECRET_ACCESS_KEY`) restent des secrets locaux ou de CI : ne
jamais les définir avec le préfixe `NUXT_PUBLIC_`.

## Publier un GLB validé

Seuls les noms déclarés dans `config/bust-models.ts` sont acceptés. Cette
restriction évite de téléverser une photo source ou un GLB intermédiaire par
erreur.

```bash
# Charge le modèle de référence déjà validé.
pnpm models:upload -- bust-photo-symptoms.glb

# Charge seulement les modèles qui existent localement parmi ceux du catalogue.
pnpm models:upload -- --all-configured
```

Le fichier local doit rester dans `public/models/`, qui est ignoré par Git. Le
script l'envoie vers `models/<nom-du-fichier>.glb` avec le type MIME
`model/gltf-binary` et un cache d'une heure : les noms actuels peuvent donc
être remplacés sans laisser une version obsolète pendant un an.

Après l'upload, vérifier l'URL avec une requête `HEAD` et ouvrir la démo :

```bash
curl -I https://models.nenes.fr/models/bust-photo-symptoms.glb
# Puis, après le déploiement Netlify :
# https://www.ton-domaine.fr/?preview3d=photo
```

Attendre `200`, `Content-Type: model/gltf-binary` et les en-têtes CORS pour
une requête venant du domaine du site. Après un changement de règle CORS sur
un domaine déjà servi, purger le cache Cloudflare de ce domaine.

## Ordre de publication

1. Générer et inspecter le GLB localement.
2. Le téléverser avec `models:upload`.
3. Déployer ou fusionner le code/catalogue vers `main`.
4. Contrôler l'URL de production et le fallback des fruits non encore produits.

Pour une évolution ultérieure qui ne doit jamais réutiliser un cache, déclarer
un nouveau nom versionné (`bust-photo-symptoms-v2.glb`) dans le catalogue,
téléverser ce fichier, puis déployer la modification de catalogue.

## Données autorisées

Le bucket public doit contenir uniquement les GLB destinés à la démonstration.
Il ne doit contenir ni photo originale, ni masque, ni prompt, ni historique de
conversation. Avant publication, vérifier qu'une éventuelle texture embarquée
ne rend pas la personne identifiable et que sa diffusion publique est
autorisée.
