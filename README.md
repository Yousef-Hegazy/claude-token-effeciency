# gnm-tools

## token-saver
An always-on protocol that makes the main model plan and write exact instructions, while low-cost subagents carry them out:

| Agent | Model | Job |
|---|---|---|
| searcher | Haiku, low | find files, symbols, call sites |
| micro-editor | Haiku, medium | small exact edit in one file |
| builder | Haiku, medium | larger edits / new files where the spec is the answer |
| builder-pro | Sonnet, medium | larger edits that need logic worked out |
| verifier | Haiku, low | run build/lint/tests, return PASS or first errors |

The protocol text is in `token-saver/protocol.md` and is injected at every session start by a hook (needs Node.js).

## Install
Without the `claude` CLI, add this to `~/.claude/settings.json` (use `"source": "github", "repo": "Yousef-Hegazy/claude-token-effeciency"` on other machines):
```json
{
  "extraKnownMarketplaces": {
    "gnm-tools": { "source": { "source": "directory", "path": "C:\\Users\\GNM\\claude-plugins" } }
  },
  "enabledPlugins": { "token-saver@gnm-tools": true }
}
```

With the CLI, on this machine (from a local folder):
```
claude plugin marketplace add C:\Users\GNM\claude-plugins
claude plugin install token-saver@gnm-tools
```
On another machine:
```
claude plugin marketplace add Yousef-Hegazy/claude-token-effeciency
claude plugin install token-saver@gnm-tools
```
Restart Claude Code after installing.
