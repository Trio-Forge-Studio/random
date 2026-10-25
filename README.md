# @trioforge/random

Seeded random numbers for roblox-ts. Every client and every server draws the same sequence from the same seed, today and after any engine update.

Roblox's `Random` doesn't promise that. Its algorithm and `Random:Shuffle` belong to the engine and can change between versions, which matters as soon as a server and its clients must agree on a draw. This package runs [xoshiro128\*\*](https://prng.di.unimi.it/) in plain Luau instead, and checks it against the algorithm's reference output.

Read the documentation at <https://website.trio-forge.workers.dev/docs/random/>.

## Install

```sh
pnpm add @trioforge/random
```

roblox-ts only looks for packages in the scopes your project lists, so add the `@trioforge` scope in two places.

1. In `tsconfig.json`, add it to `typeRoots`:

	```json
	"typeRoots": ["node_modules/@rbxts", "node_modules/@trioforge"]
	```

2. In your Rojo project, map it beside `@rbxts` under `rbxts_include/node_modules`:

	```json
	"node_modules": {
		"$className": "Folder",
		"@rbxts": { "$path": "node_modules/@rbxts" },
		"@trioforge": { "$path": "node_modules/@trioforge" }
	}
	```

## Example

```ts
import { Rng } from "@trioforge/random";

const rng = new Rng("chalet", 12345);

print(rng.int(1, 6));
// → 5
print(rng.pick(["lamp", "vase", "clock"]));
// → vase
print(rng.shuffle([1, 2, 3, 4, 5]).join(" "));
// → 5 4 1 2 3
```

## Seeds

`new Rng(...seed)` takes any mix of strings and integers and hashes them into a 128-bit state. The same parts in the same order always give the same stream. Different parts give unrelated streams, so a seed can name what it's for:

```ts
import { Rng } from "@trioforge/random";

const houseSeed = 2024;
const furniture = new Rng("furniture", houseSeed);
const weather = new Rng("weather", houseSeed);
```

The two streams above don't move together, and drawing from one never changes the other. Seed numbers must be integers within ±2^53. `new Rng()` with no parts seeds itself from the clock and `math.random`, for draws nobody needs to repeat.

`fork()` takes four draws from a stream and seeds a new one from them. Hand a fork to a system that draws an unknown number of times, and the parent's sequence after it stays the same whatever the fork does.

`state()` returns the four 32-bit words of the stream's position. `Rng.fromState(state)` resumes from them, so a server can save a stream or send it to clients. `clone()` copies a stream at its current position.

## Draws

| Method | Returns |
| --- | --- |
| `uint32()` | An integer from 0 to 2^32 − 1, the generator's raw output |
| `float()` | A number in [0, 1) with 53 random bits |
| `float(min, max)` | A number in [min, max) |
| `int(min, max)` | An integer in [min, max], both inclusive, without modulo bias |
| `chance(probability)` | `true` with the given probability |
| `normal(mean?, deviation?)` | A normally distributed number, by default with mean 0 and deviation 1 |
| `pick(items)` | One item |
| `weightedIndex(weights)` | An index, chosen in proportion to its weight |
| `weighted(items, weight)` | An item, chosen in proportion to `weight(item, index)` |
| `shuffle(items)` | A shuffled copy. The array you pass stays as it was |
| `sample(items, count)` | `count` distinct items, in the order they were drawn |

Indices are 0-based, as everywhere in roblox-ts. Weights must be finite and non-negative, with a positive total. A zero weight is never chosen.

```ts
import { Rng } from "@trioforge/random";

const rng = new Rng("loot", 7);
const rarities = ["common", "rare", "epic"];
print(rarities[rng.weightedIndex([80, 18, 2])]);
// → common
```

Each method's sequence for a given state is part of the package's contract. A change that would draw differently from the same seed is a breaking change.
