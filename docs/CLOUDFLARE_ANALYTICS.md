# Audience et interactions Cloudflare

Domaine public : **nenes.ismaelsebbane.com**.

L’ancien script Matomo est remplacé par deux collectes indépendantes :

- **Cloudflare Web Analytics** : visites, pages vues, provenance, pays,
  appareils, navigateurs, temps de chargement et Core Web Vitals.
- **Worker + Analytics Engine** : sections atteintes et clics sur les ressources.
  Ces événements sont stockés dans `nenes_interactions`, séparément du tableau
  de bord Web Analytics.

## État de l’installation

Le collecteur d’interactions est déployé dans le compte Cloudflare du projet :

- Worker : `nenes-analytics` ;
- URL de collecte : `https://nenes-analytics.hypersensibles.workers.dev/events` ;
- origine acceptée : `https://nenes.ismaelsebbane.com` ;
- dataset : `nenes_interactions`, créé automatiquement au premier événement.

Le domaine, le token public Web Analytics et l’URL du collecteur sont configurés
par défaut dans Nuxt. L’audience et les interactions démarreront après publication de cette version du site sur ce
**domaine exact**. Les branch deploys Netlify et localhost restent exclus.

Le site Web Analytics est créé et configuré pour l’installation manuelle :
[gérer le site dans Cloudflare](https://dash.cloudflare.com/?to=/:account/web-analytics).
Le token public intégré est `9a5621b4526f4a30b17d5cc38fe7786f` ; ce n’est pas
un jeton API et il ne donne aucun droit d’administration.

Le compte Cloudflare est fourni par `CLOUDFLARE_ACCOUNT_ID` dans le fichier
`.env` local ignoré par Git. `pnpm analytics:deploy` charge ce fichier pour
Wrangler. Ne pas recopier cet identifiant dans les exemples, les liens ou la
configuration suivie : Netlify le traite comme une variable secrète et bloque
le déploiement si sa valeur apparaît dans le dépôt.

## Activer l’audience

1. Reconstruire et redéployer le site. La page d’accueil prégénérée embarque
   les paramètres publics au build. Aucune variable supplémentaire n’est
   nécessaire pour le domaine actuel, qui peut rester hébergé sur Netlify.
2. Pour changer de site Web Analytics, surcharger dans Netlify, dans le contexte
   **Production**, le token public du `data-cf-beacon` fourni par Cloudflare :

   ```dotenv
   NUXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=<token-public-du-site>
   ```

   Les autres valeurs sont déjà définies dans Nuxt. Elles peuvent être
   surchargées si nécessaire :

   ```dotenv
   NUXT_PUBLIC_CLOUDFLARE_ANALYTICS_HOSTS=nenes.ismaelsebbane.com
   NUXT_PUBLIC_CLOUDFLARE_ANALYTICS_EVENTS_ENDPOINT=https://nenes-analytics.hypersensibles.workers.dev/events
   ```

3. Ouvrir le domaine public et parcourir la page. Vérifier le chargement unique
   de `beacon.min.js`, les POST vers `cloudflareinsights.com/cdn-cgi/rum` et les
   POST vers le Worker. Quitter l’onglet pour déclencher l’envoi final du beacon.
   Les graphiques Cloudflare peuvent apparaître après un délai.

Si l’injection automatique Cloudflare est activée, la désactiver pour conserver
les exclusions et préférences de confidentialité gérées par le site. Le plugin
évite de charger un deuxième beacon lorsqu’il en détecte déjà un dans la page.

## Interactions mesurées

Après la fin du chargement, chaque section est comptée lorsqu’elle traverse
la zone centrale de l’écran, une seule fois par chargement de page :

| Événement | Cible | Signification |
| --- | --- | --- |
| `section_view` | `entry` | Introduction atteinte |
| `section_view` | `screening` | Dépistage atteint |
| `section_view` | `model-selection` | Choix du gabarit atteint, sans enregistrer le choix |
| `section_view` | `symptoms` | Section de sensibilisation atteinte |
| `section_view` | `self-examination` | Guide d’autopalpation atteint |
| `section_view` | `resources` | Ressources atteintes |
| `resource_click` | `cancer-info:phone` | Clic pour appeler Cancer Info |
| `resource_click` | `ruban-rose:website` | Clic vers Ruban rose |
| `resource_click` | `ligue-cancer:website` | Clic vers La Ligue contre le cancer |
| `resource_click` | `sante-publique:website` | Clic vers Santé publique France |

Un clic ne prouve ni qu’un appel a abouti ni que le site externe a été consulté.
Les crédits du pied de page et les pages prototypes ne sont pas instrumentés.
Le suivi ne mesure pas la lecture effective des vidéos.

Les événements sont envoyés par petits lots et à la sortie de l’onglet. Les
clics sont envoyés immédiatement pour résister à la navigation vers la ressource.
La transmission est sans effet bloquant sur l’interface et reste indicative :
les bloqueurs ou les problèmes réseau peuvent empêcher une remontée.

## Consulter les interactions

Pour les visites et performances, utiliser **Cloudflare → Web Analytics**.
Pour les interactions, interroger le dataset Analytics Engine ou connecter un
outil de visualisation à son API SQL.

Un rapport local est fourni :

1. Créer dans Cloudflare un token limité à **Account → Account Analytics → Read**,
   sur le compte du projet.
2. Le conserver uniquement dans `.env` ignoré par Git :

   ```dotenv
   CLOUDFLARE_ACCOUNT_ID=<identifiant-du-compte-cloudflare>
   CLOUDFLARE_ANALYTICS_READ_TOKEN=<token-prive-de-lecture>
   ```

3. Lire les comptages des sept derniers jours, ou choisir entre 1 et 90 jours :

   ```bash
   pnpm analytics:report
   pnpm analytics:report 30
   ```

Le token de lecture reste local et n’entre jamais dans la configuration publique
Nuxt. Ne pas le préfixer par `NUXT_PUBLIC_`.

Requête SQL équivalente :

```sql
SELECT
  blob4 AS event,
  blob5 AS target,
  SUM(_sample_interval * double1) AS total
FROM nenes_interactions
WHERE timestamp >= NOW() - INTERVAL '7' DAY
  AND blob1 = '1'
  AND blob2 = 'nenes.ismaelsebbane.com'
GROUP BY event, target
ORDER BY event, total DESC
```

Les poids d’échantillonnage Cloudflare sont pris en compte. Les chiffres sont
agrégés : aucun identifiant ne relie les événements à une personne ou une session.
Comparer les sections permet d’estimer la progression globale ; ce n’est pas un
entonnoir attribué à chaque visiteur. Un rechargement compte comme un nouveau
parcours.

## Données et protections

- Collecte uniquement en production, en HTTPS, sur les hôtes explicitement
  autorisés ; Do Not Track et Global Privacy Control sont respectés.
- Le beacon démarre uniquement sur `/` et `/links`. Les interactions sont limitées
  à `/`. Les URL avec `preview3d`, `studio3d`, `journeyDebug` ou `model` sont exclues.
- Le beacon officiel gère la navigation SPA. Conserver la navigation complète
  actuellement utilisée vers les studios et prototypes pour réévaluer les
  exclusions avant leur chargement.
- Aucun cookie, stockage persistant ou identifiant utilisateur n’est ajouté.
  Aucun détail de symptôme, photo, choix de gabarit, paramètre d’URL ou texte libre
  n’est écrit dans Analytics Engine.
- Le Worker valide chaque événement contre une liste fixe, accepte au maximum
  dix événements et 4 Ko par requête, et applique une limite de débit.
- L’IP est utilisée uniquement comme clé d’un compteur temporaire de limitation
  du débit ; elle n’est pas écrite dans le dataset. Les journaux Worker sont
  désactivés dans la configuration du projet.
- La restriction d’origine contrôle les navigateurs ; elle ne constitue pas une
  authentification contre des clients capables de fabriquer leurs en-têtes.

Ordre des dimensions Analytics Engine :

| Champ | Valeur |
| --- | --- |
| `blob1` | Version du schéma (`1`) |
| `blob2` | Domaine public |
| `blob3` | Chemin public (`/`) |
| `blob4` | Nom de l’événement |
| `blob5` | Cible fixe |
| `double1` | Comptage (`1`) |
| `index1` | Domaine + événement + cible, clé d’échantillonnage |

## Maintenance et vérification

```bash
pnpm analytics:test
pnpm exec wrangler deploy --config cloudflare/analytics/wrangler.jsonc --dry-run
pnpm analytics:deploy
```

Les tests couvrent le chargement, les préférences de confidentialité, les
exclusions, les retours sur une section, les clics, les onglets en arrière-plan,
le nettoyage des écouteurs, la validation et la limitation du collecteur.
Les contrôles en ligne utilisent une prérequête CORS et des données invalides
pour vérifier les réponses sans introduire de faux événements.

Documentation officielle :

- https://developers.cloudflare.com/web-analytics/get-started/
- https://developers.cloudflare.com/web-analytics/get-started/web-analytics-spa/
- https://developers.cloudflare.com/web-analytics/faq/
- https://developers.cloudflare.com/analytics/analytics-engine/get-started/
- https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
