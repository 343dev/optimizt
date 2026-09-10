#!/usr/bin/env python3
"""Generate the reproducible JPEG parity fixtures.

Requires Pillow 12.3.0. The immutable floating-point boundary fixture is not
created here; see test/fixtures/README.md.
"""

from pathlib import Path

import PIL
from PIL import Image, features

WIDTH = 96
HEIGHT = 64
FIXTURES = Path(__file__).resolve().parents[1] / "test" / "fixtures"


def assert_toolchain() -> None:
    versions = {
        "Pillow": PIL.__version__,
        "libjpeg-turbo": features.version("libjpeg_turbo"),
    }
    expected = {"Pillow": "12.3.0", "libjpeg-turbo": "3.1.4.1"}
    if versions != expected:
        raise RuntimeError(f"fixture toolchain must be {expected}, got {versions}")


def rgb_image() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT))
    pixels = image.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            pixels[x, y] = ((x * 3) % 256, (y * 5) % 256, ((x ^ y) * 7) % 256)
    return image


def grayscale_image() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT))
    pixels = image.load()
    for y in range(HEIGHT):
        for x in range(WIDTH):
            value = (x * 3 + y * 5) % 256
            pixels[x, y] = (value, value, value)
    return image


def save(image: Image.Image, name: str, **options: object) -> None:
    image.save(
        FIXTURES / name,
        quality=98,
        optimize=False,
        progressive=False,
        **options,
    )


def main() -> None:
    assert_toolchain()
    FIXTURES.mkdir(parents=True, exist_ok=True)

    rgb = rgb_image()
    save(rgb, "rgb-444.jpg", subsampling=0)
    save(rgb, "rgb-420.jpg", subsampling=2)
    rgb.save(
        FIXTURES / "progressive-420.jpg",
        quality=98,
        subsampling=2,
        optimize=False,
        progressive=True,
    )
    save(
        rgb,
        "metadata-444.jpg",
        subsampling=0,
        exif=b"Exif\0\0fixture metadata",
        icc_profile=b"fixture ICC profile",
    )

    grayscale = grayscale_image()
    save(grayscale, "grayscale-ycbcr.jpg", subsampling=2)
    save(grayscale.convert("L"), "grayscale-single-component.jpg")
    (FIXTURES / "invalid.jpg").write_bytes(b"not a jpeg")


if __name__ == "__main__":
    main()
