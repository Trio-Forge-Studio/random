# @trioforge/random

## 0.1.0

### Minor Changes

- First release. `Rng` is a seeded xoshiro128\*\* generator in plain Luau, so every client and server draws the same sequence from the same seed. It draws integers, floats, chances and normal values, and it picks by weight, shuffles and samples. A state can be saved, restored, cloned and forked. ([Trio-Forge-Studio/random#1](https://github.com/Trio-Forge-Studio/random/pull/1))
