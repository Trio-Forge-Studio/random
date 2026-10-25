import { execFileSync } from "node:child_process";

export type SeedPart = string | number;
export type RngState = readonly [number, number, number, number];

interface Call {
	method: string;
	args: unknown[];
	times?: number;
}

// JSON has no NaN or infinities, so they cross as tagged objects the bridge turns back into numbers.
function encode(_key: string, value: unknown): unknown {
	return typeof value === "number" && !Number.isFinite(value) ? { nonFinite: String(value) } : value;
}

function bridge<T>(request: object): T {
	const input = JSON.stringify(request, encode);
	const output = execFileSync("lune", ["run", "test/bridge.luau"], { input, encoding: "utf8", maxBuffer: 2 ** 28 });
	const response = JSON.parse(output) as { ok: true; value: T } | { ok: false; error: string };
	if (!response.ok) throw new Error(response.error);
	return response.value;
}

// Lune encodes an empty table as an object, though every table the package returns is an array.
function list<T>(value: unknown): T[] {
	return Array.isArray(value) ? value : [];
}

// Mirrors the package's Rng. Each draw runs in Lune from the last state, so the tests check the compiled Luau that
// ships rather than the TypeScript source.
export class Rng {
	private constructor(private words: RngState) {}

	static seeded(...seed: SeedPart[]): Rng {
		return new Rng(bridge<{ state: RngState }>({ op: "rng", seed }).state);
	}

	static fromState(state: readonly number[]): Rng {
		return new Rng(bridge<{ state: RngState }>({ op: "rng", state }).state);
	}

	private call<T>(call: Call): T {
		const { results, state } = bridge<{ results: [T]; state: RngState }>({
			op: "rng",
			state: this.words,
			calls: [call],
		});
		this.words = state;
		return results[0];
	}

	// Draws many times in one trip to Lune, for the statistical tests.
	many<K extends Exclude<keyof Rng, "many" | "state" | "clone" | "fork">>(
		times: number,
		method: K,
		...args: Parameters<Rng[K]>
	): ReturnType<Rng[K]>[] {
		return list(this.call({ method, args, times }));
	}

	state(): RngState {
		return this.call({ method: "state", args: [] });
	}

	clone(): Rng {
		return new Rng(this.call({ method: "clone", args: [] }));
	}

	fork(): Rng {
		return new Rng(this.call({ method: "fork", args: [] }));
	}

	uint32(): number {
		return this.call({ method: "uint32", args: [] });
	}

	float(min?: number, max?: number): number {
		return this.call({ method: "float", args: min === undefined ? [] : [min, max] });
	}

	int(min: number, max: number): number {
		return this.call({ method: "int", args: [min, max] });
	}

	chance(probability: number): boolean {
		return this.call({ method: "chance", args: [probability] });
	}

	normal(mean?: number, deviation?: number): number {
		return this.call({ method: "normal", args: [mean, deviation].filter((arg) => arg !== undefined) });
	}

	pick<T>(items: readonly T[]): T {
		return this.call({ method: "pick", args: [items] });
	}

	weightedIndex(weights: readonly number[]): number {
		return this.call({ method: "weightedIndex", args: [weights] });
	}

	weighted<T extends object>(items: readonly T[], field: keyof T & string): T {
		return this.call({ method: "weighted", args: [items, field] });
	}

	shuffle<T>(items: readonly T[]): T[] {
		return list(this.call({ method: "shuffle", args: [items] }));
	}

	sample<T>(items: readonly T[], count: number): T[] {
		return list(this.call({ method: "sample", args: [items, count] }));
	}
}

export function runExample(file: string): string[] {
	return list(bridge<{ printed: unknown }>({ op: "example", file }).printed);
}
