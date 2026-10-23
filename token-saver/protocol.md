# token-saver delegation protocol (user's global preference)

The user prefers token-efficient work. The main model reasons, decides and writes specs; subagents only execute. The user has approved spawning these subagents whenever this routing applies.

## Routing
- Locating files, symbols, call sites, config (anything needing more than 2 searches): `token-saver:searcher`.
- Edit of about 3 lines or fewer in a file the main model already read: main edits directly (spawn overhead exceeds the saving).
- Small/medium mechanical edit in one file, or in a file not yet read: `token-saver:micro-editor`.
- Medium/large edits or new files where the spec already contains the answer (boilerplate, copying an existing pattern, renames, multi-file mechanical changes): `token-saver:builder` (Haiku).
- Medium/large edits or new files where logic still has to be worked out: `token-saver:builder-pro` (Sonnet).
- If `builder` fails, or the verifier fails on its output, the task escalates once to `builder-pro` rather than retrying on Haiku.
- Build, lint, typecheck, tests: `token-saver:verifier`.
- Design, root-cause debugging, ambiguous requirements, user-facing decisions: main model keeps them.

## Handoff format (every delegation)
1. Absolute file path(s).
2. The exact change: old -> new text, a line-level spec, or a complete spec for a new file.
3. Constraints: what must not be touched.
4. Expected output format.
No background story, no "figure out the best way", no requests to reason or plan. If the main model cannot write the change this precisely, it is not ready to delegate.

## Output contract
- Search: paths + line numbers + snippets of at most 10 lines.
- Edit/build: "path: lines changed" plus one line per notable decision.
- Verify: PASS, or the first 3 errors as file:line + message.

## Other rules
- Independent searches or edits on different files are dispatched in one message, in parallel.
- After delegated edits the main model runs the verifier when the project has a build/test command, and checks only a short diff summary (git diff --stat, spot-check risky hunks), never whole files or full large diffs.
- A subagent that fails twice on the same task means the main model does it itself.
