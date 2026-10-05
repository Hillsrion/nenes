import type { MaterialStyle } from "~/components/ui/three-bust/types";
import type { SymptomType } from "~/components/ui/three-bust/symptom-effects";

export const previewMaterials: Array<{
  id: MaterialStyle;
  label: string;
  short: string;
  description: string;
  swatch: string;
}> = [
    {
      id: "original",
      label: "Original",
      short: "Argile / texture",
      description: "Conserve la texture du GLB ou applique une argile rose au maillage brut.",
      swatch: "linear-gradient(135deg, #f7d7e3, #c991aa)",
    },
    {
      id: "glass",
      label: "Verre",
      short: "Rose translucide",
      description: "Transmission, réfraction douce et reflets de studio sur un verre rose.",
      swatch: "linear-gradient(135deg, #ffffff 8%, #bde9ff 42%, #ffb8dc 78%, #ffffff)",
    },
    {
      id: "glow",
      label: "Glow",
      short: "Néon émissif",
      description: "Émission rose pulsée et halo lumineux sur un fond nocturne.",
      swatch: "radial-gradient(circle at 35% 30%, #ffffff, #ff2b9b 24%, #6d0b6f 58%, #13031f)",
    },
    {
      id: "iridescent",
      label: "Nacre",
      short: "Irisée",
      description: "Une matière claire dont les reflets varient entre cyan, lilas et rose.",
      swatch: "linear-gradient(135deg, #9ff7ec, #ddd2ff 46%, #ffcae1 72%, #fff6ce)",
    },
  ];
export const previewSymptoms: Array<{
  id: SymptomType;
  label: string;
  short: string;
  description: string;
}> = [
    {
      id: "none",
      label: "Modèle neutre",
      short: "Masquer les annotations",
      description: "Le maillage original, sans modification ni annotation.",
    },
    {
      id: "asymmetry",
      label: "Taille ou asymétrie",
      short: "Comparer les deux volumes",
      description:
        "La différence de volume est montrée directement par la forme des deux seins, sans contour ajouté.",
    },
    {
      id: "skin",
      label: "Aspect de la peau",
      short: "Rougeur et peau d’orange",
      description:
        "La rougeur et le microrelief intégrés au maillage illustrent une texture de peau d’orange à surveiller.",
    },
    {
      id: "dimpling",
      label: "Fossettes ou croûtes",
      short: "Petites zones localisées",
      description:
        "Les rétractions de la peau et de fines plaques sèches, irrégulières et squameuses illustrent fossettes ou croûtes inhabituelles.",
    },
    {
      id: "nipple",
      label: "Mamelon ou écoulement",
      short: "Modification localisée",
      description:
        "Une petite goutte translucide se forme au mamelon puis se détache. L’écoulement peut être clair, jaunâtre ou teinté de sang : il n’est pas toujours rouge.",
    },
  ];
