# Migration

## 11.0.0 → 12.0.0

The SVGO configuration has been updated to be compatible with SVGO v4 (see [migration guide](https://svgo.dev/docs/migrations/migration-from-v3-to-v4/)). If you use a custom [.optimiztrc.cjs](.optimiztrc.cjs) file, update your SVG plugins configuration to match the new format.

See the changes in commit [8c1215e](https://github.com/343dev/optimizt/commit/8c1215e2441ce03770d36d5c7ae31e28e9ef5659):

```diff
diff --git a/.optimiztrc.cjs b/.optimiztrc.cjs
index ca611d2..148dcd4 100644
--- a/.optimiztrc.cjs
+++ b/.optimiztrc.cjs
@@ -71,14 +71,8 @@ module.exports = {
 				indent: 2,
 			},
 			plugins: [
-				{
-					name: 'preset-default',
-					params: {
-						overrides: {
-							removeViewBox: false,
-						},
-					},
-				},
+				'preset-default',
+				'removeTitle',
 				'cleanupListOfValues',
 				'convertStyleToAttrs',
 				'reusePaths',
```

## 10.0.0 → 11.0.0

If you use an external configuration file (`.optimiztrc.cjs`), add the following parameters with a value of `1` to preserve the previous behavior:

- [optimize.gif.lossy.gamma](https://github.com/343dev/optimizt/blob/a53d5b82facf4d24a25d2e60d9dd15868e79acbf/.optimiztrc.cjs#L55)
- [optimize.gif.lossless.gamma](https://github.com/343dev/optimizt/blob/a53d5b82facf4d24a25d2e60d9dd15868e79acbf/.optimiztrc.cjs#L62)


## 9.1.1 → 10.0.0

Node.js version must be 18.18 or higher.

The “sharp” module now replaces “gif2webp” for converting GIFs to WebP. Consequently, the “webpGif” section in [.optimiztrc.cjs](.optimiztrc.cjs) has been replaced with a “webp” section. If you use a custom configuration file, please remove any “webpGif” section.

Default settings in Optimizt’s configuration have been updated. Note that in lossless mode, image processing times may increase slightly, but resulting file sizes are expected to be smaller compared to previous versions.


## 8.0.1 → 9.0.0

The main change in the new version is how Optimizt handles file processing. Before, the result was stored in memory until all files were processed. This could cause the app to crash if it ran out of memory, leading to a loss of optimization results. Now, each file is processed one by one, and the result is saved to disk immediately. Logging events also happen in real-time, instead of waiting until all files are done.

Previously, if you tried to create an AVIF or WebP file that already existed, an error message would appear in the log. Now, it shows an informational message, but only if you use the `--verbose` option.

To handle AVIF files, Optimizt uses the [sharp](https://sharp.pixelplumbing.com) module, which uses the libheif library. However, libheif [doesn't support](https://github.com/strukturag/libheif/issues/377) converting to animated AVIF (AVIS). In earlier versions, Optimizt would quietly convert animated GIFs into static AVIF. But from this version, an error will show up if you try to do this.

The logic for creating file structures when using the `--output` option has also changed. Now, the original file structure will be recreated inside the output folder, starting from the folder passed to the app. Who knows how this worked before, but hopefully, it works better now!


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
