# token-saver — token-efficient subagents for Claude Code

An always-on protocol that has the main model plan and write exact instructions, while low-cost subagents carry them out.

| Agent | Model | Job |
|---|---|---|
| `token-saver:searcher` | Haiku, low | Find files, symbols, call sites |
| `token-saver:micro-editor` | Haiku, medium | Small exact edit in one file |
| `token-saver:builder` | Haiku, medium | Larger edits / new files where the spec is the answer |
| `token-saver:builder-pro` | Sonnet, medium | Larger edits that need logic worked out (or when `builder` fails) |
| `token-saver:verifier` | Haiku, low | Run build/lint/tests, return PASS or the first 3 errors |

The rules live in [`token-saver/protocol.md`](token-saver/protocol.md). A `SessionStart` hook injects them into every session.

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
2. Run `/agents`: the five `token-saver:*` agents should be listed.
3. Ask something like "where is X defined?" and the main model should hand it to `token-saver:searcher`.
4. Optional hook test, run from the repo folder: `node token-saver/hooks/inject.js` should print JSON that starts with `{"hookSpecificOutput"`.

## Avoid duplicate agents
If you already have personal agents with the same jobs in `~/.claude/agents/` (for example `searcher.md` or `micro-editor.md`), move them out of that folder, e.g. into `~/.claude/agents-backup/`. Otherwise Claude may pick the old ones instead.

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

### Upgrading from 1.0.0 to 1.1.0
1.1.0 adds the Haiku fallback above. Run the update command for your setup, then restart. Nothing else is needed. The new `env` settings are optional.

## Uninstall
- CLI: `claude plugin uninstall token-saver@gnm-tools`
- Settings: set `"token-saver@gnm-tools": false` or remove both keys.

## Customize
- Routing rules and thresholds: `token-saver/protocol.md`
- Agent models, effort and turn limits: frontmatter in `token-saver/agents/*.md`
