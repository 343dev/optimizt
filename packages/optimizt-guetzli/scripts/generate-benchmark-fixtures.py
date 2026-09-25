#!/usr/bin/env python3
"""Generate local JPEG fixtures used by scripts/benchmark.js.

Requires Pillow 12.3.0. Output is intentionally outside the repository.
"""

import sys
from pathlib import Path

import PIL
from PIL import Image, features

SIZES = {
    "1mp": (1000, 1000),
    "4mp": (2000, 2000),
    "8mp": (2828, 2828),
}


def assert_toolchain() -> None:
    versions = {
        "Pillow": PIL.__version__,
        "libjpeg-turbo": features.version("libjpeg_turbo"),
    }
    expected = {"Pillow": "12.3.0", "libjpeg-turbo": "3.1.4.1"}
    if versions != expected:
        raise RuntimeError(f"benchmark toolchain must be {expected}, got {versions}")


def image(width: int, height: int) -> Image.Image:
    result = Image.new("RGB", (width, height))
    pixels = result.load()
    for y in range(height):
        for x in range(width):
            pixels[x, y] = (
                (x * 3 + y) % 256,
                (y * 5 + x) % 256,
                ((x ^ y) * 7) % 256,
            )
    return result


def main() -> None:
    assert_toolchain()
    output = Path(sys.argv[1] if len(sys.argv) > 1 else ".cache/benchmarks")
    output.mkdir(parents=True, exist_ok=True)
    for name, dimensions in SIZES.items():
        image(*dimensions).save(
            output / f"{name}.jpg",
            quality=98,
            subsampling=0,
            optimize=False,
            progressive=False,
        )


if __name__ == "__main__":
    main()
