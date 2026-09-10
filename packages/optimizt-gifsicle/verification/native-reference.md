# Native reference environment

Canonical native parity uses Linux x64 and GCC 14.2.0 with `-O3 -DNDEBUG`, no
threads, and no SIMD. The build compiles the same pristine snapshot and exact
integration patch as the WebAssembly distribution.

The canonical container is the official `gcc:14.2.0` image pinned by immutable
OCI index digest:

```text
gcc:14.2.0@sha256:b99b86a28812b1e6453a231a947dc43d76fe192788a12f344a9b568bf9f5d24c
```

The Linux amd64 manifest referenced by that index is:

```text
sha256:82549aa8f90ada3236a8be70c74543132a76662ef33f0c3271ed802b81584a82
```

Run the repository in that image and invoke `npm run build:native`. For release
builds, the script verifies Linux, an x86-64 GNU compiler target, and
`gcc -dumpfullversion -dumpversion` before compiling. Sanitizer verification may
run the same bridge natively on another architecture, but it does not generate
the canonical parity reference. The resulting executable is a verification
artifact and is not included in the npm package.
