# Optimizt monorepo

This repository contains four workspaces:

- [`@343dev/optimizt`](packages/optimizt) — the published Optimizt command-line image optimizer.
- [`@343dev/optimizt-sharp`](packages/optimizt-sharp) — a private build workspace that reproducibly generates the WASM-only sharp distribution vendored into Optimizt.
- [`@343dev/optimizt-guetzli`](packages/optimizt-guetzli) — the private Guetzli WebAssembly build and provenance workspace.
- [`@343dev/optimizt-gifsicle`](packages/optimizt-gifsicle) — the private Gifsicle WebAssembly build, corresponding source, and provenance workspace.

## Development

```sh
npm ci
npm run check
```

`npm run build` downloads the exact upstream sharp tarball pinned by `packages/optimizt-sharp/package.json`, verifies its integrity, generates the wrapper, and copies all three codec runtimes into the ignored `packages/optimizt/vendor` directory. Only `@343dev/optimizt` is published.

## Release verification

Fast local validation is `npm run check`. Codec changes can be checked with `npm run provenance:setup` followed by `npm run provenance:verify`. Canonical codec provenance, exact committed distributions, parity, package contents, license metadata and notices, and artifact construction are checked by `npm run release:verify` in its supported pinned Linux environment. Gifsicle is distributed under the alternative license in its original licensing text, which is included with the package alongside an immutable link to the corresponding public source.

Run the release workflow manually when publishing is needed. It packs and verifies the npm archive once, then independently checks whether that version already exists in npm and Docker Hub. Each publisher skips an existing version or publishes its missing version, so a failed publication can be retried without republishing the successful one. Docker installs the same verified archive used for npm. For a local image build, run `npm run release:artifact` and then `docker build .`; both consume `artifacts/optimizt.tgz`.
