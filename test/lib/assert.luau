local assert = {}

local function show(value: any): string
	if type(value) == "table" then
		local parts = {}
		for _, item in value do
			table.insert(parts, tostring(item))
		end
		return "{ " .. table.concat(parts, ", ") .. " }"
	end
	return tostring(value)
end

function assert.equal(actual: any, expected: any)
	if actual ~= expected then
		error(`expected {show(expected)}, got {show(actual)}`, 2)
	end
end

function assert.list(actual: { any }, expected: { any })
	local same = #actual == #expected
	for index = 1, #expected do
		same = same and actual[index] == expected[index]
	end
	if not same then
		error(`expected {show(expected)}, got {show(actual)}`, 2)
	end
end

function assert.near(actual: number, expected: number, tolerance: number)
	if math.abs(actual - expected) > tolerance then
		error(`expected {expected} ± {tolerance}, got {actual}`, 2)
	end
end

function assert.truthy(value: any, message: string?)
	if not value then
		error(message or "expected a truthy value", 2)
	end
end

function assert.throws(fn: () -> (), pattern: string)
	local ok, message = pcall(fn)
	if ok then
		error(`expected an error matching "{pattern}"`, 2)
	end
	if not string.find(tostring(message), pattern, 1, true) then
		error(`expected an error matching "{pattern}", got "{message}"`, 2)
	end
end

return assert
