import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("인증 키 훅: 경로·직접 값 차단, 환경 변수·견본 허용, 출력 비밀 제거", t => {
  const root = mkdtempSync(join(tmpdir(), "secrets-hook-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".codex/hooks"), { recursive: true });
  const script = join(root, ".codex/hooks/protect-secrets.py");
  copyFileSync(new URL("../.codex/hooks/protect-secrets.py", import.meta.url), script);
  const secret = "synthetic-credential-98765";
  writeFileSync(join(root, ".env"), `# comment\nexport API_KEY="${secret}" # comment\nEMPTY=\nOTHER='second-test-secret'\nBARE=third-test-secret # comment\n`);
  writeFileSync(join(root, ".env.local"), "LOCAL=local-test-secret\n");
  const run = (tool_input, tool_name = "Bash") => {
    const result = spawnSync("python3", ["-B", script], {
      input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name, tool_input }), encoding: "utf8",
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.ok(!result.stdout.includes(secret));
    return JSON.parse(result.stdout);
  };
  for (const tool_input of [
    { command: "cat .env" }, { cmd: "open /tmp/.env.local" },
    { file_path: "./.env" }, { command: "python -c \"open('.env').read()\"" },
    { command: `KEY=${secret} node app.js` },
    { patch: `*** Add File: config.js\n+const key = '${secret}';` },
    { nested: [{ content: "second-test-secret" }] },
    { command: "echo third-test-secret" }, { command: "echo local-test-secret" },
    { file_path: ".env.sample", content: secret },
  ]) {
    const output = run(tool_input, "apply_patch").hookSpecificOutput;
    assert.equal(output.permissionDecision, "deny");
    assert.match(output.permissionDecisionReason, /process.env/);
    assert.match(output.permissionDecisionReason, /\.env.sample/);
  }
  for (const command of ["cat .env.sample", "ls .env.sample", "node app.js", 'API_KEY="$API_KEY" node app.js',
    "node -e 'use(process.env.API_KEY)'", "python -c 'use(os.environ[\"API_KEY\"])'"]) {
    assert.deepEqual(run({ command }), {});
  }
  assert.deepEqual(run("*** Add File: config.js\n+use(process.env.API_KEY)", "apply_patch"), {});
  rmSync(join(root, ".env"));
  assert.deepEqual(run({ command: "npm test" }), {});
  assert.equal(run({ command: "cat .env" }).hookSpecificOutput.permissionDecision, "deny");
  writeFileSync(join(root, ".env"), Buffer.from([0xff]));
  assert.equal(run({ command: "npm test" }).hookSpecificOutput.permissionDecision, "deny");
});
