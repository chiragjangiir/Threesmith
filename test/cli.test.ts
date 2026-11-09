import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ci } from "../src/ci.js";
import { project, THREE_DIR } from "./helpers.js";

describe("ci receipt", () => {
  it("passes clean code and fails broken code", async () => {
    const good = await ci({ path: project({ "a.js": readFileSync("test/fixtures/modern.js", "utf8") }), three: THREE_DIR, minScore: 90 });
    expect(good.ok).toBe(true);
    expect(good.markdown).toContain("✅ pass");
    const bad = await ci({ path: project({ "a.js": readFileSync("test/fixtures/legacy.js", "utf8") }), three: THREE_DIR, minScore: 90 });
    expect(bad.ok).toBe(false);
    expect(bad.reasons.join(" ")).toContain("below the minimum");
    expect(bad.markdown).toContain("❌ fail");
  });
});

describe.skipIf(!existsSync("dist/cli.js"))("built cli", () => {
  it("prints version and exit codes", () => {
    expect(execFileSync("node", ["dist/cli.js", "--version"]).toString().trim()).toMatch(/^\d+\.\d+\.\d+/);
    const dir = project({ "a.js": "import * as THREE from 'three';\nnew THREE.Geometry();\n" });
    const r = spawnSync("node", ["dist/cli.js", "review", dir, "--three", THREE_DIR, "--fail-on", "error"]);
    expect(r.status).toBe(1);
    expect(r.stdout.toString()).toContain("geometry-class");
    const miss = spawnSync("node", ["dist/cli.js", "api", "Nope", "--three", THREE_DIR]);
    expect(miss.status).toBe(1);
    // doctor and undo take the folder as an argument too, like review and scan
    const pos = spawnSync("node", ["dist/cli.js", "doctor", "examples/agent-mistakes", "--no-env"]).stdout.toString();
    expect(pos).toMatch(/^Threesmith doctor: \d+ error/);
    expect(spawnSync("node", ["dist/cli.js", "doctor", "--path", "examples/agent-mistakes", "--no-env"]).stdout.toString()).toBe(pos);
    expect(spawnSync("node", ["dist/cli.js", "undo", dir, "--list"]).stdout.toString()).toContain("No Threesmith writes");

    const badLimit = spawnSync("node", ["dist/cli.js", "search", "Vector3", "--three", THREE_DIR, "--limit", "abc"]);
    expect(badLimit.status).toBe(2);
    expect(badLimit.stderr.toString()).toContain('threesmith: --limit must be a whole number of 1 or more (got "abc")');

    const zeroLimit = spawnSync("node", ["dist/cli.js", "search", "Vector3", "--three", THREE_DIR, "--limit", "0"]);
    expect(zeroLimit.status).toBe(2);
    expect(zeroLimit.stderr.toString()).toContain('threesmith: --limit must be a whole number of 1 or more (got "0")');

    const negLimit = spawnSync("node", ["dist/cli.js", "search", "Vector3", "--three", THREE_DIR, "--limit", "-3"]);
    expect(negLimit.status).toBe(2);
    expect(negLimit.stderr.toString()).toContain('threesmith: --limit must be a whole number of 1 or more (got "-3")');

    const goodLimit = spawnSync("node", ["dist/cli.js", "search", "Vector3", "--three", THREE_DIR, "--limit", "1"]);
    expect(goodLimit.status).toBe(0);
    expect(goodLimit.stdout.toString()).toContain("Vector3");
  });
});
void join;
