# Expected findings: Brooks reviewing complexity.js

## Must detect

### [DEFECT] Cyclomatic complexity exceeds maintainability threshold

- **Function**: `proc` (line 10)
- **Issue**: Function has cyclomatic complexity >15 with 9+ levels of nesting. Measurable threshold: functions should have cyclomatic complexity <=10 (per ADR-020 measurability requirement)
- **Impact**: Untestable -- the number of paths through this function makes exhaustive testing impractical

### [DEFECT] Naming does not communicate intent

- **Function**: `proc` -- what does it process? What is the domain concept?
- **Parameters**: `d`, `m`, `f` -- data? mode? filter? No reader can determine purpose without tracing every usage
- **Properties**: `t`, `s`, `v`, `a`, `q`, `n`, `w`, `p`, `e` -- single-letter property names force readers to hold a mental lookup table
- **Output**: `{ x, y, z }` -- the result properties are equally opaque
- **Impact**: Measurable via naming clarity metric -- 0 of 14 identifiers communicate their domain meaning

### [DEFECT] Function violates single responsibility principle

- **Function**: `proc` handles three distinct record types (`t === 1`, `t === 2`, `t === 3`) with entirely different processing logic
- **Impact**: Any change to type-1 processing risks breaking type-2 or type-3 due to shared scope and interleaved conditions

## May detect (advisory)

### [RISK] Magic numbers without explanation

- `t === 1`, `t === 2`, `t === 3`, `s > 10` -- numeric literals with no named constants or documentation explaining their meaning

### [SUGGESTION] Extract per-type processing into separate functions

- `processType1(record, mode, filter)`, `processType2(record)`, `processType3(record, mode)` would each be testable and comprehensible

### [SUGGESTION] Use early-continue pattern to reduce nesting

- Inverting conditions and using `continue` would flatten the nesting from 9 levels to 2-3
