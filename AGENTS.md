# Project instructions

## Photo-to-3D work

Before generating or modifying a bust from a photo, read
docs/PHOTO_TO_3D_INSTALLATION.md and docs/PHOTO_TO_3D_WORKFLOW.md completely,
then follow the canonical pipeline.

Never commit source bust photos, generated GLB files, or exported conversation
history. Keep them in the ignored locations documented in the workflow.

The canonical future pipeline is:

1. private cropped photo;
2. local Hunyuan3D inference through pnpm model:photo;
3. optional embedded symptom variants through pnpm model:symptoms;
4. local preview with the model query parameter;
5. visual and browser-console verification.

Use the Hunyuan3D family for new assets: the Swift/MLX port with the small
shape weights for fast single-photo iterations, and the official
Hunyuan3D-2mv pipeline when several synchronized views must contribute to one
mesh. Stable Fast 3D and TripoSR are fallbacks only.

For breast-volume variants, use the fruit catalog in `config/bust-models.ts`.
Keep its stable filename and model label aligned with the generated GLB. The
viewer must continue to fall back to the reference model when a catalog entry
has no local GLB.
