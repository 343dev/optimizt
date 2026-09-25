# Native and WebAssembly parity

`test/parity-manifest.json` records the output of the canonical Linux x64 native reference for each fixture and quality. Every WebAssembly result must match those bytes except for the single case below. A new mismatch is a release blocker; it must not be accepted automatically from a perceptual threshold.

## Accepted equivalent case

`floating-point-boundary-444.jpg` at quality 95 crosses a floating-point decision boundary. The canonical native result is 2,507 bytes, while wasm32 produces 2,505 bytes. The outputs decode to the same dimensions and were investigated with these results:

- 260 of 6,144 pixels differ;
- maximum channel delta: 12;
- mean absolute channel delta: 0.05398;
- RMSE: 0.41855;
- Butteraugli distance: 0.66740;
- upstream “good” threshold: 0.76548.

This exception applies only to that immutable input hash and quality 95. Its native hash remains in the manifest; the test also pins the accepted WebAssembly hash.
