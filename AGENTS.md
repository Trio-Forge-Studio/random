# Agent instructions

Seeded random numbers for roblox-ts, published as `@trioforge/random`. The generator is xoshiro128\*\* in plain Luau, so every client and server draws the same sequence from the same seed on any engine version.

## Checks

Run every check before you call a change done:

```sh
pnpm run check
```

It runs oxfmt over `src` and `scripts`, rbxtsc, StyLua over the Luau tests, the tests against the compiled package, and the README examples. Install the Node tools with `pnpm install`, and Lune and StyLua with `rokit install`. Fix the cause of a failure rather than silencing it.

`node scripts/check-snippets.mjs <files>` compiles the TypeScript examples in Markdown and MDX files with rbxtsc and runs them in Lune. A `// → text` comment is the next line an example prints, and blocks that share `group=<name>` in their info string build on each other.

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
