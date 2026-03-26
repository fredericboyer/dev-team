#!/usr/bin/env node

/**
 * dev-team-agent-teams-guide.js
 * PreToolUse hook on Agent.
 *
 * Advisory guidance for agent team isolation patterns.
 * Always exits 0 (never blocks) — prints reminders to stderr.
 *
 * Conditions:
 * 1. Implementing agent with team_name but no worktree isolation →
 *    remind to add isolation: "worktree"
 * 2. Agent with worktree isolation but no team_name (when agentTeams enabled) →
 *    suggest using TeamCreate for coordination
 * 3. Read-only agent spawned →
 *    remind to consider whether it needs the implementer's worktree
 */

"use strict";

const fs = require("fs");
const path = require("path");

let input = {};
try {
  input = JSON.parse(process.argv[2] || "{}");
} catch {
  // Malformed input — advisory hook, just exit cleanly
  process.exit(0);
}

const toolInput = input.tool_input || {};
const prompt = (toolInput.prompt || "").toLowerCase();
const teamName = toolInput.team_name || "";
const agentName = toolInput.name || "";
const isolation = toolInput.isolation || "";
const subagentType = toolInput.subagent_type || "";

// Detect read-only agents by name or prompt keywords
const READ_ONLY_AGENTS = [
  "szabo",
  "knuth",
  "brooks",
  "borges",
  "tufte",
  "turing",
  "rams",
  "conway",
  "deming",
];

const agentNameLower = agentName.toLowerCase();
const isReadOnly =
  READ_ONLY_AGENTS.some((a) => agentNameLower.includes(a) || prompt.includes(`@dev-team-${a}`)) ||
  subagentType === "read-only" ||
  prompt.includes("review") ||
  prompt.includes("audit");

// Implementing agents: have team_name but no worktree isolation
if (teamName && !isolation && !isReadOnly) {
  console.error(
    `[dev-team agent-teams-guide] Advisory: implementing teammate "${agentName || "(unnamed)"}" has team_name but no isolation: "worktree". ` +
      `Add isolation: "worktree" to prevent branch conflicts between parallel teammates.`,
  );
}

// Worktree isolation without team coordination (when agent teams are available)
if (isolation === "worktree" && !teamName) {
  let agentTeamsEnabled = false;
  try {
    const configPath = path.join(process.cwd(), ".dev-team", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    agentTeamsEnabled = !!config.agentTeams;
  } catch {
    // No config or parse error — skip this check
  }

  if (agentTeamsEnabled) {
    console.error(
      `[dev-team agent-teams-guide] Advisory: agent "${agentName || "(unnamed)"}" uses worktree isolation without a team_name. ` +
        `Consider using TeamCreate for coordinated parallel work — it provides progress tracking and message passing between teammates.`,
    );
  }
}

// Read-only agent reminder
if (isReadOnly && teamName) {
  console.error(
    `[dev-team agent-teams-guide] Advisory: read-only agent "${agentName || "(unnamed)"}" spawned as teammate. ` +
      `Consider whether it needs access to an implementer's worktree (to run tests or read changed files in context), ` +
      `or should work in its own isolation for independent analysis.`,
  );
}

process.exit(0);
