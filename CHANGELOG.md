# Changelog

## 11.0.0 (2025-05-04)

### Breaking Changes

- Replaced [imagemin/gifsicle-bin](https://github.com/imagemin/gifsicle-bin) package with [343dev/gifsicle](https://github.com/343dev/gifsicle).
- Added new configuration parameters in [.optimiztrc.cjs](.optimiztrc.cjs):
  - [optimize.gif.lossy.gamma](https://github.com/343dev/optimizt/blob/a53d5b82facf4d24a25d2e60d9dd15868e79acbf/.optimiztrc.cjs#L55)
  - [optimize.gif.lossless.gamma](https://github.com/343dev/optimizt/blob/a53d5b82facf4d24a25d2e60d9dd15868e79acbf/.optimiztrc.cjs#L62)
- Updated gifsicle to version 1.96.

### Benefits

- **Reduced Dependencies**: Total project dependencies decreased from 218 to 41.
- **Improved Platform Support**: Added arm64 binary versions for `guetzli` and `gifsicle`.

### Important Note About Gamma Parameters

The new gamma parameters were added because of changes in gifsicle 1.96. In this version:

- The `--lossy` option now measures color errors using the color space selected by `--gamma` (defaults to sRGB).
- A new algorithm for computing color differences has been implemented.
- This means `--lossy=N` will behave differently than in previous versions and may compress less than expected.
- For behavior similar to previous versions, use `--lossy=N --gamma=1`.


## 10.0.0 (2024-10-28)

Breaking Changes:

- Supported Node.js version updated to 18.18 or higher.
- Replaced “gif2webp” with “sharp” for GIF-to-WebP conversions.
- Removed the “webpGif” section from [.optimiztrc.cjs](.optimiztrc.cjs).
- Fine-tuned params in [.optimiztrc.cjs](.optimiztrc.cjs).


## 9.1.1 (2024-10-22)

- Replaced [imagemin/guetzli-bin](https://github.com/imagemin/guetzli-bin) with [343dev/guetzli](https://github.com/343dev/guetzli).


## 9.1.0 (2024-10-16)

- Disabled parallel optimization of JPEG files in Lossless mode.

Guetzli uses a huge amount of RAM. In my case, when optimizing a file of about 30 MB, one process could use up to 12 GB of memory. If there are multiple files, parallel optimization with Guetzli consumes all available RAM, causing the system to use Swap, leading to slowdowns and freezes.

For this reason I decided to disable parallel optimization of JPEG files in Lossless mode. Now, it will take more time but will have less impact on the OS performance.


## 9.0.2 (2024-10-08)

- Fixed Guetzli install.


## 9.0.1 (2024-10-08)

- Fixed installing on Windows.


## 9.0.0 (2024-10-03)

- Improved image processing workflow. Check the [migration guide](./MIGRATION.md) for details.
- Added an interactive log for image processing.
- Changed the “File already exists” message from “error” to “info,” now only shown in verbose mode.
- Added a notice that animated AVIF is not supported (unfortunately).
- Fixed the progress indicator in conversion mode. It now correctly shows the total number of items.
- Fixed output to the user directory. The original folder structure is now preserved (I hope so!).

## 8.0.0 (2024-08-05)

❤️ Thank you for using Optimizt. If you have any suggestions or feedback, please don't hesitate to [open an issue](https://github.com/343dev/optimizt/issues).

Here are the changes in this version:

- Added EXIF Orientation tag support for JPEG.
- Removed convert ratio check for AVIF and WebP.
- Improved JPEG lossless optimization process.
- Changed configuration file format to CJS.

[Migration guide](./MIGRATION.md).


## 7.0.0 (02.02.2024)

SVGO config updated.

Minimum Node.js version is set to 18.17.

Check out [migration guide](./MIGRATION.md).


## 6.0.0 (27.08.2023)

Drop support for Node.js 14.


## 5.0.1 (04.06.2023)

Fixed an [issue](https://github.com/funbox/optimizt/issues/63) with an incorrect path to the configuration file on Windows systems.


## 5.0.0 (19.05.2023)

Removed `removeOffCanvasPaths` plugin from SVGO config due to known bugs: [svg/svgo#1732](https://github.com/svg/svgo/issues/1732), [svg/svgo#1646](https://github.com/svg/svgo/issues/1646).

Removed import of `removeUnknownsAndDefaults` plugin from the default config to make it easy to redefine the config on the user side.

Check out [migration guide](./MIGRATION.md).


## 4.1.1 (27.02.2023)

Fixed installation and included the configuration file to the package.


## 4.1.0 (27.01.2023)

Added `--config` flag, which allows specifying path to file with custom settings.

See more in README.


## 4.0.0 (27.05.2022)

This package is now pure ESM.

In lossy mode, JPEG files are now processed by sharp module.


## 3.1.2 (06.05.2022)

Fixed total saved size calculation.

Added file format to the success message in conversion mode.


## 3.1.1 (08.04.2022)

Removed logging unsupported symbols in CI environment.


## 3.1.0 (04.02.2022)

Added `--output` flag, which allows output to be written to provided directory.


## 3.0.0 (31.01.2022)

Removed [pngquant-bin](https://github.com/imagemin/pngquant-bin) due to license issues.


## 2.7.5 (23.09.2021)

Fixed “Cannot find module” error that occurred if Optimizt was installed using Yarn.


## 2.7.4 (22.09.2021)

Fixed SVG processing.


## 2.7.3 (14.09.2021)

Updated project dependencies.

Optimizt now has bigger file sizes for AVIF images. See:

- <https://github.com/lovell/sharp/issues/2562>
- <https://github.com/lovell/sharp/issues/2850>


## 2.7.2 (21.06.2021)

Sometimes Optimizt could return empty JPEG files. Now it's fixed.


## 2.7.1 (18.06.2021)

Added “Differences between ‘lossy’ and ‘lossless’” section to [README.md](README.md).

Disabled cursor hiding in progress bar.


## 2.7.0 (16.06.2021)

Added display of summary.


## 2.6.1 (11.06.2021)

Fixed “Only YUV color space input jpeg is supported” error.
Now Optimizt may set sRGB color space for images before processing them.


## 2.6.0 (28.05.2021)

Spinner was replaced with a progress bar.


## 2.5.0 (08.04.2021)

Added `--force` flag to CLI, which allows creating AVIF and WebP even if output file size increased or file already exists.

Added [workflows](./workflows) directory with examples of GitHub Actions workflows.

Enabled use of [LZW compression](https://github.com/kohler/gifsicle/commit/0fd160b506ab0c4bce9f6852b494dc2b4ac9733f)
to optimize GIF files in lossy mode.


## 2.4.2 (19.02.2021)

Fixed ratio logging.


## 2.4.1 (16.02.2021)

Added Troubleshooting section to [README.md](README.md).

Added error handler for `jpegoptim` child process.


## 2.4.0 (27.01.2021)

Added AVIF support.


## 2.3.1 (25.01.2021)

Fixed GIF to WebP conversion.


## 2.3.0 (25.01.2021)

Bye-bye imagemin. Now we use optimizers directly.

Added a limit on the number of optimization tasks run simultaneously.

Fixed a bug with JPEG processing (jpegoptim could crash with some files).


## 2.2.0 (28.10.2020)

Updated dependencies.

Unpinned dependencies versions to major range.



## 2.1.0 (27.10.2020)

Added disabling coloring output when no TTY found.


## 2.0.1 (12.10.2020)

Removed unused logic from [formatBytes](lib/formatBytes.js).

Optimized [prepareFilePaths](lib/prepareFilePaths.js) function.

Updated images used in README.


## 2.0.0 (07.10.2020)

Prepared the package for publishing on GitHub.

Updated some deps, fixed small linter errors, added LICENSE.


## 1.0.1 (09.06.2020)

We continue the glorious tradition of “Publish first, think later”.

Removed useless files from the bundled package.


## 1.0.0 (18.05.2020)

First major version!

The script does everything described in [README](./README.md):

1. Compresses raster images lossy and lossless.

2. Optimizes SVG files preserving their readability.

3. Generates WebP versions while optimizing raster images.


## 0.1.0 (06.04.2020)

Init version.
