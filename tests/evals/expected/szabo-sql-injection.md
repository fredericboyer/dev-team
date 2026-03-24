# Expected findings: Szabo reviewing sql-injection.js

## Must detect

### [DEFECT] SQL injection via string concatenation in getUserByUsername
- **Line**: 14
- **Issue**: User-supplied `username` is concatenated directly into SQL query string
- **Attack**: `' OR '1'='1' --` bypasses authentication
- **Fix**: Use parameterized queries / prepared statements

### [DEFECT] SQL injection via template literal in searchProducts
- **Line**: 23
- **Issue**: User-supplied `term` is interpolated directly into SQL query via template literal
- **Attack**: `%'; DROP TABLE products; --` destroys data
- **Fix**: Use parameterized queries with proper LIKE escaping

### [DEFECT] SQL injection via concatenation in deleteUser (two statements)
- **Lines**: 33-34
- **Issue**: User-supplied `id` is concatenated into two DELETE statements without validation
- **Attack**: `1 OR 1=1` deletes all users and sessions
- **Fix**: Validate `id` is an integer, use parameterized queries

## May detect (advisory)

### [RISK] No input validation on any function parameter
- All three functions blindly trust their input without type checking or sanitization

### [RISK] deleteUser performs two separate queries without a transaction
- If the first DELETE succeeds but the second fails, data is left in an inconsistent state

### [SUGGESTION] Use an ORM or query builder to prevent SQL injection by default
- Structural fix that eliminates the class of vulnerability rather than patching individual instances
