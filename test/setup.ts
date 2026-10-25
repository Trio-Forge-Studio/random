import { execFileSync } from "node:child_process";
import { join } from "node:path";

// The tests run the compiled package, so it builds once before any of them.
export default function setup() {
	execFileSync(process.execPath, [join("node_modules", "roblox-ts", "out", "CLI", "cli.js"), "--type", "package"], {
		stdio: "inherit",
	});
}
