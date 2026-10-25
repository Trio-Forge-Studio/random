local package = require("./lib/package")
local assert = require("./lib/assert")
local Rng = package.Rng

local function take(rng: any, count: number): { number }
	local result = {}
	for _ = 1, count do
		table.insert(result, rng:uint32())
	end
	return result
end

local function key(list: { any }): string
	return table.concat(list, ",")
end

local tests = {}

-- Expected values come from an independent JavaScript implementation. The first matches xoshiro128**'s reference.
tests["generates the xoshiro128** reference sequence"] = function()
	local rng = Rng:fromState({ 1, 2, 3, 4 })
	assert.list(take(rng, 6), { 11520, 0, 5927040, 70819200, 2031721883, 1637235492 })
end

tests["derives the same state from the same seed"] = function()
	assert.list(Rng.new(0):state(), { 2444478070, 1892977553, 204952106, 653490083 })
	assert.list(take(Rng.new(42), 4), { 1768527656, 1179704497, 952457629, 392045271 })
	assert.list(take(Rng.new(-1), 4), { 2514316023, 3712122463, 1288616284, 4212124868 })
	assert.list(take(Rng.new(2 ^ 40 + 7), 4), { 940947505, 860629668, 2318667971, 1540612657 })
	assert.list(take(Rng.new("houses"), 4), { 274776295, 1319200954, 1366996277, 148356336 })
	assert.list(take(Rng.new("chalet", 12345), 4), { 1528027912, 922584547, 2892789382, 1156408121 })
	assert.list(take(Rng.new(""), 4), { 3839691421, 3150456080, 2871649241, 402779910 })
end

tests["tells seed parts apart"] = function()
	local seen = {}
	for _, rng in { Rng.new("1"), Rng.new(1), Rng.new("ab", "c"), Rng.new("a", "bc"), Rng.new("abc") } do
		local state = key(rng:state())
		assert.truthy(not seen[state], `two seeds share the state {state}`)
		seen[state] = true
	end
end

tests["draws a random seed without parts"] = function()
	assert.truthy(key(Rng.new():state()) ~= key(Rng.new():state()))
end

tests["rejects seeds that aren't integers"] = function()
	assert.throws(function()
		Rng.new(0.5)
	end, "integer")
	assert.throws(function()
		Rng.new(0 / 0)
	end, "integer")
	assert.throws(function()
		Rng.new(math.huge)
	end, "integer")
end

tests["restores and clones a state"] = function()
	local rng = Rng.new("save")
	rng:uint32()
	local copy = rng:clone()
	local restored = Rng:fromState(rng:state())
	local expected = take(rng, 5)
	assert.list(take(copy, 5), expected)
	assert.list(take(restored, 5), expected)
end

tests["rejects a bad state"] = function()
	assert.throws(function()
		Rng:fromState({ 0, 0, 0, 0 })
	end, "all zeroes")
	assert.throws(function()
		Rng:fromState({ 1, 2, 3, 2 ^ 32 })
	end, "uint32")
end

tests["forks an independent stream"] = function()
	local rng = Rng.new(7)
	local fork = rng:fork()
	assert.truthy(key(take(fork, 4)) ~= key(take(rng, 4)))
	assert.list(take(Rng.new(7):fork(), 4), take(Rng.new(7):fork(), 4))
end

tests["draws floats in [0, 1) with a fair mean"] = function()
	local rng = Rng.new("float")
	local sum = 0
	for _ = 1, 100000 do
		local value = rng:float()
		assert.truthy(value >= 0 and value < 1, `float out of range: {value}`)
		sum += value
	end
	assert.near(sum / 100000, 0.5, 0.005)
end

tests["draws floats between bounds"] = function()
	local rng = Rng.new("between")
	for _ = 1, 10000 do
		local value = rng:float(-3, 5)
		assert.truthy(value >= -3 and value < 5, `float out of range: {value}`)
	end
	assert.equal(rng:float(2, 2), 2)
	assert.throws(function()
		rng:float(1, 0)
	end, "min <= max")
end

tests["draws every integer in range evenly"] = function()
	local rng = Rng.new("dice")
	local counts = {}
	for _ = 1, 60000 do
		local value = rng:int(1, 6)
		counts[value] = (counts[value] or 0) + 1
	end
	for face = 1, 6 do
		assert.near(counts[face] or 0, 10000, 400)
	end
	assert.equal(rng:int(-4, -4), -4)
	local wide = rng:int(0, 2 ^ 32 - 1)
	assert.truthy(wide >= 0 and wide < 2 ^ 32)
end

tests["rejects bad integer ranges"] = function()
	local rng = Rng.new(1)
	assert.throws(function()
		rng:int(2, 1)
	end, "min <= max")
	assert.throws(function()
		rng:int(0, 1.5)
	end, "integer bounds")
	assert.throws(function()
		rng:int(0, 2 ^ 32)
	end, "2^32")
end

tests["passes a chance at its probability"] = function()
	local rng = Rng.new("chance")
	local hits = 0
	for _ = 1, 100000 do
		if rng:chance(0.25) then
			hits += 1
		end
	end
	assert.near(hits / 100000, 0.25, 0.005)
	assert.truthy(not Rng.new(1):chance(0))
	assert.truthy(Rng.new(1):chance(1))
end

tests["draws a normal distribution"] = function()
	local rng = Rng.new("normal")
	local count, sum, squares = 100000, 0, 0
	for _ = 1, count do
		local value = rng:normal(10, 2)
		sum += value
		squares += value * value
	end
	local mean = sum / count
	assert.near(mean, 10, 0.03)
	assert.near(math.sqrt(squares / count - mean * mean), 2, 0.03)
end

tests["picks every item"] = function()
	local rng = Rng.new("pick")
	local seen = {}
	for _ = 1, 200 do
		seen[rng:pick({ "a", "b", "c" })] = true
	end
	assert.truthy(seen.a and seen.b and seen.c)
	assert.throws(function()
		rng:pick({})
	end, "empty")
end

tests["picks by weight"] = function()
	local rng = Rng.new("weights")
	local counts = { 0, 0, 0, 0 }
	for _ = 1, 100000 do
		local index = rng:weightedIndex({ 1, 0, 3, 6 })
		counts[index + 1] += 1
	end
	assert.equal(counts[2], 0)
	assert.near(counts[1] / 100000, 0.1, 0.005)
	assert.near(counts[3] / 100000, 0.3, 0.005)
	assert.near(counts[4] / 100000, 0.6, 0.005)

	local items = { { name = "common", weight = 9 }, { name = "rare", weight = 1 } }
	local function weight(item)
		return item.weight
	end
	local rare = 0
	for _ = 1, 10000 do
		if rng:weighted(items, weight).name == "rare" then
			rare += 1
		end
	end
	assert.near(rare / 10000, 0.1, 0.01)
end

tests["rejects bad weights"] = function()
	local rng = Rng.new(1)
	assert.throws(function()
		rng:weightedIndex({ 0, 0 })
	end, "more than zero")
	assert.throws(function()
		rng:weightedIndex({})
	end, "more than zero")
	assert.throws(function()
		rng:weightedIndex({ 1, -1 })
	end, "non-negative")
	assert.throws(function()
		rng:weightedIndex({ 1, math.huge })
	end, "finite")
end

tests["shuffles a copy into every order"] = function()
	local rng = Rng.new("shuffle")
	local items = { 1, 2, 3 }
	local orders = {}
	for _ = 1, 6000 do
		local order = table.concat(rng:shuffle(items), "")
		orders[order] = (orders[order] or 0) + 1
	end
	assert.list(items, { 1, 2, 3 })
	for _, order in { "123", "132", "213", "231", "312", "321" } do
		assert.near(orders[order] or 0, 1000, 120)
	end
	assert.list(Rng.new("same"):shuffle({ 1, 2, 3, 4, 5 }), Rng.new("same"):shuffle({ 1, 2, 3, 4, 5 }))
	assert.list(rng:shuffle({}), {})
end

tests["samples distinct items"] = function()
	local rng = Rng.new("sample")
	local items = { "a", "b", "c", "d", "e" }
	for _ = 1, 100 do
		local picked = rng:sample(items, 3)
		assert.equal(#picked, 3)
		local seen = {}
		for _, item in picked do
			assert.truthy(not seen[item], `sampled {item} twice`)
			seen[item] = true
		end
	end
	assert.list(items, { "a", "b", "c", "d", "e" })
	assert.list(rng:sample(items, 0), {})
	assert.equal(#rng:sample(items, 5), 5)
	assert.throws(function()
		rng:sample(items, 6)
	end, "count from 0 to 5")
end

return tests
