# Upstream source and provenance

This package embeds the complete source snapshot for Gifsicle **1.96** from
<https://github.com/kohler/gifsicle>.

- Git tag: `v1.96`
- Git commit: `a08e0f6686d467bb8b9e4715b1f1835f12984fb0`
- Snapshot directory: `upstream/gifsicle/`
- File checksums: `upstream/gifsicle.sha256`
- File modes: `upstream/gifsicle.modes`
- Local integration changes: `upstream/gifsicle-wasm.patch`

The snapshot was exported from the exact Git commit rather than reconstructed
from generated release files. The checksum and mode manifests are the
canonical evidence for the committed snapshot. Run `npm run verify:upstream`
to verify every file and `npm run verify:patch` to prove that the integration
patch applies exactly, without offsets or fuzz.

The source was acquired from GitHub's `v1.96` tag archive endpoint:

```text
https://github.com/kohler/gifsicle/archive/refs/tags/v1.96.tar.gz
```

The acquired archive had SHA-256
`1104b338745f466bdb6b739b152c42a5dfe2fb50a4c21e3bcd78446766f007ea`.
The tag was resolved to the commit recorded above before export. GitHub-generated,
codeload-generated, and local `git archive` files are not assumed to have
interchangeable bytes; the committed per-file manifest is therefore the
authoritative verification input for this snapshot.

The build copies the pristine snapshot to temporary storage, applies the patch,
and compiles that copy. Files under `upstream/gifsicle/` must never be edited
for integration purposes.

Gifsicle's optimization code uses C-library `qsort()` comparators that can compare
distinct tied candidates as equal. Different libc implementations can therefore
produce equivalent palette permutations but different compressed bytes. Both the
native reference and WebAssembly build redirect those calls to the stable mergesort
in `src/wasm/stable-qsort.c`. This compatibility layer preserves upstream comparison
and optimization logic while making exact cross-platform parity deterministic.

The exact native/WebAssembly cases and hashes are retained in
`verification/parity-manifest.json` and checked by `npm run verify:parity`. The
canonical native toolchain is documented in `verification/native-reference.md`.
