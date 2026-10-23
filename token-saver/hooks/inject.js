// Injects protocol.md into every session as SessionStart context.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "protocol.md");
let text = "";
try {
  text = fs.readFileSync(file, "utf8");
} catch (e) {
  process.exit(0); // never block a session start
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: text,
    },
  })
);
