"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");

const bin = path.join(__dirname, "..", "..", "bin", "dev-team.js");
const pkg = require("../../package.json");

describe("CLI --help flag", () => {
  it("exits with code 0 for --help", () => {
    const output = execFileSync(process.execPath, [bin, "--help"], {
      encoding: "utf-8",
    });
    // If we reach here, exit code was 0
    assert.ok(output.length > 0, "should produce help output");
  });

  it("help text contains all subcommands", () => {
    const output = execFileSync(process.execPath, [bin, "--help"], {
      encoding: "utf-8",
    });
    assert.ok(output.includes("init"), "help should mention init");
    assert.ok(output.includes("update"), "help should mention update");
    assert.ok(output.includes("create-agent"), "help should mention create-agent");
    assert.ok(output.includes("doctor"), "help should mention doctor");
    assert.ok(output.includes("status"), "help should mention status");
    assert.ok(!output.includes("mcp"), "help should not mention mcp (removed in v2.0.1)");
  });

  it("exits with code 1 for unknown command", () => {
    assert.throws(
      () => {
        execFileSync(process.execPath, [bin, "nonexistent-command"], {
          encoding: "utf-8",
        });
      },
      (err) => {
        assert.equal(err.status, 1, "should exit with code 1");
        return true;
      },
      "unknown command should exit with code 1",
    );
  });
});

describe("--preset flag parsing", () => {
  it("rejects --presets as not a preset match", () => {
    try {
      execFileSync(process.execPath, [bin, "init", "--presets"], {
        encoding: "utf-8",
        cwd: os.tmpdir(),
      });
    } catch (err) {
      const stderr = err.stderr || "";
      assert.ok(
        !stderr.includes("Unknown preset: s"),
        "--presets should not be parsed as --preset with leftover 's'",
      );
    }
  });

  it("rejects --presetfoo as not a preset match", () => {
    try {
      execFileSync(process.execPath, [bin, "init", "--presetfoo"], {
        encoding: "utf-8",
        cwd: os.tmpdir(),
      });
    } catch (err) {
      const stderr = err.stderr || "";
      assert.ok(
        !stderr.includes("Unknown preset"),
        "--presetfoo should not be parsed as a preset flag",
      );
    }
  });

  it("parses --preset=backend with equals syntax", () => {
    try {
      execFileSync(process.execPath, [bin, "init", "--preset=backend"], {
        encoding: "utf-8",
        cwd: os.tmpdir(),
      });
    } catch (err) {
      const stderr = err.stderr || "";
      if (stderr.includes("Unknown preset")) {
        assert.ok(
          stderr.includes("Unknown preset: backend"),
          "--preset=backend should extract 'backend' as the preset name",
        );
      }
    }
  });

  it("parses --preset backend with space syntax", () => {
    try {
      execFileSync(process.execPath, [bin, "init", "--preset", "backend"], {
        encoding: "utf-8",
        cwd: os.tmpdir(),
      });
    } catch (err) {
      const stderr = err.stderr || "";
      if (stderr.includes("Unknown preset")) {
        assert.ok(
          stderr.includes("Unknown preset: backend"),
          "--preset backend should extract 'backend' as the preset name",
        );
      }
    }
  });
});

describe("CLI --version flag", () => {
  it("prints the version from package.json with --version", () => {
    const output = execFileSync(process.execPath, [bin, "--version"], {
      encoding: "utf-8",
    });
    assert.equal(output.trim(), pkg.version);
  });

  it("prints the version from package.json with -v", () => {
    const output = execFileSync(process.execPath, [bin, "-v"], {
      encoding: "utf-8",
    });
    assert.equal(output.trim(), pkg.version);
  });

  it("exits with code 0", () => {
    // execFileSync throws on non-zero exit, so reaching here means exit 0
    execFileSync(process.execPath, [bin, "--version"], {
      encoding: "utf-8",
    });
  });
});
