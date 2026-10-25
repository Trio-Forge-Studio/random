# Agent instructions

Seeded random numbers for roblox-ts, published as `@trioforge/random`. The generator is xoshiro128\*\* in plain Luau, so every client and server draws the same sequence from the same seed on any engine version.

## Checks

Run every check before you call a change done:

```sh
pnpm run check
```

It runs oxfmt, oxlint, tsc over the tests, and vitest. Install the Node tools with `pnpm install` and Lune with `rokit install`. Fix the cause of a failure rather than silencing it.

The package is TypeScript and so are its tests, but Node can't run the Luau that rbxtsc emits. vitest builds `out/` once, and `test/luau.ts` mirrors `Rng`: each call sends the state and the method to `test/bridge.luau`, which runs it in Lune against the compiled package and returns the result and the new state. Use `many(times, method, ...args)` for statistical draws, since each call starts Lune. The bridge stays the only Luau in the repository.

`test/readme.test.ts` compiles every TypeScript block in the README with rbxtsc and runs it in Lune. A `// → text` comment is the next line an example prints, and blocks that share `group=<name>` in their info string build on each other.

## Determinism

- The sequence each method draws from a given state is the package's contract. A change that draws differently from the same seed is a breaking change, even when the distribution stays correct. Say so in the PR and bump the major version, or the minor version before 1.0.
- Expected sequences in the tests come from an independent implementation, not from this package's own output. Never update one to match a new result.
- Keep every intermediate value exact in a double. Luau has no 32-bit multiply, so `imul` splits one operand; a full product of two 32-bit words loses bits.
- Don't use Roblox's `Random`, or anything else whose output the engine owns.

## Conventions

- Comment only what the code can't say: a non-obvious reason, a workaround, a trap.
- Commit messages are Conventional Commits with a scope: `feat(rng): …`, `fix(seed): …`, `test: …`, `docs: …`.

## Releasing

Releases publish from CI. Bump `version` in `package.json` in a PR and merge it. Then tag that commit on `main` and push the tag:

```sh
git tag v0.2.0 origin/main
git push origin refs/tags/v0.2.0
```

`.github/workflows/release.yml` refuses a tag that isn't on `main` or doesn't match the version, runs `pnpm run check`, and publishes with `npm publish` through npm trusted publishing, with provenance. Don't publish from a machine.
