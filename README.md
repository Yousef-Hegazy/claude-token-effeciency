# token-saver — token-efficient subagents for Claude Code

An always-on protocol that has the main model plan and write exact instructions, while low-cost subagents carry them out.

| Agent | Model | Job |
|---|---|---|
| `token-saver:searcher` | Haiku, low | Find files, symbols, call sites |
| `token-saver:builder` | Haiku, medium | Default for implementation: any edit or new file that follows the spec or an existing pattern, from one line to many files |
| `token-saver:builder-pro` | Sonnet, low | Only genuinely new logic the spec leaves open (or when `builder` fails twice) |
| `token-saver:verifier` | Haiku, low | Run build/lint/tests, return PASS or the first 3 errors |

The rules live in [`token-saver/protocol.md`](token-saver/protocol.md). A `SessionStart` hook injects them into every session, and a `PreToolUse` hook [enforces](#enforcement) them on the main model.

## Requirements
- Claude Code (CLI, desktop app or IDE extension)
- [Node.js](https://nodejs.org) on your `PATH` (the hook runs `node`). Check with `node --version`.

## Setup

Use **one** of the options below, then restart Claude Code.

### Option A — `claude` CLI
```bash
claude plugin marketplace add Yousef-Hegazy/claude-token-effeciency
claude plugin install token-saver@gnm-tools
```
In an interactive `claude` terminal you can do the same with `/plugin marketplace add Yousef-Hegazy/claude-token-effeciency` and then `/plugin install token-saver@gnm-tools`.

### Option B — edit settings (no CLI needed, e.g. desktop app only)
Open your user settings file, creating it if it doesn't exist:
- Windows: `C:\Users\<you>\.claude\settings.json`
- macOS / Linux: `~/.claude/settings.json`

Add these two keys (merge them into the existing JSON if the file already has content):
```json
{
  "extraKnownMarketplaces": {
    "gnm-tools": {
      "source": { "source": "github", "repo": "Yousef-Hegazy/claude-token-effeciency" }
    }
  },
  "enabledPlugins": {
    "token-saver@gnm-tools": true
  }
}
```

### Option C — local clone (for editing the plugin)
```bash
git clone https://github.com/Yousef-Hegazy/claude-token-effeciency.git
```
Then use Option B, replacing the `source` with a local directory:
```json
"source": { "source": "directory", "path": "/absolute/path/to/claude-token-effeciency" }
```
On Windows, escape backslashes: `"C:\\Users\\<you>\\claude-plugins"`. Edits to the files take effect in the next new session.

## Check that it works
1. Start a **new** session.
2. Run `/agents`: the four `token-saver:*` agents should be listed.
3. Ask something like "where is X defined?" and the main model should hand it to `token-saver:searcher`.
4. Optional hook test, run from the repo folder: `node token-saver/hooks/inject.js` should print JSON that starts with `{"hookSpecificOutput"`.

## Avoid duplicate agents
If you already have personal agents with the same jobs in `~/.claude/agents/` (for example `searcher.md` or `builder.md`), move them out of that folder, e.g. into `~/.claude/agents-backup/`. Otherwise Claude may pick the old ones instead.

## If Haiku 5.5 isn't available
Four agents use the `haiku` alias, which points to the newest Haiku. If your account or provider (Bedrock, Vertex, Foundry, a gateway, an org allowlist) doesn't have it, the plugin falls back in this order:

1. **A cheaper model you configure** (recommended). Point the `haiku` alias at any model you do have. Add an `env` block to your `settings.json`:
   ```json
   { "env": { "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5" } }
   ```
   Use your provider's ID format, for example `us.anthropic.claude-haiku-4-5-20251001-v1:0` on Bedrock or `claude-haiku-4-5@20251001` on Vertex.
   **Open models:** if you run Claude Code through an Anthropic-compatible gateway (for example LiteLLM, with `ANTHROPIC_BASE_URL` pointing at it), set `ANTHROPIC_DEFAULT_HAIKU_MODEL` to the gateway's model name, e.g. a Qwen, DeepSeek or Llama model. The agents then run on that model.
2. **Sonnet, automatically.** With nothing configured, when a Haiku agent fails because the model is missing, Claude retries it once on Sonnet and keeps using Sonnet for the rest of the session. It tells you once when this happens.
3. **The main model.** If Sonnet is missing too, the main model does the work itself.

If you know Haiku is missing and don't want to set up another model, add `"TOKEN_SAVER_NO_HAIKU": "1"` to the same `env` block. Claude then goes straight to Sonnet and skips the failing first try.

Restart Claude Code after changing `settings.json`.

## Update
- CLI: `claude plugin update token-saver@gnm-tools`, then restart Claude Code (or run `/reload-plugins` in a session). `claude plugin marketplace update` alone only refreshes the listing and does **not** update the installed plugin.
- In an interactive terminal: `/plugin` → Marketplaces → `gnm-tools` → Update marketplace (this also updates the plugin).
- Local clone (Option C): `git pull` in the clone, then start a new session.

### What changed
- **1.3.0:** cuts `builder-pro` usage, which was the largest share of subagent tokens:
  - `builder` (Haiku) is now the default for all implementation, including new screens or modules modeled on existing ones. `builder-pro` (Sonnet) is only for genuinely new logic, or after `builder` has failed twice. A failed `builder` is first sent its error to fix, instead of escalating right away.
  - `builder-pro` runs at low effort (most of its output was reasoning, not code). Set `effort: medium` in `token-saver/agents/builder-pro.md` if you want it back.
  - Builders read only the files the spec names, read large files by range, never re-read a file, and don't explore the codebase. The main model now passes along what was already found, so nothing is searched twice.
- **1.2.0:**
  - No turn limits, so long or fully automated tasks are never cut off midway. Each agent instead stops itself with "BLOCKED" when it is stuck (the same step failing 3 times, or no progress). A stopped agent is continued rather than restarted.
  - `micro-editor` is merged into `builder`: Haiku now takes every edit where the spec holds the answer, at any size. If you have `token-saver:micro-editor` in your own prompts or settings, use `token-saver:builder`.
  - New enforcement hook so strong models (Opus and up) can't quietly skip delegation. See [Enforcement](#enforcement).
- **1.1.0:** the Haiku fallback above.

To upgrade from any earlier version, run the update command for your setup, then restart. Nothing else is needed. The `env` settings are optional.

## Enforcement
Strong models sometimes decide doing the work themselves is "better" and skip the agents. A `PreToolUse` hook catches this on the main model only (never inside agents):

- The 3rd search in a row (Grep, Glob, or a `grep`/`rg`/`find` shell command) is blocked with a one-line note to use `token-saver:searcher`.
- Writing more than 60 lines, or an edit adding more than 30 lines, to a project file is blocked with a note to use `token-saver:builder`. Files outside the project and under `.claude/` (plans, memory) are never blocked.
- If the model has a good reason, it repeats the exact same call and it goes through, so it never gets stuck.

It adds no tokens unless it blocks something, and then only one line. Unlike a per-prompt reminder, it costs nothing on turns where the model follows the rules. To turn it off, add `"TOKEN_SAVER_ENFORCE": "off"` to the `env` block in `settings.json`. The limits are constants at the top of `token-saver/hooks/enforce.js`.

## Uninstall
- CLI: `claude plugin uninstall token-saver@gnm-tools`
- Settings: set `"token-saver@gnm-tools": false` or remove both keys.

## Customize
- Routing rules and thresholds: `token-saver/protocol.md`
- Agent models and effort: frontmatter in `token-saver/agents/*.md`. Agents have no turn limit by default. To add a hard cap, add `maxTurns: <n>` to an agent's frontmatter (it counts tool-use rounds).
