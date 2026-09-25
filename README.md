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

Fast local validation is `npm run check`. Codec changes can be checked with `npm run provenance:setup` followed by `npm run provenance:verify`. Canonical codec provenance, exact committed distributions, parity, package contents, and artifact construction are checked by `npm run release:verify` in its supported pinned Linux environment. Publication fails closed until maintainers provide `release-distribution-policy.json` after licensing review; implementation code does not infer that policy.

The release artifact command packs the npm archive once and verifies its contents and clean-installed behavior before publication.
