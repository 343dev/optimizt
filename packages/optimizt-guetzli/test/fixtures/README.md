# JPEG fixtures

The fixtures are intentionally small because Guetzli is CPU- and memory-intensive. Their byte hashes are part of `test/parity-manifest.json`.

## Reproducible fixtures

Run the generator with the exact toolchain:

```sh
python3 -m venv .cache/fixtures-venv
.cache/fixtures-venv/bin/pip install Pillow==12.3.0
.cache/fixtures-venv/bin/python scripts/generate-fixtures.py
```

The generator rejects other versions. The pinned wheel used for the baseline contains Pillow 12.3.0 and libjpeg-turbo 3.1.4.1.

| Fixture | Purpose |
| --- | --- |
| `rgb-444.jpg` | Baseline YCbCr 4:4:4 JPEG |
| `rgb-420.jpg` | Baseline YCbCr 4:2:0 JPEG |
| `progressive-420.jpg` | Progressive YCbCr 4:2:0 JPEG |
| `metadata-444.jpg` | 4:4:4 JPEG with EXIF and ICC APP segments; Guetzli removes them |
| `grayscale-ycbcr.jpg` | Supported three-component YCbCr JPEG with grayscale pixel content |
| `grayscale-single-component.jpg` | Well-formed but unsupported single-component grayscale JPEG |
| `invalid.jpg` | Malformed input |

The generated pixel patterns are defined in `scripts/generate-fixtures.py`. Do not edit the JPEG bytes manually.

## Floating-point boundary fixture

`floating-point-boundary-444.jpg` is an immutable regression artifact. It was produced on Linux arm64 from the same 96×64 RGB pixel pattern as the baseline RGB fixture, using:

- sharp 0.35.4;
- libvips 8.18.6;
- mozjpeg revision `0826579`;
- JPEG quality 98;
- 4:4:4 chroma subsampling.

Its SHA-256 is:

```text
5a9d67c90a42940b4159e4c99423436af00c4bcb43d03fae09071b31561dba25
```

At Guetzli quality 95, this input causes a small, investigated floating-point divergence between the canonical native reference and WebAssembly. It is retained specifically to prevent that difference from being hidden by fixtures that happen to produce byte parity. Do not regenerate it with a newer sharp or libvips release; changing the input requires a new parity investigation.
