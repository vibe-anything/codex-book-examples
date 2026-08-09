const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  inspectPreToolUse,
  parseEnvEntries,
} = require("./protect-auth-keys.cjs");

const LOCAL_SECRET = "local-secret-value-123456789";

function createProject(envContents = `API_KEY=${LOCAL_SECRET}\n`) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-auth-guard-"));
  fs.writeFileSync(path.join(projectRoot, ".env"), envContents);
  return projectRoot;
}

function input(toolName, toolInput) {
  return {
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
  };
}

function assertDenied(result, messagePattern) {
  assert.equal(
    result?.hookSpecificOutput?.permissionDecision,
    "deny",
  );
  assert.match(
    result.hookSpecificOutput.permissionDecisionReason,
    messagePattern,
  );
  assert.match(
    result.hookSpecificOutput.permissionDecisionReason,
    /process\.env/,
  );
}

test("따옴표 뒤 인라인 주석을 인증키 값에서 제외한다", () => {
  assert.deepEqual(parseEnvEntries('API_KEY="quoted-value" # local only\n'), [
    { name: "API_KEY", value: "quoted-value" },
  ]);
});

test("Bash에서 .env를 직접 읽는 명령을 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  const result = inspectPreToolUse(
    input("Bash", { command: "sed -n '1,20p' .env" }),
    projectRoot,
  );

  assertDenied(result, /직접 읽거나 여는 작업/);
});

test("파일 도구가 절대 경로의 .env를 여는 요청을 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  const result = inspectPreToolUse(
    input("mcp__filesystem__read_file", {
      path: path.join(projectRoot, ".env"),
    }),
    projectRoot,
  );

  assertDenied(result, /직접 읽거나 여는 작업/);
});

test(".env.example 경로와 process.env 참조는 허용한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assert.equal(
    inspectPreToolUse(
      input("Bash", { command: "sed -n '1,20p' .env.example" }),
      projectRoot,
    ),
    null,
  );
  assert.equal(
    inspectPreToolUse(
      input("apply_patch", {
        command: "+const apiKey = process.env.API_KEY;",
      }),
      projectRoot,
    ),
    null,
  );
});

test("명령에 실제 인증키 값이 들어가면 값 노출 없이 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  const result = inspectPreToolUse(
    input("Bash", {
      command: `curl -H "Authorization: Bearer ${LOCAL_SECRET}" https://example.com`,
    }),
    projectRoot,
  );

  assertDenied(result, /실제 인증키 값/);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(LOCAL_SECRET));
});

test("파일 수정 내용에 실제 인증키 값이 들어가도 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  const result = inspectPreToolUse(
    input("apply_patch", {
      command: `*** Begin Patch\n+const token = "${LOCAL_SECRET}";\n*** End Patch`,
    }),
    projectRoot,
  );

  assertDenied(result, /실제 인증키 값/);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(LOCAL_SECRET));
});

test("따옴표와 export가 있는 .env 값도 비교한다", (t) => {
  const quotedSecret = "quoted-secret-value-987654321";
  const projectRoot = createProject(`export SERVICE_TOKEN="${quotedSecret}"\n`);
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  const result = inspectPreToolUse(
    input("apply_patch", { command: `+const token = "${quotedSecret}";` }),
    projectRoot,
  );

  assertDenied(result, /실제 인증키 값/);
  assert.doesNotMatch(JSON.stringify(result), new RegExp(quotedSecret));
});

test(".env가 없어도 process.env 참조는 허용한다", (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-auth-guard-"));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assert.equal(
    inspectPreToolUse(
      input("apply_patch", {
        command: "+const apiKey = process.env.API_KEY;",
      }),
      projectRoot,
    ),
    null,
  );
});
