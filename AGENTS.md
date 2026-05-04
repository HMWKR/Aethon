# AETHON Codex Instructions

> Codex-specific project contract. This file is the project-level source of
> truth for Codex behavior in this repository. If this file conflicts with
> higher-priority system or developer instructions, follow the higher-priority
> instructions.

## Language

- Default responses are Korean.
- Keep explanations concise and technical.
- Use `Get-Content -Encoding UTF8` when checking Korean text on Windows
  PowerShell; default decoding can make valid UTF-8 look corrupted.

## Workflow

1. Read the local source of truth before changing files:
   - `AGENTS.md`
   - `README.md`
   - `session-handoff.md` or `NEXT_SESSION_HANDOFF.md` when present
   - relevant package manifests and configs
2. Preserve the existing monorepo style and make the smallest safe diff.
3. Do not revert user changes in the dirty worktree.
4. For multi-step work, keep explicit progress and verify before finalizing.
5. Do not read or modify legacy runtime instruction files unless the user
   explicitly asks for migration, comparison, or cleanup work.

## Codex Harness Rules

- Codex hooks are enabled through `features.codex_hooks = true` and
  `~/.codex/hooks.json`.
- Hook stdout for `UserPromptSubmit` and `Stop` must remain valid JSON.
- Use `~/.codex/scripts/codex_hook_json.py` for JSON-safe hook wrapping.
- Treat `checkpoint.md` as local continuity state, not as product code.

## Agents

- Use Codex `spawn_agent` only when the user explicitly asks for delegation,
  sub-agents, or parallel agent work.
- Existing `agents/` files are role references unless a runtime explicitly
  activates them.

## Verification

- Prefer project commands from `package.json` and workspace manifests.
- For harness changes, run:
  - `codex --help`
  - `python C:\Users\jusan\.codex\skills\codex-harness\scripts\codex_harness_eval.py --json`
  - direct JSON parsing checks for hook wrapper output
