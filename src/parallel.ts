/**
 * parallel.ts — Parallel state management for multi-issue orchestration (ADR-019).
 *
 * Manages the `.claude/dev-team-parallel.json` state file that tracks
 * parallel implementation phases, sync barriers, and review waves.
 *
 * Zero runtime dependencies (project constraint from ADR-002).
 */

import fs from "fs";
import path from "path";
import { readFile, writeFile, fileExists } from "./files";

// ─── Types ───────────────────────────────────────────────────────────────────

export type IssueStatus =
  | "pending"
  | "implementing"
  | "implemented"
  | "reviewing"
  | "defects-found"
  | "fixing"
  | "approved";

export type Phase =
  | "pre-assessment"
  | "implementation"
  | "sync-barrier"
  | "review-wave"
  | "defect-routing"
  | "borges-completion"
  | "done";

export interface IssueEntry {
  issue: number;
  branch: string;
  agent: string;
  status: IssueStatus;
  defects?: string[];
  reviewIteration?: number;
}

export interface ReviewWave {
  wave: number;
  startedAt: string;
  completedAt?: string;
  branches: string[];
  findings: Record<string, BranchFindings>;
}

export interface BranchFindings {
  defects: string[];
  risks: string[];
  suggestions: string[];
  questions: string[];
}

export interface ParallelState {
  mode: "parallel";
  issues: IssueEntry[];
  phase: Phase;
  conflictGroups: number[][];
  reviewWave: ReviewWave | null;
  maxIterations: number;
  createdAt: string;
  updatedAt: string;
  phaseLog: PhaseTransition[];
}

export interface PhaseTransition {
  from: Phase;
  to: Phase;
  timestamp: string;
  reason: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const STATE_FILENAME = "dev-team-parallel.json";
export const DEFAULT_MAX_ITERATIONS = 10;

// ─── State file path ─────────────────────────────────────────────────────────

export function statePath(projectRoot: string): string {
  return path.join(projectRoot, ".claude", STATE_FILENAME);
}

// ─── Read / Write ────────────────────────────────────────────────────────────

export function readState(projectRoot: string): ParallelState | null {
  const fp = statePath(projectRoot);
  const content = readFile(fp);
  if (content === null) return null;
  try {
    return JSON.parse(content) as ParallelState;
  } catch {
    return null;
  }
}

export function writeState(projectRoot: string, state: ParallelState): void {
  state.updatedAt = new Date().toISOString();
  const fp = statePath(projectRoot);
  writeFile(fp, JSON.stringify(state, null, 2) + "\n");
}

export function stateExists(projectRoot: string): boolean {
  return fileExists(statePath(projectRoot));
}

export function deleteState(projectRoot: string): boolean {
  const fp = statePath(projectRoot);
  if (!fileExists(fp)) return false;
  fs.unlinkSync(fp);
  return true;
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface CreateOptions {
  issues: Array<{ issue: number; branch: string; agent: string }>;
  conflictGroups?: number[][];
  maxIterations?: number;
}

export function createState(projectRoot: string, options: CreateOptions): ParallelState {
  if (options.issues.length === 0) {
    throw new Error("Cannot create parallel state with zero issues");
  }

  // Validate no duplicate issue numbers
  const issueNumbers = options.issues.map((i) => i.issue);
  const unique = new Set(issueNumbers);
  if (unique.size !== issueNumbers.length) {
    throw new Error("Duplicate issue numbers in parallel state");
  }

  // Validate conflict groups reference existing issues
  for (const group of options.conflictGroups || []) {
    for (const issueNum of group) {
      if (!unique.has(issueNum)) {
        throw new Error(`Conflict group references unknown issue #${issueNum}`);
      }
    }
  }

  const now = new Date().toISOString();
  const state: ParallelState = {
    mode: "parallel",
    issues: options.issues.map((i) => ({
      issue: i.issue,
      branch: i.branch,
      agent: i.agent,
      status: "pending" as IssueStatus,
      reviewIteration: 0,
    })),
    phase: "pre-assessment",
    conflictGroups: options.conflictGroups || [],
    reviewWave: null,
    maxIterations: options.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    createdAt: now,
    updatedAt: now,
    phaseLog: [],
  };

  writeState(projectRoot, state);
  return state;
}

// ─── Phase transitions ──────────────────────────────────────────────────────

export function transitionPhase(state: ParallelState, to: Phase, reason: string): ParallelState {
  const from = state.phase;

  // Validate transition is legal
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid phase transition: ${from} -> ${to}. Allowed from ${from}: ${allowedTransitions(from).join(", ")}`,
    );
  }

  state.phaseLog.push({
    from,
    to,
    timestamp: new Date().toISOString(),
    reason,
  });
  state.phase = to;
  return state;
}

const TRANSITION_MAP: Record<Phase, Phase[]> = {
  "pre-assessment": ["implementation"],
  implementation: ["sync-barrier"],
  "sync-barrier": ["review-wave"],
  "review-wave": ["defect-routing", "borges-completion"],
  "defect-routing": ["review-wave", "borges-completion"],
  "borges-completion": ["done"],
  done: [],
};

export function isValidTransition(from: Phase, to: Phase): boolean {
  return TRANSITION_MAP[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: Phase): Phase[] {
  return TRANSITION_MAP[from] || [];
}

// ─── Issue status updates ────────────────────────────────────────────────────

export function updateIssueStatus(
  state: ParallelState,
  issueNumber: number,
  status: IssueStatus,
): ParallelState {
  const entry = state.issues.find((i) => i.issue === issueNumber);
  if (!entry) {
    throw new Error(`Issue #${issueNumber} not found in parallel state`);
  }
  entry.status = status;
  return state;
}

// ─── Sync barrier ────────────────────────────────────────────────────────────

/**
 * Checks whether ALL implementation agents have completed.
 * Returns true when every issue has status "implemented" or later.
 */
export function checkSyncBarrier(state: ParallelState): {
  ready: boolean;
  pending: number[];
  completed: number[];
} {
  const completedStatuses: IssueStatus[] = [
    "implemented",
    "reviewing",
    "defects-found",
    "fixing",
    "approved",
  ];
  const completed: number[] = [];
  const pending: number[] = [];

  for (const issue of state.issues) {
    if (completedStatuses.includes(issue.status)) {
      completed.push(issue.issue);
    } else {
      pending.push(issue.issue);
    }
  }

  return {
    ready: pending.length === 0,
    pending,
    completed,
  };
}

// ─── Review wave management ──────────────────────────────────────────────────

export function startReviewWave(state: ParallelState): ParallelState {
  const barrier = checkSyncBarrier(state);
  if (!barrier.ready) {
    throw new Error(
      `Cannot start review wave: issues still pending: ${barrier.pending.join(", ")}`,
    );
  }

  const waveNumber = state.reviewWave ? state.reviewWave.wave + 1 : 1;
  const branches = state.issues.map((i) => i.branch);

  state.reviewWave = {
    wave: waveNumber,
    startedAt: new Date().toISOString(),
    branches,
    findings: {},
  };

  // Update all issue statuses to reviewing
  for (const issue of state.issues) {
    if (issue.status !== "approved") {
      issue.status = "reviewing";
    }
  }

  return state;
}

export function recordFindings(
  state: ParallelState,
  branch: string,
  findings: BranchFindings,
): ParallelState {
  if (!state.reviewWave) {
    throw new Error("No active review wave to record findings for");
  }

  const issue = state.issues.find((i) => i.branch === branch);
  if (!issue) {
    throw new Error(`Branch "${branch}" not found in parallel state`);
  }

  state.reviewWave.findings[branch] = findings;

  // Update issue status based on findings
  if (findings.defects.length > 0) {
    issue.status = "defects-found";
    issue.defects = findings.defects;
    issue.reviewIteration = (issue.reviewIteration || 0) + 1;
  } else {
    issue.status = "approved";
    issue.defects = [];
  }

  return state;
}

/**
 * Checks if ALL branches in the current review wave have reported findings.
 */
export function isReviewWaveComplete(state: ParallelState): boolean {
  if (!state.reviewWave) return false;
  const reported = new Set(Object.keys(state.reviewWave.findings));
  return state.reviewWave.branches.every((b) => reported.has(b));
}

// ─── Defect routing ──────────────────────────────────────────────────────────

export interface DefectRoute {
  issue: number;
  branch: string;
  agent: string;
  defects: string[];
  iteration: number;
}

/**
 * Returns defect routes: which issues need fixes routed back to their implementing agent.
 * Respects per-branch iteration limits.
 */
export function getDefectRoutes(state: ParallelState): {
  routes: DefectRoute[];
  exhausted: DefectRoute[];
} {
  const routes: DefectRoute[] = [];
  const exhausted: DefectRoute[] = [];

  for (const issue of state.issues) {
    if (issue.status !== "defects-found") continue;

    const route: DefectRoute = {
      issue: issue.issue,
      branch: issue.branch,
      agent: issue.agent,
      defects: issue.defects || [],
      iteration: issue.reviewIteration || 1,
    };

    if ((issue.reviewIteration || 0) >= state.maxIterations) {
      exhausted.push(route);
    } else {
      routes.push(route);
      issue.status = "fixing";
    }
  }

  return { routes, exhausted };
}

// ─── Convergence check ──────────────────────────────────────────────────────

export interface ConvergenceResult {
  converged: boolean;
  allApproved: boolean;
  exhaustedBranches: number[];
  pendingDefects: number[];
}

/**
 * Checks if the parallel execution has converged (all approved or exhausted).
 */
export function checkConvergence(state: ParallelState): ConvergenceResult {
  const approved: number[] = [];
  const exhausted: number[] = [];
  const pendingDefects: number[] = [];

  for (const issue of state.issues) {
    if (issue.status === "approved") {
      approved.push(issue.issue);
    } else if ((issue.reviewIteration || 0) >= state.maxIterations) {
      exhausted.push(issue.issue);
    } else if (issue.status === "defects-found" || issue.status === "fixing") {
      pendingDefects.push(issue.issue);
    }
  }

  return {
    converged: pendingDefects.length === 0,
    allApproved: approved.length === state.issues.length,
    exhaustedBranches: exhausted,
    pendingDefects,
  };
}

// ─── Conflict group helpers ──────────────────────────────────────────────────

/**
 * Returns issues that can execute in parallel (not in any conflict group with
 * currently-running issues).
 */
export function getIndependentIssues(state: ParallelState): number[] {
  const inConflict = new Set<number>();
  for (const group of state.conflictGroups) {
    for (const num of group) {
      inConflict.add(num);
    }
  }

  return state.issues.filter((i) => !inConflict.has(i.issue)).map((i) => i.issue);
}

/**
 * Returns the conflict group that contains a given issue, or null.
 */
export function getConflictGroup(state: ParallelState, issueNumber: number): number[] | null {
  for (const group of state.conflictGroups) {
    if (group.includes(issueNumber)) {
      return group;
    }
  }
  return null;
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface ParallelSummary {
  phase: Phase;
  totalIssues: number;
  byStatus: Record<IssueStatus, number>;
  currentWave: number | null;
  phaseTransitions: number;
  conflictGroupCount: number;
}

export function summarize(state: ParallelState): ParallelSummary {
  const byStatus: Record<string, number> = {};
  for (const issue of state.issues) {
    byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
  }

  return {
    phase: state.phase,
    totalIssues: state.issues.length,
    byStatus: byStatus as Record<IssueStatus, number>,
    currentWave: state.reviewWave?.wave ?? null,
    phaseTransitions: state.phaseLog.length,
    conflictGroupCount: state.conflictGroups.length,
  };
}
