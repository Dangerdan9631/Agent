"""Register Commander failed-animation layers before compositing."""

import os
from pathlib import Path

from PIL import Image


FAILED_DIR = Path(__file__).resolve().parent / "source" / "failed"
FOOT_BASELINE = 202
BODY_CENTER_X = 95
DRONE_SCALE = 0.50
DRONE_POSITIONS = (
    (18, 4),
    (18, 5),
    (18, 5),
    (18, 5),
    (18, 5),
    (18, 5),
    (18, 5),
    (18, 5),
)


def replace_image(target: Path, image: Image.Image) -> None:
    temporary = target.with_suffix(".registered.png")
    image.save(temporary)
    os.replace(temporary, target)


for frame in range(8):
    name = f"{frame:02}.png"

    robot_path = FAILED_DIR / "robot" / name
    robot = Image.open(robot_path).convert("RGBA")
    left, top, right, bottom = robot.getbbox()
    registered_robot = Image.new("RGBA", robot.size, (0, 0, 0, 0))
    x_offset = round(BODY_CENTER_X - (left + right) / 2)
    registered_robot.alpha_composite(robot, (x_offset, FOOT_BASELINE - bottom))
    replace_image(robot_path, registered_robot)

    drone_path = FAILED_DIR / "drone" / name
    drone = Image.open(drone_path).convert("RGBA")
    crop = drone.crop(drone.getbbox())
    resized = crop.resize(
        (round(crop.width * DRONE_SCALE), round(crop.height * DRONE_SCALE)),
        Image.Resampling.NEAREST,
    )
    registered_drone = Image.new("RGBA", drone.size, (0, 0, 0, 0))
    registered_drone.alpha_composite(resized, DRONE_POSITIONS[frame])
    replace_image(drone_path, registered_drone)
