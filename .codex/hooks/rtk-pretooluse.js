#!/usr/bin/env node

import fs from "node:fs";

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function shouldSkip(command) {
  const trimmed = command.trimStart();
  return (
    trimmed.length === 0 ||
    trimmed.startsWith("rtk ") ||
    trimmed === "rtk" ||
    trimmed.startsWith("command rtk ") ||
    trimmed.startsWith("RTK_DISABLE=1 ")
  );
}

function main() {
  let payload;

  try {
    payload = JSON.parse(readStdin() || "{}");
  } catch {
    return;
  }

  const toolName = payload.tool_name || payload.toolName;
  const toolInput = payload.tool_input || payload.toolInput || {};
  const command = toolInput.command;

  if (toolName !== "Bash" || typeof command !== "string" || shouldSkip(command)) {
    return;
  }

  const updatedCommand = `rtk zsh -lc ${shellQuote(command)}`;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: {
          ...toolInput,
          command: updatedCommand,
        },
        additionalContext: `RTK hook rewrote command to: ${updatedCommand}`,
      },
    }),
  );
}

main();
