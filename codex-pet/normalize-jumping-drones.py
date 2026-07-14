"""Normalize the jumping scout's ring scale in its isolated source frames."""

from pathlib import Path

from PIL import Image


DRONE_DIR = Path(__file__).resolve().parent / "source" / "jumping" / "drone"

# Idle's scout ring is about 50 px wide.  A 55 px jumping ring preserves that
# relative scale while leaving room for its propulsion plume.
TARGET_RING_WIDTH = 55
FRAME_ANCHORS = ((96, 78), (97, 83), (96, 82), (96, 78), (97, 83))


def scale_about_anchor(image: Image.Image, anchor: tuple[int, int], scale: float) -> Image.Image:
    """Scale opaque pixels about an orb center with nearest-neighbor sampling."""
    width = round(image.width * scale)
    height = round(image.height * scale)
    resized = image.resize((width, height), Image.Resampling.NEAREST)
    output = Image.new("RGBA", image.size, (0, 0, 0, 0))
    x = round(anchor[0] - anchor[0] * scale)
    y = round(anchor[1] - anchor[1] * scale)
    output.alpha_composite(resized, (x, y))
    return output


for frame, anchor in enumerate(FRAME_ANCHORS):
    path = DRONE_DIR / f"{frame:02}.png"
    image = Image.open(path).convert("RGBA")
    left, _, right, _ = image.getbbox()
    normalized = scale_about_anchor(image, anchor, TARGET_RING_WIDTH / (right - left))
    temporary = path.with_suffix(".normalized.png")
    normalized.save(temporary)
    temporary.replace(path)
