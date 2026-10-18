import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Feed examples to main(), replacing only the value supplier. No dotenv is opened.
const runner = `
import importlib.util, io, sys
spec = importlib.util.spec_from_file_location('hook', '.codex/hooks/protect-secrets.py')
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)
hook.secret_values = lambda root: iter(['synthetic-credential-98765'])
hook.main()
`;
const run = tool_input => {
  const result = spawnSync('python3', ['-B', '-c', runner], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_input }), encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(!result.stdout.includes('synthetic-credential-98765'));
  return JSON.parse(result.stdout).hookSpecificOutput?.permissionDecision === 'deny';
};

const cases = [
  ['여러 줄 명령 읽기', { cmd: 'echo harmless\ncat .env' }, true],
  ['여러 경로 도구', { file_paths: ['README.md', '.env'] }, true],
  ['작은따옴표 커밋 문구', { cmd: "git commit -m '문서의 `cat .env` 예시 설명'" }, false],
  ['작은따옴표 명령 예시', { cmd: "echo '$(cat .env)'" }, false],
  ['Node 직접 읽기', { cmd: `node -e "require('fs').readFileSync('.env')"` }, true],
  ['Python 이름 변경', { cmd: `python -c "os.rename('sample', '.env')"` }, true],
  ['직접 읽기', { cmd: 'cat .env' }, true],
  ['변형 파일 열기', { cmd: 'open /tmp/.env.local' }, true],
  ['파일 도구 경로', { file_path: './.env' }, true],
  ['중첩 경로', { nested: [{ path: '.env.production' }] }, true],
  ['출력 리다이렉션', { cmd: 'echo text > .env' }, true],
  ['입력 리다이렉션', { cmd: 'cat < .env' }, true],
  ['수정', { cmd: "sed -i '' 's/a/b/' .env" }, true],
  ['패치 수정', { patch: '*** Update File: .env\n@@\n-old\n+new' }, true],
  ['패치 이동', { patch: '*** Update File: sample\n*** Move to: .env' }, true],
  ['Python 읽기', { cmd: `python -c "open('.env').read()"` }, true],
  ['Python heredoc 읽기', { cmd: "python3 - <<'PY'\nfrom pathlib import Path\nPath('.env').read_text()\nPY" }, true],
  ['셸 중첩 읽기', { cmd: `sh -c 'cat .env'` }, true],
  ['명령 치환', { cmd: 'echo "$(cat .env)"' }, true],
  ['heredoc 명령 치환', { cmd: 'cat > note.md <<EOF\n$(cat .env)\nEOF' }, true],
  ['검색 대상 파일', { cmd: "rg 'KEY' .env" }, true],
  ['검색 패턴 파일 읽기', { cmd: 'rg -f .env README.md' }, true],
  ['검색 옵션과 패턴', { cmd: "grep -A 2 '.env' README.md" }, false],
  ['견본 읽기', { cmd: 'cat .env.sample' }, false],
  ['문서 heredoc', { cmd: "cat > note.md <<'EOF'\n.env는 읽지 않는다.\n`cat .env`\nEOF" }, false],
  ['문서 패치', { patch: '*** Update File: README.md\n@@\n+.env를 열지 않는다.' }, false],
  ['커밋 메시지', { cmd: "git commit -m '.env 접근 검사 수정'" }, false],
  ['검색 패턴', { cmd: "rg '.env' README.md" }, false],
  ['검색 glob', { cmd: "rg --files -g '!.env'" }, false],
  ['명시적 검색 패턴', { cmd: "rg -e '.env' README.md" }, false],
  ['출력 문구', { cmd: "printf '%s' '.env를 열지 않는다'" }, false],
  ['Python 문서 작성', { cmd: `python3 -c "Path('README.md').write_text('.env를 열지 않는다')"` }, false],
  ['환경변수 참조', { cmd: "node -e 'use(process.env.API_KEY)'" }, false],
  ['명령 속 키 값', { cmd: 'echo synthetic-credential-98765' }, true],
  ['코드 속 키 값', { patch: "*** Add File: config.js\n+const key='synthetic-credential-98765';" }, true],
  ['문서 속 키 값', { cmd: "cat > note.md <<'EOF'\nsynthetic-credential-98765\nEOF" }, true],
];
for (const [name, input, denied] of cases) {
  test(`인증 키 훅 예시: ${name}`, () => assert.equal(run(input), denied));
}

test('인증 키 훅 예시: 방금 차단된 전체 Skill 작성 명령', () => {
  const cmd = readFileSync(new URL('./fixtures/blocked-skill-command.txt', import.meta.url), 'utf8').trimEnd();
  assert.equal(run({ cmd, sandbox_permissions: 'require_escalated' }), false);
});

test('인증 키 훅 예시: 키 검사 오류는 비밀 없이 차단', () => {
  const failedRunner = runner.replace(
    "hook.secret_values = lambda root: iter(['synthetic-credential-98765'])",
    "def fail(root): raise OSError('synthetic-credential-98765')\nhook.secret_values = fail",
  );
  const result = spawnSync('python3', ['-B', '-c', failedRunner], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_input: { cmd: 'npm test' } }), encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  assert.ok(!result.stdout.includes('synthetic-credential-98765'));
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
});
