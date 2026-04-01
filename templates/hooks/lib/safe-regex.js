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

function hasOverlappingAlternation(pattern) {
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "\\") {
      i++;
      continue;
    }
    if (pattern[i] === "(") {
      let depth = 1;
      let j = i + 1;
      if (j < pattern.length && pattern[j] === "?") {
        j += 2;
      }
      const bodyStart = j;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === "\\") {
          j++;
        } else if (pattern[j] === "(") {
          depth++;
        } else if (pattern[j] === ")") {
          depth--;
        }
        j++;
      }
      const closePos = j - 1;
      if (j < pattern.length && /[+*{]/.test(pattern[j])) {
        const body = pattern.slice(bodyStart, closePos);
        const alternatives = splitOnTopLevelPipes(body);
        if (alternatives.length > 1 && hasPrefixOverlap(alternatives)) {
          return true;
        }
      }
    }
  }
  return false;
}

function splitOnTopLevelPipes(body) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\") {
      i++;
    } else if (body[i] === "(") {
      depth++;
    } else if (body[i] === ")") {
      depth--;
    } else if (body[i] === "|" && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

function hasPrefixOverlap(alternatives) {
  for (let i = 0; i < alternatives.length; i++) {
    for (let j = 0; j < alternatives.length; j++) {
      if (i !== j && alternatives[j].startsWith(alternatives[i])) {
        return true;
      }
    }
  }
  return false;
}

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
  // Examples: (.*)+  (a+)*  (\d*)+  ([^x]+)*  (a{1,}){2,}
  if (/\([^)]*[+*{][^)]*\)[+*{]/.test(pattern)) {
    return { safe: false, reason: "nested quantifiers detected (potential ReDoS)" };
  }

  // Detect quantified backreferences — another ReDoS vector
  if (/\\[1-9]\d*[+*{]/.test(pattern)) {
    return { safe: false, reason: "quantified backreference detected (potential ReDoS)" };
  }

  // Detect quantified alternation groups with overlapping prefixes
  if (hasOverlappingAlternation(pattern)) {
    return {
      safe: false,
      reason: "overlapping alternation with quantifier detected (potential ReDoS)",
    };
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
