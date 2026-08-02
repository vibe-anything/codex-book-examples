const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { handleEvent, stateFilePath } = require("./verify-tests-before-stop.cjs");

function createProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-test-guard-"));
  fs.mkdirSync(path.join(projectRoot, ".codex"), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, "components"), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, "lib"), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, "components", "Dashboard.js"),
    "export function Dashboard() { return null; }\n"
  );
  fs.writeFileSync(
    path.join(projectRoot, "lib", "calculate.js"),
    "export const calculate = (value) => value;\n"
  );
  return projectRoot;
}

function input(eventName, overrides = {}) {
  return {
    hook_event_name: eventName,
    session_id: "session-1",
    turn_id: "turn-1",
    ...overrides,
  };
}

function startTurn(projectRoot) {
  return handleEvent(input("UserPromptSubmit"), projectRoot);
}

test("로직 변경이 없으면 종료를 허용한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  startTurn(projectRoot);

  assert.deepEqual(handleEvent(input("Stop"), projectRoot), { continue: true });
});

test("표시 로직 변경 후 npm test 기록이 없으면 한 번 더 진행시킨다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  startTurn(projectRoot);
  fs.appendFileSync(path.join(projectRoot, "components", "Dashboard.js"), "// changed\n");

  const result = handleEvent(input("Stop"), projectRoot);

  assert.equal(result.decision, "block");
  assert.match(result.reason, /npm test/);
  assert.match(result.reason, /components\/Dashboard\.js/);
});

test("계산 로직 변경 후 npm test 실행 기록이 있으면 종료를 허용한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  startTurn(projectRoot);
  fs.appendFileSync(path.join(projectRoot, "lib", "calculate.js"), "// changed\n");
  handleEvent(
    input("PostToolUse", {
      tool_name: "Bash",
      tool_input: { command: "npm test" },
    }),
    projectRoot
  );

  assert.deepEqual(handleEvent(input("Stop"), projectRoot), { continue: true });
});

test("npm run test도 테스트 실행 기록으로 인정한다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  startTurn(projectRoot);
  fs.appendFileSync(path.join(projectRoot, "lib", "calculate.js"), "// changed\n");
  handleEvent(
    input("PostToolUse", {
      tool_name: "Bash",
      tool_input: { cmd: "npm run test" },
    }),
    projectRoot
  );

  assert.deepEqual(handleEvent(input("Stop"), projectRoot), { continue: true });
});

test("이미 한 번 이어 간 같은 턴에서는 다시 묻지 않는다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  startTurn(projectRoot);
  fs.appendFileSync(path.join(projectRoot, "components", "Dashboard.js"), "// changed\n");

  assert.equal(handleEvent(input("Stop"), projectRoot).decision, "block");
  assert.deepEqual(
    handleEvent(input("Stop", { stop_hook_active: true }), projectRoot),
    { continue: true }
  );
  assert.equal(fs.existsSync(stateFilePath(projectRoot, input("Stop"))), false);
});

test("문서 변경은 표시·계산 로직 변경으로 간주하지 않는다", (t) => {
  const projectRoot = createProject();
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));

  fs.writeFileSync(path.join(projectRoot, "README.md"), "before\n");
  startTurn(projectRoot);
  fs.writeFileSync(path.join(projectRoot, "README.md"), "after\n");

  assert.deepEqual(handleEvent(input("Stop"), projectRoot), { continue: true });
});
