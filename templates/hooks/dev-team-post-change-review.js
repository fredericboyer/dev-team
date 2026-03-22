#!/usr/bin/env node

/**
 * dev-team-post-change-review.js
 * PostToolUse hook on Edit/Write.
 *
 * After a file is modified, flags which agents should review based on
 * the file's domain. Advisory only — always exits 0.
 */

'use strict';

const path = require('path');

const input = JSON.parse(process.argv[2] || '{}');
const filePath = (input.tool_input && (input.tool_input.file_path || input.tool_input.path)) || '';

if (!filePath) {
  process.exit(0);
}

const basename = path.basename(filePath).toLowerCase();
const fullPath = filePath.toLowerCase();

const flags = [];

// Security-sensitive patterns → flag for Szabo
const SECURITY_PATTERNS = [
  /auth/,
  /login/,
  /password/,
  /token/,
  /session/,
  /crypto/,
  /encrypt/,
  /decrypt/,
  /secret/,
  /permission/,
  /rbac/,
  /acl/,
  /oauth/,
  /jwt/,
  /cors/,
  /csrf/,
  /sanitiz/,
  /escap/,
];

if (SECURITY_PATTERNS.some((p) => p.test(fullPath) || p.test(basename))) {
  flags.push('@dev-team-szabo (security surface changed)');
}

// API/contract patterns → flag for Mori
const API_PATTERNS = [
  /\/api\//,
  /\/routes?\//,
  /\/endpoints?\//,
  /schema/,
  /\.graphql$/,
  /\.proto$/,
  /openapi/,
  /swagger/,
];

if (API_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push('@dev-team-mori (API contract may affect UI)');
}

// Config/infra patterns → flag for Voss
const INFRA_PATTERNS = [
  /docker/,
  /\.env/,
  /config/,
  /migration/,
  /database/,
  /\.sql$/,
  /infrastructure/,
  /deploy/,
];

if (INFRA_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push('@dev-team-voss (architectural/config change)');
}

// Tooling patterns → flag for Deming
const TOOLING_PATTERNS = [
  /eslint/,
  /prettier/,
  /\.github\/workflows/,
  /\.claude\//,
  /tsconfig/,
  /jest\.config/,
  /vitest/,
  /package\.json$/,
  /\.husky/,
];

if (TOOLING_PATTERNS.some((p) => p.test(fullPath))) {
  flags.push('@dev-team-deming (tooling change)');
}

// Always flag Knuth for non-test implementation files
const isTestFile = /\.(test|spec)\.|__tests__|\/tests?\//.test(fullPath);
const isCodeFile = /\.(js|ts|jsx|tsx|py|rb|go|java|rs|c|cpp|cs)$/.test(fullPath);

if (isCodeFile && !isTestFile) {
  flags.push('@dev-team-knuth (new or changed code path to audit)');
}

if (flags.length > 0) {
  console.log(`[dev-team review] Flag for review: ${flags.join(', ')}`);
}

process.exit(0);
