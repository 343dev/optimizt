# @343dev/optimizt

<img align="right" width="192" height="192"
     alt="Optimizt avatar: OK sign with Mona Lisa picture between the fingers"
     src="./docs/logo.png">

[![npm](https://img.shields.io/npm/v/@343dev/optimizt.svg)](https://www.npmjs.com/package/@343dev/optimizt)

**Optimizt** is a command-line tool that helps prepare images for the web.

It can compress PNG, JPEG, GIF and SVG lossy and lossless, and also create AVIF and WebP versions for raster images.

[По-русски](./README.ru.md)

## Rationale

As frontend developers, we have to care about pictures: compress PNG and JPEG, remove useless parts of SVG, create AVIF and WebP for modern browsers, and so on. One day, we got tired of using a bunch of apps for that, and created one tool that does everything we want.

## Usage

Install:

```sh
npm i -g @343dev/optimizt
```

Optimize!

```sh
optimizt path/to/picture.jpg
```

## Command line flags

- `--avif` — create AVIF versions of images.
- `--webp` — create WebP versions of images.
- `-f, --force` — recreate AVIF and WebP versions if the file already exists.
- `-l, --lossless` — optimize losslessly instead of lossily.
- `-v, --verbose` — show more details during the process (e.g. skipped files).
- `-c, --config` — use a provided configuration file instead of the default one.
- `-o, --output` — write result to provided directory.
- `-V, --version` — show the tool version.
- `-h, --help` — show help.

## Usage Examples

```bash
# optimize one image
optimizt path/to/picture.jpg

# optimize several images losslessly
optimizt --lossless path/to/picture.jpg path/to/another/picture.png

# recursively create AVIF and WebP versions for images in a directory
optimizt --avif --webp path/to/directory

# recursively optimize JPEG files in the current directory
find . -iname \*.jpg -exec optimizt {} +
```

## Differences between Lossy and Lossless

### Lossy (default)

Gives the best balance between compression and minimal visual changes.

### Lossless (with `--lossless` flag)

When creating AVIF and WebP, it uses lossless compression. For PNG, JPEG, and GIF optimization, it maximizes image quality at the cost of larger file size.

For SVG files, the settings in Lossy and Lossless modes are identical.

## Configuration

Image processing is done using [sharp](https://github.com/lovell/sharp) for [JPEG](https://sharp.pixelplumbing.com/api-output#jpeg), [PNG](https://sharp.pixelplumbing.com/api-output#png), [WebP](https://sharp.pixelplumbing.com/api-output#webp), and [AVIF](https://sharp.pixelplumbing.com/api-output#avif), while SVG is processed by [svgo](https://github.com/svg/svgo).

For GIF, [gifsicle](https://github.com/kohler/gifsicle) is used.

> [!NOTE]
> In Lossless mode for JPEG, we use [Guetzli](https://github.com/google/guetzli), which offers high level of compression with good visual quality. However, repeated optimization may degrade visual quality.

The default settings are located in [.optimiztrc.cjs](./.optimiztrc.cjs), and the file contains a list of supported parameters and their brief description.

To disable any parameter, use the value `false`.

When running with the `--config path/to/.optimiztrc.cjs` flag, the settings from the specified configuration file will be used for image processing.

If no `--config` flag is provided, a recursive search for the `.optimiztrc.cjs` file will be performed, starting from the current directory up to the root of the file system. If the file is not found, the default settings will be applied.

## Troubleshooting

### “spawn guetzli ENOENT”, etc.

Make sure that the [ignore-scripts](https://docs.npmjs.com/cli/v6/using-npm/config#ignore-scripts) option is not enabled.

Details: [funbox/optimizt/issues/9](https://github.com/funbox/optimizt/issues/9).

### “pkg-config: command not found”, “fatal error: 'png.h' file not found”, etc.

Some OS may lack necessary libraries. Install them manually.

Example for macOS using [Homebrew](https://brew.sh):

```bash
brew install pkg-config libpng
```

## Docker

### Using a pre-built image

```bash
# pull by name
docker pull 343dev/optimizt

# pull by name and version
docker pull 343dev/optimizt:9.0.2
```

### Build the image manually

```bash
# clone the Optimizt repository
git clone https://github.com/343dev/optimizt.git

# go to the repository folder
cd optimizt

# build the image
docker build --tag 343dev/optimizt .
```

OR:

```bash
# build the image without cloning the repository
# in this case “.dockerignore” file will be ignored; see: https://github.com/docker/cli/issues/2827
docker build --tag 343dev/optimizt https://github.com/343dev/optimizt.git
```

### Running the container

```bash
# inside the container, WORKDIR is set to `/src`, so all paths will resolve from there
docker run --rm --volume $(pwd):/src 343dev/optimizt --webp ./image.png
```

## Integrations

- [JetBrains IDEs](./docs/jetbrains.md)
- [Visual Studio Code](./docs/vscode.md)
- [Sublime Text 3](./docs/sublime-text.md)
- [GitHub Actions Workflow](./docs/github.md)

## Credits

Cute picture for the project was made by [Igor Garybaldi](http://pandabanda.com/).
