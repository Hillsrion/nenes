export const useContent = () => {
  // Define main content elements for the ContentSection
  const mainContentElements = [
    {
      content: "Il est le cancer le plus fréquent pour la femme",
    },
    {
      content: "Ainsi que la première cause de mortalité par cancer",
    },
  ];

  // Statistics text for the statistics section
  const statisticsText = [
    "Chaque année en France,",
    "le cancer du sein touche",
    "plus de 60000 femmes.",
  ];

  const screeningContentElements = [
    {
      title: "Dépistage",
      content:
        "Les femmes entre 50 et 74 ans sont invitées à faire une mammographie tous les 2 ans. Ce simple examen peut sauver des vies. Il est cependant recommandé dès l'âge de 25 ans de les montrer une fois par an à un médecin et/ou à un gynécologue.",
      image: "/images/screening-01.jpg",
    },
    {
      title: "Autopalpation",
      content:
        "L'autopalpation régulière est un procédé simple qui vous permettra de détecter d'éventuels symptômes de cancer du sein entre deux dépistages. Au plus tôt il est détecté, au plus facile il est de le soigner.",
      image: "/images/screening-02.jpg",
    },
  ];

  const screeningMainTitle =
    "Détecté à un stade précoce, le cancer du sein est guéri dans plus de 9 cas sur 10. C'est pourquoi il est essentiel d'agir et de se sensibiliser aux gestes qui sauvent.";

  const symptomsMainTitle = "Les symptômes";

  const symptomsCards = [
    {
      title: "L'observation visuelle",
      description:
        "Placez-vous devant un miroir, les bras le long du corps, puis les mains sur les hanches, et enfin les bras levés au-dessus de la tête. Observez vos seins pour détecter tout changement inhabituel.",
    },
    {
      title: "Modification de la taille, de la forme ou de la symétrie.",
      image: "/images/symptoms/symptoms-01.jpg",
    },
    {
      title: `Changement d'aspect de la peau (rougeur, aspect de "peau d'orange", plis)`,
      image: "/images/symptoms/symptoms-02.jpg",
    },
    {
      title: "Apparition de fossettes ou de croûtes",
      image: "/images/symptoms/symptoms-03.jpg",
    },
    {
      title: "Écoulement ou modification du mamelon",
      image: "/images/symptoms/symptoms-04.jpg",
    },
  ];

  return {
    mainContentElements,
    statisticsText,
    screeningContentElements,
    screeningMainTitle,
    symptomsMainTitle,
    symptomsCards,
  };
};
