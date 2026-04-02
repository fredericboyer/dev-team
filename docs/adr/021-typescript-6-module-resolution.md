# ADR-021: TypeScript 6.0 with nodenext module resolution

Date: 2026-03-24
Status: accepted

## Context

The project used TypeScript 5.x with `"module": "commonjs"` and `"moduleResolution": "node"` in tsconfig.json. TypeScript 6.0 deprecates `moduleResolution: "node"` (which maps to the legacy Node 10 algorithm) and will remove it entirely in TypeScript 7. The legacy mode does not enforce file extensions on relative imports, which diverges from how Node.js actually resolves modules.

The project outputs CommonJS, has zero runtime dependencies (ADR-002), and targets Node 18+. It needs a module resolution strategy that continues emitting CJS while aligning with modern TypeScript and Node.js resolution semantics.

## Decision

- Upgrade TypeScript from ^5.9.3 to ^6.0.2
- Change `module` from `"commonjs"` to `"nodenext"` — emits CJS for `.ts` files when `"type": "module"` is absent from package.json (which it is). We use `nodenext` rather than `node16` because it is the current TypeScript recommended default (as of TS 5.9+) and tracks the latest Node.js module semantics automatically as TypeScript evolves
- Change `moduleResolution` from `"node"` to `"nodenext"` — enforces Node.js's actual resolution algorithm, including mandatory `.js` extensions on relative imports
- Add `"moduleDetection": "force"` — treats all files as modules regardless of content, which is the TS 5.9+ recommended default
- Add `"types": ["node"]` to tsconfig.json — required under `nodenext` to resolve Node.js built-in modules
- Add `.js` extensions to all relative import specifiers across all source files (9 files)

These settings work together: `module: "nodenext"` tells TypeScript to emit CJS when the nearest package.json lacks `"type": "module"`, and `moduleResolution: "nodenext"` enforces the resolution rules that Node.js actually uses at runtime.

### Why nodenext over node16

TypeScript's `node16` and `nodenext` are functionally identical today, but `nodenext` is the recommended choice per the TypeScript 5.9+ documentation. The `node16` setting is pinned to Node 16-era module semantics, while `nodenext` will automatically pick up any future changes to Node.js module resolution. Since this project targets Node 18+ and has no reason to pin to older semantics, `nodenext` is the correct forward-looking choice.

### Why not verbatimModuleSyntax

`verbatimModuleSyntax` is recommended by TS 5.9+ for new projects. However, it requires that import/export syntax exactly matches the module system — for CJS output, this means using `import x = require("...")` instead of ESM-style `import x from "..."`. Enabling it in this project would require rewriting every import statement in every source file from ESM syntax to CJS require syntax, which is too invasive for this change. This can be revisited if the project migrates to ESM output.

## Consequences

- Relative imports now require explicit `.js` extensions (e.g., `import { foo } from "./bar.js"` instead of `import { foo } from "./bar"`), matching Node.js runtime behavior
- The project is prepared for TypeScript 7, which will remove the deprecated `"node"` resolution mode
- The project automatically picks up future Node.js module resolution improvements via `nodenext`
- No change to output format — the project still emits CommonJS to `dist/`
- ADR-007 (TypeScript with oxc tooling) remains valid; this ADR extends it with the module resolution upgrade
- Contributors must use `.js` extensions in new import statements — TypeScript will error if they forget
