/**
 * Adapter interface and registry for multi-runtime agent installation.
 *
 * Each adapter translates canonical agent definitions into a runtime's
 * native format. The Claude Code adapter is an identity transform —
 * the canonical format IS the Claude Code format.
 *
 * See ADR-036 for the architectural decision.
 */

import path from "path";
import type { CanonicalAgentDefinition } from "./canonical.js";
import { copyFile, fileExists, readFile, templateDir } from "../files.js";

/**
 * Adapter interface. Each runtime adapter implements generate() for
 * first-time installation and update() for upgrading existing installations.
 */
export interface RuntimeAdapter {
  /** Runtime identifier (e.g., "claude", "codex", "copilot"). */
  readonly id: string;

  /** Human-readable name (e.g., "Claude Code"). */
  readonly name: string;

  /**
   * Generate agent artifacts for first-time installation.
   * @param definitions Parsed canonical agent definitions
   * @param targetDir Project root directory
   */
  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void;

  /**
   * Update existing agent artifacts to match latest definitions.
   * Preserves user customizations where applicable.
   * @param definitions Parsed canonical agent definitions
   * @param targetDir Project root directory
   * @returns Summary of changes (updated and added agent labels)
   */
  update(
    definitions: CanonicalAgentDefinition[],
    targetDir: string,
  ): { updated: string[]; added: string[] };
}

/**
 * Claude Code adapter — runtime-native installation.
 *
 * Generates agent files to `.claude/agents/` using the `.agent.md` extension
 * (Claude Code's native agent file format). See ADR-038.
 */
export class ClaudeCodeAdapter implements RuntimeAdapter {
  readonly id = "claude";
  readonly name = "Claude Code";

  generate(definitions: CanonicalAgentDefinition[], targetDir: string): void {
    const agentsDir = path.join(targetDir, ".claude", "agents");
    const templatesAgentsDir = path.join(templateDir(), "agents");

    for (const def of definitions) {
      const srcFilename = `${def.name}.md`;
      const destFilename = `${def.name}.agent.md`;
      const src = path.join(templatesAgentsDir, srcFilename);
      const dest = path.join(agentsDir, destFilename);
      copyFile(src, dest);
    }
  }

  update(
    definitions: CanonicalAgentDefinition[],
    targetDir: string,
  ): { updated: string[]; added: string[] } {
    const agentsDir = path.join(targetDir, ".claude", "agents");
    const templatesAgentsDir = path.join(templateDir(), "agents");
    const updated: string[] = [];
    const added: string[] = [];

    for (const def of definitions) {
      const srcFilename = `${def.name}.md`;
      const destFilename = `${def.name}.agent.md`;
      const src = path.join(templatesAgentsDir, srcFilename);
      const dest = path.join(agentsDir, destFilename);

      if (!fileExists(src)) continue;

      if (fileExists(dest)) {
        const srcContent = readFile(src);
        const destContent = readFile(dest);
        if (srcContent !== destContent) {
          copyFile(src, dest);
          updated.push(def.name);
        }
      } else {
        copyFile(src, dest);
        added.push(def.name);
      }
    }

    return { updated, added };
  }
}

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

const registry = new Map<string, RuntimeAdapter>();

const BUILTIN_IDS = new Set(["claude", "copilot", "codex", "agents-md"]);

/**
 * Register a runtime adapter. Replaces any existing adapter with the same id,
 * unless the id is a built-in adapter that is already registered.
 */
export function registerAdapter(adapter: RuntimeAdapter): void {
  if (BUILTIN_IDS.has(adapter.id) && registry.has(adapter.id)) {
    throw new Error(`Cannot replace built-in adapter "${adapter.id}"`);
  }
  registry.set(adapter.id, adapter);
}

/**
 * Get a registered adapter by id, or undefined if not found.
 */
export function getAdapter(id: string): RuntimeAdapter | undefined {
  return registry.get(id);
}

/**
 * Get all registered adapters.
 */
export function getAdapters(): RuntimeAdapter[] {
  return Array.from(registry.values());
}

/**
 * Get adapters for the specified runtime ids.
 * Throws if any requested runtime has no registered adapter.
 */
export function getAdaptersForRuntimes(runtimes: string[]): RuntimeAdapter[] {
  const adapters: RuntimeAdapter[] = [];
  for (const id of runtimes) {
    const adapter = registry.get(id);
    if (!adapter) {
      throw new Error(
        `No adapter registered for runtime "${id}". Available: ${Array.from(registry.keys()).join(", ")}`,
      );
    }
    adapters.push(adapter);
  }
  return adapters;
}

// Register built-in adapters
registerAdapter(new ClaudeCodeAdapter());
