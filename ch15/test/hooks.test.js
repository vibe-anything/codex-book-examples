import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "stock-hook-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".codex/hooks"), { recursive: true });
  mkdirSync(join(root, "components"));
  const script = join(root, ".codex/hooks/check-tests.py");
  copyFileSync(new URL("../.codex/hooks/check-tests.py", import.meta.url), script);
  const edit = (value) => writeFileSync(join(root, "components/Card.js"), value);
  edit("original");
  const event = (name, fields = {}) => {
    const result = spawnSync("python3", ["-B", script], {
      input: JSON.stringify({
        hook_event_name: name, session_id: "test-session", turn_id: "turn-1", cwd: root, ...fields,
      }),
      env: { ...process.env, TMPDIR: root }, encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const runTest = (command = "npm test", output = "> dashboard@0.1.0 test\n> node --test && next build\n") => {
    const fields = { tool_name: "Bash", tool_use_id: "test-call", tool_input: { command } };
    event("PreToolUse", fields);
    event("PostToolUse", { ...fields, tool_response: { output, exit_code: 0 } });
  };
  event("UserPromptSubmit");
  return { root, event, edit, runTest };
}

test("훅: 기존 미커밋 변경이나 문서 변경만 있으면 되묻지 않는다", t => {
  const { root, event } = fixture(t);
  writeFileSync(join(root, "README.md"), "changed");
  assert.deepEqual(event("Stop"), {});
});

test("훅: 로직 변경 후 테스트가 없으면 한 번만 되묻는다", t => {
  const { event, edit } = fixture(t);
  edit("changed");
  assert.equal(event("Stop").decision, "block");
  assert.deepEqual(event("Stop"), {});
});

test("훅: stop_hook_active이면 재요청하지 않는다", t => {
  const { event, edit } = fixture(t);
  edit("changed");
  assert.deepEqual(event("Stop", { stop_hook_active: true }), {});
});

test("훅: 로직 변경 후 완료된 npm test 기록을 인정한다", t => {
  const { event, edit, runTest } = fixture(t);
  edit("changed");
  runTest();
  assert.deepEqual(event("Stop"), {});
});

test("훅: 테스트 실행 이후 추가 변경이 있으면 다시 검증을 요청한다", t => {
  const { event, edit, runTest } = fixture(t);
  runTest();
  edit("changed");
  assert.equal(event("Stop").decision, "block");
});

test("훅: 명령 언급과 실행되지 않은 조건부 테스트를 기록하지 않는다", t => {
  const { event, edit, runTest } = fixture(t);
  edit("changed");
  runTest('echo "npm test"');
  runTest("false && npm test", "");
  assert.equal(event("Stop").decision, "block");
});

test("훅: 실행 중인 테스트는 완료 기록으로 인정하지 않는다", t => {
  const { event, edit } = fixture(t);
  edit("changed");
  event("PreToolUse", { tool_name: "Bash", tool_use_id: "running", tool_input: { command: "npm test" } });
  assert.equal(event("Stop").decision, "block");
});

test("훅: 다음 사용자 턴에는 한 번 더 되물을 수 있다", t => {
  const { event, edit } = fixture(t);
  edit("first change");
  assert.equal(event("Stop").decision, "block");
  event("UserPromptSubmit", { turn_id: "turn-2" });
  edit("second change");
  assert.equal(event("Stop", { turn_id: "turn-2" }).decision, "block");
});

test("훅: 파일 삭제도 변경으로 확인한다", t => {
  const { root, event } = fixture(t);
  rmSync(join(root, "components/Card.js"));
  assert.equal(event("Stop").decision, "block");
});
