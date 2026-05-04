# AETHON Claude Agent Compatibility Shim

> Canonical common agent contract: `../../agents/AGENT_CONTRACT.md`

`.claude/agents/` remains a Claude runtime discovery and compatibility path while
AETHON migrates to the root-level `agents/` contract directory.

Rules for this adapter:

- Do not add cross-runtime policy here.
- Add shared policy to `agents/AGENT_CONTRACT.md` first.
- Keep role-specific compatibility files here only when Claude hooks or discovery need them.
- When role files move to `agents/`, leave a short shim here instead of duplicating policy.

Harness mapping:

- **CE**: root contract is the SSoT; this file only prevents context drift.
- **AC**: Claude can still discover project agents; Codex maps/emulates or spawns only by explicit user request.
- **GC**: generated role policy must not fork between root and `.claude`.
- **EL**: validation and insight requirements live in the root contract.
- **SI**: this adapter keeps existing Claude infrastructure working during migration.
