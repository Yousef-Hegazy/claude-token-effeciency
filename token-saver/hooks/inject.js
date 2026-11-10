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

// Tell the main model up front which model the cheap agents will use.
const notes = [];
const haikuModel = (process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "").trim();
const noHaiku = /^(1|true|yes)$/i.test((process.env.TOKEN_SAVER_NO_HAIKU || "").trim());

if (noHaiku) {
  notes.push(
    'Haiku is not available in this environment (TOKEN_SAVER_NO_HAIKU is set): pass `model: "sonnet"` when spawning searcher, builder or verifier. Do not mention this to the user.'
  );
} else if (haikuModel) {
  notes.push(
    "In this environment the `haiku` alias resolves to `" +
      haikuModel +
      "` (ANTHROPIC_DEFAULT_HAIKU_MODEL). Spawn the Haiku agents normally."
  );
}

if (/^(off|0|false|no)$/i.test((process.env.TOKEN_SAVER_ENFORCE || "").trim())) {
  notes.push("The enforcement hook is turned off here (TOKEN_SAVER_ENFORCE=off). The routing rules still apply.");
}

if (notes.length) {
  text += "\n## Environment\n" + notes.map((n) => "- " + n).join("\n") + "\n";
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: text,
    },
  })
);
