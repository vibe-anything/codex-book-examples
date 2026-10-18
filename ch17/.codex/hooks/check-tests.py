"""Codex lifecycle hook. State stays outside the repo, isolated by session/turn."""

import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import sys
import tempfile


def fingerprint(root):
    # Include additions/deletions and existing uncommitted work; never read .env.
    files = []
    for directory in ("app", "components", "lib", "data"):
        base = root / directory
        if base.exists():
            files.extend(path for path in base.rglob("*") if path.is_file() and not path.is_symlink())
    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(str(path.relative_to(root)).encode())
        digest.update(b"\0")
        digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()


def is_test_command(command):
    # Parse actual shell words: an echo/quoted mention of npm test isn't a run.
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|()\n")
        lexer.whitespace = " \t\r"
        lexer.whitespace_split = True
        words = list(lexer)
    except ValueError:
        return False
    start = True
    for index, word in enumerate(words):
        if word and all(char in ";&|()\n" for char in word):
            start = True
            continue
        if start and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", word):
            continue
        if start and word == "npm":
            rest = words[index + 1:]
            if rest[:1] == ["test"] or rest[:2] == ["run", "test"]:
                return True
        start = False
    return False


def process(event, state, current):
    name = event.get("hook_event_name")
    turn = event.get("turn_id")
    # A Stop continuation can submit a prompt too; preserve the same turn's state.
    if not state or (turn and state.get("turn_id") != turn):
        state.clear()
        state.update(turn_id=turn, baseline=current, reminded=False, pending={})

    tool = event.get("tool_input") or {}
    command = tool.get("command", tool.get("cmd", "")) if isinstance(tool, dict) else ""
    call_id = event.get("tool_use_id")
    if name == "PreToolUse" and event.get("tool_name") in ("Bash", "exec_command"):
        if call_id and is_test_command(command):
            state["pending"][call_id] = current
    elif name == "PostToolUse" and call_id in state["pending"]:
        before = state["pending"].pop(call_id)
        response = event.get("tool_response")
        output = response if isinstance(response, str) else json.dumps(response, ensure_ascii=False)
        # The npm lifecycle banner distinguishes execution from a skipped command.
        # PostToolUse fires on completion, including failure, which must be reported.
        if re.search(r">\s*node --test\s*&&\s*next build", output) and before == current:
            state["tested"] = current
    elif name == "Stop":
        if event.get("stop_hook_active") or state.get("reminded"):
            return {}
        if current != state["baseline"] and state.get("tested") != current:
            state["reminded"] = True
            return {
                "decision": "block",
                "reason": "이 턴에서 표시·계산 로직이 바뀌었지만 변경 후 npm test를 완료한 기록이 없습니다. "
                "프로젝트 루트에서 npm test를 실행하고, 테스트 및 next build의 성공·실패 결과를 사용자에게 보고한 후 마무리해 주세요. "
                "실행할 수 없다면 그 이유를 보고해 주세요. 같은 턴에서는 다시 요청하지 않습니다.",
            }
    return {}


def main():
    event = json.load(sys.stdin)
    root = Path(__file__).resolve().parents[2]
    session = event.get("session_id")
    if not session:
        print("{}")
        return
    key = hashlib.sha256(f"{root}:{session}:{event.get('turn_id', '')}".encode()).hexdigest()
    directory = Path(tempfile.gettempdir()) / f"stock-dashboard-test-hooks-{os.getuid()}"
    directory.mkdir(mode=0o700, exist_ok=True)
    with (directory / f"{key}.json").open("a+", encoding="utf-8") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        handle.seek(0)
        saved = handle.read()
        state = json.loads(saved) if saved else {}
        result = process(event, state, fingerprint(root))
        handle.seek(0)
        handle.truncate()
        json.dump(state, handle)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
