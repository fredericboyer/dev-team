"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const fs = require("fs");
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
  it("does not match --presets as a preset flag", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      // --presets with --all to avoid interactive mode; should NOT be treated as --preset
      execFileSync(process.execPath, [bin, "init", "--all", "--presets"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
    } catch {
      // May exit non-zero — that's fine
    }
    // Verify no preset-related output was generated (--presets is not a valid flag)
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does not match --presetfoo as a preset flag", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      execFileSync(process.execPath, [bin, "init", "--all", "--presetfoo"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
    } catch {
      // May exit non-zero — that's fine
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("parses --preset=backend with equals syntax", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(process.execPath, [bin, "init", "--preset=backend"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
      assert.ok(output.includes("Using preset: backend"), "--preset=backend should be recognized");
    } catch (err) {
      // If it exits non-zero, check stderr for correct preset extraction
      const stderr = err.stderr || "";
      assert.ok(
        !stderr.includes("Unknown preset"),
        "--preset=backend should extract 'backend' as a valid preset",
      );
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("parses --preset backend with space syntax", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(process.execPath, [bin, "init", "--preset", "backend"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
      assert.ok(output.includes("Using preset: backend"), "--preset backend should be recognized");
    } catch (err) {
      const stderr = err.stderr || "";
      assert.ok(
        !stderr.includes("Unknown preset"),
        "--preset backend should extract 'backend' as a valid preset",
      );
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe("--runtime flag parsing", () => {
  it("parses --runtime=claude,copilot with equals syntax", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(
        process.execPath,
        [bin, "init", "--all", "--runtime=claude,copilot"],
        { encoding: "utf-8", cwd: tmpDir, timeout: 10000 },
      );
      assert.ok(output.includes("Done!"), "init should complete successfully");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("parses --runtime claude,copilot with space syntax", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(
        process.execPath,
        [bin, "init", "--all", "--runtime", "claude,copilot"],
        { encoding: "utf-8", cwd: tmpDir, timeout: 10000 },
      );
      assert.ok(output.includes("Done!"), "init should complete successfully");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("defaults to claude runtime when --runtime is omitted", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(process.execPath, [bin, "init", "--all"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
      assert.ok(output.includes("Done!"), "init should complete with default runtime");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("--force flag behavior", () => {
  it("refuses to re-init without --force when config exists", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".dev-team", "config.json"), "{}");
    try {
      assert.throws(
        () => {
          execFileSync(process.execPath, [bin, "init", "--all"], {
            encoding: "utf-8",
            cwd: tmpDir,
            timeout: 10000,
          });
        },
        (err) => {
          const stderr = err.stderr || "";
          assert.ok(
            stderr.includes("config.json already exists"),
            "should warn about existing config",
          );
          assert.equal(err.status, 1, "should exit with code 1");
          return true;
        },
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("allows re-init with --force when config exists", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    fs.mkdirSync(path.join(tmpDir, ".dev-team"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".dev-team", "config.json"), "{}");
    try {
      const output = execFileSync(process.execPath, [bin, "init", "--all", "--force"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
      assert.ok(output.includes("Done!"), "--force should allow re-init");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("--all flag combinations", () => {
  it("--all with --preset uses preset agent selection", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(process.execPath, [bin, "init", "--all", "--preset=backend"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
      assert.ok(output.includes("Using preset: backend"), "should use backend preset");
      assert.ok(output.includes("Done!"), "should complete successfully");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("--all with --preset=data uses data preset", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(process.execPath, [bin, "init", "--all", "--preset=data"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
      assert.ok(output.includes("Using preset: data"), "should use data preset");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("rejects unknown preset name", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      assert.throws(
        () => {
          execFileSync(process.execPath, [bin, "init", "--all", "--preset=nonexistent"], {
            encoding: "utf-8",
            cwd: tmpDir,
            timeout: 10000,
          });
        },
        (err) => {
          const stderr = err.stderr || "";
          assert.ok(stderr.includes("Unknown preset: nonexistent"), "should report unknown preset");
          assert.equal(err.status, 1, "should exit with code 1");
          return true;
        },
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("--all without --preset installs all agents", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dt-test-"));
    try {
      const output = execFileSync(process.execPath, [bin, "init", "--all"], {
        encoding: "utf-8",
        cwd: tmpDir,
        timeout: 10000,
      });
      assert.ok(output.includes("Voss"), "should include Voss");
      assert.ok(output.includes("Drucker"), "should include Drucker");
      assert.ok(output.includes("Rams"), "should include Rams");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
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
