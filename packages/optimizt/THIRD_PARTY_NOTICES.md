# Third-party notices

Optimizt-authored code is licensed under the MIT License in `LICENSE`.
Bundled third-party components retain their own copyright and license terms:

- Sharp and its runtime dependencies: see `vendor/sharp/LICENSE` and
  `vendor/sharp/NOTICE`.
- Guetzli and Butteraugli: Apache License 2.0; see
  `vendor/guetzli/LICENSE`, `vendor/guetzli/THIRD_PARTY_NOTICES.md`,
  `vendor/guetzli/MUSL-COPYRIGHT`, and `vendor/guetzli/UPSTREAM.md`.
- Gifsicle: the bundled runtime is distributed under the alternative license
  offered by its author. The original upstream licensing text, including that
  alternative and GPLv2-only options, is in
  `vendor/gifsicle/GIFSICLE-LICENSE.md`; the GPLv2 text is in
  `vendor/gifsicle/LICENSE`. See also `vendor/gifsicle/MUSL-COPYRIGHT`.
- Generated Emscripten runtime code, musl libc code linked into WebAssembly,
  and other runtime portions retain the notices in the corresponding
  `vendor/*/THIRD_PARTY_NOTICES.md` files.

The immutable location of the complete corresponding source for the bundled
Gifsicle WebAssembly binary is recorded in `vendor/gifsicle/SOURCE.md`.
