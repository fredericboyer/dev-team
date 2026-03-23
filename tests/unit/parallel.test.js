"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Import compiled module
const parallel = require("../../dist/parallel");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dev-team-parallel-"));
  fs.mkdirSync(path.join(dir, ".claude"), { recursive: true });
  return dir;
}

function cleanTmpDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

const TWO_ISSUES = {
  issues: [
    { issue: 42, branch: "feat/42-add-auth", agent: "dev-team-voss" },
    { issue: 43, branch: "feat/43-fix-nav", agent: "dev-team-mori" },
  ],
};

const THREE_ISSUES_WITH_CONFLICT = {
  issues: [
    { issue: 42, branch: "feat/42-add-auth", agent: "dev-team-voss" },
    { issue: 43, branch: "feat/43-fix-nav", agent: "dev-team-mori" },
    { issue: 55, branch: "feat/55-update-sidebar", agent: "dev-team-mori" },
  ],
  conflictGroups: [[42, 55]],
};

// ─── State file path ─────────────────────────────────────────────────────────

describe("statePath", () => {
  it("returns path under .claude/", () => {
    const p = parallel.statePath("/projects/myapp");
    assert.equal(p, path.join("/projects/myapp", ".claude", "dev-team-parallel.json"));
  });
});

// ─── Create state ────────────────────────────────────────────────────────────

describe("createState", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("creates state file with correct structure", () => {
    const state = parallel.createState(tmpDir, TWO_ISSUES);

    assert.equal(state.mode, "parallel");
    assert.equal(state.phase, "pre-assessment");
    assert.equal(state.issues.length, 2);
    assert.equal(state.issues[0].issue, 42);
    assert.equal(state.issues[0].status, "pending");
    assert.equal(state.issues[0].reviewIteration, 0);
    assert.deepEqual(state.conflictGroups, []);
    assert.equal(state.reviewWave, null);
    assert.equal(state.maxIterations, 10);
    assert.ok(state.createdAt);
    assert.ok(state.updatedAt);
    assert.deepEqual(state.phaseLog, []);
  });

  it("writes state to disk", () => {
    parallel.createState(tmpDir, TWO_ISSUES);
    assert.ok(parallel.stateExists(tmpDir));
  });

  it("preserves conflict groups", () => {
    const state = parallel.createState(tmpDir, THREE_ISSUES_WITH_CONFLICT);
    assert.deepEqual(state.conflictGroups, [[42, 55]]);
  });

  it("accepts custom maxIterations", () => {
    const state = parallel.createState(tmpDir, { ...TWO_ISSUES, maxIterations: 5 });
    assert.equal(state.maxIterations, 5);
  });

  it("rejects empty issues array", () => {
    assert.throws(() => parallel.createState(tmpDir, { issues: [] }), /zero issues/);
  });

  it("rejects duplicate issue numbers", () => {
    assert.throws(
      () =>
        parallel.createState(tmpDir, {
          issues: [
            { issue: 42, branch: "feat/42-a", agent: "dev-team-voss" },
            { issue: 42, branch: "feat/42-b", agent: "dev-team-mori" },
          ],
        }),
      /Duplicate/,
    );
  });

  it("rejects conflict groups referencing unknown issues", () => {
    assert.throws(
      () =>
        parallel.createState(tmpDir, {
          ...TWO_ISSUES,
          conflictGroups: [[42, 999]],
        }),
      /unknown issue #999/,
    );
  });
});

// ─── Read / Write ────────────────────────────────────────────────────────────

describe("readState / writeState", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("returns null when no state file", () => {
    assert.equal(parallel.readState(tmpDir), null);
  });

  it("round-trips state correctly", () => {
    const original = parallel.createState(tmpDir, TWO_ISSUES);
    const loaded = parallel.readState(tmpDir);
    assert.deepEqual(loaded.issues, original.issues);
    assert.equal(loaded.phase, original.phase);
  });

  it("returns null for corrupted JSON", () => {
    const fp = parallel.statePath(tmpDir);
    fs.writeFileSync(fp, "{ broken json");
    assert.equal(parallel.readState(tmpDir), null);
  });
});

// ─── Delete state ────────────────────────────────────────────────────────────

describe("deleteState", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("removes existing state file", () => {
    parallel.createState(tmpDir, TWO_ISSUES);
    assert.ok(parallel.stateExists(tmpDir));
    const result = parallel.deleteState(tmpDir);
    assert.equal(result, true);
    assert.ok(!parallel.stateExists(tmpDir));
  });

  it("returns false when no file exists", () => {
    assert.equal(parallel.deleteState(tmpDir), false);
  });
});

// ─── Phase transitions ──────────────────────────────────────────────────────

describe("transitionPhase", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("allows valid transition: pre-assessment -> implementation", () => {
    const updated = parallel.transitionPhase(state, "implementation", "Brooks assessment done");
    assert.equal(updated.phase, "implementation");
    assert.equal(updated.phaseLog.length, 1);
    assert.equal(updated.phaseLog[0].from, "pre-assessment");
    assert.equal(updated.phaseLog[0].to, "implementation");
    assert.equal(updated.phaseLog[0].reason, "Brooks assessment done");
  });

  it("allows valid transition chain through all phases", () => {
    parallel.transitionPhase(state, "implementation", "start");
    parallel.transitionPhase(state, "sync-barrier", "all done");
    parallel.transitionPhase(state, "review-wave", "barrier passed");
    parallel.transitionPhase(state, "borges-completion", "no defects");
    parallel.transitionPhase(state, "done", "borges complete");
    assert.equal(state.phase, "done");
    assert.equal(state.phaseLog.length, 5);
  });

  it("allows defect-routing loop", () => {
    parallel.transitionPhase(state, "implementation", "start");
    parallel.transitionPhase(state, "sync-barrier", "all done");
    parallel.transitionPhase(state, "review-wave", "wave 1");
    parallel.transitionPhase(state, "defect-routing", "defects found");
    parallel.transitionPhase(state, "review-wave", "wave 2");
    assert.equal(state.phase, "review-wave");
    assert.equal(state.phaseLog.length, 5);
  });

  it("rejects invalid transition", () => {
    assert.throws(
      () => parallel.transitionPhase(state, "review-wave", "skipping ahead"),
      /Invalid phase transition/,
    );
  });

  it("rejects transition from done", () => {
    parallel.transitionPhase(state, "implementation", "start");
    parallel.transitionPhase(state, "sync-barrier", "done");
    parallel.transitionPhase(state, "review-wave", "wave");
    parallel.transitionPhase(state, "borges-completion", "clean");
    parallel.transitionPhase(state, "done", "complete");
    assert.throws(
      () => parallel.transitionPhase(state, "implementation", "restart"),
      /Invalid phase transition/,
    );
  });
});

// ─── isValidTransition ──────────────────────────────────────────────────────

describe("isValidTransition", () => {
  it("returns true for valid transitions", () => {
    assert.ok(parallel.isValidTransition("pre-assessment", "implementation"));
    assert.ok(parallel.isValidTransition("implementation", "sync-barrier"));
    assert.ok(parallel.isValidTransition("sync-barrier", "review-wave"));
    assert.ok(parallel.isValidTransition("review-wave", "defect-routing"));
    assert.ok(parallel.isValidTransition("review-wave", "borges-completion"));
    assert.ok(parallel.isValidTransition("defect-routing", "review-wave"));
    assert.ok(parallel.isValidTransition("defect-routing", "borges-completion"));
    assert.ok(parallel.isValidTransition("borges-completion", "done"));
  });

  it("returns false for invalid transitions", () => {
    assert.ok(!parallel.isValidTransition("pre-assessment", "review-wave"));
    assert.ok(!parallel.isValidTransition("implementation", "review-wave"));
    assert.ok(!parallel.isValidTransition("done", "implementation"));
    assert.ok(!parallel.isValidTransition("sync-barrier", "implementation"));
  });
});

// ─── Update issue status ─────────────────────────────────────────────────────

describe("updateIssueStatus", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("updates an existing issue status", () => {
    parallel.updateIssueStatus(state, 42, "implementing");
    assert.equal(state.issues[0].status, "implementing");
  });

  it("throws for unknown issue", () => {
    assert.throws(
      () => parallel.updateIssueStatus(state, 999, "implementing"),
      /Issue #999 not found/,
    );
  });
});

// ─── Sync barrier ────────────────────────────────────────────────────────────

describe("checkSyncBarrier", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("returns not ready when issues are pending", () => {
    const result = parallel.checkSyncBarrier(state);
    assert.equal(result.ready, false);
    assert.deepEqual(result.pending, [42, 43]);
    assert.deepEqual(result.completed, []);
  });

  it("returns not ready when some implementing", () => {
    parallel.updateIssueStatus(state, 42, "implemented");
    parallel.updateIssueStatus(state, 43, "implementing");
    const result = parallel.checkSyncBarrier(state);
    assert.equal(result.ready, false);
    assert.deepEqual(result.pending, [43]);
    assert.deepEqual(result.completed, [42]);
  });

  it("returns ready when all implemented", () => {
    parallel.updateIssueStatus(state, 42, "implemented");
    parallel.updateIssueStatus(state, 43, "implemented");
    const result = parallel.checkSyncBarrier(state);
    assert.equal(result.ready, true);
    assert.deepEqual(result.pending, []);
    assert.deepEqual(result.completed, [42, 43]);
  });

  it("treats approved as completed", () => {
    parallel.updateIssueStatus(state, 42, "approved");
    parallel.updateIssueStatus(state, 43, "implemented");
    const result = parallel.checkSyncBarrier(state);
    assert.equal(result.ready, true);
  });
});

// ─── Review wave ─────────────────────────────────────────────────────────────

describe("startReviewWave", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
    parallel.updateIssueStatus(state, 42, "implemented");
    parallel.updateIssueStatus(state, 43, "implemented");
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("creates review wave when barrier passed", () => {
    parallel.startReviewWave(state);
    assert.ok(state.reviewWave);
    assert.equal(state.reviewWave.wave, 1);
    assert.deepEqual(state.reviewWave.branches, ["feat/42-add-auth", "feat/43-fix-nav"]);
    assert.ok(state.reviewWave.startedAt);
    assert.deepEqual(state.reviewWave.findings, {});
  });

  it("sets all non-approved issues to reviewing", () => {
    parallel.startReviewWave(state);
    assert.equal(state.issues[0].status, "reviewing");
    assert.equal(state.issues[1].status, "reviewing");
  });

  it("preserves approved status", () => {
    parallel.updateIssueStatus(state, 42, "approved");
    parallel.startReviewWave(state);
    assert.equal(state.issues[0].status, "approved");
    assert.equal(state.issues[1].status, "reviewing");
  });

  it("throws when barrier not passed", () => {
    parallel.updateIssueStatus(state, 43, "implementing");
    assert.throws(() => parallel.startReviewWave(state), /still pending/);
  });

  it("increments wave number on subsequent waves", () => {
    parallel.startReviewWave(state);
    assert.equal(state.reviewWave.wave, 1);

    // Simulate: record findings, fix, start another wave
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: ["bug"],
      risks: [],
      suggestions: [],
      questions: [],
    });
    parallel.recordFindings(state, "feat/43-fix-nav", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });
    parallel.updateIssueStatus(state, 42, "implemented");
    parallel.startReviewWave(state);
    assert.equal(state.reviewWave.wave, 2);
  });
});

// ─── Record findings ─────────────────────────────────────────────────────────

describe("recordFindings", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
    parallel.updateIssueStatus(state, 42, "implemented");
    parallel.updateIssueStatus(state, 43, "implemented");
    parallel.startReviewWave(state);
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("records clean findings — sets approved", () => {
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: [],
      risks: ["minor risk"],
      suggestions: [],
      questions: [],
    });
    assert.equal(state.issues[0].status, "approved");
    assert.deepEqual(state.issues[0].defects, []);
  });

  it("records defects — sets defects-found", () => {
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: ["Missing null check"],
      risks: [],
      suggestions: [],
      questions: [],
    });
    assert.equal(state.issues[0].status, "defects-found");
    assert.deepEqual(state.issues[0].defects, ["Missing null check"]);
    assert.equal(state.issues[0].reviewIteration, 1);
  });

  it("throws for unknown branch", () => {
    assert.throws(
      () =>
        parallel.recordFindings(state, "feat/999-unknown", {
          defects: [],
          risks: [],
          suggestions: [],
          questions: [],
        }),
      /not found/,
    );
  });

  it("throws when no review wave active", () => {
    state.reviewWave = null;
    assert.throws(
      () =>
        parallel.recordFindings(state, "feat/42-add-auth", {
          defects: [],
          risks: [],
          suggestions: [],
          questions: [],
        }),
      /No active review wave/,
    );
  });
});

// ─── isReviewWaveComplete ────────────────────────────────────────────────────

describe("isReviewWaveComplete", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
    parallel.updateIssueStatus(state, 42, "implemented");
    parallel.updateIssueStatus(state, 43, "implemented");
    parallel.startReviewWave(state);
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("returns false when no findings reported", () => {
    assert.equal(parallel.isReviewWaveComplete(state), false);
  });

  it("returns false when partial findings", () => {
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });
    assert.equal(parallel.isReviewWaveComplete(state), false);
  });

  it("returns true when all branches reported", () => {
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });
    parallel.recordFindings(state, "feat/43-fix-nav", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });
    assert.equal(parallel.isReviewWaveComplete(state), true);
  });

  it("returns false when no review wave", () => {
    state.reviewWave = null;
    assert.equal(parallel.isReviewWaveComplete(state), false);
  });
});

// ─── Defect routing ──────────────────────────────────────────────────────────

describe("getDefectRoutes", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
    parallel.updateIssueStatus(state, 42, "implemented");
    parallel.updateIssueStatus(state, 43, "implemented");
    parallel.startReviewWave(state);
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("returns routes for issues with defects", () => {
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: ["Bug A"],
      risks: [],
      suggestions: [],
      questions: [],
    });
    parallel.recordFindings(state, "feat/43-fix-nav", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });

    const { routes, exhausted } = parallel.getDefectRoutes(state);
    assert.equal(routes.length, 1);
    assert.equal(routes[0].issue, 42);
    assert.equal(routes[0].agent, "dev-team-voss");
    assert.deepEqual(routes[0].defects, ["Bug A"]);
    assert.equal(exhausted.length, 0);
    // Issue should now be "fixing"
    assert.equal(state.issues[0].status, "fixing");
  });

  it("returns empty when no defects", () => {
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });
    parallel.recordFindings(state, "feat/43-fix-nav", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });

    const { routes, exhausted } = parallel.getDefectRoutes(state);
    assert.equal(routes.length, 0);
    assert.equal(exhausted.length, 0);
  });

  it("marks exhausted when iteration limit reached", () => {
    state.maxIterations = 1;
    parallel.recordFindings(state, "feat/42-add-auth", {
      defects: ["Bug A"],
      risks: [],
      suggestions: [],
      questions: [],
    });
    parallel.recordFindings(state, "feat/43-fix-nav", {
      defects: [],
      risks: [],
      suggestions: [],
      questions: [],
    });

    const { routes, exhausted } = parallel.getDefectRoutes(state);
    assert.equal(routes.length, 0);
    assert.equal(exhausted.length, 1);
    assert.equal(exhausted[0].issue, 42);
  });
});

// ─── Convergence ─────────────────────────────────────────────────────────────

describe("checkConvergence", () => {
  let tmpDir;
  let state;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    state = parallel.createState(tmpDir, TWO_ISSUES);
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("not converged when issues pending", () => {
    const result = parallel.checkConvergence(state);
    // pending issues are neither approved nor defects — they are converged vacuously
    assert.equal(result.converged, true);
    assert.equal(result.allApproved, false);
  });

  it("converged when all approved", () => {
    parallel.updateIssueStatus(state, 42, "approved");
    parallel.updateIssueStatus(state, 43, "approved");
    const result = parallel.checkConvergence(state);
    assert.equal(result.converged, true);
    assert.equal(result.allApproved, true);
    assert.deepEqual(result.exhaustedBranches, []);
    assert.deepEqual(result.pendingDefects, []);
  });

  it("not converged when defects pending", () => {
    parallel.updateIssueStatus(state, 42, "defects-found");
    parallel.updateIssueStatus(state, 43, "approved");
    const result = parallel.checkConvergence(state);
    assert.equal(result.converged, false);
    assert.equal(result.allApproved, false);
    assert.deepEqual(result.pendingDefects, [42]);
  });

  it("converged with exhausted branches (iteration limit reached)", () => {
    state.maxIterations = 1;
    state.issues[0].reviewIteration = 1;
    parallel.updateIssueStatus(state, 42, "defects-found");
    parallel.updateIssueStatus(state, 43, "approved");
    const result = parallel.checkConvergence(state);
    // Exhausted branches are converged — no more iterations possible
    assert.equal(result.converged, true);
    assert.equal(result.allApproved, false);
    assert.deepEqual(result.exhaustedBranches, [42]);
    assert.deepEqual(result.pendingDefects, []);
  });
});

// ─── Conflict group helpers ──────────────────────────────────────────────────

describe("getIndependentIssues", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("returns all issues when no conflict groups", () => {
    const state = parallel.createState(tmpDir, TWO_ISSUES);
    const independent = parallel.getIndependentIssues(state);
    assert.deepEqual(independent, [42, 43]);
  });

  it("excludes issues in conflict groups", () => {
    const state = parallel.createState(tmpDir, THREE_ISSUES_WITH_CONFLICT);
    const independent = parallel.getIndependentIssues(state);
    assert.deepEqual(independent, [43]);
  });
});

describe("getConflictGroup", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("returns the group containing the issue", () => {
    const state = parallel.createState(tmpDir, THREE_ISSUES_WITH_CONFLICT);
    assert.deepEqual(parallel.getConflictGroup(state, 42), [42, 55]);
    assert.deepEqual(parallel.getConflictGroup(state, 55), [42, 55]);
  });

  it("returns null for independent issue", () => {
    const state = parallel.createState(tmpDir, THREE_ISSUES_WITH_CONFLICT);
    assert.equal(parallel.getConflictGroup(state, 43), null);
  });
});

// ─── Summary ─────────────────────────────────────────────────────────────────

describe("summarize", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("returns correct summary", () => {
    const state = parallel.createState(tmpDir, TWO_ISSUES);
    parallel.updateIssueStatus(state, 42, "implementing");

    const summary = parallel.summarize(state);
    assert.equal(summary.phase, "pre-assessment");
    assert.equal(summary.totalIssues, 2);
    assert.equal(summary.byStatus["implementing"], 1);
    assert.equal(summary.byStatus["pending"], 1);
    assert.equal(summary.currentWave, null);
    assert.equal(summary.phaseTransitions, 0);
    assert.equal(summary.conflictGroupCount, 0);
  });
});

// ─── Parallel loop hook ──────────────────────────────────────────────────────

describe("dev-team-parallel-loop hook", () => {
  const { execFileSync } = require("child_process");
  const HOOK_PATH = path.join(
    __dirname,
    "..",
    "..",
    "templates",
    "hooks",
    "dev-team-parallel-loop.js",
  );
  let tmpDir;

  function runHookInDir(dir) {
    try {
      const stdout = execFileSync(process.execPath, [HOOK_PATH], {
        encoding: "utf-8",
        timeout: 5000,
        cwd: dir,
      });
      return { code: 0, stdout, stderr: "" };
    } catch (err) {
      return { code: err.status, stdout: err.stdout || "", stderr: err.stderr || "" };
    }
  }

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });
  afterEach(() => {
    cleanTmpDir(tmpDir);
  });

  it("exits cleanly when no state file", () => {
    const result = runHookInDir(tmpDir);
    assert.equal(result.code, 0);
  });

  it("blocks during implementation when issues pending", () => {
    const state = {
      mode: "parallel",
      issues: [
        { issue: 42, branch: "feat/42-a", agent: "voss", status: "implementing" },
        { issue: 43, branch: "feat/43-b", agent: "mori", status: "implemented" },
      ],
      phase: "implementation",
      conflictGroups: [],
      reviewWave: null,
    };
    fs.writeFileSync(path.join(tmpDir, ".claude", "dev-team-parallel.json"), JSON.stringify(state));

    const result = runHookInDir(tmpDir);
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("SYNC BARRIER"));
    assert.ok(result.stdout.includes("#42"));
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.decision, "block");
  });

  it("allows exit when all implemented", () => {
    const state = {
      mode: "parallel",
      issues: [
        { issue: 42, branch: "feat/42-a", agent: "voss", status: "implemented" },
        { issue: 43, branch: "feat/43-b", agent: "mori", status: "implemented" },
      ],
      phase: "implementation",
      conflictGroups: [],
      reviewWave: null,
    };
    fs.writeFileSync(path.join(tmpDir, ".claude", "dev-team-parallel.json"), JSON.stringify(state));

    const result = runHookInDir(tmpDir);
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("All 2 implementations complete"));
  });

  it("cleans up state when phase is done", () => {
    const state = {
      mode: "parallel",
      issues: [],
      phase: "done",
      conflictGroups: [],
      reviewWave: null,
    };
    const fp = path.join(tmpDir, ".claude", "dev-team-parallel.json");
    fs.writeFileSync(fp, JSON.stringify(state));

    const result = runHookInDir(tmpDir);
    assert.equal(result.code, 0);
    assert.ok(!fs.existsSync(fp));
  });

  it("handles corrupted state gracefully", () => {
    fs.writeFileSync(path.join(tmpDir, ".claude", "dev-team-parallel.json"), "{ broken");

    const result = runHookInDir(tmpDir);
    assert.equal(result.code, 0);
  });

  it("blocks during sync-barrier phase", () => {
    const state = {
      mode: "parallel",
      issues: [{ issue: 42, branch: "feat/42-a", agent: "voss", status: "implemented" }],
      phase: "sync-barrier",
      conflictGroups: [],
      reviewWave: null,
    };
    fs.writeFileSync(path.join(tmpDir, ".claude", "dev-team-parallel.json"), JSON.stringify(state));

    const result = runHookInDir(tmpDir);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.decision, "block");
    assert.ok(parsed.reason.includes("review wave"));
  });

  it("blocks during review-wave when reviews pending", () => {
    const state = {
      mode: "parallel",
      issues: [{ issue: 42, branch: "feat/42-a", agent: "voss", status: "reviewing" }],
      phase: "review-wave",
      conflictGroups: [],
      reviewWave: {
        wave: 1,
        startedAt: new Date().toISOString(),
        branches: ["feat/42-a"],
        findings: {},
      },
    };
    fs.writeFileSync(path.join(tmpDir, ".claude", "dev-team-parallel.json"), JSON.stringify(state));

    const result = runHookInDir(tmpDir);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.decision, "block");
    assert.ok(parsed.reason.includes("awaiting review"));
  });

  it("allows exit when review wave complete", () => {
    const state = {
      mode: "parallel",
      issues: [{ issue: 42, branch: "feat/42-a", agent: "voss", status: "reviewing" }],
      phase: "review-wave",
      conflictGroups: [],
      reviewWave: {
        wave: 1,
        startedAt: new Date().toISOString(),
        branches: ["feat/42-a"],
        findings: { "feat/42-a": { defects: [], risks: [], suggestions: [], questions: [] } },
      },
    };
    fs.writeFileSync(path.join(tmpDir, ".claude", "dev-team-parallel.json"), JSON.stringify(state));

    const result = runHookInDir(tmpDir);
    assert.equal(result.code, 0);
    assert.ok(result.stdout.includes("Review wave complete"));
  });

  it("blocks during borges-completion phase", () => {
    const state = {
      mode: "parallel",
      issues: [],
      phase: "borges-completion",
      conflictGroups: [],
      reviewWave: null,
    };
    fs.writeFileSync(path.join(tmpDir, ".claude", "dev-team-parallel.json"), JSON.stringify(state));

    const result = runHookInDir(tmpDir);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.decision, "block");
    assert.ok(parsed.reason.includes("Borges"));
  });
});
