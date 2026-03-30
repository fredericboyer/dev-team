# Expected findings: Knuth reviewing missing-boundary.js

## Must detect

### [DEFECT] calculateAverage crashes on null/undefined input

- **Line**: 13
- **Issue**: `scores.length` throws TypeError when `scores` is null or undefined
- **Counter-example**: `calculateAverage(null)` -> TypeError

### [DEFECT] calculateAverage returns NaN for empty array

- **Line**: 16
- **Issue**: `0 / 0` evaluates to NaN when `scores` is an empty array
- **Counter-example**: `calculateAverage([])` -> NaN

### [DEFECT] getRange returns undefined values for empty array

- **Lines**: 25-26
- **Issue**: `items[0]` and `items[items.length - 1]` are both `undefined` for empty arrays
- **Counter-example**: `getRange([])` -> `{ first: undefined, last: undefined }`

### [DEFECT] getRange crashes on null/undefined input

- **Line**: 25
- **Issue**: Property access on null/undefined throws TypeError
- **Counter-example**: `getRange(null)` -> TypeError

### [DEFECT] findTopScorer crashes on empty array

- **Line**: 35
- **Issue**: `users[0]` is `undefined`, then `users[i].score > top.score` throws TypeError
- **Counter-example**: `findTopScorer([])` -> TypeError on next iteration comparison

### [DEFECT] findTopScorer crashes on null/undefined input

- **Line**: 35
- **Issue**: Property access on null/undefined throws TypeError
- **Counter-example**: `findTopScorer(null)` -> TypeError

### [DEFECT] mergeConfigs crashes on null/undefined input

- **Line**: 50
- **Issue**: `for...of` on null/undefined throws TypeError
- **Counter-example**: `mergeConfigs(null)` -> TypeError

## May detect (advisory)

### [RISK] calculateAverage does not handle non-numeric values in array

- `calculateAverage([1, "two", 3])` produces incorrect result via string coercion

### [RISK] mergeConfigs does not handle null entries in the array

- `mergeConfigs([{a: 1}, null])` throws TypeError on `Object.keys(null)`

### [SUGGESTION] All functions should validate inputs with early returns or thrown errors

- Defensive programming pattern: check preconditions before operating on data
