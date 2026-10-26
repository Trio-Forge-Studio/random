import { readFileSync } from "node:fs";
import { expect, test } from "vite-plus/test";

test("the shipped Luau carries native attributes and parameter hints", () => {
	const output = readFileSync("out/init.luau", "utf8");
	expect(output).toContain("@native\nlocal function imul(a: number, b: number)");
	expect(output).toContain("@native function(lane: number)");
	expect(output).toContain("@native\n\tfunction Rng:int(min: number, max: number)");
});
