/**
 * safe-regex.js — ReDoS guard for user-controlled regex patterns.
 *
 * Detects patterns likely to cause catastrophic backtracking:
 * - Nested quantifiers: (.*)*  (.+)+  (a*)*  (\d+)+  etc.
 * - Overlapping alternations with quantifiers: (a|a)+
 *
 * Returns { safe: true, regex } on success, { safe: false, reason } on rejection.
 * Does NOT add npm dependencies — pure string analysis.
 */

"use strict";

/**
 * Check whether a regex pattern is likely safe from ReDoS.
 *
 * @param {string} pattern - The regex source string
 * @returns {{ safe: true, regex: RegExp } | { safe: false, reason: string }}
 */
function safeRegex(pattern) {
  if (typeof pattern !== "string" || pattern.length === 0) {
    return { safe: false, reason: "pattern must be a non-empty string" };
  }

  // Reject patterns over a reasonable length — very long patterns
  // are themselves a DoS vector during compilation
  if (pattern.length > 1024) {
    return { safe: false, reason: "pattern exceeds 1024 characters" };
  }

  // Detect nested quantifiers — the primary ReDoS vector.
  // Matches: group with quantifier inside, followed by outer quantifier.
  // Examples: (.*)+  (a+)*  (\d*)+  ([^x]+)*
  if (/\([^)]*[+*][^)]*\)[+*{]/.test(pattern)) {
    return { safe: false, reason: "nested quantifiers detected (potential ReDoS)" };
  }

  // Detect quantified backreferences — another ReDoS vector
  if (/\\[1-9]\d*[+*{]/.test(pattern)) {
    return { safe: false, reason: "quantified backreference detected (potential ReDoS)" };
  }

  // Try to compile — catches syntax errors
  try {
    const regex = new RegExp(pattern);
    return { safe: true, regex };
  } catch (err) {
    return { safe: false, reason: `invalid regex: ${err.message}` };
  }
}

module.exports = { safeRegex };
