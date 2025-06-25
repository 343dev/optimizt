# @343dev/optimizt

<img align="right" width="192" height="192"
     alt="Optimizt logo: OK hand sign with Mona Lisa image between the fingers"
     src="./docs/logo.png">

[![npm](https://img.shields.io/npm/v/@343dev/optimizt.svg)](https://www.npmjs.com/package/@343dev/optimizt)

**Optimizt** is a command-line tool that helps prepare images for the web.

It can compress PNG, JPEG, GIF, and SVG lossy or lossless, and create AVIF and WebP versions for raster images.

## Rationale

As frontend developers, we have to care about pictures: compress PNG and JPEG, remove useless parts of SVG, create AVIF and WebP for modern browsers, and so on. One day, we got tired of using a bunch of apps for that, and created one tool that does everything we want.

## Usage

Install:

```sh
npm install -g @343dev/optimizt
```

Optimize!

```sh
optimizt path/to/picture.jpg
```

## Command Line Flags

- `--avif` — create AVIF versions of images.
- `--webp` — create WebP versions of images.
- `-f, --force` — recreate AVIF and WebP versions even if they already exist.
- `-l, --lossless` — optimize losslessly instead of lossily.
- `-v, --verbose` — show detailed output (e.g. skipped files).
- `-c, --config` — use a custom configuration file instead of the default.
- `-o, --output` — write results to the specified directory.
- `-V, --version` — display the tool version.
- `-h, --help` — show help message.

## Usage Examples

```bash
# optimize a single image
optimizt path/to/picture.jpg

# optimize multiple images losslessly
optimizt --lossless path/to/picture.jpg path/to/another/picture.png

# recursively create AVIF and WebP versions for all images in a directory
optimizt --avif --webp path/to/directory

# recursively optimize JPEG files in the current directory
find . -iname \*.jpg -exec optimizt {} +
```

## Differences Between Lossy and Lossless

### Lossy (Default)

Provides the best balance between file size reduction and minimal visual quality loss.

### Lossless (`--lossless` flag)

- **AVIF/WebP**: Uses lossless compression.
- **PNG/JPEG/GIF**: Maximizes image quality at the expense of larger file sizes.
- **SVG**: Settings are identical in both modes.

## Configuration

Image processing leverages:

- [sharp](https://github.com/lovell/sharp) for [JPEG](https://sharp.pixelplumbing.com/api-output#jpeg), [PNG](https://sharp.pixelplumbing.com/api-output#png), [WebP](https://sharp.pixelplumbing.com/api-output#webp), and [AVIF](https://sharp.pixelplumbing.com/api-output#avif).
- [svgo](https://github.com/svg/svgo) for SVG.
- [gifsicle](https://github.com/kohler/gifsicle) for GIF.

> [!NOTE]
> In Lossless mode for JPEG, [Guetzli](https://github.com/google/guetzli) is used. Repeated optimization may degrade visual quality.

Default settings are defined in [.optimiztrc.cjs](./.optimiztrc.cjs), which includes all supported parameters. Disable any parameter by setting it to `false`.

When using `--config path/to/.optimiztrc.cjs`, the specified configuration file will be used. If no `--config` is provided, Optimizt searches recursively from the current directory upward for `.optimiztrc.cjs`. If none is found, defaults are applied.

## Troubleshooting

### Errors like “spawn guetzli ENOENT”.

Ensure the [ignore-scripts](https://docs.npmjs.com/cli/v6/using-npm/config#ignore-scripts) npm option is disabled.
Details: [funbox/optimizt/issues/9](https://github.com/funbox/optimizt/issues/9).

## Docker

### Pre-Built Image

```bash
# pull latest
docker pull 343dev/optimizt

# pull specific version
docker pull 343dev/optimizt:9.0.2
```

### Manual Build

```bash
# clone repository
git clone https://github.com/343dev/optimizt.git
cd optimizt

# build image
docker build --tag 343dev/optimizt .
```

Alternatively:

```bash
# build directly from GitHub
# ignores .dockerignore (see: https://github.com/docker/cli/issues/2827)
docker build --tag 343dev/optimizt https://github.com/343dev/optimizt.git
```

### Run Container

```bash
# mount current directory to /src in the container
docker run --rm --volume $(pwd):/src 343dev/optimizt --webp ./image.png
```

## Integrations

Optimizt works seamlessly with:

- [JetBrains IDEs](./docs/jetbrains.md)
- [Visual Studio Code](./docs/vscode.md)
- [Sublime Text 3](./docs/sublime-text.md)
- [GitHub Actions Workflow](./docs/github.md)

## Articles

- [anuwong.com](https://anuwong.com/blog/2023-08-21-save-tons-of-gbs-with-optimizt/) — Compress files before uploading, save tons of GBs. 🇹🇭
- [Linux Format, Issue 277 (July 2021)](https://www.linuxformat.com/archives?issue=277#:~:text=Kitchen%20Tales%2C%20zFRAG%2C-,Optimizt,-and%20SingleFileZ.) — Optimizt is ideal for reducing the disk footprint of images without any reduction in quality.

## Credits

Cute picture for the project was made by [Igor Garybaldi](http://pandabanda.com/).
