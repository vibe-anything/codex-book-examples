#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const DOTENV_REFERENCE_PATTERN = /(^|[^A-Za-z0-9_.-])\.env(?![A-Za-z0-9_.-])/m;
const SENSITIVE_NAME_PATTERN =
  /(?:^|_)(?:api_?key|key|secret|token|password|passwd|pwd|credential|private|auth)(?:_|$)/i;
const COMMON_NON_SECRET_VALUES = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "development",
  "production",
  "test",
  "localhost",
]);

const DIRECT_ENV_ACCESS_MESSAGE =
  "보안 훅이 .env 파일을 직접 읽거나 여는 작업을 차단했습니다. 인증키를 파일에서 읽지 말고 코드에는 process.env.<변수명> 참조를 유지하세요.";
const EXPOSED_VALUE_MESSAGE =
  "보안 훅이 .env의 실제 인증키 값이 명령 또는 코드에 포함된 작업을 차단했습니다. 실제 값을 쓰지 말고 process.env.<변수명> 참조를 유지하세요.";
const INSPECTION_FAILURE_MESSAGE =
  "보안 훅이 .env의 인증키를 안전하게 검사하지 못해 작업을 차단했습니다. 실제 값을 쓰지 말고 process.env.<변수명> 참조를 유지하세요.";

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

function collectStrings(value, result = []) {
  if (typeof value === "string") {
    result.push(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, result);
    return result;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, result);
  }

  return result;
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if (!value) return "";

  const quote = value[0];
  if (quote === '"' || quote === "'" || quote === "`") {
    for (let index = 1; index < value.length; index += 1) {
      if (value[index] !== quote) continue;

      let backslashCount = 0;
      for (let cursor = index - 1; cursor > 0 && value[cursor] === "\\"; cursor -= 1) {
        backslashCount += 1;
      }

      if (backslashCount % 2 === 0) return value.slice(1, index);
    }

    return value.slice(1);
  }

  const commentIndex = value.indexOf("#");
  return (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim();
}

function parseEnvEntries(contents) {
  const entries = [];

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;

    const value = parseEnvValue(match[2]);
    if (value) entries.push({ name: match[1], value });
  }

  return entries;
}

function shouldProtectValue({ name, value }) {
  if (SENSITIVE_NAME_PATTERN.test(name)) return true;
  if (COMMON_NON_SECRET_VALUES.has(value.toLowerCase())) return false;
  return value.length >= 8;
}

function readProtectedValues(projectRoot) {
  const envPath = path.join(projectRoot, ".env");

  try {
    const entries = parseEnvEntries(fs.readFileSync(envPath, "utf8"));
    return {
      error: false,
      values: [...new Set(entries.filter(shouldProtectValue).map(({ value }) => value))]
        .sort((left, right) => right.length - left.length),
    };
  } catch (error) {
    if (error && error.code === "ENOENT") return { error: false, values: [] };
    return { error: true, values: [] };
  }
}

function deny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function inspectPreToolUse(input, projectRoot = PROJECT_ROOT) {
  if (!input || input.hook_event_name !== "PreToolUse") return null;

  const inputStrings = collectStrings(input.tool_input);

  if (inputStrings.some((value) => DOTENV_REFERENCE_PATTERN.test(value))) {
    return deny(DIRECT_ENV_ACCESS_MESSAGE);
  }

  const protectedValues = readProtectedValues(projectRoot);
  if (protectedValues.error) return deny(INSPECTION_FAILURE_MESSAGE);

  if (
    protectedValues.values.some((secret) =>
      inputStrings.some((value) => value.includes(secret)),
    )
  ) {
    return deny(EXPOSED_VALUE_MESSAGE);
  }

  return null;
}

function main() {
  const input = parseJson(readStdin());

  if (!input) {
    process.stdout.write(JSON.stringify(deny(INSPECTION_FAILURE_MESSAGE)));
    return;
  }

  const result = inspectPreToolUse(input);
  if (result) process.stdout.write(JSON.stringify(result));
}

if (require.main === module) main();

module.exports = {
  collectStrings,
  inspectPreToolUse,
  parseEnvEntries,
  readProtectedValues,
};
