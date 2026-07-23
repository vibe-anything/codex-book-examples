#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const SOURCE_ROOTS = ["src", "app", "lib"];
const SOURCE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
  ".sass",
]);
const TEST_FILE_PATTERN = /(^|[./_-])(test|spec)\.[cm]?[jt]sx?$/i;
const NPM_TEST_PATTERN = /\bnpm\s+(?:run\s+)?test\b/;

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function allow() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

function block(reason) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason,
    })
  );
}

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getTurnId(record) {
  return (
    record?.payload?.internal_chat_message_metadata_passthrough?.turn_id ||
    record?.payload?.turn_id ||
    record?.internal_chat_message_metadata_passthrough?.turn_id ||
    record?.turn_id ||
    null
  );
}

function isCurrentTurn(record, turnId) {
  if (!turnId) return false;
  return getTurnId(record) === turnId || JSON.stringify(record).includes(`"turn_id":"${turnId}"`);
}

function normalizeChangedPath(filePath, cwd) {
  const withoutQuotes = filePath.trim().replace(/^["']|["']$/g, "");
  const absolutePath = path.isAbsolute(withoutQuotes)
    ? withoutQuotes
    : path.resolve(cwd, withoutQuotes);
  const relativePath = path.relative(cwd, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;
  return relativePath.split(path.sep).join("/");
}

function collectPatchFiles(patchInput, cwd) {
  const files = [];
  const pattern = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm;
  let match;

  while ((match = pattern.exec(patchInput)) !== null) {
    const changedPath = normalizeChangedPath(match[1], cwd);
    if (changedPath) files.push(changedPath);
  }

  return files;
}

function isSourceLogicFile(filePath) {
  const normalizedPath = filePath.replaceAll("\\", "/");
  const firstSegment = normalizedPath.split("/")[0];
  const extension = path.extname(normalizedPath);

  if (!SOURCE_ROOTS.includes(firstSegment)) return false;
  if (!SOURCE_EXTENSIONS.has(extension)) return false;
  if (TEST_FILE_PATTERN.test(normalizedPath)) return false;
  if (normalizedPath.includes("/__tests__/")) return false;
  return true;
}

function readTranscriptRecords(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];

  return fs
    .readFileSync(transcriptPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseJson(line))
    .filter(Boolean);
}

function getFunctionCallCommand(payload) {
  if (payload?.type !== "function_call" || payload?.name !== "exec_command") return "";
  const args = parseJson(payload.arguments, {});
  return String(args.cmd || "");
}

function getChangedFiles(records, cwd, turnId) {
  const changedFiles = new Set();

  records
    .filter((record) => isCurrentTurn(record, turnId))
    .forEach((record) => {
      const payload = record.payload || {};

      if (payload.type === "custom_tool_call" && payload.name === "apply_patch") {
        collectPatchFiles(String(payload.input || ""), cwd).forEach((filePath) =>
          changedFiles.add(filePath)
        );
      }
    });

  return [...changedFiles];
}

function hasNpmTestRun(records, turnId) {
  return records
    .filter((record) => isCurrentTurn(record, turnId))
    .some((record) => NPM_TEST_PATTERN.test(getFunctionCallCommand(record.payload || {})));
}

function stateFilePath(cwd, sessionId, turnId) {
  const safeId = `${sessionId || "unknown-session"}-${turnId || "unknown-turn"}`.replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
  return path.join(cwd, ".codex", "state", "test-guard", `${safeId}.json`);
}

function hasAlreadyAsked(cwd, sessionId, turnId) {
  return fs.existsSync(stateFilePath(cwd, sessionId, turnId));
}

function markAsked(cwd, sessionId, turnId, changedFiles) {
  const filePath = stateFilePath(cwd, sessionId, turnId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        askedAt: new Date().toISOString(),
        changedFiles,
      },
      null,
      2
    )
  );
}

function main() {
  const input = parseJson(readStdin(), {});
  const cwd = input.cwd || process.cwd();
  const turnId = input.turn_id;
  const sessionId = input.session_id;

  if (input.hook_event_name && input.hook_event_name !== "Stop") {
    allow();
    return;
  }

  const records = readTranscriptRecords(input.transcript_path);
  const changedFiles = getChangedFiles(records, cwd, turnId).filter(isSourceLogicFile);

  if (changedFiles.length === 0 || hasNpmTestRun(records, turnId)) {
    allow();
    return;
  }

  if (hasAlreadyAsked(cwd, sessionId, turnId)) {
    allow();
    return;
  }

  markAsked(cwd, sessionId, turnId, changedFiles);
  block(
    [
      "이번 턴에서 표시/계산 소스 로직이 변경됐지만 같은 턴의 `npm test` 실행 기록이 없습니다.",
      "",
      `감지한 파일: ${changedFiles.join(", ")}`,
      "",
      "`npm test`를 실행하고, 통과/실패 결과를 사용자에게 보고한 뒤 마무리하세요.",
      "이 Stop 훅은 같은 턴에서 한 번만 이 요청을 보냅니다.",
    ].join("\n")
  );
}

main();
