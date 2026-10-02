# Audit et découpage des composants

Audit réalisé le 3 octobre 2026 sur les composants Vue de `app/` et `components/`.
La taille totale comprend le template, le script et les styles. La décision de
scinder repose surtout sur le mélange de responsabilités et les dépendances,
plutôt que sur une limite arbitraire de lignes.

## Fichiers découpés

| Fichier | Avant | Après | Responsabilités extraites |
| --- | ---: | ---: | --- |
| `components/ui/ThreeBustViewer.vue` | 1 153 | 113 | Scène, lecture de palpation, cadrage, symptômes, matières et buste de secours |
| `app/app.vue` | 990 | 367 | Prévisualisation 3D, options, résolution du modèle, comparaison source et animation du parcours |
| `components/ui/ThreeBustJourney.vue` | 766 | 55 | Scène du parcours, trajectoire de caméra et présentation des symptômes |
| `components/sections/ScreeningSection.vue` | 502 | 297 | Séquence de défilement et son nettoyage |
| `components/ui/ExaminationSteps.vue` | 406 | 263 | Entrée de la vidéo, empilement des cartes et sélection de l'étape par défilement |

Les interfaces des composants (props, valeurs par défaut et événements) sont
conservées. Les templates et styles du parcours principal sont conservés.
Aucun asset 3D ou photo source n'a été modifié.

## Organisation obtenue

### Affichage

- `ThreeDPreview.vue` compose l'écran de prévisualisation.
- `three-bust/BustPreviewSidebar.vue` affiche ses commandes et descriptions.
- Les deux composants `ThreeBust*` affichent le canvas, le contour et les
  commandes du viewer, avec leurs contrats dans `three-bust/types.ts`.

### Logique Vue et animations

- `composables/three-bust/useBustViewer.ts` et `useBustJourney.ts` orchestrent
  chaque scène : initialisation, chargement, rendu conditionnel, observation
  du viewport, redimensionnement et libération des ressources.
- `useBustPlayback.ts` gère la lecture, la pause, la recherche temporelle et
  les métadonnées des étapes du viewer.
- `useViewerFraming.ts` gère le cadrage des symptômes et de la palpation.
- `useBustSymptomPresentation.ts` est partagé par les deux scènes. Il gère
  la disparition du titre de profil, la rotation et le symptôme en attente,
  puis émet la disponibilité du symptôme une fois sa transition terminée.
- `useJourneyStage.ts` gère l'apparition de la scène commune et le défilement
  de sa caméra après la sortie du chargement.
- `useBustPreview.ts` gère le catalogue, les sélections et le repli vers le
  modèle de démonstration quand la vérification de disponibilité échoue.
- `useBustSourceComparison.ts` gère la comparaison optionnelle à la source.
- `composables/screening/useScreeningScrollSequence.ts` et
  `composables/examination/useExaminationCardSequence.ts` possèdent chacun
  leur séquence d'animation et son nettoyage.

### Modules Three.js et données

- `three-bust/journey-camera.ts` possède les courbes et le calcul de caméra.
- `three-bust/viewer-materials.ts` possède les matières, le bloom et leur
  libération. La composition lumineuse reste chargée à la demande.
- `three-bust/mock-bust.ts` construit le buste de secours et anime ses formes.
- `three-bust/scene-utils.ts` mutualise l'éclairage, la normalisation des
  modèles, la sélection des meshes de symptômes et le profil de performance.
- `config/bust-preview-options.ts` contient les textes et options du prototype.

Les orchestrateurs de scène restent autour de 460 lignes : ils coordonnent
un seul cycle de vie et délèguent les fonctionnalités spécialisées. Les
extractions ne déplacent donc pas simplement l'intégralité des anciens scripts
vers deux nouveaux fichiers géants.

## Autres composants examinés

| Fichier | Lignes | Conclusion |
| --- | ---: | --- |
| `RevealingSectionHeader.vue` | 343 | Une séquence de révélation du titre avec ses adaptations iOS ; pas de sous-interface autonome à extraire dans cet audit |
| `ThreeFruitLoadingAnimator.vue` | 338 | Un cycle de rendu et de transition des fruits ; création des modèles déjà séparée dans `utils/loading-fruit-models.ts` |
| `ThreeDStudio.vue` | 306 | Formulaire d'envoi et suivi, avec un template majoritaire ; pas de bloc aussi lourd que les scènes 3D |
| `IntroPhotoSequence.vue` | 300 | Un seul rendu de séquence ; calcul de progression déjà isolé dans `utils/intro-sequence.ts` |

Les autres composants existants comptent moins de 300 lignes. Leur découpage
supplémentaire n'apporterait pas le même gain de lisibilité. Les gros modules
Three.js existants, notamment `symptom-effects.ts`, sont des moteurs spécialisés
et ne constituent pas des composants Vue ; leur réorganisation n'était pas
nécessaire à ce découpage.

## Vérifications

- Les 18 tests existants passent, couvrant les animations de palpation, les
  transitions de symptômes, le verrouillage du carousel, l'introduction et la
  physique des fruits. Le test qui inspecte les conditions de rendu suit
  maintenant les deux orchestrateurs déplacés, avec les mêmes assertions.
- La compilation Nuxt de production passe (client, serveur et prérendu).
- 126 poses de caméra ont été comparées numériquement au code d'origine :
  positions, orientations et zooms identiques sur trois rapports de viewport,
  en progression et en retour arrière, avec symptômes et palpation.
- Vérification navigateur à 1366 × 900 et 390 × 844 : parcours 3D,
  autopalpation et vidéo, retour par défilement, prévisualisation et changement
  de matière/symptôme. Aucune erreur JavaScript relevée lors de ces parcours.
- Le contrôle TypeScript ciblé ne signale aucune erreur dans les nouveaux
  modules. Le contrôle complet n'est pas entièrement vert : des erreurs
  préexistantes restent dans `palpation-transition.ts`, `profile-contour.ts`,
  `symptom-effects.ts` et certains fichiers serveur (catalogue, types AWS et
  comparaison source). La vérification ciblée résout les types GSAP depuis la
  dépendance déjà installée ; elle n'ajoute aucune dépendance au projet.
- La comparaison privée à une photo n'a pas été activée pendant la vérification
  navigateur ; son code de résolution a été extrait en conservant son option
  d'activation et sa gestion des réponses concurrentes.
