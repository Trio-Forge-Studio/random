-- Runs one compiled docs example for check-examples.
local process = require("@lune/process")

require("@tooling/runtime")(".snippets/out")("examples", process.args[1])
