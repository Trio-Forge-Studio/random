import { execFileSync } from "node:child_process";
import { cliPath } from "@trioforge/rbxts-native";

// The tests run the compiled package, so it builds once before any of them.
export default function setup() {
	execFileSync(process.execPath, [cliPath, "--type", "package"], {
		stdio: "inherit",
	});
}
