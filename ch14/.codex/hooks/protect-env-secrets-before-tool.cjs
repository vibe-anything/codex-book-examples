#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const COMMAND_FIELDS = new Set(["cmd", "command", "script"]);
const PATH_FIELD_PATTERN =
  /(^|_)(file|file_path|filepath|filename|notebook_path|path|paths|source|target|target_file|destination|uri)(_|$)/i;
const SECRET_NAME_PATTERN =
  /(^|_)(api_?key|key|token|secret|password|passwd|pwd|auth|credential|private|service_?key|access_?key|client_?secret)(_|$)/i;
const ENV_ACCESS_COMMANDS = new Set([
  ".",
  "ack",
  "ag",
  "awk",
  "base64",
  "bash",
  "bat",
  "batcat",
  "bun",
  "cat",
  "chmod",
  "chown",
  "code",
  "cmp",
  "cp",
  "curl",
  "cut",
  "dash",
  "dd",
  "deno",
  "dotenv",
  "diff",
  "egrep",
  "emacs",
  "fgrep",
  "file",
  "fish",
  "grep",
  "git",
  "gzip",
  "head",
  "hexdump",
  "install",
  "jq",
  "less",
  "mapfile",
  "mate",
  "md5",
  "md5sum",
  "more",
  "mv",
  "nano",
  "nl",
  "node",
  "nvim",
  "od",
  "open",
  "openssl",
  "pbcopy",
  "perl",
  "python",
  "python3",
  "read",
  "rg",
  "rm",
  "rsync",
  "ruby",
  "scp",
  "sed",
  "sha1sum",
  "sha256sum",
  "shasum",
  "sh",
  "sort",
  "source",
  "strings",
  "subl",
  "tail",
  "tar",
  "tee",
  "touch",
  "tr",
  "truncate",
  "uniq",
  "unlink",
  "vi",
  "view",
  "vim",
  "wc",
  "xxd",
  "yq",
  "zip",
  "zsh",
]);

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
  if (/^(true|false|null|undefined|development|production|test)$/i.test(value)) {
    return false;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return false;
  return /[A-Za-z]/.test(value) && /[0-9%+/=_-]/.test(value);
}

function readSensitiveEnvValues(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return [];

  return parseEnvEntries(fs.readFileSync(envPath, "utf8"))
    .filter(({ name, value }) => isLikelySecretValue(name, value))
    .map(({ value }) => value)
    .sort((left, right) => right.length - left.length);
}

function collectStrings(value, strings = [], seen = new WeakSet()) {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }

  if (!value || typeof value !== "object" || seen.has(value)) return strings;
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
    if (PATH_FIELD_PATTERN.test(key) && key !== "cwd") {
      collectStrings(item, paths);
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
    .replace(/^file:\/\//i, "")
    .replace(/^["'`@([{]+|["'`),;\]}]+$/g, "")
    .replace(/^[=:+]+/, "");
}

function isProtectedEnvBasename(basename) {
  if (basename === ".env") return true;
  if (/^\.env[*?[]/.test(basename)) return true;
  return /^\.env\.(local|development|production|test|development\.local|production\.local|test\.local)$/.test(
    basename
  );
}

function isProtectedEnvPath(value) {
  return String(value)
    .split(/[=:,]/)
    .map(stripShellDecorations)
    .filter(Boolean)
    .some((candidate) => {
      const normalized = candidate.replaceAll("\\", "/");
      return isProtectedEnvBasename(path.posix.basename(normalized));
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

function hasCodeEnvReadAttempt(text) {
  const envPathPattern = String.raw`['\"\`](?:[^'\"\`\r\n]*[\\/])?\.env(?:\.(?:local|development|production|test)(?:\.local)?)?['\"\`]`;
  const patterns = [
    new RegExp(
      String.raw`\b(?:readFileSync|readFile|read_to_string|readText|read_text|read_bytes|createReadStream|openSync|open|fopen)\s*\([\s\S]{0,400}?${envPathPattern}`,
      "i"
    ),
    new RegExp(
      String.raw`\b(?:Deno\.readTextFile|Deno\.readFile|Bun\.file)\s*\([\s\S]{0,400}?${envPathPattern}`,
      "i"
    ),
    new RegExp(
      String.raw`\bPath\s*\(\s*${envPathPattern}\s*\)\s*\.(?:read_text|read_bytes|open)\s*\(`,
      "i"
    ),
    new RegExp(
      String.raw`\bFile\.(?:read|open|binread)\s*\(\s*${envPathPattern}`,
      "i"
    ),
    /\bdotenv(?:Flow)?\.config\s*\(/i,
    /\brequire\s*\(\s*['\"`]dotenv['\"`]\s*\)\.config\s*\(/i,
    /\b(?:load_dotenv|dotenv_values)\s*\(/i,
    /\bprocess\.loadEnvFile\s*\(/i,
    /['\"`]dotenv\/config['\"`]/i,
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function hasShellEnvAccessAttempt(command) {
  const tokens = tokenizeShellLike(command);
  if (!tokens.some(isProtectedEnvPath)) return false;

  if (tokens.some((token) => ENV_ACCESS_COMMANDS.has(commandName(token)))) return true;
  if (/[<>]{1,2}\s*['\"]?(?:\.\/)?\.env(?:\.|['\"]|\s|$)/i.test(command)) return true;
  if (/--env-file(?:=|\s+)['\"]?(?:\.\/)?\.env(?:\.|['\"]|\s|$)/i.test(command)) {
    return true;
  }

  return hasCodeEnvReadAttempt(command);
}

function hasPatchTargetingEnvFile(text) {
  const pattern = /^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$/gm;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (isProtectedEnvPath(match[1] || match[2])) return true;
  }

  return false;
}

function isDirectFileTool(toolName) {
  const normalized = String(toolName).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return /(^|_)(read|open|view|edit|write|delete|move|copy)(_|$)/.test(normalized);
}

function hasDirectEnvFileAttempt(toolName, toolInput) {
  const allText = collectStrings(toolInput).join("\n");

  if (
    isDirectFileTool(toolName) &&
    collectPathFieldValues(toolInput).some(isProtectedEnvPath)
  ) {
    return true;
  }

  if (hasPatchTargetingEnvFile(allText)) return true;
  if (collectCommandStrings(toolInput).some(hasShellEnvAccessAttempt)) return true;
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
      ? "`.env`에 있는 실제 인증키 값이 도구 입력에 그대로 포함되어 있어 차단했습니다."
      : kind === "inspection-error"
        ? "인증키 보호 검사를 안전하게 완료할 수 없어 도구 실행을 차단했습니다."
        : "`.env` 파일을 직접 읽거나 여는 시도가 감지되어 차단했습니다.";

  return [
    firstLine,
    "",
    "인증키는 명령이나 코드에 직접 붙여넣지 말고 `.env`에만 보관하세요.",
    "앱 코드에서는 실제 값 대신 `process.env.환경변수명` 참조를 그대로 유지하세요.",
    "검증이 필요하면 키 값을 출력하지 말고 환경변수의 존재 여부만 확인하세요.",
  ].join("\n");
}

function deny(kind) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: blockReason(kind),
    },
  };
}

function inspectToolUse(input, projectRoot = PROJECT_ROOT) {
  try {
    if (input.hook_event_name && input.hook_event_name !== "PreToolUse") return null;

    const toolName = String(input.tool_name || input.name || "");
    const toolInput = input.tool_input || input.toolInput || input.input || {};

    if (hasDirectEnvFileAttempt(toolName, toolInput)) return deny("direct");

    const sensitiveValues = readSensitiveEnvValues(projectRoot);
    if (containsSensitiveEnvValue(toolInput, sensitiveValues)) return deny("secret");
    return null;
  } catch {
    return deny("inspection-error");
  }
}

function main() {
  try {
    const input = parseJson(fs.readFileSync(0, "utf8"));
    if (!input || typeof input !== "object") {
      process.stdout.write(JSON.stringify(deny("inspection-error")));
      return;
    }

    const result = inspectToolUse(input);
    if (result) process.stdout.write(JSON.stringify(result));
  } catch {
    process.stdout.write(JSON.stringify(deny("inspection-error")));
  }
}

if (require.main === module) main();

module.exports = {
  blockReason,
  hasCodeEnvReadAttempt,
  hasDirectEnvFileAttempt,
  hasShellEnvAccessAttempt,
  inspectToolUse,
  isProtectedEnvPath,
  parseEnvEntries,
  readSensitiveEnvValues,
};
