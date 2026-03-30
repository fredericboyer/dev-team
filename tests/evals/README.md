# Agent Evaluation Framework (Spike)

Measures whether dev-team agents consistently detect known issues in code samples.

refs #118

## Directory structure

```
tests/evals/
  eval-runner.js          # Prompt construction script
  README.md               # This file
  samples/                # Known-bad code samples
    sql-injection.js      # SQL injection via string concatenation
    missing-boundary.js   # Missing null/empty/boundary checks
    complexity.js         # Deep nesting, opaque naming, high complexity
  expected/               # Expected findings per agent-sample pair
    szabo-sql-injection.md
    knuth-missing-boundary.md
    brooks-complexity.md
```

## How to run an eval

### 1. Generate the prompt

```bash
node tests/evals/eval-runner.js <agent-name> <sample-file>
```

Example:

```bash
node tests/evals/eval-runner.js szabo tests/evals/samples/sql-injection.js
```

This prints a complete prompt to stdout that includes:

- The agent's full definition (from `.dev-team/agents/` if present, falling back to `templates/agents/`)
- The code sample to review
- Instructions to produce classified findings

### 2. Run the prompt with the agent

Copy the generated prompt and paste it into a Claude session. The prompt is
self-contained -- it includes the agent definition so no additional setup is
needed.

Alternatively, redirect to a file for reference:

```bash
node tests/evals/eval-runner.js szabo tests/evals/samples/sql-injection.js > /tmp/eval-szabo.md
```

### 3. Compare results against expected findings

Open the corresponding file in `expected/` and compare:

- **Must detect**: Findings marked as mandatory. If the agent misses these, it's a recall failure.
- **May detect**: Advisory findings that demonstrate depth but are not required.

## Metrics to track

### Per-run metrics

| Metric              | Definition                                                     |
| ------------------- | -------------------------------------------------------------- |
| **True positives**  | Agent found an issue listed in "must detect"                   |
| **False negatives** | Agent missed an issue listed in "must detect"                  |
| **True extras**     | Agent found a real issue not in expected (beyond "may detect") |
| **False positives** | Agent flagged something that is not actually an issue          |

### Per-sample metrics

| Metric        | Formula                                             |
| ------------- | --------------------------------------------------- |
| **Precision** | true positives / (true positives + false positives) |
| **Recall**    | true positives / (true positives + false negatives) |

### Variance measurement

**Goal**: Determine how consistent agent findings are across multiple runs.

**Protocol**:

1. Run the same agent + sample combination **10 times**
2. For each run, record which "must detect" findings were reported
3. Calculate per-finding consistency:
   - `consistency = (times detected / 10) * 100%`
4. Calculate overall consistency:
   - `overall = average of per-finding consistency scores`

**Interpreting results**:

| Overall consistency | Assessment                                                     |
| ------------------- | -------------------------------------------------------------- |
| 90-100%             | Low variance -- agent reliably detects known issues            |
| 70-89%              | Moderate variance -- some findings are inconsistently detected |
| Below 70%           | High variance -- agent behavior is unreliable for this sample  |

**What to track across runs**:

- Which findings appear in every run vs. only some runs
- Whether the classification (DEFECT vs. RISK) changes between runs
- Whether the agent invents false positives inconsistently
- Whether finding descriptions are materially different or just stylistic variants

## Adding new evals

### Adding a new sample

1. Create a `.js` file in `samples/` with:
   - A comment header stating the target agent and expected finding type
   - Realistic code (not toy examples) that contains the known issue
   - Enough context for the agent to understand the code's purpose

2. Create a matching expected file in `expected/` named `<agent>-<sample>.md`

### Design principles for good samples

- **One primary issue per sample**: The sample should test one specific agent capability
- **Realistic context**: Include function documentation and comments that a real codebase would have
- **Clear ground truth**: The expected findings should be unambiguous -- reasonable reviewers would agree

## Limitations

This is a spike. Current limitations:

- No automated LLM calls -- prompts must be run manually
- No automated comparison -- results are compared by human judgment
- No scoring algorithm -- metrics are computed manually
- No CI integration -- this is a local development tool only
- Sample set is small (3 samples, 3 agents) -- expand before drawing conclusions
