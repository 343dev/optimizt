# Migration

## 7.0.2 → 8.0.0

Optimizt now checks for the EXIF Orientation tag before processing images and rotates the resulting image accordingly.

The compression ratio check has been removed when converting images to AVIF and WebP formats. The `--force` flag is now only used to overwrite existing files.

The lossless optimization process for JPEG images has been improved. Optimization is done by Guetzli, but necessary transformations are applied first using Sharp. This includes converting the color space to sRGB and rotating the image based on the EXIF orientation tag. And the image quality used to degrade after [passing through Sharp](https://github.com/lovell/sharp/issues/2453) because the default quality setting for JPEG was 80. Starting with this version, the quality is set to 100, which should improve the image quality and slightly increase its size compared to previous versions.

The [.optimiztrc](.optimiztrc.cjs) file format has been changed from ESM to CJS. This should make it easier to link an external configuration file using the `--config` flag.


## 6.0.0 → 7.0.0

Previously, when working with SVGO, a custom version of `removeUnknownsAndDefaults` plugin was used, which did not
remove `stroke="none"` during SVG optimization. This was due to the specific configuration of dev environment.

Dev environment support is no longer needed, so the default plugin version is used instead of the custom one. But
if you still need to preserve `stroke="none"` in your files, you can try replacing it with `stroke-width="0"`.

Also, Node.js version must now be 18.17 or higher. So, please make sure you have the right version before update.


## 5.0.2 → 6.0.0

Drop support for Node.js 14.

Please make sure you have the right version (>=16.14.0) of Node.js installed.


## 4.1.1 → 5.0.0

First, `removeOffCanvasPaths` SVGO plugin has been removed, so make sure that all your SVG files are optimized correctly by Optimizt v5.
It's possible that you encounter structure changes in the SVGs code, but there should not be any visual changes.

Last, if you were using your own config file and monkey-patched import of `removeUnknownsAndDefaults` plugin, now you should not do it.
Instead use string literal `'removeUnknownsAndDefaultsPATCHED'` in `optimize.svg.plugin` array of the config. Check out the default config to make sure that you're doing everything right.


## 3.1.2 → 4.0.0

Drop Node.js v12 support.

Please make sure you have the right version (>=14.14) of Node.js installed.

[sharp](README.md#jpeg) module is now used to process JPEG files.

The size of JPEG files and their visual quality may differ from files processed with older versions of Optimizt.


## 2.7.5 → 3.0.0

[sharp](README.md#png) module is now used to process PNG files.

The size of PNG files and their visual quality may differ from files processed with older versions of Optimizt.

Also, when you process PNG files in lossless mode, Optimizt will now try to preserve the original visual quality of
the image.


## 1.0.1 → 2.0.0

There were no any breaking changes.

The version was bumped due to adding LICENSE file and publishing to GitHub.
