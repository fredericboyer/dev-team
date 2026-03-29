# Calibration Examples: Szabo (Security Auditor)

Annotated examples of correctly classified findings from this project's review history. Use these to calibrate finding severity and avoid repeat miscalibrations.

### Example 1: IGNORED — $ARGUMENTS trust boundary in extract skill

**Finding:** Szabo raised a trust boundary question about $ARGUMENTS usage in /dev-team:extract skill — could untrusted input flow through skill arguments?
**Classification:** [QUESTION]
**Outcome:** ignored (self-answered)
**Why:** The skill is invoked only by other orchestration skills (task, review, retro), not by untrusted external input. Skill-to-skill invocation is an internal trust boundary with no user-controlled data crossing it.
**Lesson:** Before flagging argument trust boundaries, trace the invocation chain. If the caller is another internal skill with disable-model-invocation:true, the trust boundary is already constrained. Do not flag internal-only interfaces as external attack surfaces.

### Example 2: ACCEPTED — Symlink-following in file operations (path traversal)

**Finding:** File operations in init.ts and update.ts follow symlinks without validation. An attacker could plant a symlink at a target path, causing the tool to read/write outside the intended directory tree.
**Classification:** [RISK]
**Outcome:** accepted — assertNotSymlink() added in v1.7.0, assertNoSymlinkInPath() added in v1.8.0
**Why:** File system operations are the primary attack surface for a CLI installer tool. Symlink-following enables path traversal, which is a real risk even for tools running with user permissions (malicious repo contents could redirect writes).
**Lesson:** For CLI tools that copy files into target directories, symlink validation is a legitimate security concern. The two-wave fix (leaf check + ancestor traversal) is the correct depth. The residual TOCTOU gap was correctly accepted as inherent to POSIX.

### Example 3: ACCEPTED — shell:true with hardcoded arguments

**Finding:** Hook scripts use `execFileSync` with `shell: true` option. Shell expansion could enable command injection.
**Classification:** [RISK]
**Outcome:** accepted (documented in anti-patterns, no code change needed)
**Why:** All arguments are hardcoded string literals or arrays — no user-controlled data flows into the command. `shell: true` is needed on Windows for `.cmd`/`.bat` resolution. The risk is theoretical only when all inputs are developer-authored constants.
**Lesson:** Command injection requires attacker-controlled input reaching an interpreter. When the binary path and all arguments are string literals, `shell: true` is a false positive. This is now in the anti-patterns list to prevent repeated flagging.

### Example 4: ACCEPTED — TOCTOU in assertNotSymlink accepted as POSIX limitation

**Finding:** assertNotSymlink uses lstatSync before the file operation — classic time-of-check-to-time-of-use gap. An attacker could replace a regular file with a symlink between the check and the operation.
**Classification:** [RISK]
**Outcome:** accepted (no fix possible within POSIX constraints)
**Why:** Check-then-act is inherent to POSIX file operations. Exploitability requires a local attacker with write access to the target directory, which already represents a compromised environment. No atomic alternative exists without OS-specific APIs (O_NOFOLLOW on Linux, RESOLVE_NO_SYMLINKS on newer kernels).
**Lesson:** When the only mitigation would require non-portable OS-specific APIs, accept the residual risk with documentation rather than pursuing an incomplete fix. State the exploitation prerequisites clearly — "requires local write access" makes the residual risk concrete and assessable.

### Example 5: CLEAN APPROVE — Retro-derived changes with no new trust boundaries

**Finding:** No security findings raised across 4 retro-derived PRs (#509/#510/#511/#512).
**Classification:** N/A (clean approve)
**Outcome:** clean
**Why:** Changes were skill definitions, ADR documents, learnings, and merge timing logic. No new file system operations, no new trust boundary crossings, no new input handling. Clean approve was the correct call.
**Lesson:** Not every PR needs security findings. Skill definition and documentation changes that do not introduce new I/O, trust boundary crossings, or input handling are genuinely security-neutral. A clean approve is a valid and correct outcome — do not manufacture findings to appear thorough.
