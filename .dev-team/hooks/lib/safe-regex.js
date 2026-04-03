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
 * Build a map of group open positions to their close positions.
 */
function buildGroupMap(pattern) {
  const openToClose = new Map();
  const stack = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "\\") {
      i++;
      continue;
    }
    if (pattern[i] === "[") {
      while (i < pattern.length && pattern[i] !== "]") {
        if (pattern[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (pattern[i] === "(") {
      stack.push(i);
    } else if (pattern[i] === ")") {
      if (stack.length > 0) {
        const open = stack.pop();
        openToClose.set(open, i);
      }
    }
  }
  return openToClose;
}

/**
 * Check whether a group at openPos (or any ancestor group) is quantified.
 */
function isGroupQuantified(pattern, openPos, groupMap) {
  // Check this group directly
  const closePos = groupMap.get(openPos);
  if (
    closePos !== undefined &&
    closePos + 1 < pattern.length &&
    /[+*{]/.test(pattern[closePos + 1])
  ) {
    return true;
  }
  // Check ancestor groups: any group that contains openPos and is quantified
  for (const [open, close] of groupMap) {
    if (open < openPos && close > closePos) {
      // This is an ancestor group — check if it's quantified
      if (close + 1 < pattern.length && /[+*{]/.test(pattern[close + 1])) {
        return true;
      }
    }
  }
  return false;
}

function hasOverlappingAlternation(pattern) {
  const groupMap = buildGroupMap(pattern);
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "\\") {
      i++;
      continue;
    }
    // Skip character classes
    if (pattern[i] === "[") {
      while (i < pattern.length && pattern[i] !== "]") {
        if (pattern[i] === "\\") i++;
        i++;
      }
      continue;
    }
    if (pattern[i] === "(") {
      let depth = 1;
      let j = i + 1;
      // Parse group prefix: (?:, (?=, (?!, (?<=, (?<!, (?<name>
      if (j < pattern.length && pattern[j] === "?") {
        j++; // skip '?'
        if (j < pattern.length) {
          if (pattern[j] === "<") {
            j++; // skip '<'
            if (j < pattern.length && pattern[j] !== "=" && pattern[j] !== "!") {
              // Named group (?<name> — skip to '>'
              while (j < pattern.length && pattern[j] !== ">") j++;
              if (j < pattern.length) j++; // skip '>'
            } else {
              j++; // skip '=' or '!'
            }
          } else {
            j++; // skip ':', '=', '!'
          }
        }
      }
      const bodyStart = j;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === "\\") {
          j++;
        } else if (pattern[j] === "[") {
          while (j < pattern.length && pattern[j] !== "]") {
            if (pattern[j] === "\\") j++;
            j++;
          }
        } else if (pattern[j] === "(") {
          depth++;
        } else if (pattern[j] === ")") {
          depth--;
        }
        j++;
      }
      const closePos = j - 1;
      if (isGroupQuantified(pattern, i, groupMap)) {
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
    } else if (body[i] === "[") {
      // Skip character class — '|' inside [...] is literal
      while (i < body.length && body[i] !== "]") {
        if (body[i] === "\\") i++;
        i++;
      }
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
 * Detect nested quantifiers structurally, properly handling char classes and nesting.
 * A nested quantifier is any quantified atom inside a quantified group.
 */
function hasNestedQuantifiers(pattern) {
  const groupMap = buildGroupMap(pattern);
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "\\") {
      i++;
      continue;
    }
    // Skip character classes entirely — quantifier chars inside [...] are literals
    if (pattern[i] === "[") {
      i++;
      while (i < pattern.length && pattern[i] !== "]") {
        if (pattern[i] === "\\") i++;
        i++;
      }
      continue;
    }
    // Found a quantifier character?
    if (/[+*]/.test(pattern[i]) || (pattern[i] === "{" && /^\{\d+,/.test(pattern.slice(i)))) {
      const qPos = i;
      const atomEnd = i - 1;
      if (atomEnd < 0) continue;
      if (pattern[atomEnd] === ")") {
        // Quantified group — check if any ancestor group is also quantified
        for (const [open, close] of groupMap) {
          if (close === atomEnd) {
            for (const [aOpen, aClose] of groupMap) {
              if (aOpen < open && aClose > close) {
                if (aClose + 1 < pattern.length && /[+*{]/.test(pattern[aClose + 1])) {
                  return true;
                }
              }
            }
            break;
          }
        }
      }
      // Quantified non-group atom (a+, \d*, etc.) — check if inside a quantified group
      if (pattern[atomEnd] !== ")") {
        for (const [open, close] of groupMap) {
          if (open < qPos && close > qPos) {
            if (close + 1 < pattern.length && /[+*{]/.test(pattern[close + 1])) {
              return true;
            }
          }
        }
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
  // Uses structural analysis to handle char classes and nested groups correctly.
  // Examples: (.*)+  (a+)*  (\d*)+  ([^x]+)*  (a{1,}){2,}  ((a+)+)
  if (hasNestedQuantifiers(pattern)) {
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
    return { safe: false, reason: "invalid regex: " + err.message };
  }
}

module.exports = { safeRegex };
