# ADR-022: Agent proliferation governance

Date: 2026-03-24
Status: accepted

## Context

Dev-team currently has 12 agents. Research indicates that coordination overhead grows non-linearly with agent count — Microsoft's AI Agent Design Patterns guidance recommends limiting group chat to 3 or fewer agents, and while dev-team's hierarchical model avoids group chat, the principle of agent economy applies. Chanl.ai's production analysis found that "better prompts or tools often solve problems requiring new agents." Zylos research shows coordination failures account for 37% of multi-agent failures, with each additional agent increasing the failure surface.

At 12 agents, the team is near the upper bound for effective multi-agent coordination. Without a formal governance policy, the natural tendency is to solve new problems by adding agents rather than improving existing ones. This leads to overlapping responsibilities, increased token costs, and cognitive overhead for users who must understand which agent to invoke.

## Decision

Establish a formal governance policy for agent roster changes:

### Current roster justification

| Agent    | Unique capability                           | Cannot be merged into                                         |
| -------- | ------------------------------------------- | ------------------------------------------------------------- |
| Voss     | Backend/API design, data modeling           | Distinct domain from frontend (Mori)                          |
| Hamilton | Infrastructure, IaC, containers, deployment | Operational expertise distinct from application code          |
| Mori     | Frontend/UI, accessibility, UX              | Distinct domain from backend (Voss)                           |
| Szabo    | Security analysis, attack surface           | Adversarial security mindset, always-on reviewer              |
| Knuth    | Quality/correctness verification            | Different lens than security (Szabo) or architecture (Brooks) |
| Beck     | Test implementation, TDD                    | Implementing agent vs. auditing agents (Knuth, Szabo)         |
| Deming   | Tooling, CI/CD, automation                  | Tooling optimization distinct from infrastructure (Hamilton)  |
| Tufte    | Documentation, doc-code sync                | Dedicated focus on documentation quality                      |
| Brooks   | Architecture, quality attributes            | Read-only structural review, distinct from implementation     |
| Conway   | Release management, versioning              | Release process expertise                                     |
| Drucker  | Orchestration, delegation                   | Meta-coordination role                                        |
| Borges   | Memory, cross-agent coherence               | Meta-learning role                                            |

### Decision criteria for new agent proposals

A new agent may only be added when ALL of the following are true:

1. **Unique capability**: The proposed agent has a distinct domain expertise that no existing agent covers
2. **Cannot extend existing**: Improving an existing agent's prompt, tools, or memory cannot adequately cover the gap. The proposer must demonstrate what was tried and why it failed.
3. **Justifiable cost**: The coordination overhead of adding the agent (increased review surface, more complex delegation, higher token costs) is outweighed by the capability gained
4. **Non-overlapping**: The new agent's responsibilities do not substantially overlap with any existing agent. If overlap exists, the proposal must include a plan to narrow both agents' scopes.

### Soft cap

The recommended maximum is 15 agents. Proposals that would exceed this cap require stronger justification and must include a plan to consolidate or retire an existing agent.

### Process

1. Open a GitHub issue with the agent proposal, addressing all four decision criteria above
2. Brooks assesses architectural impact during review
3. Drucker evaluates whether an existing agent can be extended before approving delegation to a new agent
4. The proposal must be accepted as an ADR before the agent is implemented

### Preferred alternative: extend existing agents

Before proposing a new agent, try these in order:

1. **Prompt improvement**: Add the capability to an existing agent's definition
2. **Tool addition**: Give an existing agent new tools that enable the capability
3. **Memory specialization**: Add domain knowledge to an existing agent's memory
4. **Skill creation**: Create a new skill that leverages existing agents in a new workflow

## Consequences

- New agents cannot be added without formal justification, reducing roster bloat
- Existing agents improve over time as capabilities are added to them rather than split off
- The soft cap provides a guideline without being a hard block for genuinely needed additions
- Brooks and Drucker have explicit governance responsibilities during reviews
- The process adds friction to agent creation, which is intentional — the friction ensures each addition is well-justified
- Does not retroactively remove any current agents; the current 12 are grandfathered with justifications documented above
