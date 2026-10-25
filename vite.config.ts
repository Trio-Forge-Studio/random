import { defineConfig } from "vite-plus";

export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
		globalSetup: ["test/setup.ts"],
		testTimeout: 30_000,
	},
});
