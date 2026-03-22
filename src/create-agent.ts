import path from "path";
import { fileExists, writeFile } from "./files";

const AGENT_TEMPLATE = `---
name: dev-team-AGENTNAME
description: ROLE. Use to TRIGGER_CONDITIONS.
tools: Read, Edit, Write, Bash, Grep, Glob, Agent
model: sonnet
memory: project
---

You are AGENTNAME, a ROLE. PERSPECTIVE_STATEMENT.

Your philosophy: "GUIDING_PRINCIPLE."

## How you work

Before starting:
1. Spawn Explore subagents in parallel to understand the codebase area.
2. Read the actual code. Do not rely on descriptions from other agents.
3. Return concise findings to the main thread.

After completing work:
1. Report impacts for other agents.
2. Spawn reviewers as background tasks.

## Focus areas

You always check for:
- **AREA_1**: DESCRIPTION.
- **AREA_2**: DESCRIPTION.

## Challenge style

DESCRIPTION_OF_HOW_THIS_AGENT_FRAMES_CHALLENGES.

## Challenge protocol

When reviewing another agent's work, classify each concern:
- \`[DEFECT]\`: Concretely wrong. Will produce incorrect behavior. **Blocks progress.**
- \`[RISK]\`: Not wrong today, but creates a likely failure mode. Advisory.
- \`[QUESTION]\`: Decision needs justification. Advisory.
- \`[SUGGESTION]\`: Works, but here is a specific improvement. Advisory.

Rules:
1. Every challenge must include a concrete scenario, input, or code reference.
2. Only \`[DEFECT]\` blocks progress.
3. When challenged: address directly, concede when wrong, justify with a counter-scenario when you disagree.
4. One exchange each before escalating to the human.
5. Acknowledge good work when you see it.

## Learning

After completing work, write key learnings to your MEMORY.md:
- DOMAIN_SPECIFIC_LEARNINGS
- Challenges you raised that were accepted (reinforce) or overruled (calibrate)
`;

const MEMORY_TEMPLATE = `# Agent Memory: AGENTNAME
<!-- First 200 lines are loaded into agent context. Keep concise. -->

## Project Conventions


## Patterns to Watch For


## Calibration Log
<!-- Challenges accepted/overruled — tunes adversarial intensity over time -->

`;

export function createAgent(targetDir: string, name: string): void {
  if (!name) {
    console.error("Usage: npx dev-team create-agent <name>");
    console.error("Example: npx dev-team create-agent codd");
    process.exit(1);
  }

  const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const fullName = safeName.startsWith("dev-team-") ? safeName : `dev-team-${safeName}`;
  const displayName = safeName.replace(/^dev-team-/, "");
  const titleName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  const agentPath = path.join(targetDir, ".claude", "agents", `${fullName}.md`);
  const memoryPath = path.join(targetDir, ".claude", "agent-memory", fullName, "MEMORY.md");

  if (fileExists(agentPath)) {
    console.error(`Agent already exists: ${agentPath}`);
    process.exit(1);
  }

  const agentContent = AGENT_TEMPLATE.replace(/AGENTNAME/g, titleName);
  const memoryContent = MEMORY_TEMPLATE.replace(/AGENTNAME/g, `${titleName}`);

  writeFile(agentPath, agentContent);
  writeFile(memoryPath, memoryContent);

  console.log(`\nCreated agent: @${fullName}\n`);
  console.log(`  Agent:  ${agentPath}`);
  console.log(`  Memory: ${memoryPath}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Edit the agent file — fill in ROLE, FOCUS_AREAS, etc.");
  console.log("  2. Add the agent to the table in CLAUDE.md");
  console.log("  3. See docs/custom-agents.md for the full authoring guide");
  console.log("");
}
