const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { inspectToolUse } = require("./protect-env-secrets-before-tool.cjs");

const TEST_SECRET = "test-secret-key-9284";

function createProject(envContent = `SERVICE_API_KEY=${TEST_SECRET}\nNODE_ENV=development\n`) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-secret-guard-"));
  fs.writeFileSync(path.join(projectRoot, ".env"), envContent);
  return projectRoot;
}

function input(toolName, toolInput) {
  return {
    hook_event_name: "PreToolUse",
    cwd: "/tmp/nested-directory",
    tool_name: toolName,
    tool_input: toolInput,
  };
}

function reason(result) {
  return result?.hookSpecificOutput?.permissionDecisionReason || "";
}

function assertDenied(result) {
  assert.equal(result?.hookSpecificOutput?.hookEventName, "PreToolUse");
  assert.equal(result?.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(reason(result), /process\.env/);
}

test("process.env 참조는 허용한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  const result = inspectToolUse(
    input("apply_patch", {
      command: [
        "*** Begin Patch",
        "*** Update File: lib/client.js",
        "-const apiKey = 'old';",
        "+const apiKey = process.env.SERVICE_API_KEY;",
        "*** End Patch",
      ].join("\n"),
    }),
    projectRoot
  );

  assert.equal(result, null);
});

test("셸 명령으로 .env 내용을 읽는 시도를 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assertDenied(inspectToolUse(input("Bash", { command: "cat .env" }), projectRoot));
  assertDenied(
    inspectToolUse(input("Bash", { command: "sed -n '1,20p' .env.local" }), projectRoot)
  );
});

test("파일 읽기 도구와 .env 대상 패치를 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assertDenied(
    inspectToolUse(
      input("mcp__filesystem__read_text_file", { path: "/workspace/.env" }),
      projectRoot
    )
  );
  assertDenied(
    inspectToolUse(
      input("apply_patch", {
        command: "*** Begin Patch\n*** Update File: .env\n@@\n-old\n+new\n*** End Patch",
      }),
      projectRoot
    )
  );
});

test("코드로 .env를 직접 읽거나 dotenv를 로드하는 수정을 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assertDenied(
    inspectToolUse(
      input("apply_patch", {
        command: "+const raw = fs.readFileSync('.env', 'utf8');",
      }),
      projectRoot
    )
  );
  assertDenied(
    inspectToolUse(
      input("apply_patch", {
        command: "+const raw = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');",
      }),
      projectRoot
    )
  );
  assertDenied(
    inspectToolUse(
      input("apply_patch", { command: "+require('dotenv').config();" }),
      projectRoot
    )
  );
});

test(".env의 실제 인증키가 명령이나 코드에 포함되면 차단한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  const commandResult = inspectToolUse(
    input("Bash", { command: `curl -H 'Authorization: ${TEST_SECRET}' https://example.test` }),
    projectRoot
  );
  const patchResult = inspectToolUse(
    input("apply_patch", { command: `+const apiKey = '${TEST_SECRET}';` }),
    projectRoot
  );

  assertDenied(commandResult);
  assertDenied(patchResult);
  assert.doesNotMatch(reason(commandResult), new RegExp(TEST_SECRET));
  assert.doesNotMatch(reason(patchResult), new RegExp(TEST_SECRET));
});

test("키가 아닌 일반 .env 값과 .env.sample 경로는 허용한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assert.equal(
    inspectToolUse(input("apply_patch", { command: "+const mode = 'development';" }), projectRoot),
    null
  );
  assert.equal(
    inspectToolUse(input("Bash", { command: "cat .env.sample" }), projectRoot),
    null
  );
});

test(".env 존재 여부만 확인하는 명령은 허용한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assert.equal(
    inspectToolUse(input("Bash", { command: "test -f .env" }), projectRoot),
    null
  );
});

test(".env를 안전하게 읽을 수 없으면 도구 실행을 차단한다", (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-secret-guard-"));
  fs.mkdirSync(path.join(projectRoot, ".env"));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  assertDenied(inspectToolUse(input("Bash", { command: "npm test" }), projectRoot));
});
