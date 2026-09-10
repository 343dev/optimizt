# Third-party notices

## Gifsicle

This package contains Gifsicle 1.96 and LCDF GIF library source by Eddie Kohler
and other contributors. Gifsicle is distributed under the GNU General Public
License, version 2. The complete corresponding source is in
`upstream/gifsicle/`, its integration changes are in
`upstream/gifsicle-wasm.patch`, and the license text is available in both
`LICENSE` and `upstream/gifsicle/COPYING`.

## Emscripten runtime

The committed files in `dist/` contain generated Emscripten runtime code.
Emscripten is distributed under the MIT license and the University of Illinois
Open Source License. Its notices and license terms are available from
<https://github.com/emscripten-core/emscripten/blob/6.0.9/LICENSE>.

The exact Emscripten release and emsdk commit used to generate the distribution
are pinned in `scripts/setup-emsdk.sh`. Emscripten itself is build tooling and
is not installed or downloaded when this package is installed.
