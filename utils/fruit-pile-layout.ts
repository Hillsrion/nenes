export const getFruitPileLayout = (
  width: number,
  height: number,
  variant: "default" | "entry" = "default",
  entrance: "rain" | "right" = "rain",
) => {
  if (variant === "entry" && width < 768) {
    const diameter = Math.min(110, Math.max(72, width / 4.5));
    // Scanned silhouettes occupy about 60% of their bounding square. Allow
    // for the gaps between resting fruits to fill the lower half of the stage.
    const count = Math.ceil(width * height * 0.5 * 0.8 / (diameter ** 2 * 0.6));
    return { diameter, count };
  }

  const diameter = Math.min(145, Math.max(64, width / 10));
  const count = variant === "entry"
    ? Math.min(64, Math.max(24, Math.round(width / diameter * 3.5)))
    : entrance === "right"
      ? Math.min(56, Math.max(28, Math.round(width / diameter * 4.2)))
      : Math.min(36, Math.max(18, Math.round(width / diameter * 2.6)));
  return { diameter, count };
};
