-- Runs one compiled docs example from .snippets/out for scripts/check-snippets.mjs.
local process = require("@lune/process")
local load = require("../test/lib/runtime")

load(".snippets/out", { "examples", process.args[1] })
