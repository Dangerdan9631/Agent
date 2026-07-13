"""Create visible robot and drone layers from Commander composite frames.

The original animation cells are flattened. This extractor preserves the visible
pixels for each character while keeping the original 192x208 registration; it
does not attempt to invent drone pixels occluded by the foreground robot.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


# Each entry gives the scout's visual center in the 192x208 composite cells.
# The ring is included as a thin annulus, so foreground robot pixels remain in
# the robot layer wherever the two silhouettes overlap.
DRONE_LAYOUTS = {
    "idle": ((52, 23), "none"),
    "running-right": ((85, 22), "left"),
    "running-left": ((109, 22), "right"),
    "waving": ((95, 37), "none"),
    "jumping": ((48, 22), "down"),
    "failed": ((36, 28), "none"),
    "waiting": ((35, 24), "none"),
    "running": ((35, 24), "none"),
    "review": ((75, 24), "none"),
    "look-directions": ((119, 70), "none"),
}


def drone_mask(size: tuple[int, int], center: tuple[int, int], thrust: str) -> Image.Image:
    """Return an alpha mask for the scout body, orbital ring, and thruster."""
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    cx, cy = center

    # The visible scout hull is compact; a conservative radius avoids
    # attributing the foreground mech's overlapping armor to the rear layer.
    draw.ellipse((cx - 19, cy - 19, cx + 19, cy + 19), fill=255)
    if thrust == "left":
        draw.polygon([(cx - 18, cy - 8), (0, cy - 20), (0, cy + 7), (cx - 18, cy + 10)], fill=255)
        draw.ellipse((cx - 32, cy - 15, cx - 10, cy + 15), fill=255)
    elif thrust == "right":
        draw.polygon([(cx + 18, cy - 8), (191, cy - 20), (191, cy + 7), (cx + 18, cy + 10)], fill=255)
        draw.ellipse((cx + 10, cy - 15, cx + 32, cy + 15), fill=255)
    elif thrust == "down":
        draw.polygon([(cx - 10, cy + 17), (cx - 23, cy + 66), (cx + 8, cy + 66), (cx + 11, cy + 17)], fill=255)

    draw.arc((cx - 33, cy - 8, cx + 33, cy + 36), 0, 360, fill=255, width=7)
    return mask


def isolate_frame(path: Path, center: tuple[int, int], thrust: str) -> None:
    composite = Image.open(path).convert("RGBA")
    alpha = composite.getchannel("A")
    scout_shape = drone_mask(composite.size, center, thrust)
    drone_alpha = Image.composite(alpha, Image.new("L", composite.size, 0), scout_shape)
    # Invert the binary shape selector, not the source alpha. Inverting the
    # latter would halve semi-transparent edge pixels rather than assigning
    # each source pixel to exactly one layer.
    robot_selector = Image.eval(scout_shape, lambda value: 255 - value)
    robot_alpha = Image.composite(alpha, Image.new("L", composite.size, 0), robot_selector)

    # Start from transparent black so no hidden composite RGB leaks through a
    # layer in renderers that inspect RGB without first compositing alpha.
    drone = Image.new("RGBA", composite.size, (0, 0, 0, 0))
    drone.paste(composite, mask=scout_shape)
    drone.putalpha(drone_alpha)
    robot = Image.new("RGBA", composite.size, (0, 0, 0, 0))
    robot.paste(composite, mask=robot_selector)
    robot.putalpha(robot_alpha)

    path.parent.joinpath("drone").mkdir(exist_ok=True)
    path.parent.joinpath("robot").mkdir(exist_ok=True)
    drone.save(path.parent / "drone" / path.name)
    robot.save(path.parent / "robot" / path.name)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="source frame root")
    args = parser.parse_args()

    for animation, (center, thrust) in DRONE_LAYOUTS.items():
        for frame in sorted((args.source / animation).glob("*.png")):
            isolate_frame(frame, center, thrust)


if __name__ == "__main__":
    main()
