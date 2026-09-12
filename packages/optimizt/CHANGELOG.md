# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added Guetzli WebAssembly memory64 support for JPEG processing beyond the 4 GiB wasm32 address-space limit.
- Added deterministic operation planning before configuration loading or image processing. Optimizt now validates explicit operands, directory traversal, output mappings, path containment, collisions, generated filenames, symbolic links, and hard links before changing image files.
- Added atomic image replacement with `write-file-atomic`. Completed writes are synchronized before replacement and preserve existing file modes and, when permitted, ownership.
- Added `--no-color` and `--debug` flags. Debug output includes stack traces and Optimizt and Node.js versions without printing environment variables or configuration contents.
- Added bounded handling for `SIGINT` and `SIGTERM`, including conventional POSIX exit statuses, termination of active external encoders, and a five-second forced-shutdown limit.
- Added process-level CLI tests that pass arguments without shell interpretation and verify exit status, `stdout`, `stderr`, and filesystem effects.
- Added a Windows CI job using the minimum supported Node.js version.

### Changed

- **BREAKING:** Guetzli now uses wasm64 and requires Node.js 24.0.0 or newer.
- **BREAKING:** Processing now exits with status `1` when argument validation, filesystem preflight, configuration loading, or any image operation fails. Independent valid operations continue after runtime failures, and valid empty directories remain successful no-ops.
- **BREAKING:** Human-readable status, progress, warnings, errors, and summaries now use `stderr`. `stdout` is reserved for help and version output and remains empty during normal image processing.
- **BREAKING:** Missing or inaccessible explicit operands and explicitly supplied files with unsupported extensions now fail instead of being silently ignored. Unsupported files discovered while traversing directories remain ignored.
- **BREAKING:** `--force` is now rejected unless `--avif` or `--webp` is selected.
- **BREAKING:** Prefixes, suffixes, and generated filenames are validated and rejected when unsafe instead of being silently sanitized.
- **BREAKING:** A custom CJS configuration must now define an object for the selected mode. A missing or misspelled section fails instead of silently leaving every codec on its own defaults. As before, a custom configuration replaces the bundled one for that mode rather than merging with it.
- Changed progress totals to count output operations, so converting one image to both AVIF and WebP counts as two operations. Animated progress and terminal decoration are now enabled only for a capable `stderr` TTY; `NO_COLOR` and `TERM=dumb` are honored.
- Changed summaries to name only the outcomes that occurred: processed, skipped, failed, and the operations an interruption left undone. Work abandoned while shutting down counts as not started rather than failed.
- Changed size reporting so optimization savings include only written operations, while conversion summaries report created bytes.
- Changed verbose output to report operands and discovered inputs omitted as duplicates.
- Changed runtime failure reporting to print each failure once in deterministic operation-plan order.
- Clarified configuration errors by distinguishing missing files, non-file paths, inspection failures, loading failures, and missing mode sections.
- Clarified codec failures by naming the mode, format, and configuration file behind the attempt while keeping the codec's own reason.
- Updated GitHub Actions examples to use supported action and Node.js versions and pass changed filenames as separate shell arguments.
- Updated the Docker example to run with the host user's UID and GID so generated files are not owned by root.
- Documented how images are written: atomic replacement, preserved modes and ownership, link handling, and the absence of a durability guarantee after sudden power loss.
- Documented that discovered CJS configuration executes with the current user's permissions and that JPEG processing in Lossless mode uses Guetzli and is not strictly lossless.

### Fixed

- Fixed successful exit statuses after image-processing failures and unhandled asynchronous failures.
- Fixed partial or corrupted targets caused by direct writes by atomically replacing complete temporary files.
- Fixed nondeterministic output when multiple inputs map to the same target by rejecting collisions during preflight.
- Fixed animated progress and ANSI control sequences appearing in redirected output.
- Fixed conversion summaries that described retained source images as disk savings.
- Fixed interrupted runs that started an external encoder after the interrupt arrived, which delayed the summary until the forced five-second exit.
- Fixed an output whose existing parent is a file reporting a raw `ENOTDIR` instead of naming the offending path.

### Removed

- Removed the `fdir` dependency along with the path-preparation modules replaced by operation planning.

## [13.0.0] - 2026-06-27

### Changed

- **BREAKING:** Increased the minimum Node.js version to 22.22.1 (required by `lint-staged`).
- **BREAKING:** Restricted package exports so Optimizt is only exposed as a CLI package.
- Pinned the Docker base image to `node:22.22.1-alpine3.23` for reproducible builds.
- Replaced `simple-git-hooks` with versioned hooks in `.githooks`; contributors working on Optimizt code can run `npm run enable-git-hooks` after cloning to configure `core.hooksPath`.
- Updated dependencies no longer ship `postinstall` scripts, following the ecosystem move away from dependency lifecycle scripts in npm and other package managers (see [npm RFC #868](https://github.com/npm/rfcs/pull/868)).

### Removed

- Removed the `gcompat` package from the Docker image build.

## [12.1.1] - 2026-01-02

### Changed

- Updated `@343dev/gifsicle` and `@343dev/guetzli` packages, which now allow Optimizt to work on Alpine Linux without installing additional packages. Previously, the `gcompat` package was required as the `guetzli` and `gifsicle` binaries were built for glibc-based systems, which is absent on Alpine Linux.

## [12.1.0] - 2025-12-24

### Added

- Added `--prefix` and `--suffix` flags to add custom prefixes and suffixes to optimized file names.

### Changed

- Updated log output to display output filenames instead of input filenames.

## [12.0.0] - 2025-12-23

### Added

- Configure trusted publishing for npm package to enhance security by eliminating token-based publishing risks (see [npm trusted publishers](https://docs.npmjs.com/trusted-publishers)).

### Changed

- **BREAKING:** Increase minimum Node.js version to 20.19.0 due to dependency requirements.
- **BREAKING:** Update SVGO config in default [.optimiztrc.cjs](.optimiztrc.cjs) to migrate from v3 to v4 (see [migration guide](./MIGRATION.md)).
- Update all dependencies to latest versions with a 7-day cooling period and fix versions to prevent security vulnerabilities during installations.

## [11.0.0] - 2025-05-04

### Added

- Added new configuration parameters in [.optimiztrc.cjs](.optimiztrc.cjs):
  - [optimize.gif.lossy.gamma](https://github.com/343dev/optimizt/blob/a53d5b82facf4d24a25d2e60d9dd15868e79acbf/.optimiztrc.cjs#L55)
  - [optimize.gif.lossless.gamma](https://github.com/343dev/optimizt/blob/a53d5b82facf4d24a25d2e60d9dd15868e79acbf/.optimiztrc.cjs#L62)
- Improved Platform Support: Added arm64 binary versions for `guetzli` and `gifsicle`.

### Changed

- Replaced [imagemin/gifsicle-bin](https://github.com/imagemin/gifsicle-bin) package with [343dev/gifsicle](https://github.com/343dev/gifsicle).
- Updated gifsicle to version 1.96.
- Reduced Dependencies: Total project dependencies decreased from 218 to 41.

  The new gamma parameters were added because of changes in gifsicle 1.96. In this version:

  - The `--lossy` option now measures color errors using the color space selected by `--gamma` (defaults to sRGB).
  - A new algorithm for computing color differences has been implemented.
  - This means `--lossy=N` will behave differently than in previous versions and may compress less than expected.
  - For behavior similar to previous versions, use `--lossy=N --gamma=1`.

## [10.0.0] - 2024-10-28

### Changed

- Supported Node.js version updated to 18.18 or higher.
- Replaced "gif2webp" with "sharp" for GIF-to-WebP conversions.
- Fine-tuned params in [.optimiztrc.cjs](.optimiztrc.cjs).

### Removed

- Removed the "webpGif" section from [.optimiztrc.cjs](.optimiztrc.cjs).

## [9.1.1] - 2024-10-22

### Changed

- Replaced [imagemin/guetzli-bin](https://github.com/imagemin/guetzli-bin) with [343dev/guetzli](https://github.com/343dev/guetzli).

## [9.1.0] - 2024-10-16

### Changed

- Disabled parallel optimization of JPEG files in Lossless mode.

  Guetzli uses a huge amount of RAM. In my case, when optimizing a file of about 30 MB, one process could use up to 12 GB of memory. If there are multiple files, parallel optimization with Guetzli consumes all available RAM, causing the system to use Swap, leading to slowdowns and freezes.

  For this reason I decided to disable parallel optimization of JPEG files in Lossless mode. Now, it will take more time but will have less impact on the OS performance.

## [9.0.2] - 2024-10-08

### Fixed

- Fixed Guetzli install.

## [9.0.1] - 2024-10-08

### Fixed

- Fixed installing on Windows.

## [9.0.0] - 2024-10-03

### Added

- Added an interactive log for image processing.
- Added a notice that animated AVIF is not supported (unfortunately).

### Changed

- Improved image processing workflow. Check the [migration guide](./MIGRATION.md) for details.
- Changed the "File already exists" message from "error" to "info," now only shown in verbose mode.

### Fixed

- Fixed the progress indicator in conversion mode. It now correctly shows the total number of items.
- Fixed output to the user directory. The original folder structure is now preserved (I hope so!).

## [8.0.0] - 2024-08-05

### Added

- Added EXIF Orientation tag support for JPEG.

### Changed

- Improved JPEG lossless optimization process.
- Changed configuration file format to CJS.

### Removed

- Removed convert ratio check for AVIF and WebP.

## [7.0.0] - 2024-02-02

### Changed

- SVGO config updated.
- Minimum Node.js version is set to 18.17.

## [6.0.0] - 2023-08-27

### Removed

- Drop support for Node.js 14.

## [5.0.1] - 2023-06-04

### Fixed

- Fixed an [issue](https://github.com/funbox/optimizt/issues/63) with an incorrect path to the configuration file on Windows systems.

## [5.0.0] - 2023-05-19

### Removed

- Removed `removeOffCanvasPaths` plugin from SVGO config due to known bugs: [svg/svgo#1732](https://github.com/svg/svgo/issues/1732), [svg/svgo#1646](https://github.com/svg/svgo/issues/1646).
- Removed import of `removeUnknownsAndDefaults` plugin from the default config to make it easy to redefine the config on the user side.

## [4.1.1] - 2023-02-27

### Fixed

- Fixed installation and included the configuration file to the package.

## [4.1.0] - 2023-01-27

### Added

- Added `--config` flag, which allows specifying path to file with custom settings.

## [4.0.0] - 2022-05-27

### Changed

- This package is now pure ESM.
- In lossy mode, JPEG files are now processed by sharp module.

## [3.1.2] - 2022-05-06

### Added

- Added file format to the success message in conversion mode.

### Fixed

- Fixed total saved size calculation.

## [3.1.1] - 2022-04-08

### Removed

- Removed logging unsupported symbols in CI environment.

## [3.1.0] - 2022-02-04

### Added

- Added `--output` flag, which allows output to be written to provided directory.

## [3.0.0] - 2022-01-31

### Removed

- Removed [pngquant-bin](https://github.com/imagemin/pngquant-bin) due to license issues.

## [2.7.5] - 2021-09-23

### Fixed

- Fixed "Cannot find module" error that occurred if Optimizt was installed using Yarn.

## [2.7.4] - 2021-09-22

### Fixed

- Fixed SVG processing.

## [2.7.3] - 2021-09-14

### Changed

- Updated project dependencies.
- Optimizt now has bigger file sizes for AVIF images. See:
  - <https://github.com/lovell/sharp/issues/2562>
  - <https://github.com/lovell/sharp/issues/2850>

## [2.7.2] - 2021-06-21

### Fixed

- Sometimes Optimizt could return empty JPEG files. Now it's fixed.

## [2.7.1] - 2021-06-18

### Added

- Added "Differences between 'lossy' and 'lossless'" section to [README.md](README.md).

### Changed

- Disabled cursor hiding in progress bar.

## [2.7.0] - 2021-06-16

### Added

- Added display of summary.

## [2.6.1] - 2021-06-11

### Fixed

- Fixed "Only YUV color space input jpeg is supported" error. Now Optimizt may set sRGB color space for images before processing them.

## [2.6.0] - 2021-05-28

### Changed

- Spinner was replaced with a progress bar.

## [2.5.0] - 2021-04-08

### Added

- Added `--force` flag to CLI, which allows creating AVIF and WebP even if output file size increased or file already exists.
- Added [workflows](./workflows) directory with examples of GitHub Actions workflows.

### Changed

- Enabled use of [LZW compression](https://github.com/kohler/gifsicle/commit/0fd160b506ab0c4bce9f6852b494dc2b4ac9733f) to optimize GIF files in lossy mode.

## [2.4.2] - 2021-02-19

### Fixed

- Fixed ratio logging.

## [2.4.1] - 2021-02-16

### Added

- Added Troubleshooting section to [README.md](README.md).
- Added error handler for `jpegoptim` child process.

## [2.4.0] - 2021-01-27

### Added

- Added AVIF support.

## [2.3.1] - 2021-01-25

### Fixed

- Fixed GIF to WebP conversion.

## [2.3.0] - 2021-01-25

### Added

- Added a limit on the number of optimization tasks run simultaneously.

### Changed

- Bye-bye imagemin. Now we use optimizers directly.

### Fixed

- Fixed a bug with JPEG processing (jpegoptim could crash with some files).

## [2.2.0] - 2020-10-28

### Changed

- Updated dependencies.
- Unpinned dependencies versions to major range.

## [2.1.0] - 2020-10-27

### Added

- Added disabling coloring output when no TTY found.

## [2.0.1] - 2020-10-12

### Changed

- Removed unused logic from [formatBytes](lib/formatBytes.js).
- Optimized [prepareFilePaths](lib/prepareFilePaths.js) function.
- Updated images used in README.

## [2.0.0] - 2020-10-07

### Changed

- Prepared the package for publishing on GitHub.
- Updated some deps, fixed small linter errors, added LICENSE.

## [1.0.1] - 2020-06-09

### Changed

- Removed useless files from the bundled package.

## [1.0.0] - 2020-05-18

### Added

- The script does everything described in [README](./README.md):
  1. Compresses raster images lossy and lossless.
  2. Optimizes SVG files preserving their readability.
  3. Generates WebP versions while optimizing raster images.

### Changed

- First major version!

## [0.1.0] - 2020-04-06

### Added

- Init version.
