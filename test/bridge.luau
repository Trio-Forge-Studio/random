-- Runs one request from test/luau.ts against the compiled package in out/, since Node can't run Luau.
local fs = require("@lune/fs")
local luau = require("@lune/luau")
local serde = require("@lune/serde")
local stdio = require("@lune/stdio")
local package = require("../out")

local NON_FINITE = { NaN = 0 / 0, Infinity = math.huge, ["-Infinity"] = -math.huge }

local function decode(value: any): any
	if type(value) ~= "table" then
		return value
	elseif value.nonFinite then
		return NON_FINITE[value.nonFinite]
	end
	local result = {}
	for key, item in value do
		result[key] = decode(item)
	end
	return result
end

local function rng(request)
	local Rng = package.Rng
	local generator = if request.state then Rng:fromState(request.state) else Rng.new(table.unpack(request.seed or {}))
	local results = {}
	for _, call in request.calls or {} do
		local args = call.args or {}
		-- A function can't cross JSON, so weighted takes the name of the field that holds each item's weight.
		if call.method == "weighted" then
			local field = args[2]
			args[2] = function(item)
				return item[field]
			end
		end
		local method = generator[call.method]
		local function draw()
			local value = method(generator, table.unpack(args))
			-- An Rng from fork or clone crosses as its state.
			return if getmetatable(value) == Rng then value:state() else value
		end
		if call.times then
			local draws = table.create(call.times)
			for index = 1, call.times do
				draws[index] = draw()
			end
			table.insert(results, draws)
		else
			table.insert(results, draw())
		end
	end
	return { results = results, state = generator:state() }
end

-- A compiled example reaches the package through roblox-ts's runtime, which is only ever asked for this package.
local function example(request)
	local printed = {}
	local runtime = {
		import = function()
			return package
		end,
	}
	local environment = {
		_G = setmetatable({}, {
			__index = function()
				return runtime
			end,
		}),
		script = setmetatable({}, {
			__index = function(self)
				return self
			end,
		}),
		print = function(...)
			local parts = {}
			for index = 1, select("#", ...) do
				table.insert(parts, tostring((select(index, ...))))
			end
			table.insert(printed, table.concat(parts, " "))
		end,
	}
	luau.load(fs.readFile(request.file), { debugName = request.file, environment = environment })()
	return { printed = printed }
end

local request = decode(serde.decode("json", stdio.readToEnd()))
local ok, response = pcall(if request.op == "example" then example else rng, request)
stdio.write(serde.encode("json", if ok then { ok = true, value = response } else { ok = false, error = tostring(response) }))
