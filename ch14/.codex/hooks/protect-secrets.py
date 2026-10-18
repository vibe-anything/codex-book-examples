"""Inspect pending inputs locally; never emit secret values or input text."""

import json
from pathlib import Path
import re
import sys


GUIDANCE = (
    "인증 키 보호: 비밀 파일 접근 또는 실제 값의 직접 사용을 차단했습니다. "
    "키는 로컬 실행 환경에서 주입하고 코드에서는 process.env 또는 os.environ으로 참조하세요. "
    "키 값을 명령·코드·대화에 복사하지 마세요. "
    "값이 없는 견본 .env.sample의 파일명 참조 및 읽기는 허용됩니다."
)
# Conservative: reject references to secret dotenv files in any tool argument.
# Only the exact sample filename is exempt; sample contents still undergo matching.
ENV_PATH = re.compile(r"(?<![\w.-])\.env(?!\.sample(?![\w.-]))(?![\w-])")
ASSIGNMENT = re.compile(
    r"^[ \t]*(?:export[ \t]+)?[\w.\-]+[ \t]*=[ \t]*"
    r"(?:\"((?:\\.|[^\"\\])*)\"|'([^']*)'|([^\r\n]*))",
    re.MULTILINE,
)


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield str(key)
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def secret_values(root):
    # Only this process reads dotenv data. No caches, logs, or subprocesses.
    for path in sorted(root.glob(".env*")):
        if path.name == ".env.sample" or not path.is_file():
            continue
        for match in ASSIGNMENT.finditer(path.read_text(encoding="utf-8-sig")):
            double, single, bare = match.groups()
            value = double if double is not None else single
            if value is None:
                value = bare.split("#", 1)[0].strip()
            if value:
                yield value
                if double is not None:
                    yield value.replace(r"\n", "\n").replace(r"\r", "\r").replace(r'\"', '"').replace(r"\\", "\\")


def main():
    try:
        event = json.load(sys.stdin)
        if event.get("hook_event_name") != "PreToolUse":
            print("{}")
            return
        inputs = list(strings(event.get("tool_input", {})))
        root = Path(__file__).resolve().parents[2]
        blocked = any(ENV_PATH.search(text) for text in inputs)
        if not blocked:
            blocked = any(value in text for value in secret_values(root) for text in inputs)
        result = {} if not blocked else denial(GUIDANCE)
    except Exception:
        # Fail closed without a traceback that could contain sensitive data.
        result = denial("인증 키 보호 검사를 완료하지 못했습니다. 로컬에서 훅과 파일 권한을 확인하세요. " + GUIDANCE)
    print(json.dumps(result, ensure_ascii=False))


def denial(reason):
    return {"hookSpecificOutput": {
        "hookEventName": "PreToolUse", "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }}


if __name__ == "__main__":
    main()
