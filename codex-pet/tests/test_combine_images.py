"""Focused tests for the JSON image compositor."""

from __future__ import annotations

import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TEST_TEMP_ROOT = ROOT / "tmp"
SPEC = importlib.util.spec_from_file_location("combine_images", ROOT / "combine-images.py")
assert SPEC and SPEC.loader
combine_images = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(combine_images)


class CombineImagesTests(unittest.TestCase):
    def test_motion_types_cover_endpoints_and_intermediate_frames(self) -> None:
        frames = ["00", "01", "02"]
        self.assertEqual(combine_images.evaluate_motion({"type": "linear", "start": 0, "end": 10}, "01", 1, frames, "rotation"), 5)
        self.assertEqual(combine_images.evaluate_motion({"type": "frames", "values": {"00": 1, "01": 2, "02": 3}}, "01", 1, frames, "rotation"), 2)
        self.assertEqual(combine_images.evaluate_motion({"type": "keyframes", "keyframes": [{"frame": "00", "value": [0, 0]}, {"frame": "02", "value": [4, 8]}]}, "01", 1, frames, "position"), [2, 4])
        ellipse = combine_images.evaluate_motion({"type": "ellipse", "center": [5, 5], "radii": [2, 3], "startAngle": 0, "endAngle": 90}, "02", 2, frames, "position")
        self.assertAlmostEqual(ellipse[0], 5)
        self.assertAlmostEqual(ellipse[1], 8)
        arc = combine_images.evaluate_motion({"type": "arc", "center": [0, 0], "radius": 4, "startAngle": 0, "endAngle": 180}, "01", 1, frames, "position")
        self.assertAlmostEqual(arc[0], 0)
        self.assertAlmostEqual(arc[1], 4)

    def test_layer_order_translation_and_frame_override(self) -> None:
        with tempfile.TemporaryDirectory(dir=TEST_TEMP_ROOT) as temporary:
            animation = Path(temporary) / "idle"
            (animation / "drone").mkdir(parents=True)
            (animation / "robot").mkdir()
            for frame in ("00", "01"):
                drone = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
                drone.putpixel((0, 0), (255, 0, 0, 255))
                drone.save(animation / "drone" / f"{frame}.png")
                robot = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
                robot.putpixel((1, 0), (0, 0, 255, 255))
                robot.save(animation / "robot" / f"{frame}.png")
            config = {
                "version": 1,
                "canvas": [4, 4],
                "frames": ["00", "01"],
                "layerOrder": ["drone", "robot"],
                "layers": {
                    "drone": {"source": "drone/{frame}.png", "transform": {"position": {"type": "linear", "start": [0, 0], "end": [1, 0]}}, "frameOverrides": {"01": {"opacity": 0.5}}},
                    "robot": {"source": "robot/{frame}.png"},
                },
            }
            config_path = animation / "combine.json"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            staged = combine_images.compose_animation(config_path, check_only=False)
            for temporary_path, output in staged:
                os.replace(temporary_path, output)
            with Image.open(animation / "00.png") as image:
                self.assertEqual(image.convert("RGBA").getpixel((1, 0)), (0, 0, 255, 255))
            with Image.open(animation / "01.png") as image:
                self.assertEqual(image.convert("RGBA").getpixel((1, 0)), (0, 0, 255, 255))

    def test_failed_render_leaves_existing_outputs_untouched(self) -> None:
        with tempfile.TemporaryDirectory(dir=TEST_TEMP_ROOT) as temporary:
            animation = Path(temporary) / "idle"
            (animation / "drone").mkdir(parents=True)
            (animation / "robot").mkdir()
            Image.new("RGBA", (4, 4)).save(animation / "drone" / "00.png")
            Image.new("RGBA", (4, 4)).save(animation / "robot" / "00.png")
            (animation / "00.png").write_bytes(b"unchanged")
            config = {"version": 1, "canvas": [4, 4], "frames": ["00", "01"], "layerOrder": ["drone", "robot"], "layers": {"drone": {"source": "drone/{frame}.png"}, "robot": {"source": "robot/{frame}.png"}}}
            config_path = animation / "combine.json"
            config_path.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaises(combine_images.ConfigError):
                combine_images.compose_animation(config_path, check_only=False)
            self.assertEqual((animation / "00.png").read_bytes(), b"unchanged")
            self.assertFalse(list(animation.glob(".*.combine-*.png")))


if __name__ == "__main__":
    unittest.main()
