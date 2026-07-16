#!/usr/bin/env python3
"""Compose layered animation frames using per-animation ``combine.json`` files.

The compositor keeps all layers in their original canvas registration.  A layer
can be scaled and rotated around a stable anchor before being translated and
painted onto the output canvas.  Configuration coordinates use screen space:
positive rotation is clockwise and path angles increase clockwise.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import uuid
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps


SCRIPT_ROOT = Path(__file__).resolve().parent
DEFAULT_SOURCE_ROOT = SCRIPT_ROOT / "source"
RESAMPLING = {
    "nearest": Image.Resampling.NEAREST,
    "bilinear": Image.Resampling.BILINEAR,
    "bicubic": Image.Resampling.BICUBIC,
}


class ConfigError(ValueError):
    """Raised when a composition configuration is invalid."""


def number(value: Any, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ConfigError(f"{label} must be a number")
    return float(value)


def vector(value: Any, label: str, length: int = 2) -> tuple[float, ...]:
    if not isinstance(value, list) or len(value) != length:
        raise ConfigError(f"{label} must be a {length}-element array")
    return tuple(number(item, label) for item in value)


def interpolate(start: Any, end: Any, progress: float, label: str) -> Any:
    if isinstance(start, (int, float)) and not isinstance(start, bool):
        return number(start, label) + (number(end, label) - number(start, label)) * progress
    start_vector = vector(start, label)
    end_vector = vector(end, label, len(start_vector))
    return [left + (right - left) * progress for left, right in zip(start_vector, end_vector)]


def eased(progress: float, easing: str) -> float:
    if easing == "linear":
        return progress
    if easing == "step":
        return 0.0 if progress < 1.0 else 1.0
    if easing == "ease-in":
        return progress * progress
    if easing == "ease-out":
        return 1.0 - (1.0 - progress) ** 2
    if easing == "ease-in-out":
        return 2 * progress * progress if progress < 0.5 else 1 - ((-2 * progress + 2) ** 2) / 2
    raise ConfigError(f"unsupported easing {easing!r}")


def frame_progress(index: int, frame_count: int) -> float:
    return 0.0 if frame_count == 1 else index / (frame_count - 1)


def evaluate_motion(spec: Any, frame: str, index: int, frames: list[str], property_name: str) -> Any:
    """Evaluate a literal value or a configured animation for one frame."""
    if not isinstance(spec, dict) or "type" not in spec:
        return spec

    motion_type = spec["type"]
    progress = frame_progress(index, len(frames))
    easing_name = spec.get("easing", "linear")

    if motion_type == "frames":
        values = spec.get("values")
        if not isinstance(values, dict):
            raise ConfigError(f"{property_name}.values must be an object")
        if frame in values:
            return values[frame]
        if "default" in spec:
            return spec["default"]
        raise ConfigError(f"{property_name} has no value for frame {frame}")

    if motion_type == "linear":
        return interpolate(spec.get("start"), spec.get("end"), eased(progress, easing_name), property_name)

    if motion_type == "keyframes":
        keyframes = spec.get("keyframes")
        if not isinstance(keyframes, list) or not keyframes:
            raise ConfigError(f"{property_name}.keyframes must be a non-empty array")
        parsed: list[tuple[int, Any, str]] = []
        for keyframe in keyframes:
            if not isinstance(keyframe, dict) or "frame" not in keyframe or "value" not in keyframe:
                raise ConfigError(f"{property_name} keyframes require frame and value")
            key_frame = keyframe["frame"]
            if key_frame not in frames:
                raise ConfigError(f"{property_name} keyframe references unknown frame {key_frame!r}")
            parsed.append((frames.index(key_frame), keyframe["value"], keyframe.get("easing", "linear")))
        parsed.sort(key=lambda item: item[0])
        if len({item[0] for item in parsed}) != len(parsed):
            raise ConfigError(f"{property_name} has duplicate keyframes")
        if index <= parsed[0][0]:
            return parsed[0][1]
        if index >= parsed[-1][0]:
            return parsed[-1][1]
        for left, right in zip(parsed, parsed[1:]):
            if left[0] <= index <= right[0]:
                span = right[0] - left[0]
                return interpolate(left[1], right[1], eased((index - left[0]) / span, left[2]), property_name)
        raise AssertionError("keyframe lookup should always find a segment")

    if motion_type in {"ellipse", "arc"}:
        if property_name != "position":
            raise ConfigError(f"{motion_type} motion is supported only for position")
        center = vector(spec.get("center"), f"{property_name}.center")
        if motion_type == "ellipse":
            radii = vector(spec.get("radii"), f"{property_name}.radii")
        else:
            radius = number(spec.get("radius"), f"{property_name}.radius")
            radii = (radius, radius)
        start_angle = number(spec.get("startAngle"), f"{property_name}.startAngle")
        end_angle = number(spec.get("endAngle"), f"{property_name}.endAngle")
        angle = math.radians(start_angle + (end_angle - start_angle) * eased(progress, easing_name))
        return [center[0] + radii[0] * math.cos(angle), center[1] + radii[1] * math.sin(angle)]

    raise ConfigError(f"unsupported {property_name} motion type {motion_type!r}")


def anchor_point(anchor: Any, image: Image.Image, canvas_size: tuple[int, int]) -> tuple[float, float]:
    if anchor == "canvas-center":
        return canvas_size[0] / 2, canvas_size[1] / 2
    if anchor == "content-center":
        bbox = image.getbbox()
        if bbox is None:
            return canvas_size[0] / 2, canvas_size[1] / 2
        return (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    return vector(anchor, "anchor")


def scale_about_anchor(image: Image.Image, scale: tuple[float, float], anchor: tuple[float, float], resample: int) -> Image.Image:
    sx, sy = scale
    if sx == 0 or sy == 0:
        raise ConfigError("scale values must not be zero")
    scaled_size = (max(1, round(image.width * abs(sx))), max(1, round(image.height * abs(sy))))
    scaled = image.resize(scaled_size, resample=resample)
    anchor_after_scale = (anchor[0] * abs(sx), anchor[1] * abs(sy))
    if sx < 0:
        scaled = ImageOps.mirror(scaled)
        anchor_after_scale = (scaled.width - anchor_after_scale[0], anchor_after_scale[1])
    if sy < 0:
        scaled = ImageOps.flip(scaled)
        anchor_after_scale = (anchor_after_scale[0], scaled.height - anchor_after_scale[1])
    output = Image.new("RGBA", image.size, (0, 0, 0, 0))
    output.alpha_composite(
        scaled,
        (round(anchor[0] - anchor_after_scale[0]), round(anchor[1] - anchor_after_scale[1])),
    )
    return output


def render_layer(
    source: Path,
    canvas_size: tuple[int, int],
    transform: dict[str, Any],
    frame: str,
    index: int,
    frames: list[str],
) -> Image.Image:
    with Image.open(source) as source_image:
        image = source_image.convert("RGBA")
    if image.size != canvas_size:
        raise ConfigError(f"{source} is {image.size}, expected {canvas_size}")
    resampling_name = transform.get("resampling", "nearest")
    if resampling_name not in RESAMPLING:
        raise ConfigError(f"unsupported resampling mode {resampling_name!r}")
    resample = RESAMPLING[resampling_name]
    anchor = anchor_point(transform.get("anchor", "content-center"), image, canvas_size)
    scale_value = evaluate_motion(transform.get("scale", 1), frame, index, frames, "scale")
    scale = (number(scale_value, "scale"),) * 2 if isinstance(scale_value, (int, float)) else vector(scale_value, "scale")
    image = scale_about_anchor(image, scale, anchor, resample)

    rotation = number(evaluate_motion(transform.get("rotation", 0), frame, index, frames, "rotation"), "rotation")
    if rotation:
        image = image.rotate(-rotation, resample=resample, center=anchor, expand=False)

    opacity = number(evaluate_motion(transform.get("opacity", 1), frame, index, frames, "opacity"), "opacity")
    if not 0 <= opacity <= 1:
        raise ConfigError("opacity must be between 0 and 1")
    if opacity != 1:
        alpha = image.getchannel("A").point(lambda value: round(value * opacity))
        image.putalpha(alpha)

    position = vector(evaluate_motion(transform.get("position", [0, 0]), frame, index, frames, "position"), "position")
    translated = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    translated.alpha_composite(image, (round(position[0]), round(position[1])))
    return translated


def merged_transform(layer: dict[str, Any], frame: str) -> dict[str, Any]:
    transform = dict(layer.get("transform", {}))
    overrides = layer.get("frameOverrides", {})
    if not isinstance(overrides, dict):
        raise ConfigError("frameOverrides must be an object")
    override = overrides.get(frame, {})
    if not isinstance(override, dict):
        raise ConfigError(f"frame override for {frame} must be an object")
    transform.update(override)
    return transform


def load_config(config_path: Path) -> dict[str, Any]:
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ConfigError(f"{config_path}: invalid JSON: {error}") from error
    if not isinstance(config, dict) or config.get("version") != 1:
        raise ConfigError(f"{config_path}: version must be 1")
    return config


def compose_animation(config_path: Path, check_only: bool) -> list[tuple[Path, Path]]:
    config = load_config(config_path)
    animation_dir = config_path.parent
    canvas = config.get("canvas")
    canvas_size = vector(canvas, "canvas")
    if any(value != int(value) or value <= 0 for value in canvas_size):
        raise ConfigError("canvas dimensions must be positive integers")
    canvas_size = (int(canvas_size[0]), int(canvas_size[1]))
    frames = config.get("frames")
    if not isinstance(frames, list) or not frames or not all(isinstance(frame, str) and frame for frame in frames):
        raise ConfigError("frames must be a non-empty array of names")
    if len(set(frames)) != len(frames):
        raise ConfigError("frames must not contain duplicates")
    layer_order = config.get("layerOrder")
    layers = config.get("layers")
    if not isinstance(layer_order, list) or not layer_order or not all(isinstance(name, str) for name in layer_order):
        raise ConfigError("layerOrder must be a non-empty array")
    if len(set(layer_order)) != len(layer_order) or not isinstance(layers, dict) or set(layer_order) != set(layers):
        raise ConfigError("layerOrder must contain every layer exactly once")
    output_pattern = config.get("output", "{frame}.png")
    if not isinstance(output_pattern, str) or "{frame}" not in output_pattern:
        raise ConfigError("output must be a pattern containing {frame}")

    staged: list[tuple[Path, Path]] = []
    try:
        for index, frame in enumerate(frames):
            composed = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
            for layer_name in layer_order:
                layer = layers[layer_name]
                if not isinstance(layer, dict) or not isinstance(layer.get("source"), str):
                    raise ConfigError(f"layer {layer_name!r} requires a source pattern")
                source = animation_dir / layer["source"].format(frame=frame)
                if not source.is_file():
                    raise ConfigError(f"missing source image {source}")
                composed.alpha_composite(render_layer(source, canvas_size, merged_transform(layer, frame), frame, index, frames))
            output = animation_dir / output_pattern.format(frame=frame)
            if check_only:
                continue
            temporary = output.with_name(f".{output.stem}.combine-{uuid.uuid4().hex}{output.suffix}")
            composed.save(temporary)
            staged.append((temporary, output))
        return staged
    except Exception:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)
        raise


def selected_configs(source_root: Path, animations: list[str] | None) -> list[Path]:
    if animations:
        configs = [source_root / animation / "combine.json" for animation in animations]
    else:
        configs = sorted(source_root.glob("*/combine.json"))
    missing = [path for path in configs if not path.is_file()]
    if missing:
        raise ConfigError("missing configuration: " + ", ".join(str(path) for path in missing))
    if not configs:
        raise ConfigError(f"no combine.json files found below {source_root}")
    return configs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT, help="animation root (default: %(default)s)")
    parser.add_argument("--animation", action="append", help="animation folder to compose; repeat to select several")
    parser.add_argument("--check", action="store_true", help="validate and render configurations without replacing outputs")
    args = parser.parse_args()

    staged: list[tuple[Path, Path]] = []
    try:
        for config_path in selected_configs(args.source_root, args.animation):
            staged.extend(compose_animation(config_path, args.check))
        if not args.check:
            for temporary, output in staged:
                os.replace(temporary, output)
    except Exception:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    try:
        main()
    except ConfigError as error:
        raise SystemExit(f"combine-images: {error}") from error
