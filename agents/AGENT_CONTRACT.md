# AETHON Common Agent Contract

> `agents/` is the project-local source of truth for AETHON agent contracts.
> Claude, Codex, OMX, and future orchestration surfaces should read the same role
> contract and apply their own runtime adapter rules.

---

## 1. Purpose

AETHON agents are reusable role contracts, not Claude-only prompts or hidden automation.
They keep product, engineering, QA, security, legal, and context-review decisions
consistent across runtimes.

Every runtime must preserve these invariants:

- **Adviser-first**: AI recommends, explains, and warns. The editor chooses.
- **Timeline memory**: decisions, blockers, evidence, and handoffs are recorded.
- **Small safe diffs**: implement only the requested slice and avoid unrelated cleanup.
- **Verification before confidence**: tests, typecheck, build, browser evidence, or explicit residual risk.
- **Insight accumulation**: reusable findings go to `docs/domain-knowledge/*-insights.md`.

---

## 2. Directory Policy

The preferred public contract path is:

```text
agents/
```

Codex-specific execution policy lives in:

```text
agents/CODEX_RUNTIME.md
```

The historical Claude runtime path is:

```text
.claude/agents/
```

During migration, `.claude/agents/` remains a Claude adapter/compatibility location.
Cross-runtime policy and role contracts should be written under `agents/` first.
The matching `.claude/agents/` role files remain compatibility adapters until hook
and runtime discovery references are audited or replaced with a sync/shim strategy.

---

## 3. Harness Axis Contract

The common `agents/` contract is also the cross-runtime harness contract. Every
agent role, skill, and runtime adapter should map its behavior to these axes:

| Axis | Agent Contract Requirement |
|---|---|
| **CE - Context Engineering** | Keep role scope, trigger keywords, constraints, and insight targets in one readable contract. Avoid Claude-only assumptions in shared role files. |
| **AC - Agentic Coding** | Map work to project roles first; spawn or delegate only when the runtime and user request allow it. Record whether a role was mapped, emulated, or actually spawned. |
| **GC - Generation Control** | Keep generated code/docs within role boundaries, preserve Adviser-first product rules, avoid broad rewrites, and write runtime-specific tool rules only in adapters. |
| **EL - Evaluation Loop** | Require tests, source checks, browser evidence, screenshots, or explicit residual risk for every meaningful change. Route findings back to the relevant insight file. |
| **SI - System Integration** | Prefer repo-local contracts over global catalogs, keep `.claude/agents/` as a compatibility adapter during migration, and keep Codex/Claude/OMX references synchronized. |

When a harness score changes, update the relevant axis notes in
`docs/domain-knowledge/evaluator-insights.md` and cross-cutting changes in
`docs/domain-knowledge/shared/changelog.md`.

---

## 4. Contract Shape

Each agent role file defines:

- **Role scope**: what the agent owns and what it must not decide alone.
- **Trigger keywords**: how work is mapped to that role.
- **Decision rules**: product/architecture/security principles for that domain.
- **Allowed evidence**: tests, screenshots, ADR/DDR, source checks, or docs.
- **Insight target**: the domain-knowledge file that must receive durable findings.

The role file is runtime-neutral. It must not assume that one specific tool name exists.
Runtime-specific tool use belongs in adapter rules.

---

## 5. Runtime Adapters

### Claude

- Use project agents through the Claude-supported discovery path while it exists.
- Use the `Agent` tool when hooks require delegation or when independent context helps.
- Respect hook-level Iron Laws in `CLAUDE.md`.

### Codex

- Read the common contract first, then the mapped role file.
- Read `agents/CODEX_RUNTIME.md` before running an all-agent wave.
- Use `spawn_agent` only when the user explicitly asks for agents, delegation, or parallel agent work.
- For large all-agent waves, do not use full conversation forks. Pass only the active goal, role file path, relevant repo files, and output schema.
- Use Codex-native tools for shell, edits, screenshots, and browser checks.
- For deferred MCP/plugin tools, run `tool_search` first. Example: Playwright MCP appears as
  `mcp__playwright__` only after searching for Playwright browser automation.

### OMX

- Use OMX team/hud/question surfaces only when an attached OMX-capable shell exists.
- Outside tmux or without a bridge, treat the same role file as guidance and use native Codex/Claude tools.

---

## 6. Activation Workflow

1. **Map** the request to one or more roles using `.claude/rules/agent-matrix.md`.
2. **Load** `agents/AGENT_CONTRACT.md`, then the mapped role file.
3. **Choose execution mode**:
   - main-agent role emulation for tightly coupled work,
   - subagent delegation for explicit parallel work,
   - read-only evaluator wave for review and risk discovery.
4. **Implement or review** within the mapped role boundaries.
5. **Verify** with the smallest check that proves the behavior.
6. **Record or route insights** in the mapped domain file and, for cross-cutting
   changes, in `docs/domain-knowledge/shared/changelog.md`.

---

## 7. Output Contract

Agent outputs should be short, actionable, and traceable.

Required fields for role reports:

- **changed**: files or behavior changed, or `없음` for read-only work.
- **verified**: commands, screenshots, source checks, or reviewed files.
- **uncertain**: residual risks, blocked checks, or assumptions.

When an agent finds a concrete code risk, prefer file/line-grounded findings. When it
finds a reusable lesson, record it as an insight instead of leaving it only in chat.
Read-only evaluator roles may not write directly; they should include an insight
recommendation in their report so `insight-curator` or the document owner can record it.

---

## 8. Stop Conditions

Agents must pause or escalate when:

- a destructive command, production DB write, paid provider call, or secret access is required;
- role findings conflict and `coherence-reviewer` has not resolved the conflict;
- verification cannot run and no credible substitute evidence exists;
- a runtime adapter would require a tool that is not available after discovery.
