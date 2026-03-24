# ADR-021: TypeScript 6.0 with node16 module resolution
Date: 2026-03-24
Status: accepted

## Context

The project used TypeScript 5.x with `"module": "commonjs"` and `"moduleResolution": "node"` in tsconfig.json. TypeScript 6.0 deprecates `moduleResolution: "node"` (which maps to the legacy Node 10 algorithm) and will remove it entirely in TypeScript 7. The legacy mode does not enforce file extensions on relative imports, which diverges from how Node.js actually resolves modules.

The project outputs CommonJS, has zero runtime dependencies (ADR-002), and targets Node 18+. It needs a module resolution strategy that continues emitting CJS while aligning with modern TypeScript and Node.js resolution semantics.

## Decision

- Upgrade TypeScript from ^5.9.3 to ^6.0.2
- Change `module` from `"commonjs"` to `"node16"` — emits CJS for `.ts` files when `"type": "module"` is absent from package.json (which it is)
- Change `moduleResolution` from `"node"` to `"node16"` — enforces Node.js's actual resolution algorithm, including mandatory `.js` extensions on relative imports
- Add `"types": ["node"]` to tsconfig.json — required under `node16` to resolve Node.js built-in modules
- Add `.js` extensions to all relative import specifiers across all source files (9 files)

These settings work together: `module: "node16"` tells TypeScript to emit CJS when the nearest package.json lacks `"type": "module"`, and `moduleResolution: "node16"` enforces the resolution rules that Node.js actually uses at runtime.

## Consequences

- Relative imports now require explicit `.js` extensions (e.g., `import { foo } from "./bar.js"` instead of `import { foo } from "./bar"`), matching Node.js runtime behavior
- The project is prepared for TypeScript 7, which will remove the deprecated `"node"` resolution mode
- No change to output format — the project still emits CommonJS to `dist/`
- ADR-007 (TypeScript with oxc tooling) remains valid; this ADR extends it with the module resolution upgrade
- Contributors must use `.js` extensions in new import statements — TypeScript will error if they forget
