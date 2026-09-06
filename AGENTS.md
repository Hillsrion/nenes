# Project instructions

## Design reference

The canonical Figma reference is [Nénés – Projet Octobre Rose V2](https://www.figma.com/design/F1VrBC3h7ojtRAoRlwqtn2/N%C3%A9n%C3%A9s---Projet-Octobre-Rose-V2?node-id=2063-448&t=53cL6wQwTfgPhuOt-0).
Use the signed-in Figma desktop app through Computer Use for inspection; avoid the Figma MCP when possible because it is rate-limited. The editorial paper treatment is illustrated by frames `UI-1366-Nénés-V2-41` through `-45` and reused in `UI-1366-Nénés-V2-69`.

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

For breast-volume variants, use the fruit catalog in `config/bust-fruit-catalog.ts`.
Keep its stable filename and model label aligned with the generated GLB. The
viewer must continue to fall back to the demo model when a catalog entry has no
local GLB.
