#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const LOGIC_ROOTS = new Set(["app", "components", "lib", "src"]);
const LOGIC_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".sass",
]);
const TEST_FILE_PATTERN = /(^|[./_-])(test|spec)\.[cm]?[jt]sx?$/i;
const NPM_TEST_PATTERN = /\bnpm\s+(?:(?:run|run-script)\s+)?test\b/;

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function safeId(value, fallback) {
  return String(value || fallback).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function stateFilePath(projectRoot, input) {
  const sessionId = safeId(input.session_id, "unknown-session");
  const turnId = safeId(input.turn_id, "unknown-turn");
  return path.join(
    projectRoot,
    ".codex",
    "state",
    "test-guard",
    `${sessionId}-${turnId}.json`
  );
}

function isLogicFile(relativePath) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const [firstSegment] = normalizedPath.split("/");

  if (!LOGIC_ROOTS.has(firstSegment)) return false;
  if (!LOGIC_EXTENSIONS.has(path.extname(normalizedPath))) return false;
  if (TEST_FILE_PATTERN.test(normalizedPath)) return false;
  if (normalizedPath.includes("/__tests__/")) return false;
  return true;
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function collectFiles(directory, projectRoot, result) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collectFiles(absolutePath, projectRoot, result);
      continue;
    }

    if (!entry.isFile()) continue;

    const relativePath = path.relative(projectRoot, absolutePath);
    if (isLogicFile(relativePath)) result[relativePath] = hashFile(absolutePath);
  }
}

function snapshotLogicFiles(projectRoot) {
  const snapshot = {};

  for (const rootName of LOGIC_ROOTS) {
    collectFiles(path.join(projectRoot, rootName), projectRoot, snapshot);
  }

  return snapshot;
}

function changedLogicFiles(before, after) {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...paths].filter((filePath) => before[filePath] !== after[filePath]).sort();
}

function readState(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return parseJson(fs.readFileSync(filePath, "utf8"));
}

function writeState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporaryPath, filePath);
}

function removeState(filePath) {
  fs.rmSync(filePath, { force: true });
}

function createState(input, projectRoot) {
  return {
    version: 1,
    sessionId: input.session_id || null,
    turnId: input.turn_id || null,
    baseline: snapshotLogicFiles(projectRoot),
    npmTestRuns: [],
  };
}

function commandFromToolInput(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return "";
  return String(toolInput.command || toolInput.cmd || "");
}

function allow() {
  return { continue: true };
}

function handleUserPromptSubmit(input, projectRoot) {
  const filePath = stateFilePath(projectRoot, input);

  // Stop 훅이 만든 자동 연속 프롬프트가 같은 turn_id로 들어와도 기준점을 덮어쓰지 않는다.
  if (!fs.existsSync(filePath)) writeState(filePath, createState(input, projectRoot));
  return allow();
}

function handlePostToolUse(input, projectRoot) {
  const command = commandFromToolInput(input.tool_input);
  if (!NPM_TEST_PATTERN.test(command)) return allow();

  const filePath = stateFilePath(projectRoot, input);
  const state = readState(filePath);
  if (!state) return allow();

  state.npmTestRuns.push({
    command,
    recordedAt: new Date().toISOString(),
  });
  writeState(filePath, state);
  return allow();
}

function handleStop(input, projectRoot) {
  const filePath = stateFilePath(projectRoot, input);

  // Codex가 이 Stop 훅의 요청으로 이미 한 번 이어 간 턴이면 다시 묻지 않는다.
  if (input.stop_hook_active === true) {
    removeState(filePath);
    return allow();
  }

  const state = readState(filePath);
  if (!state || !state.baseline) return allow();

  const changedFiles = changedLogicFiles(
    state.baseline,
    snapshotLogicFiles(projectRoot)
  );

  if (changedFiles.length === 0 || state.npmTestRuns.length > 0) {
    removeState(filePath);
    return allow();
  }

  return {
    decision: "block",
    reason: [
      "이번 턴에서 표시·계산 로직이 변경됐지만 `npm test`를 실행한 기록이 없습니다.",
      "",
      `감지한 파일: ${changedFiles.join(", ")}`,
      "",
      "지금 `npm test`를 실행하고, 통과 또는 실패 결과를 사용자에게 보고한 뒤 마무리하세요.",
      "같은 턴에서는 이 확인을 다시 요청하지 마세요.",
    ].join("\n"),
  };
}

function handleEvent(input, projectRoot = PROJECT_ROOT) {
  switch (input.hook_event_name) {
    case "UserPromptSubmit":
      return handleUserPromptSubmit(input, projectRoot);
    case "PostToolUse":
      return handlePostToolUse(input, projectRoot);
    case "Stop":
      return handleStop(input, projectRoot);
    default:
      return allow();
  }
}

function main() {
  const input = parseJson(readStdin(), {});

  try {
    process.stdout.write(JSON.stringify(handleEvent(input)));
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        systemMessage: `테스트 확인 훅을 실행하지 못했습니다: ${error.message}`,
      })
    );
  }
}

if (require.main === module) main();

module.exports = {
  changedLogicFiles,
  handleEvent,
  isLogicFile,
  snapshotLogicFiles,
  stateFilePath,
};
