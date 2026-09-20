# @343dev/optimizt

<img align="right" width="176" height="176"
     alt="Optimizt logo: OK hand sign with Mona Lisa image between the fingers"
     src="./docs/logo.png">

[![NPM Downloads](https://img.shields.io/npm/dw/%40343dev%2Foptimizt)](https://www.npmjs.com/package/@343dev/optimizt)
[![npm](https://img.shields.io/npm/v/@343dev/optimizt.svg)](https://www.npmjs.com/package/@343dev/optimizt)
[![Docker](https://img.shields.io/docker/v/343dev/optimizt?label=Docker)](https://hub.docker.com/r/343dev/optimizt)

**Optimizt** is a command-line tool that helps prepare images for the web.

It compresses PNG, JPEG, GIF, and SVG files and creates AVIF and WebP versions of raster images.

## Why Optimizt?

I built Optimizt because preparing images for the web meant switching between several tools. I wanted one command to compress images, clean up SVGs, and create AVIF and WebP versions.

## Usage

Install Optimizt:

```sh
npm install -g @343dev/optimizt
```

Optimize an image in place:

```sh
optimizt path/to/picture.jpg
```

This command can replace the original file. To keep it, use `--output` with a separate, existing directory.

## Command-line options

| Option | Description |
| --- | --- |
| `--avif` | Create AVIF versions of images. |
| `--webp` | Create WebP versions of images. |
| `-f, --force` | Replace existing AVIF and WebP versions. |
| `-l, --lossless` | Use the lossless profile. JPEG compression is still lossy. |
| `-v, --verbose` | Show detailed output, including skipped files. |
| `-c, --config <path>` | Use a custom configuration file instead of the bundled defaults. |
| `-o, --output <path>` | Write results to an existing directory. |
| `-p, --prefix <text>` | Add a prefix to output file names. |
| `-s, --suffix <text>` | Add a suffix to output file names. |
| `-V, --version` | Show the version. |
| `-h, --help` | Show help. |

## Examples

```bash
# optimize a single image
optimizt path/to/picture.jpg

# optimize multiple images with the lossless profile
optimizt --lossless path/to/picture.jpg path/to/another/picture.png

# recursively create AVIF and WebP versions for all images in a directory
optimizt --avif --webp path/to/directory

# recursively optimize JPEG files in the current directory
find . -iname \*.jpg -exec optimizt {} +
```

## Lossy and lossless modes

### Lossy (default)

Optimizt uses lossy compression to reduce file size, with some loss of image quality. SVG settings are the same in both modes.

### Lossless (`--lossless`)

With the bundled settings:

- **AVIF/WebP/PNG/GIF**: Uses lossless compression.
- **JPEG**: Uses [Guetzli](https://github.com/google/guetzli) for higher-quality lossy compression. Despite the profile name, JPEG compression is not lossless, and repeated optimization may reduce quality.
- **SVG**: Uses the same settings as the default mode.

Files may be larger than those produced by the lossy profile.

## How files are written

Optimizt writes each result to a temporary file in the destination directory and synchronizes it to disk. It then replaces the destination file in one step, so other programs see either the old file or the complete new file, never a partially written image.

Optimizt does not restore files it has already replaced if the run fails or stops.

- When replacing a file, Optimizt keeps its permissions. It also keeps the file's owner if the operating system allows it.
- Optimizt does not replace files with multiple hard links, because the other links would still point to the old file. Use a separate output path instead.
- When optimizing a symbolic link in place, Optimizt replaces the file it points to and keeps the link itself.
- When converting an image through a symbolic link, Optimizt writes the AVIF or WebP version next to the link. Use `--output` to write it to a different directory.

> [!NOTE]
> Atomic replacement protects against partially written files. It does not guarantee that the directory entry itself survives sudden power loss, and it does not preserve file timestamps.

## Configuration

Optimizt uses:

- [sharp](https://github.com/lovell/sharp) for [JPEG](https://sharp.pixelplumbing.com/api-output#jpeg), [PNG](https://sharp.pixelplumbing.com/api-output#png), [WebP](https://sharp.pixelplumbing.com/api-output#webp), and [AVIF](https://sharp.pixelplumbing.com/api-output#avif).
- [svgo](https://github.com/svg/svgo) for SVG.
- [gifsicle](https://github.com/kohler/gifsicle) for GIF.

For JPEG in the lossless profile, Optimizt uses [Guetzli](https://github.com/google/guetzli) instead of sharp for the final compression step.

See [.optimiztrc.cjs](./.optimiztrc.cjs) for the default settings. For available options and accepted values, check the documentation for each image processor linked above.

Use `--config path/to/.optimiztrc.cjs` to load your own settings instead of the bundled configuration. Without `--config`, Optimizt looks for `.optimiztrc.cjs` in the current directory, then in each parent directory. It uses the first file it finds, or the bundled defaults if it finds none.

> [!WARNING]
> `.optimiztrc.cjs` is executable code and runs with your permissions. This applies whether Optimizt finds the file automatically or you select it with `--config`. Use Optimizt only in repositories you trust.

## Troubleshooting

### Errors like `spawn guetzli ENOENT`

Make sure the [ignore-scripts](https://docs.npmjs.com/cli/v6/using-npm/config#ignore-scripts) npm option is disabled.
Details: [funbox/optimizt/issues/9](https://github.com/funbox/optimizt/issues/9).

## Development

After cloning the repository, enable Git hooks once:

```sh
npm run enable-git-hooks
```

This tells Git to use the hooks stored in the [.githooks](./.githooks) directory.

## Docker

### Pre-built image

```bash
# pull the latest image
docker pull 343dev/optimizt

# pull a specific version
docker pull 343dev/optimizt:9.0.2
```

### Build the image

```bash
# clone the repository
git clone https://github.com/343dev/optimizt.git
cd optimizt

# build the image
docker build --tag 343dev/optimizt .
```

Alternatively:

```bash
# build directly from GitHub
# ignores .dockerignore (see: https://github.com/docker/cli/issues/2827)
docker build --tag 343dev/optimizt https://github.com/343dev/optimizt.git
```

### Run the container

```bash
# mount the current directory at /src in the container
docker run --rm --user "$(id -u):$(id -g)" --volume "$(pwd):/src" 343dev/optimizt --webp ./image.png
```

## Integrations

Use these guides to run Optimizt from your editor or GitHub Actions:

- [JetBrains IDEs](./docs/jetbrains.md)
- [Visual Studio Code](./docs/vscode.md)
- [Sublime Text 3](./docs/sublime-text.md)
- [GitHub Actions](./docs/github.md)

## Articles

- [anuwong.com](https://anuwong.com/blog/2023-08-21-save-tons-of-gbs-with-optimizt/). An article in Thai about compressing files before uploading them.
- [Linux Format, Issue 277 (July 2021)](https://www.linuxformat.com/archives?issue=277#:~:text=Kitchen%20Tales%2C%20zFRAG%2C-,Optimizt,-and%20SingleFileZ.). An article about reducing image file sizes with Optimizt.

## Credits

[Igor Garybaldi](http://pandabanda.com/) created the logo.

## Other projects

- [harold](https://github.com/343dev/harold) compares frontend project bundle sizes between snapshots from the command line.
- [jailbot](https://github.com/343dev/jailbot) wraps Docker containers and automatically mounts filesystem paths.
- [markdown-lint](https://github.com/343dev/markdown-lint) checks Markdown style with Prettier, Remark, and Typograf.
- [languagetool-node](https://github.com/343dev/languagetool-node) checks spelling and grammar from the command line with LanguageTool.
