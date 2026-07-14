"""Mirror the isolated jumping robot frames without changing the drone layer."""

from pathlib import Path

from PIL import Image, ImageOps


ROBOT_DIR = Path(__file__).resolve().parent / "source" / "jumping" / "robot"


for path in sorted(ROBOT_DIR.glob("*.png")):
    mirrored = ImageOps.mirror(Image.open(path).convert("RGBA"))
    temporary = path.with_suffix(".mirrored.png")
    mirrored.save(temporary)
    temporary.replace(path)
