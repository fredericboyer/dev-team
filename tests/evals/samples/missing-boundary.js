"use strict";

// Known-bad sample: Missing boundary condition checks
// Target agent: Knuth (quality auditor)
// Expected finding: [DEFECT] no null/undefined check, no empty array handling

/**
 * Calculate the average score from a list of scores.
 * Called from the dashboard to display aggregate metrics.
 */
function calculateAverage(scores) {
  let sum = 0;
  for (let i = 0; i < scores.length; i++) {
    sum += scores[i];
  }
  return sum / scores.length;
}

/**
 * Get the first and last items from an ordered list.
 * Used to display range summaries like "A - Z" or "1 - 100".
 */
function getRange(items) {
  return {
    first: items[0],
    last: items[items.length - 1],
  };
}

/**
 * Find the user with the highest score. Returns the user object.
 * Used for leaderboard display.
 */
function findTopScorer(users) {
  let top = users[0];
  for (let i = 1; i < users.length; i++) {
    if (users[i].score > top.score) {
      top = users[i];
    }
  }
  return top;
}

/**
 * Merge configuration objects. Later configs override earlier ones.
 * Called during app startup with user-supplied config files.
 */
function mergeConfigs(configs) {
  const result = {};
  for (const config of configs) {
    for (const key of Object.keys(config)) {
      result[key] = config[key];
    }
  }
  return result;
}

module.exports = { calculateAverage, getRange, findTopScorer, mergeConfigs };
