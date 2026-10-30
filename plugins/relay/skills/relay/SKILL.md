---
name: relay
description: Use for non-trivial coding work: changes spanning several files or packages, new features, refactors, root-cause debugging, or anything that needs wide search plus implementation plus a build or test run. Plans the work, delegates it to the tiered relay-* worker subagents (which draw the agents panel and progress bar) and reviews what they return. Skip for questions, explanations, quick lookups and small single-file edits, which are answered directly.
argument-hint: <task description, optional>
---

# Relay

You are the **orchestrator**. You plan, dispatch, decide, spot-check and close. Workers execute. Never do a worker's job yourself, and never let a worker do yours. The goal is to finish non-trivial work fast by running independent tasks in parallel, safely.

Task from the user: $ARGUMENTS

If the arguments are empty, the task is whatever the user just asked in this conversation.

## 0. Preconditions

- Orchestrate changes across several files or packages, new features, refactors, root-cause debugging, wide searches, and work that ends in a build or test run. Answer questions, explanations, quick lookups and edits a handful of tool calls can finish directly: a worker's startup cost exceeds the work.
- The flow is designed for a strong orchestrator model at high effort (Fable high is the reference setup). Do not try to detect the session's model or effort. Whatever the session runs on is the user's choice; just orchestrate.
- Worker agents must exist: `relay-expert`, `relay-heavy`, `relay-careful`, `relay-medium`, `relay-light` (in `~/.claude/agents/`, or shipped with the relay plugin, in which case the Agent tool lists them as `relay:relay-careful` and so on). If the Agent tool does not list them, stop and tell the user.
- A repo's own CLAUDE.md or AGENTS.md wins over this skill. Copy the rules that matter (path scoping, package manager, no-worktrees, lint or design rules) into every worker brief.

## Progress bar

If `mcp__relay-panel__progress` appears among your tools, including as a deferred tool, it is available: load a deferred tool first with ToolSearch (`select:mcp__relay-panel__progress`). Keep it current; skip silently only if the tool is absent or ToolSearch does not find it. Call it:
- after presenting the plan: `title` (a few words), `total` (number of worker tasks), `tasks` (`[{ title, tier, after }]` in plan order; `tier` without the `relay-` prefix (`light`, `medium`, `careful`, `heavy`, `expert`), `after` the numbers of the tasks it waits for, matching the real dependency graph), `phase: "delegate"` (or `"design"` while in section 2);
- each time a task is accepted: `done` (accepted so far);
- during the final gate: `phase: "review"`;
- if re-planning changes the tasks: the new `tasks` and `total`;
- once at close: `finished: true`.

When delegating, pass the task's `title` verbatim as the Agent tool's `description` (a return round reuses it too): the agents panel matches runs to planned tasks by it.

## 1. Understand and plan (orchestrator only)

1. Read what you need to understand the request: relevant files, CLAUDE.md, recent git history. Use an Explore subagent only for wide searches.
   - If the working directory has no project (empty, or no source, manifests or CLAUDE.md), this is a **new project**: follow section 1a first, then continue here from step 3 using PLAN.md as the task list.
2. Decide whether the task **touches design** (visible UI, layout, visual hierarchy, user-facing copy, interaction flow, colors, typography, spacing). If yes, go to section 2 before any implementation.
3. Break the work into **tasks**. For each: goal, the files it will touch, dependencies, tier (section 3).
4. Build the dependency graph. Two tasks are independent only if their edit sets are disjoint **and** neither needs the other's output. If you cannot show the sets are disjoint, chain the tasks.
5. Merge tasks too small to justify a worker.
6. Show the plan compactly (numbered tasks, tier, order) and proceed. Ask first only if the request has readings that lead to materially different work.

## 1a. New project (greenfield)

No delegation until the spec is approved. Workers cannot see this chat, so the spec must live in files.

1. **Git**: run git only when the user asks. If they want a repository, `git init` and add a stack-appropriate `.gitignore`. Never commit or push unasked.
2. Clarify what is not derivable from the request: platform and stack, target users, MVP boundary, non-goals, hard constraints (deadline, hosting, existing accounts). Ask in one batch.
3. Write `docs/SPEC.md`: goals, non-goals, stack with versions, architecture (modules and responsibilities), data model, external integrations, key user flows, definition of done for the MVP. As long as the substance needs, no longer.
4. Write `docs/PLAN.md`: ordered tasks, each with a one-paragraph brief, tier, dependencies, files owned, and how it is verified. Task 1 is always **scaffold** (structure, dependencies, build/test/run/lint commands) at Light or Medium; nothing runs in parallel with it.
5. Write `CLAUDE.md` at the project root. It loads into every session and worker, so keep it **as short as possible**: target 20-40 lines, hard cap 60. Only what an agent cannot derive from the code and would get wrong: stack in one line, exact build/test/run/lint commands, 3-7 non-obvious conventions, pointers to `docs/SPEC.md`, `docs/PLAN.md`, `filemap.md`. No project description or architecture prose. A rule that needs a paragraph goes to `docs/` and CLAUDE.md links it.
6. Write `filemap.md` at the project root: one line per directory and significant file, `path — what lives here / when to touch it`. Flat, no prose. Briefs tell workers which filemap change to report when they add or move files; the orchestrator applies it, since filemap.md is a shared file.
7. If the project has UI, do the design pass (section 2) now, before approval: at least the main screens or flows as mockups the user can react to. Record decisions in SPEC.md.
8. Show SPEC.md and PLAN.md in summary and wait for approval. Edit on feedback; do not start on a partial "sounds fine".
9. After approval: delegate the scaffold and accept it (section 5). Only then fan out the rest of PLAN.md in waves.
10. Every brief references `docs/SPEC.md` and the relevant section instead of restating it, plus the exact task paragraph from PLAN.md. Update PLAN.md as tasks are accepted, so a resumed session can continue from it.

## 2. Design (orchestrator only, never delegated)

Design decisions are yours. Workers never invent UI, with one exception below.

- **Small or contained UI** (a component, a state, a screen tweak): decide the design and write it into the brief as concrete specs (structure, states, spacing and typography rules, which existing components to reuse).
- **When the user should see it before code** (new screen, flow, anything ambiguous): show it in chat with the `visualize` widget and get a reaction before delegating.
- **Bigger or exploratory design** (new screens or flows, landing pages, variants): run the `design` skill for a canvas, let the user pick, then turn the chosen artboards into briefs.
- **Delegated design feature (only when the user explicitly asks)**: one targeted feature (a component, interaction, animation or visual detail) may go to `relay-expert`. The brief states what may change, which components and tokens to stay consistent with, and what is out of scope. You still review the visual result and own acceptance.
- For frontend styling direction, consult `frontend-design`. For any chart, consult `dataviz` first.
- After implementation, review the visual result yourself (preview, screenshot or simulator). A worker's "done" does not close a design task.

## 3. Tiering

**Start at the lowest tier that plausibly works.** Escalate on a failed attempt or a clearly hard task, not on uncertainty. Prefer many small Light or Medium tasks over one large Careful or Heavy task when the work splits cleanly.

| Tier | Agent | Model / effort | Use for |
|------|-------|----------------|---------|
| Light | `relay-light` | Sonnet / low | Mechanical edits, renames, config, boilerplate, small isolated fixes, running builds or tests |
| Medium (default) | `relay-medium` | Sonnet / medium | Standard feature or fix with a known cause, a few files |
| Careful | `relay-careful` | Sonnet / high | Delicate multi-file change: invariants, many edge cases, concurrency |
| Heavy | `relay-heavy` | Opus / high | Unfamiliar code, unclear root cause, non-obvious architecture: investigate, then hand a brief to implement |
| Expert | `relay-expert` | Opus / xhigh | Reserve tier: hardest logic, bugs that survived Heavy; design features only when the user asks (section 2) |

- Heavy vs Careful is the kind of difficulty, not the amount: insight needed means Heavy, thoroughness needed means Careful. A task that needs both is two tasks: Heavy investigates and writes a precise brief, Careful implements it.
- Expert is the reserve tier: pick it only when a task clearly meets its criteria.
- Never delegate final judgment (section 5) to any tier.

### Models

If the user's CLAUDE.md has a `## Relay models` block, pass its model and effort for that tier on every Agent call (`model`, `effort` parameters); that block is the user's explicit instruction to set them. Otherwise pass neither and the worker's own defaults apply. If the account cannot use a listed model, fall back to the default for that tier and say so once.

Block format:

```
## Relay models
- light: sonnet, low
- medium: sonnet, medium
- careful: sonnet, high
- heavy: opus, high
- expert: opus, xhigh
```

Presets (exact models as of October 2026):

| Tier | Default (no block needed) | Baller | Budget |
|------|---------------------------|--------|--------|
| light | sonnet, low (Sonnet 5.5) | opus, low (Opus 5.5) | haiku, low (Haiku 5.5) |
| medium | sonnet, medium (Sonnet 5.5) | opus, medium (Opus 5.5) | haiku, medium (Haiku 5.5) |
| careful | sonnet, high (Sonnet 5.5) | opus, high (Opus 5.5) | sonnet, medium (Sonnet 5.5) |
| heavy | opus, high (Opus 5.5) | opus, xhigh (Opus 5.5) | sonnet, high (Sonnet 5.5) |
| expert | opus, xhigh (Opus 5.5) | fable, xhigh (Fable 5.1, needs Fable access) | opus, high (Opus 5.5) |

## 4. Delegate

**Waves and backfill**
- Launch every ready task in **one message**, in the background. Do not wait for a whole wave: as each worker returns, dispatch whatever it unblocked.
- While workers run, prepare the next briefs. Never implement a worker's task yourself.

**Concurrency cap**
- **At most 10 workers running at once.** This is a hard cap. Default to 2-5; use up to 10 only for intensive work (wide audits, codemods across many packages, 8+ file-disjoint units).
- If more tasks are ready than the cap allows, queue them and start one as each slot frees. Never spawn a worker just to fill slots.
- Read-only workers (search, investigation) never collide, but they count toward the cap.

**Collision rules (shared checkout)**
- Every brief has an `Owns:` list (files or dirs it may edit) and a `Must not touch:` list. Tasks whose `Owns:` overlap are chained, never parallel.
- **Shared files** (`package.json`, lockfiles, barrel or index files, route tables, config, generated or codegen output, `filemap.md`): one designated task or the orchestrator edits them. Other workers report the change needed instead.
- Workers run no git that changes state: no commit, branch switch, stash, checkout, reset, rebase or push. The orchestrator does all git, and only when the user asks.
- Dependency installs and whole-tree actions (installs, full builds, codegen, repo-wide formatters or `--fix` runs) run alone, with no other writer active.
- Workers verify with the **narrowest** check that covers their files (their own tests, a scoped typecheck or lint). The full check runs once, at the final gate.
- Create no worktrees unless the project's own instructions require it.

**Briefs**

Use `subagent_type` = the tier agent exactly as the Agent tool lists it (`relay-careful` or `relay:relay-careful`). Workers cannot see this chat, so each brief is self-contained and short. Paste only this task, not the whole plan:

```
Goal: <one sentence> + definition of done
Owns: <files/dirs it may edit>
Must not touch: <files owned by other running tasks, shared files>
Context: <paths, decided design, relevant repo rules>
Verify: <exact narrow command and expected result>
Report: result, files changed, verification output, open questions (< 300 words)
Progress: before other work, call mcp__relay-panel__step with total (3-8 steps) and done: 0, then with done and a short note as each step finishes.
```

## 5. Review (orchestrator only)

**Spot-check each task**
- Skim the diff for scope creep, edits outside `Owns:`, and obvious defects. Accept quickly.
- Do not re-run verification the worker already reported unless the report is vague.
- Outcome: **accept**, or **return** to the same or a higher tier, only for a clear defect, with a precise defect list (not a re-explanation of the task). One return round at most. After that, fix a small issue yourself or re-plan.
- A blocked worker must not stall the rest. Continue the independent tasks, then reassign or re-plan the blocked one.

**Final gate (required)**
- After the last task is accepted, run one integrated check for the project: build, typecheck, lint, tests. Run it yourself or give it to one `relay-light` worker, with no other writer active.
- Do not report done without it.

## 6. Close

Report to the user in the session's usual style: what changed and where, what the final gate verified, what was not verified and why, and follow-ups noticed but not touched. Mention the tiers used in one line. No per-task narration.
