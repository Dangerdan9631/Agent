"""Compose Commander idle frames from the isolated drone and robot layers.

The drone source art is registered around the torso.  Moving it up and toward
screen-left places it behind the robot's left shoulder while preserving the
small hover motion already present in each frame.
"""

import os
from pathlib import Path

from PIL import Image


IDLE_DIR = Path(__file__).resolve().parent / "source" / "idle"
# The drone source art is centered over the torso.  The six offsets hold it
# above and outside the screen-left shoulder while tracing a 10 px hover loop
# in both axes.  They also compensate for the small vertical motion baked into
# the isolated drone frames, keeping the combined motion smooth.
FRAME_OFFSETS = (
    (-62, -73),
    (-57, -75),
    (-52, -70),
    (-52, -65),
    (-57, -65),
    (-62, -70),
)
FRAME_ROTATIONS = (-4, -2, 2, 4, 2, -2)


def compose(frame: int) -> None:
    name = f"{frame:02}.png"
    drone = Image.open(IDLE_DIR / "drone" / name).convert("RGBA")
    robot = Image.open(IDLE_DIR / "robot" / name).convert("RGBA")
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
    output = IDLE_DIR / name
    temporary = output.with_suffix(".combined.png")
    combined.save(temporary)
    os.replace(temporary, output)


for source in sorted((IDLE_DIR / "robot").glob("*.png")):
    compose(int(source.stem))
