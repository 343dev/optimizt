# @343dev/optimizt-sharp

An internal workspace that builds the WebAssembly-only [`sharp`](https://sharp.pixelplumbing.com/) distribution vendored into the published Optimizt package. This workspace is private and is not published separately.

The generated distribution preserves sharp's JavaScript interface but always loads `@img/sharp-wasm32`. It does not declare sharp's platform-specific native packages.

```js
import sharp from '@343dev/optimizt-sharp';

const output = await sharp(input).rotate().webp().toBuffer();
```

## Reproducible build

The exact upstream package, version, tarball URL, and Subresource Integrity digest are pinned in `package.json` under `optimiztSharp.upstream`.

```sh
npm run build --workspace @343dev/optimizt-sharp
```

The build downloads the pinned npm tarball, verifies its digest and package identity, copies its published `dist` directory, and replaces only the binding loader with a WASM-only loader. Generated files are excluded from Git. The Optimizt build copies them to `packages/optimizt/vendor/sharp`, which is included in the Optimizt tarball.

The wrapper version starts with the corresponding upstream sharp version. `0.35.2-0` is wrapper revision 0 based on sharp 0.35.2.

## Runtime limitations

The same WebAssembly limitations documented by sharp apply: browsers, single-threaded runtimes, native text rendering, and tile-based output are unsupported.

## License

The derived sharp JavaScript code is licensed under Apache-2.0. The WASM dependency includes libraries under the licenses reported by `@img/sharp-wasm32`.
