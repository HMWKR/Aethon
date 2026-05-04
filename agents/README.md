# AETHON Agents

`agents/` is the canonical, runtime-neutral home for AETHON agent contracts.

Use this directory for shared policy that should apply across Claude, Codex, OMX,
and future orchestration surfaces. Runtime-specific discovery paths, such as
`.claude/agents/`, should stay as adapters or shims.

## Current Migration State

- Canonical contract: `agents/AGENT_CONTRACT.md`
- Codex runtime adapter: `agents/CODEX_RUNTIME.md`
- Canonical role contracts: `agents/*.md` for the 23 AETHON roles listed in `.claude/rules/agent-matrix.md`
- Current Claude compatibility path: `.claude/agents/`
- Current role matrix: `.claude/rules/agent-matrix.md`

Role files now live under `agents/` as the shared source of truth. The matching
`.claude/agents/` files remain compatibility adapters until Claude hook and
discovery references are fully audited or replaced by shims.

## Harness Axes

| Axis | What `agents/` Owns |
|---|---|
| CE | Single source of truth for role scope, constraints, trigger mapping, and insight targets. |
| AC | Rules for mapped, emulated, delegated, and spawned agent execution. |
| GC | Boundaries that keep generated changes scoped and runtime-neutral. |
| EL | Required evidence and insight feedback after meaningful changes. |
| SI | Compatibility strategy across Claude, Codex, OMX, local docs, and future tools. |

## Migration Checklist

- [x] Update references from `.claude/agents/AGENT_CONTRACT.md` to `agents/AGENT_CONTRACT.md`.
- [x] Keep `.claude/agents/AGENT_CONTRACT.md` as a shim.
- [x] Promote the 23 AETHON role files to `agents/*.md`.
- [x] Add Codex runtime wave policy in `agents/CODEX_RUNTIME.md`.
- [ ] Audit Claude hooks before replacing `.claude/agents/*.md` with short shims.
- [ ] Update Codex skills that generate or inspect agent structures.
- [ ] Record cross-cutting changes in `docs/domain-knowledge/shared/changelog.md`.
