"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

/**
 * prompts.ts functions (confirm, checkbox, select, input) all depend on
 * readline.createInterface with stdin/stdout. We test the core logic by
 * importing the module and driving the readline interface programmatically.
 *
 * The module exports: confirm, checkbox, select, input
 */
const { confirm, checkbox, select, input } = require("../../dist/prompts");
const readline = require("readline");

/**
 * Helper: stub readline so the question callback fires with `answer`.
 * Restores after the returned promise resolves.
 */
function withStubReadline(answer, fn) {
  const original = readline.createInterface;
  readline.createInterface = () => ({
    question: (_prompt, cb) => cb(answer),
    close: () => {},
  });

  let result;
  try {
    result = fn();
  } catch (err) {
    readline.createInterface = original;
    throw err;
  }

  // For sync functions, restore immediately
  if (!result || typeof result.then !== "function") {
    readline.createInterface = original;
    return result;
  }

  // For async functions, restore after the promise settles
  return result.finally(() => {
    readline.createInterface = original;
  });
}

// ─── confirm ─────────────────────────────────────────────────────────────────

describe("confirm", () => {
  it("returns true for empty input when defaultYes is true", async () => {
    const result = await withStubReadline("", () => confirm("Continue?", true));
    assert.equal(result, true);
  });

  it("returns false for empty input when defaultYes is false", async () => {
    const result = await withStubReadline("", () => confirm("Continue?", false));
    assert.equal(result, false);
  });

  it("returns true for 'y'", async () => {
    const result = await withStubReadline("y", () => confirm("Continue?"));
    assert.equal(result, true);
  });

  it("returns true for 'yes'", async () => {
    const result = await withStubReadline("yes", () => confirm("Continue?"));
    assert.equal(result, true);
  });

  it("returns true for 'YES' (case insensitive)", async () => {
    const result = await withStubReadline("YES", () => confirm("Continue?"));
    assert.equal(result, true);
  });

  it("returns false for 'n'", async () => {
    const result = await withStubReadline("n", () => confirm("Continue?"));
    assert.equal(result, false);
  });

  it("returns false for any non-yes answer", async () => {
    const result = await withStubReadline("maybe", () => confirm("Continue?"));
    assert.equal(result, false);
  });

  it("trims whitespace from answer", async () => {
    const result = await withStubReadline("  y  ", () => confirm("Continue?"));
    assert.equal(result, true);
  });
});

// ─── checkbox (XOR toggle logic) ─────────────────────────────────────────────

describe("checkbox", () => {
  const items = [
    { label: "A", description: "First", defaultSelected: true },
    { label: "B", description: "Second", defaultSelected: false },
    { label: "C", description: "Third", defaultSelected: true },
  ];

  // Suppress console.log output from checkbox
  let originalLog;
  function suppressLog() {
    originalLog = console.log;
    console.log = () => {};
  }
  function restoreLog() {
    console.log = originalLog;
  }

  it("returns defaults when input is empty", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("", () => checkbox("Pick:", items));
      assert.deepEqual(result, ["A", "C"]);
    } finally {
      restoreLog();
    }
  });

  it("toggles a default-on item OFF when its number is entered", async () => {
    suppressLog();
    try {
      // Toggle item 1 (A, default ON) -> should turn OFF
      const result = await withStubReadline("1", () => checkbox("Pick:", items));
      // A toggled off, B stays off, C stays on
      assert.deepEqual(result, ["C"]);
    } finally {
      restoreLog();
    }
  });

  it("toggles a default-off item ON when its number is entered", async () => {
    suppressLog();
    try {
      // Toggle item 2 (B, default OFF) -> should turn ON
      const result = await withStubReadline("2", () => checkbox("Pick:", items));
      // A stays on, B toggled on, C stays on
      assert.deepEqual(result, ["A", "B", "C"]);
    } finally {
      restoreLog();
    }
  });

  it("handles multiple toggles simultaneously", async () => {
    suppressLog();
    try {
      // Toggle 1 (A off) and 2 (B on)
      const result = await withStubReadline("1 2", () => checkbox("Pick:", items));
      assert.deepEqual(result, ["B", "C"]);
    } finally {
      restoreLog();
    }
  });

  it("handles comma-separated input", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("1,3", () => checkbox("Pick:", items));
      // Both A and C toggled off (both were default on)
      assert.deepEqual(result, []);
    } finally {
      restoreLog();
    }
  });

  it("ignores out-of-range numbers", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("0 5 99", () => checkbox("Pick:", items));
      // No valid toggles — returns defaults
      assert.deepEqual(result, ["A", "C"]);
    } finally {
      restoreLog();
    }
  });

  it("ignores non-numeric input gracefully", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("abc", () => checkbox("Pick:", items));
      // NaN is filtered out — returns defaults via XOR
      assert.deepEqual(result, ["A", "C"]);
    } finally {
      restoreLog();
    }
  });

  it("handles toggling all items", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("1 2 3", () => checkbox("Pick:", items));
      // A off, B on, C off
      assert.deepEqual(result, ["B"]);
    } finally {
      restoreLog();
    }
  });
});

// ─── select ──────────────────────────────────────────────────────────────────

describe("select", () => {
  const options = [
    { label: "Alpha", description: "First option" },
    { label: "Beta", description: "Second option" },
    { label: "Gamma", description: "Third option" },
  ];

  let originalLog;
  function suppressLog() {
    originalLog = console.log;
    console.log = () => {};
  }
  function restoreLog() {
    console.log = originalLog;
  }

  it("returns first option on empty input", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("", () => select("Choose:", options));
      assert.equal(result, "Alpha");
    } finally {
      restoreLog();
    }
  });

  it("returns selected option by number", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("2", () => select("Choose:", options));
      assert.equal(result, "Beta");
    } finally {
      restoreLog();
    }
  });

  it("returns last option by number", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("3", () => select("Choose:", options));
      assert.equal(result, "Gamma");
    } finally {
      restoreLog();
    }
  });

  it("falls back to first option for out-of-range input", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("99", () => select("Choose:", options));
      assert.equal(result, "Alpha");
    } finally {
      restoreLog();
    }
  });

  it("falls back to first option for zero", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("0", () => select("Choose:", options));
      assert.equal(result, "Alpha");
    } finally {
      restoreLog();
    }
  });

  it("falls back to first option for non-numeric input", async () => {
    suppressLog();
    try {
      const result = await withStubReadline("abc", () => select("Choose:", options));
      assert.equal(result, "Alpha");
    } finally {
      restoreLog();
    }
  });
});

// ─── input ───────────────────────────────────────────────────────────────────

describe("input", () => {
  it("returns typed text", async () => {
    const result = await withStubReadline("hello world", () => input("Name?"));
    assert.equal(result, "hello world");
  });

  it("returns default when input is empty", async () => {
    const result = await withStubReadline("", () => input("Name?", "default-val"));
    assert.equal(result, "default-val");
  });

  it("returns empty string when no default and empty input", async () => {
    const result = await withStubReadline("", () => input("Name?"));
    assert.equal(result, "");
  });

  it("trims whitespace from input", async () => {
    const result = await withStubReadline("  trimmed  ", () => input("Name?"));
    assert.equal(result, "trimmed");
  });

  it("uses typed text over default when provided", async () => {
    const result = await withStubReadline("custom", () => input("Name?", "default-val"));
    assert.equal(result, "custom");
  });
});
