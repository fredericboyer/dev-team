#!/usr/bin/env node
"use strict";

/**
 * Eval runner for dev-team agents.
 *
 * Constructs a prompt that pairs an agent definition with a known-bad code
 * sample, ready to be manually run against the agent. Does NOT call an LLM.
 *
 * Usage:
 *   node tests/evals/eval-runner.js <agent-name> <sample-file>
 *
 * Examples:
 *   node tests/evals/eval-runner.js szabo tests/evals/samples/sql-injection.js
 *   node tests/evals/eval-runner.js knuth tests/evals/samples/missing-boundary.js
 *   node tests/evals/eval-runner.js brooks tests/evals/samples/complexity.js
 *
 * Output:
 *   Prints the constructed prompt to stdout. Copy-paste into an agent session
 *   or pipe to a file for batch processing.
 *
 * refs #118
 */

const fs = require("node:fs");
const path = require("node:path");

const AGENTS_DIR = path.join(__dirname, "..", "..", "templates", "agents");
const EXPECTED_DIR = path.join(__dirname, "expected");

function usage() {
  console.error(`Usage: node eval-runner.js <agent-name> <sample-file>

Arguments:
  agent-name    Agent short name (e.g., szabo, knuth, brooks)
  sample-file   Path to the known-bad code sample

Example:
  node tests/evals/eval-runner.js szabo tests/evals/samples/sql-injection.js

Available agents:
  szabo   - Security auditor (SQL injection, auth, input trust)
  knuth   - Quality auditor (boundary conditions, coverage gaps)
  brooks  - Architect (complexity, naming, structure)`);
  process.exit(1);
}

function loadAgentDefinition(agentName) {
  const agentFile = path.join(AGENTS_DIR, `dev-team-${agentName}.md`);
  if (!fs.existsSync(agentFile)) {
    console.error(`Error: Agent definition not found: ${agentFile}`);
    console.error(`Available agents:`);
    const agents = fs
      .readdirSync(AGENTS_DIR)
      .filter((f) => f.startsWith("dev-team-") && f.endsWith(".md"))
      .map((f) => f.replace("dev-team-", "").replace(".md", ""));
    agents.forEach((a) => console.error(`  ${a}`));
    process.exit(1);
  }
  return fs.readFileSync(agentFile, "utf-8");
}

function loadSampleCode(samplePath) {
  const resolved = path.resolve(samplePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: Sample file not found: ${resolved}`);
    process.exit(1);
  }
  return {
    content: fs.readFileSync(resolved, "utf-8"),
    filename: path.basename(resolved),
  };
}

function findExpectedFindings(agentName, sampleFilename) {
  const sampleBase = sampleFilename.replace(/\.[^.]+$/, "");
  const expectedFile = path.join(EXPECTED_DIR, `${agentName}-${sampleBase}.md`);
  if (fs.existsSync(expectedFile)) {
    return fs.readFileSync(expectedFile, "utf-8");
  }
  return null;
}

function constructPrompt(agentDefinition, sample, agentName) {
  return `# Agent Evaluation Prompt

## Agent Definition

${agentDefinition}

## Task

Review the following code and produce classified findings. Each finding must
use one of these classifications:
- [DEFECT] — a concrete bug, vulnerability, or violation that must be fixed
- [RISK] — a potential problem that could manifest under specific conditions
- [QUESTION] — an ambiguity that needs clarification before the code can be assessed
- [SUGGESTION] — an improvement that would enhance quality but is not blocking

For each finding, include:
1. The classification tag
2. A concise title
3. The specific line number(s)
4. What the issue is and why it matters
5. A concrete fix or mitigation

## Code to Review

File: \`${sample.filename}\`

\`\`\`javascript
${sample.content}
\`\`\`

## Instructions

- Review this code as if it were submitted in a pull request
- Apply your full agent lens (security for Szabo, correctness for Knuth, etc.)
- Do not assume context beyond what is shown — review the code as presented
- Produce your findings in the classified format above
`;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes("--help") || args.includes("-h")) {
    usage();
  }

  const [agentName, samplePath] = args;

  const agentDefinition = loadAgentDefinition(agentName);
  const sample = loadSampleCode(samplePath);
  const expected = findExpectedFindings(agentName, sample.filename);

  const prompt = constructPrompt(agentDefinition, sample, agentName);

  // Output the prompt
  console.log(prompt);

  // If expected findings exist, output them as a reference section
  if (expected) {
    console.log("\n---\n");
    console.log("# Expected Findings (for comparison after running)");
    console.log("");
    console.log(expected);
  }

  // Summary to stderr so it does not pollute the prompt on stdout
  console.error(`\nEval prompt generated:`);
  console.error(`  Agent:    dev-team-${agentName}`);
  console.error(`  Sample:   ${sample.filename}`);
  console.error(`  Expected: ${expected ? "yes" : "no matching expected file found"}`);
  console.error(`\nCopy the prompt above and run it with the agent to collect findings.`);
  console.error(`Then compare findings against the expected document.`);
}

main();
