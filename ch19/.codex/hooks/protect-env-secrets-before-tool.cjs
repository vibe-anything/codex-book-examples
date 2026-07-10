#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const COMMAND_FIELDS = new Set(["cmd", "command", "script"]);
const PATH_FIELD_PATTERN =
  /(^|_)(file|file_path|filename|path|target|target_file|notebook_path)(_|$)/i;
const DIRECT_FILE_TOOL_PATTERN =
  /(^|\.)(read|open|view|edit|multiedit|write|notebookedit|apply_patch)$/i;
const SECRET_NAME_PATTERN =
  /(^|_)(api_?key|key|token|secret|password|passwd|pwd|auth|credential|private|service_?key|access_?key|client_?secret)(_|$)/i;
const READER_COMMANDS = new Set([
  ".",
  "ack",
  "ag",
  "awk",
  "bat",
  "batcat",
  "bun",
  "cat",
  "code",
  "cp",
  "cursor",
  "deno",
  "emacs",
  "egrep",
  "fgrep",
  "grep",
  "gzip",
  "head",
  "hexdump",
  "less",
  "mate",
  "more",
  "nano",
  "nl",
  "node",
  "nvim",
  "od",
  "open",
  "pbcopy",
  "perl",
  "python",
  "python3",
  "rg",
  "rsync",
  "ruby",
  "scp",
  "sed",
  "source",
  "strings",
  "subl",
  "tail",
  "tar",
  "vi",
  "view",
  "vim",
  "xxd",
  "zip",
]);

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

function unquote(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if (!quote || !["'", "\"", "`"].includes(quote) || trimmed.at(-1) !== quote) {
    return trimmed.replace(/\s+#.*$/, "").trim();
  }

  const inner = trimmed.slice(1, -1);
  if (quote !== "\"") return inner;

  return inner.replace(/\\([nrt"\\])/g, (_, escaped) => {
    if (escaped === "n") return "\n";
    if (escaped === "r") return "\r";
    if (escaped === "t") return "\t";
    return escaped;
  });
}

function parseEnvEntries(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.replace(/^export\s+/, ""))
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) return null;

      const name = line.slice(0, separatorIndex).trim();
      const value = unquote(line.slice(separatorIndex + 1));

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || !value) return null;
      return { name, value };
    })
    .filter(Boolean);
}

function isLikelySecretValue(name, value) {
  if (value.length < 4) return false;
  if (SECRET_NAME_PATTERN.test(name)) return true;
  if (value.length < 20) return false;
  if (/^(https?:)?\/\//i.test(value)) return false;
  if (/^(true|false|null|undefined|development|production|test)$/i.test(value)) return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return false;
  return /[A-Za-z]/.test(value) && /[0-9%+/=_-]/.test(value);
}

function addSecretValue(values, value) {
  if (value && value.length >= 4) values.add(value);

  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value && decoded.length >= 4) values.add(decoded);
  } catch {
    // Ignore non-URL-encoded values.
  }
}

function readSensitiveEnvValues(cwd) {
  const envPath = path.join(cwd, ".env");
  if (!fs.existsSync(envPath)) return [];

  const values = new Set();
  const entries = parseEnvEntries(fs.readFileSync(envPath, "utf8"));

  entries.forEach(({ name, value }) => {
    if (isLikelySecretValue(name, value)) addSecretValue(values, value);
  });

  return [...values].sort((a, b) => b.length - a.length);
}

function collectStrings(value, strings = [], seen = new WeakSet()) {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }

  if (!value || typeof value !== "object") return strings;
  if (seen.has(value)) return strings;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, strings, seen));
    return strings;
  }

  Object.values(value).forEach((item) => collectStrings(item, strings, seen));
  return strings;
}

function collectCommandStrings(value, commands = [], seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return commands;
  seen.add(value);

  Object.entries(value).forEach(([key, item]) => {
    if (typeof item === "string" && COMMAND_FIELDS.has(key)) {
      commands.push(item);
      return;
    }

    if (item && typeof item === "object") {
      collectCommandStrings(item, commands, seen);
    }
  });

  return commands;
}

function collectPathFieldValues(value, paths = [], seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return paths;
  seen.add(value);

  Object.entries(value).forEach(([key, item]) => {
    if (typeof item === "string" && PATH_FIELD_PATTERN.test(key) && key !== "cwd") {
      paths.push(item);
      return;
    }

    if (item && typeof item === "object") {
      collectPathFieldValues(item, paths, seen);
    }
  });

  return paths;
}

function stripShellDecorations(value) {
  return value
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^[=:+,]+/, "")
    .replace(/[),;]+$/g, "");
}

function isProtectedEnvBasename(basename) {
  if (basename === ".env") return true;
  if (/^\.env[*?[]/.test(basename)) return true;
  return /^\.env\.(local|development|production|test|development\.local|production\.local|test\.local)$/.test(
    basename
  );
}

function isProtectedEnvPath(value, cwd) {
  const candidates = String(value)
    .split("=")
    .flatMap((part) => part.split(":"))
    .map(stripShellDecorations)
    .filter(Boolean);

  return candidates.some((candidate) => {
    const normalized = candidate.replaceAll("\\", "/");
    if (isProtectedEnvBasename(path.posix.basename(normalized))) return true;

    const absolutePath = path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
    return isProtectedEnvBasename(path.basename(absolutePath));
  });
}

function tokenizeShellLike(command) {
  const tokens = [];
  let current = "";
  let quote = "";

  for (let index = 0; index < command.length; index += 1) {
    const character = command[index];

    if (quote) {
      if (character === quote) {
        quote = "";
      } else if (character === "\\" && quote !== "'" && index + 1 < command.length) {
        index += 1;
        current += command[index];
      } else {
        current += character;
      }
      continue;
    }

    if (["'", "\"", "`"].includes(character)) {
      quote = character;
      continue;
    }

    if (/\s/.test(character) || /[;&|<>()]/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += character;
  }

  if (current) tokens.push(current);
  return tokens;
}

function commandName(token) {
  return path.basename(stripShellDecorations(token));
}

function hasShellEnvReadAttempt(command, cwd) {
  const tokens = tokenizeShellLike(command);
  const hasEnvPath = tokens.some((token) => isProtectedEnvPath(token, cwd));

  if (!hasEnvPath) return false;
  if (tokens.some((token) => READER_COMMANDS.has(commandName(token)))) return true;
  if (/<\s*['"]?(?:\.\/)?\.env(?:['"]?|\s|$)/.test(command)) return true;
  if (/--env-file(?:=|\s+)['"]?(?:\.\/)?\.env(?:['"]?|\s|$)/.test(command)) return true;

  return false;
}

function hasCodeEnvReadAttempt(text) {
  const envPathPattern = String.raw`['"\`](?:\.{0,2}\/)?\.env(?:\.(?:local|development|production|test)(?:\.local)?)?['"\`]`;
  const patterns = [
    new RegExp(String.raw`\b(?:readFileSync|readFile|createReadStream|openSync|open)\s*\([^)]*${envPathPattern}`, "i"),
    new RegExp(String.raw`\b(?:Deno\.readTextFile|Deno\.readFile|Bun\.file)\s*\([^)]*${envPathPattern}`, "i"),
    new RegExp(String.raw`\bdotenv(?:Flow)?\.config\s*\(`, "i"),
    new RegExp(String.raw`\brequire\s*\(\s*['"\`]dotenv['"\`]\s*\)\.config\s*\(`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function hasPatchTargetingEnvFile(text, cwd) {
  const pattern = /^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$/gm;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (isProtectedEnvPath(match[1] || match[2], cwd)) return true;
  }

  return false;
}

function hasDirectEnvFileAttempt(toolName, toolInput, cwd) {
  const allText = collectStrings(toolInput).join("\n");

  if (DIRECT_FILE_TOOL_PATTERN.test(toolName)) {
    if (collectPathFieldValues(toolInput).some((filePath) => isProtectedEnvPath(filePath, cwd))) {
      return true;
    }
  }

  if (hasPatchTargetingEnvFile(allText, cwd)) return true;
  if (collectCommandStrings(toolInput).some((command) => hasShellEnvReadAttempt(command, cwd))) {
    return true;
  }

  return hasCodeEnvReadAttempt(allText);
}

function containsSensitiveEnvValue(toolInput, sensitiveValues) {
  if (sensitiveValues.length === 0) return false;

  const inspectedText = collectStrings(toolInput).join("\n");
  return sensitiveValues.some((value) => inspectedText.includes(value));
}

function blockReason(kind) {
  const firstLine =
    kind === "secret"
      ? "`.env`에 있는 민감 값이 도구 입력에 그대로 포함되어 있어 차단했습니다."
      : "`.env` 파일을 직접 읽거나 여는 시도가 감지되어 차단했습니다.";

  return [
    firstLine,
    "",
    "인증키는 명령, 코드, 패치에 붙여넣지 말고 `.env`에만 보관하세요.",
    "앱 코드에서는 키 값을 직접 다루지 말고 기존처럼 `process.env.환경변수명` 참조를 유지하세요.",
    "검증이 필요하면 키 값을 출력하지 않는 방식으로 환경변수 존재 여부만 확인하세요.",
  ].join("\n");
}

function main() {
  const input = parseJson(readStdin(), {});
  const cwd = input.cwd || process.cwd();
  const toolName = String(input.tool_name || input.name || "");
  const toolInput = input.tool_input || input.toolInput || input.input || {};

  if (input.hook_event_name && input.hook_event_name !== "PreToolUse") {
    allow();
    return;
  }

  if (hasDirectEnvFileAttempt(toolName, toolInput, cwd)) {
    block(blockReason("direct"));
    return;
  }

  const sensitiveValues = readSensitiveEnvValues(cwd);
  if (containsSensitiveEnvValue(toolInput, sensitiveValues)) {
    block(blockReason("secret"));
    return;
  }

  allow();
}

main();
