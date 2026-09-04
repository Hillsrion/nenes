import argparse
import os
import tempfile
from pathlib import Path

import torch
from PIL import Image, ImageOps

from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Generate one bust mesh from 2 to 4 canonical camera views."
    )
    parser.add_argument("--front", required=True, type=Path)
    parser.add_argument("--left", type=Path, help="Front rotated clockwise by 90 degrees")
    parser.add_argument("--back", type=Path)
    parser.add_argument("--right", type=Path, help="Front rotated clockwise by 270 degrees")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--octree", type=int, default=320)
    parser.add_argument("--chunks", type=int, default=12000)
    parser.add_argument("--seed", type=int, default=12345)
    return parser.parse_args()


def load_view(path: Path):
    if not path.is_file():
        raise SystemExit(f"Input view not found: {path}")

    image = ImageOps.exif_transpose(Image.open(path)).convert("RGBA")
    alpha_minimum, alpha_maximum = image.getchannel("A").getextrema()
    if alpha_minimum == alpha_maximum == 255:
        raise SystemExit(
            f"{path} has no transparent background. Crop it first, then run "
            "pnpm model:view:mask before multiview inference."
        )
    return image


args = parse_arguments()
runtime_directory_value = os.environ.get("HUNYUAN3D_MV_DIR")
if not runtime_directory_value:
    raise SystemExit("HUNYUAN3D_MV_DIR is required.")

runtime_directory = Path(runtime_directory_value).resolve()
weights_directory = Path(
    os.environ.get(
        "HUNYUAN3D_MV_WEIGHTS",
        runtime_directory / "weights/hunyuan3d-2mv",
    )
).resolve()

views = {
    direction: load_view(path.resolve())
    for direction, path in {
        "front": args.front,
        "left": args.left,
        "back": args.back,
        "right": args.right,
    }.items()
    if path is not None
}
if len(views) < 2:
    raise SystemExit("At least two views are required: front plus left, back, or right.")

output_path = args.output.resolve()
if output_path.exists():
    raise SystemExit(f"Refusing to overwrite existing output: {output_path}")
output_path.parent.mkdir(parents=True, exist_ok=True)

pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
    str(weights_directory),
    subfolder="hunyuan3d-dit-v2-mv",
    variant="fp16",
    use_safetensors=True,
    device=os.environ.get("HUNYUAN3D_MV_DEVICE", "mps"),
)
mesh = pipeline(
    image=views,
    num_inference_steps=args.steps,
    octree_resolution=args.octree,
    num_chunks=args.chunks,
    generator=torch.manual_seed(args.seed),
    output_type="trimesh",
)[0]

with tempfile.TemporaryDirectory(prefix="nenes-multiview-") as temporary_directory:
    temporary_output = Path(temporary_directory) / output_path.name
    mesh.export(temporary_output)
    temporary_output.replace(output_path)

print(f"Generated {output_path}")
