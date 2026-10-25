import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, expect, test } from "vite-plus/test";
import { runExample } from "./luau";

// Each TypeScript block in the README compiles with rbxtsc and runs in Lune. A `// → text` comment is the next line it
// prints. Blocks that share `group=<name>` in their info string build on each other, and `nocheck` skips a block.
const FENCE = /^([ \t]*)```(?:ts|typescript)([^\n]*)\n([\s\S]*?)\n\1```/gm;
const README = readFileSync("README.md", "utf8");

const groups = new Map<string, string>();
const examples = [...README.matchAll(FENCE)]
	.filter(([, , info]) => !info.includes("nocheck"))
	.map(([, indent, info, body], index) => {
		const code = body
			.split("\n")
			.map((row) => (row.startsWith(indent) ? row.slice(indent.length) : row))
			.join("\n");
		const group = /\bgroup=(\S+)/.exec(info)?.[1];
		const source = (group ? (groups.get(group) ?? "") : "") + code + "\n";
		if (group) groups.set(group, source);
		const line = README.slice(0, README.indexOf(body)).split("\n").length;
		const expected = [...source.matchAll(/^[ \t]*\/\/ → ?(.*)$/gm)].map((match) => match[1]);
		return { name: `example-${index}`, line, source, expected };
	});

// rbxtsc copies its whole root folder into the output, so the examples compile in a project of their own, beside a
// copy of the package's source.
const work = ".snippets";
const project = join(work, "project");

beforeAll(() => {
	rmSync(work, { recursive: true, force: true });
	mkdirSync(join(project, "examples"), { recursive: true });
	cpSync("src", join(project, "src"), { recursive: true });
	for (const example of examples) writeFileSync(join(project, "examples", `${example.name}.ts`), example.source);
	writeFileSync(
		join(project, "tsconfig.json"),
		JSON.stringify({
			extends: "../../tsconfig.json",
			compilerOptions: {
				rootDir: ".",
				outDir: "../out",
				declaration: false,
				tsBuildInfoFile: "../tsbuildinfo",
				baseUrl: ".",
				typeRoots: ["node_modules/@rbxts", "../../node_modules/@rbxts"],
				paths: { "@trioforge/random": ["./src/index.ts"] },
			},
			include: ["examples", "src"],
		}),
	);
	const rbxtsc = join("node_modules", "roblox-ts", "out", "CLI", "cli.js");
	const compiled = spawnSync(process.execPath, [rbxtsc, "--type", "package", "-p", project], { encoding: "utf8" });
	if (compiled.status !== 0)
		throw new Error(`The README examples don't compile:\n${compiled.stdout}${compiled.stderr}`);
});

test.each(examples)("README.md:$line prints what it says", ({ name, expected }) => {
	const printed = runExample(join(work, "out", "examples", `${name}.luau`));
	expect(printed).toEqual(expected);
});
