# Agent instructions

Seeded random numbers for roblox-ts, published as `@trioforge/random`. The generator is xoshiro128\*\* in plain Luau, so every client and server draws the same sequence from the same seed on any engine version.

## Tools

Run `pnpm install` and `rokit install`. `rokit.toml` pins Lune and StyLua. Vite+ (`vp`) formats, lints and tests the repository from `vite.config.ts`, and `pnpm run fmt` fixes formatting. A pre-commit hook runs `vp check --fix` on staged files.

`tsconfig.json` extends `tsconfig.rbxts.json`, the roblox-ts options every Trio Forge library shares. The example checker, staged release command, and Lune runtime and test runner come from `@trioforge/tooling`. Lune code requires the runtime as `@tooling/runtime` through `.luaurc`. CI and release use the shared workflows in [Trio-Forge-Studio/tooling](https://github.com/Trio-Forge-Studio/tooling). Fix shared tooling in that repository.

## Checks

Run every check before you call a change done:

```sh
pnpm run check
```

It runs `vp check`, tsc over the tests, `vp test`, and the README examples through `@trioforge/tooling`. Fix the cause of a failure rather than silencing it.

The package is TypeScript and so are its tests, but Node can't run the Luau that rbxtsc emits. `vp test` builds `out/` once, and `test/luau.ts` mirrors `Rng`: each call sends the state and the method to `test/bridge.luau`, which runs it in Lune against the compiled package and returns the result and the new state. Use `many(times, method, ...args)` for statistical draws, since each call starts Lune. The bridge stays the only Luau in the tests.

`test/readme.test.ts` compiles every TypeScript block in the README with rbxtsc and runs it in Lune. A `// → text` comment is the next line an example prints, and blocks that share `group=<name>` in their info string build on each other.

## Examples

Every TypeScript example in the README and the docs compiles against `src/`. `pnpm run examples <files>` compiles the examples in Markdown and MDX files and runs them in Lune through `.lune/example.luau`, with the same `// → text`, `group=<name>` and `nocheck` rules as the README test.

The docs live in the website repository, under `src/content/docs/docs/random/`, and publish at <https://website.trio-forge.workers.dev/docs/random/>. The website checks their examples against the commit of this repository that its `docs-sources.json` pins. After changing an example or an API, check the docs from a website checkout beside this one, and update them in the website PR that moves the pin:

```sh
pnpm run examples README.md ../website/src/content/docs/docs/random/*.mdx ../website/src/content/docs/docs/random/*/*.mdx
```

## Releases

Changesets versions and publishes the package. A PR that changes what the package ships adds a changeset with `pnpm changeset`, which says whether it takes a patch, minor or major bump. On `main`, `.github/workflows/release.yml` keeps a "chore(release): version packages" PR open that applies the changesets and writes `CHANGELOG.md`. Merging that PR stages the new version through npm trusted publishing. The trusted publisher may only stage, so the version goes live once a maintainer approves it with 2FA on npmjs.com or with `npm stage approve`. Don't publish from a machine.

CI fails a PR that changes `src/` without a changeset. A change that ships nothing, such as tests, docs or tooling, needs none.

## Lockfile

The lockfile records the pinned pnpm under `packageManagerDependencies`, and CI's frozen install fails without it. A Vite+ shell sets `PNPM_CONFIG_PM_ON_FAIL=ignore`, which stops pnpm writing that block. If it goes missing, regenerate the lockfile:

```sh
env -u PNPM_CONFIG_PM_ON_FAIL -u PNPM_CONFIG_RUNTIME_ON_FAIL pnpm install
```

## Determinism

- The sequence each method draws from a given state is the package's contract. A change that draws differently from the same seed is a breaking change, even when the distribution stays correct. Say so in the PR and bump the major version, or the minor version before 1.0.
- Expected sequences in the tests come from an independent implementation, not from this package's own output. Never update one to match a new result.
- Keep every intermediate value exact in a double. Luau has no 32-bit multiply, so `imul` splits one operand; a full product of two 32-bit words loses bits.
- Don't use Roblox's `Random`, or anything else whose output the engine owns.

## Conventions

- Comment only what the code can't say: a non-obvious reason, a workaround, a trap.
- Commit messages are Conventional Commits with a scope: `feat(rng): …`, `fix(seed): …`, `test: …`, `docs: …`.
