// PreToolUse: nudges the MAIN model to delegate, per protocol.md.
// - Blocks the 3rd search in a row (Grep, Glob, or a grep/rg/find shell command).
// - Blocks large Write/Edit calls on project files.
// Repeating the exact blocked call lets it through (escape hatch).
// Never fires inside subagents. Any error lets the call through.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const SEARCH_STREAK_LIMIT = 3; // block the 3rd search in a row
const MAX_WRITE_LINES = 60;
const MAX_EDIT_LINES = 30;

function allow() {
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "token-saver: " + reason + " If you must do it yourself, repeat this exact call.",
      },
    })
  );
  process.exit(0);
}

try {
  if (/^(off|0|false|no)$/i.test((process.env.TOKEN_SAVER_ENFORCE || "").trim())) allow();

  const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (input.agent_id) allow(); // subagent: not our business

  const tool = input.tool_name || "";
  const ti = input.tool_input || {};
  const sessionId = String(input.session_id || "default").replace(/[^\w.-]/g, "_");

  const dir = path.join(os.tmpdir(), "token-saver");
  const stateFile = path.join(dir, sessionId + ".json");
  let state = { streak: 0, lastDenied: "" };
  try {
    state = Object.assign(state, JSON.parse(fs.readFileSync(stateFile, "utf8")));
  } catch (e) {}

  const save = () => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(stateFile, JSON.stringify(state));
    } catch (e) {}
  };

  const sig = crypto.createHash("sha1").update(tool + JSON.stringify(ti)).digest("hex");
  const block = (reason) => {
    if (state.lastDenied === sig) {
      // Same call repeated on purpose: let it through.
      state.lastDenied = "";
      save();
      allow();
    }
    state.lastDenied = sig;
    save();
    deny(reason);
  };

  const lines = (s) => (typeof s === "string" ? s.split("\n").length : 0);
  const isProjectFile = (p) => {
    if (!p) return false;
    const cwd = path.resolve(input.cwd || process.cwd());
    const abs = path.resolve(cwd, p);
    const rel = path.relative(cwd, abs);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return false; // outside project
    return !rel.split(/[\\/]/).includes(".claude"); // skip plans, memory, settings
  };

  const isSearch =
    tool === "Grep" ||
    tool === "Glob" ||
    ((tool === "Bash" || tool === "PowerShell") &&
      /^\s*(grep|rg|find|fd|ag|ack|findstr|Select-String|Get-ChildItem\s+.*-Recurse)\b/i.test(
        ti.command || ""
      ));

  if (isSearch) {
    state.streak += 1;
    if (state.streak >= SEARCH_STREAK_LIMIT) {
      state.streak = 0;
      block("this is a 3rd search in a row on the main thread. Hand the lookup to token-saver:searcher with exactly what to find.");
    }
    save();
    allow();
  }

  if (tool === "Read") allow(); // neither counts nor resets the streak

  state.streak = 0; // any other tool ends a search streak

  if (tool === "Write" && isProjectFile(ti.file_path) && lines(ti.content) > MAX_WRITE_LINES) {
    block("large file write (" + lines(ti.content) + " lines). Spec it and hand it to token-saver:builder (or builder-pro if logic is still open).");
  }
  if (tool === "Edit" && isProjectFile(ti.file_path) && lines(ti.new_string) > MAX_EDIT_LINES) {
    block("large edit (" + lines(ti.new_string) + " lines). Spec it and hand it to token-saver:builder (or builder-pro if logic is still open).");
  }

  save();
  allow();
} catch (e) {
  allow();
}
