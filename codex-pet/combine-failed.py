"""Compose the Commander failed animation from its isolated layers.

The scout falls from the top-left toward the mech's left side while leaning
clockwise.  It remains behind the robot throughout the sequence.
"""

import os
from pathlib import Path

from PIL import Image


FAILED_DIR = Path(__file__).resolve().parent / "source" / "failed"

# The source scout begins in the upper-left.  These offsets produce a smooth
# drop that settles roughly one-third of the way down the left side.
FRAME_OFFSETS = (
    (0, 0),
    (0, 8),
    (-1, 18),
    (-2, 30),
    (-3, 42),
    (-4, 52),
    (-5, 60),
    (-5, 60),
)

# Pillow's negative angles lean the scout clockwise (toward screen-right).
FRAME_ROTATIONS = (0, -4, -8, -12, -17, -21, -25, -25)


def compose(frame: int) -> None:
    name = f"{frame:02}.png"
    drone = Image.open(FAILED_DIR / "drone" / name).convert("RGBA")
    robot = Image.open(FAILED_DIR / "robot" / name).convert("RGBA")
    if drone.size != robot.size:
        raise ValueError(f"{name}: mismatched layer sizes")

    left, top, right, bottom = drone.getbbox()
    drone = drone.rotate(
        FRAME_ROTATIONS[frame],
        resample=Image.Resampling.NEAREST,
        center=((left + right) / 2, (top + bottom) / 2),
    )

    combined = Image.new("RGBA", robot.size, (0, 0, 0, 0))
    combined.alpha_composite(drone, FRAME_OFFSETS[frame])
    combined.alpha_composite(robot)

    output = FAILED_DIR / name
    temporary = output.with_suffix(".combined.png")
    combined.save(temporary)
    os.replace(temporary, output)


for source in sorted((FAILED_DIR / "robot").glob("*.png")):
    compose(int(source.stem))
