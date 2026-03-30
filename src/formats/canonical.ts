/**
 * Canonical agent definition schema.
 *
 * The canonical format IS the current dev-team format: Markdown with YAML
 * frontmatter. This TypeScript interface describes the structured fields
 * extracted from that format.
 *
 * Fields are classified as:
 * - **portable**: universally meaningful across all agent runtimes
 *   (name, description, instruction body)
 * - **runtime-specific**: meaningful only on runtimes that support the
 *   capability (tools, model, memory)
 *
 * See ADR-036 for the architectural decision.
 */

/**
 * Portable fields — universally meaningful across all agent runtimes.
 * Every adapter can use these fields.
 */
export interface PortableFields {
  /** Agent identifier (e.g., "dev-team-voss"). */
  name: string;

  /** One-line role description for discovery and routing. */
  description: string;

  /** Full Markdown instruction body (everything below the frontmatter). */
  body: string;
}

/**
 * Runtime-specific fields — only meaningful on runtimes that support
 * the capability. Adapters for less-capable runtimes ignore these.
 */
export interface RuntimeSpecificFields {
  /** Comma-separated tool names available to this agent (e.g., "Read, Edit, Write, Bash"). */
  tools?: string;

  /** Model assignment (e.g., "sonnet", "opus"). */
  model?: string;

  /** Memory scope (e.g., "project"). */
  memory?: string;
}

/**
 * Complete canonical agent definition — the union of portable and
 * runtime-specific fields. This is the in-memory representation of
 * a parsed agent definition file.
 */
export interface CanonicalAgentDefinition extends PortableFields, RuntimeSpecificFields {}

/**
 * Parses a Markdown file with YAML frontmatter into a CanonicalAgentDefinition.
 *
 * Expected format:
 * ```
 * ---
 * name: dev-team-voss
 * description: Backend engineer. ...
 * tools: Read, Edit, Write, Bash
 * model: sonnet
 * memory: project
 * ---
 *
 * Markdown body here...
 * ```
 */
export function parseAgentDefinition(content: string): CanonicalAgentDefinition {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new Error("Invalid agent definition: missing YAML frontmatter delimiters (---)");
  }

  const [, yamlBlock, body] = frontmatterMatch;
  const fields: Record<string, string> = {};

  for (const line of yamlBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) {
      fields[key] = value;
    }
  }

  if (!fields.name) {
    throw new Error("Invalid agent definition: missing required field 'name'");
  }
  if (!fields.description) {
    throw new Error("Invalid agent definition: missing required field 'description'");
  }

  return {
    name: fields.name,
    description: fields.description,
    body: body.trimStart(),
    tools: fields.tools || undefined,
    model: fields.model || undefined,
    memory: fields.memory || undefined,
  };
}

/**
 * Serializes a CanonicalAgentDefinition back to the Markdown + YAML frontmatter format.
 */
export function serializeAgentDefinition(def: CanonicalAgentDefinition): string {
  const lines = ["---", `name: ${def.name}`, `description: ${def.description}`];

  if (def.tools) {
    lines.push(`tools: ${def.tools}`);
  }
  if (def.model) {
    lines.push(`model: ${def.model}`);
  }
  if (def.memory) {
    lines.push(`memory: ${def.memory}`);
  }

  lines.push("---", "");

  return lines.join("\n") + def.body;
}
