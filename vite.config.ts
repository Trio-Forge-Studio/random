import { defineConfig } from "vite-plus";

export default defineConfig({
	staged: {
		"*": "vp check --fix",
	},
	fmt: {
		printWidth: 120,
		tabWidth: 4,
		useTabs: true,
		trailingComma: "all",
		sortPackageJson: false,
		ignorePatterns: ["**/out/**", "**/.snippets/**", "pnpm-lock.yaml", "**/*.md"],
		overrides: [
			{
				files: ["**/*.yml", "**/*.yaml"],
				options: { tabWidth: 2, useTabs: false },
			},
		],
	},
	lint: {
		categories: { correctness: "error", suspicious: "error" },
		plugins: ["typescript", "node"],
		ignorePatterns: ["**/out/**", "**/.snippets/**"],
		overrides: [
			{
				files: ["test/**/*.ts"],
				plugins: ["vitest"],
			},
		],
	},
	test: {
		include: ["test/**/*.test.ts"],
		globalSetup: ["test/setup.ts"],
		testTimeout: 30_000,
	},
});
