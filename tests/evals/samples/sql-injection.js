"use strict";

// Known-bad sample: SQL injection via string concatenation
// Target agent: Szabo (security auditor)
// Expected finding: [DEFECT] SQL injection vulnerability

const db = require("./db"); // hypothetical database module

/**
 * Look up a user by username. Called from the login endpoint
 * with user-supplied input from req.body.username.
 */
function getUserByUsername(username) {
  const query = "SELECT * FROM users WHERE username = '" + username + "'";
  return db.execute(query);
}

/**
 * Search for products by name. Called from /api/search?q=<term>
 * with user-supplied input from req.query.q.
 */
function searchProducts(term) {
  return db.execute(`SELECT * FROM products WHERE name LIKE '%${term}%' ORDER BY name`);
}

/**
 * Delete a user account. Called from admin panel with user-supplied
 * input from req.params.id.
 */
function deleteUser(id) {
  // "id is always a number from the frontend" -- famous last words
  db.execute("DELETE FROM users WHERE id = " + id);
  db.execute("DELETE FROM sessions WHERE user_id = " + id);
}

module.exports = { getUserByUsername, searchProducts, deleteUser };
