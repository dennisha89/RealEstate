---
name: handoff
description: Generate a session handoff document before ending work. Captures goal, progress, blockers, key files, and next steps so the next session can pick up seamlessly.
user_invocable: true
---

Generate a session handoff document. Write it to `.claude/scratchpad.md`.

Include these sections:

## Current Goal
What was being worked on this session? What was the user's request?

## Progress
- What was completed (with file paths)
- What was partially completed
- What tests pass/fail

## Key Files Modified
List every file that was created or modified this session.

## Blockers
Any issues preventing progress — errors, missing dependencies, unclear requirements.

## Decisions Made
Key architectural or design decisions and why they were made.

## Next Steps
Numbered list of what should be done next, in priority order.

## Context to Preserve
Any important details that would be lost without this handoff — variable names, API responses, error messages, user preferences expressed.

---

IMPORTANT: Write this to `.claude/scratchpad.md` (overwrite existing content). This file is loaded automatically at the start of every session via the UserPromptSubmit hook.
