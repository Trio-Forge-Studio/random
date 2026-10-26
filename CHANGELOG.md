# @trioforge/random

## 0.1.2

### Patch Changes

- [`6964b61`](https://github.com/Trio-Forge-Studio/random/commit/6964b61521e39c60f326defb3be497cac2a6e6a4) Thanks [@Hezaerd](https://github.com/Hezaerd)! - The source moved to its own repository, [Trio-Forge-Studio/random](https://github.com/Trio-Forge-Studio/random), so the package's repository and issue links point there. Its homepage is now its docs page at <https://website.trio-forge.workers.dev/docs/random/>. The code is the same as the previous version.

## 0.1.1

### Patch Changes

- [#6](https://github.com/Trio-Forge-Studio/packages/pull/6) [`dac820b`](https://github.com/Trio-Forge-Studio/packages/commit/dac820b44abb72c663f694c6125de44e1a1a8fcd) Thanks [@Hezaerd](https://github.com/Hezaerd)! - The source moved to [Trio-Forge-Studio/packages](https://github.com/Trio-Forge-Studio/packages), so the package's repository and issue links point there. The package now ships its `CHANGELOG.md`. The code is the same as the previous version.

## 0.1.0

### Minor Changes

- First release. `Rng` is a seeded xoshiro128\*\* generator in plain Luau, so every client and server draws the same sequence from the same seed. It draws integers, floats, chances and normal values, and it picks by weight, shuffles and samples. A state can be saved, restored, cloned and forked. ([Trio-Forge-Studio/random#1](https://github.com/Trio-Forge-Studio/random/pull/1))
