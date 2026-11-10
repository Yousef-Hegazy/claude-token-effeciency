# token-saver delegation protocol (user's standing instruction)

The user runs token-saver to cut token usage, and has approved every spawn this routing calls for. These are rules, not suggestions: follow them even when doing the work yourself looks quicker or more thorough.

Why: everything the main model reads (search results, files, logs) stays in its context and is paid for again on every later turn, at the main model's price. A subagent pays for that reading once, on a cheaper model, and hands back a few lines. Your judgement is the expensive part; spend it on deciding and specifying, not on reading and typing.

## Routing
- Finding files, symbols, call sites or config, when it takes more than 2 searches: `token-saver:searcher` (Haiku).
- Edit of about 3 lines or fewer in a file you already read: do it yourself (a spawn costs more).
- Any other edit or new file where your spec already holds the answer, any size, one file or many: `token-saver:builder` (Haiku).
- Edits or new files where logic still has to be worked out: `token-saver:builder-pro` (Sonnet).
- If `builder` fails, or the verifier fails on its output, escalate once to `builder-pro` instead of retrying on Haiku.
- Build, lint, typecheck, tests: `token-saver:verifier` (Haiku).
- Keep for yourself: design, root-cause debugging, unclear requirements, decisions the user must make.

A PreToolUse hook enforces this on the main thread: it blocks a 3rd search in a row and large writes or edits, and names the agent to use. If you have a real reason to do it yourself (for example the agent already failed twice), repeat the exact same call and it goes through.

## Handoff (every delegation)
1. Absolute file path(s).
2. The exact change: old -> new text, a line-level spec, or a complete spec for a new file.
3. What must not be touched.
4. The output format you want.
No background story and no "figure out the best way". If you cannot write the change this precisely, it is not ready to delegate.

## What agents return
- Search: `path:line` + at most 10 lines of snippet per hit.
- Edit: `path: lines changed` + one line per notable decision.
- Verify: PASS, or the first 3 errors as `file:line message`.

## After delegating
- Send independent searches or edits on different files in one message, in parallel.
- After edits, run the verifier when the project has a build/test command, and check only `git diff --stat` plus risky hunks, never whole files or full diffs.
- Agents have no turn limit and stop themselves with "BLOCKED" when stuck. Fix the cause, then continue the same agent with SendMessage; never spawn a fresh one for the same task (it starts over and re-reads everything).
- An agent that fails twice on the same task: do it yourself.

## Model fallback
- A spawn that errors because its model is unavailable (model not found, no access, 403/404) is not a task failure and does not count toward "fails twice".
- Haiku agent unavailable: retry it once with the Agent tool's `model: "sonnet"` override; if that fails too, do the task yourself. `builder-pro` (Sonnet) unavailable: do it yourself.
- Remember this for the rest of the session instead of hitting the same error again.
- The first time, tell the user in one line that Haiku is not available on this account and that they can point the `haiku` alias at a cheaper model (an older Haiku, or an open model through a gateway) with `ANTHROPIC_DEFAULT_HAIKU_MODEL`; see the token-saver README.
