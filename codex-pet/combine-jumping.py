"""Compose the isolated Commander jumping layers into combined frames.

The scout stays behind the mech's screen-left shoulder.  Its source frames have
different thrust-plume lengths, so offsets register the orb (rather than the
outer alpha bounds) at a stable size and position across the motion.
"""

from pathlib import Path

from PIL import Image


JUMPING_DIR = Path(__file__).resolve().parent / "source" / "jumping"

# These coordinates hold the drone orb in the same place relative to the
# rising mech.  The slightly different offsets compensate for the source
# frames' ring/thruster follow-through, without scaling the drone artwork.
FRAME_OFFSETS = (
    (52, -10),
    (51, -12),
    (64, 12),
    (52, -10),
    (51, -12),
)
def compose(frame: int) -> None:
    name = f"{frame:02}.png"
    drone = Image.open(JUMPING_DIR / "drone" / name).convert("RGBA")
    robot = Image.open(JUMPING_DIR / "robot" / name).convert("RGBA")
    if drone.size != robot.size:
        raise ValueError(f"{name}: mismatched layer sizes")

    combined = Image.new("RGBA", robot.size, (0, 0, 0, 0))
    combined.alpha_composite(drone, FRAME_OFFSETS[frame])
    combined.alpha_composite(robot)

    output = JUMPING_DIR / name
    temporary = output.with_suffix(".combined.png")
    combined.save(temporary)
    temporary.replace(output)


for source in sorted((JUMPING_DIR / "robot").glob("*.png")):
    compose(int(source.stem))
