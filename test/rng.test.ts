import { describe, expect, test } from "vite-plus/test";
import { Rng } from "./luau";

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

function counts<T>(values: T[]): Map<T, number> {
	const result = new Map<T, number>();
	for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
	return result;
}

describe("seeds", () => {
	// Expected values come from an independent JavaScript implementation. The first matches xoshiro128**'s reference.
	test("generates the xoshiro128** reference sequence", () => {
		expect(Rng.fromState([1, 2, 3, 4]).many(6, "uint32")).toEqual([
			11520, 0, 5927040, 70819200, 2031721883, 1637235492,
		]);
	});

	test.each([
		[[42], [1768527656, 1179704497, 952457629, 392045271]],
		[[-1], [2514316023, 3712122463, 1288616284, 4212124868]],
		[[2 ** 40 + 7], [940947505, 860629668, 2318667971, 1540612657]],
		[["houses"], [274776295, 1319200954, 1366996277, 148356336]],
		[
			["chalet", 12345],
			[1528027912, 922584547, 2892789382, 1156408121],
		],
		[[""], [3839691421, 3150456080, 2871649241, 402779910]],
	])("derives the same stream from %j", (seed, expected) => {
		expect(Rng.seeded(...seed).many(4, "uint32")).toEqual(expected);
	});

	test("derives the same state from the same seed", () => {
		expect(Rng.seeded(0).state()).toEqual([2444478070, 1892977553, 204952106, 653490083]);
	});

	test("tells seed parts apart", () => {
		const states = [["1"], [1], ["ab", "c"], ["a", "bc"], ["abc"]].map((seed) =>
			Rng.seeded(...seed)
				.state()
				.join(),
		);
		expect(new Set(states).size).toBe(states.length);
	});

	test("draws a random seed without parts", () => {
		expect(Rng.seeded().state()).not.toEqual(Rng.seeded().state());
	});

	test.each([0.5, NaN, Infinity, 2 ** 54])("rejects the seed %s", (seed) => {
		expect(() => Rng.seeded(seed)).toThrow("integer");
	});
});

describe("state", () => {
	test("restores and clones a state", () => {
		const rng = Rng.seeded("save");
		rng.uint32();
		const copy = rng.clone();
		const restored = Rng.fromState(rng.state());
		const expected = rng.many(5, "uint32");
		expect(copy.many(5, "uint32")).toEqual(expected);
		expect(restored.many(5, "uint32")).toEqual(expected);
	});

	test("rejects a bad state", () => {
		expect(() => Rng.fromState([0, 0, 0, 0])).toThrow("all zeroes");
		expect(() => Rng.fromState([1, 2, 3, 2 ** 32])).toThrow("uint32");
	});

	test("forks an independent stream", () => {
		const rng = Rng.seeded(7);
		const fork = rng.fork();
		expect(fork.many(4, "uint32")).not.toEqual(rng.many(4, "uint32"));
		expect(Rng.seeded(7).fork().many(4, "uint32")).toEqual(Rng.seeded(7).fork().many(4, "uint32"));
	});
});

describe("numbers", () => {
	test("draws floats in [0, 1) with a fair mean", () => {
		const values = Rng.seeded("float").many(100_000, "float");
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
		expect(average(values)).toBeCloseTo(0.5, 2);
	});

	test("draws floats between bounds", () => {
		const rng = Rng.seeded("between");
		expect(rng.many(10_000, "float", -3, 5).every((value) => value >= -3 && value < 5)).toBe(true);
		expect(rng.float(2, 2)).toBe(2);
		expect(() => rng.float(1, 0)).toThrow("min <= max");
	});

	test("draws every integer in range evenly", () => {
		const rng = Rng.seeded("dice");
		const faces = counts(rng.many(60_000, "int", 1, 6));
		for (let face = 1; face <= 6; face++) expect(Math.abs((faces.get(face) ?? 0) - 10_000)).toBeLessThan(400);
		expect(rng.int(-4, -4)).toBe(-4);
		const wide = rng.int(0, 2 ** 32 - 1);
		expect(wide).toBeGreaterThanOrEqual(0);
		expect(wide).toBeLessThan(2 ** 32);
	});

	test("rejects bad integer ranges", () => {
		const rng = Rng.seeded(1);
		expect(() => rng.int(2, 1)).toThrow("min <= max");
		expect(() => rng.int(0, 1.5)).toThrow("integer bounds");
		expect(() => rng.int(0, 2 ** 32)).toThrow("2^32");
	});

	test("passes a chance at its probability", () => {
		const hits = Rng.seeded("chance").many(100_000, "chance", 0.25).filter(Boolean).length;
		expect(hits / 100_000).toBeCloseTo(0.25, 2);
		expect(Rng.seeded(1).chance(0)).toBe(false);
		expect(Rng.seeded(1).chance(1)).toBe(true);
	});

	test("draws a normal distribution", () => {
		const values = Rng.seeded("normal").many(100_000, "normal", 10, 2);
		const mean = average(values);
		expect(Math.abs(mean - 10)).toBeLessThan(0.03);
		expect(Math.abs(Math.sqrt(average(values.map((value) => value * value)) - mean * mean) - 2)).toBeLessThan(0.03);
	});
});

describe("items", () => {
	test("picks every item", () => {
		const rng = Rng.seeded("pick");
		const seen = new Set(rng.many(50, "pick", ["a", "b", "c"]));
		expect([...seen].sort()).toEqual(["a", "b", "c"]);
		expect(() => rng.pick([])).toThrow("empty");
	});

	test("picks by weight", () => {
		const rng = Rng.seeded("weights");
		const picks = counts(rng.many(100_000, "weightedIndex", [1, 0, 3, 6]));
		expect(picks.get(1)).toBeUndefined();
		expect((picks.get(0) ?? 0) / 100_000).toBeCloseTo(0.1, 2);
		expect((picks.get(2) ?? 0) / 100_000).toBeCloseTo(0.3, 2);
		expect((picks.get(3) ?? 0) / 100_000).toBeCloseTo(0.6, 2);
	});

	test("picks items by a weight field", () => {
		const rng = Rng.seeded("weighted");
		const items = [
			{ name: "common", weight: 0 },
			{ name: "rare", weight: 1 },
		];
		expect(rng.weighted(items, "weight")).toEqual({ name: "rare", weight: 1 });
	});

	test("rejects bad weights", () => {
		const rng = Rng.seeded(1);
		expect(() => rng.weightedIndex([0, 0])).toThrow("more than zero");
		expect(() => rng.weightedIndex([])).toThrow("more than zero");
		expect(() => rng.weightedIndex([1, -1])).toThrow("non-negative");
		expect(() => rng.weightedIndex([1, Infinity])).toThrow("finite");
		expect(() => rng.weightedIndex([1, NaN])).toThrow("finite");
	});

	test("shuffles a copy into every order", () => {
		const rng = Rng.seeded("shuffle");
		const orders = counts(rng.many(6000, "shuffle", [1, 2, 3]).map((order) => order.join("")));
		expect([...orders.keys()].sort()).toEqual(["123", "132", "213", "231", "312", "321"]);
		for (const count of orders.values()) expect(Math.abs(count - 1000)).toBeLessThan(120);
		expect(Rng.seeded("same").shuffle([1, 2, 3, 4, 5])).toEqual(Rng.seeded("same").shuffle([1, 2, 3, 4, 5]));
		expect(rng.shuffle([])).toEqual([]);
	});

	test("samples distinct items", () => {
		const rng = Rng.seeded("sample");
		const items = ["a", "b", "c", "d", "e"];
		for (const sample of rng.many(100, "sample", items, 3)) expect(new Set(sample).size).toBe(3);
		expect(rng.sample(items, 0)).toEqual([]);
		expect(rng.sample(items, 5)).toHaveLength(5);
		expect(() => rng.sample(items, 6)).toThrow("count from 0 to 5");
	});
});
