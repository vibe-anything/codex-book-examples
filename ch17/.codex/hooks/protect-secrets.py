"""Inspect pending inputs locally; never emit secret values or input text."""

import ast
import json
from pathlib import Path
import re
import shlex
import sys


GUIDANCE = (
    "인증 키 보호: 비밀 파일 접근 또는 실제 값의 직접 사용을 차단했습니다. "
    "키는 로컬 실행 환경에서 주입하고 코드에서는 process.env 또는 os.environ으로 참조하세요. "
    "키 값을 명령·코드·대화에 복사하지 마세요. "
    "값이 없는 견본 .env.sample의 파일명 참조 및 읽기는 허용됩니다."
)
# Match sensitive filenames only in access contexts, never in prose.
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


def code_access(code, language):
    if language.startswith('python'):
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return bool(ENV_PATH.search(code))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func = node.func
            name = func.id if isinstance(func, ast.Name) else getattr(func, 'attr', '')
            if name in ('open', 'Path', 'read_text', 'read_bytes', 'write_text',
                        'write_bytes', 'unlink', 'rename', 'replace', 'remove'):
                # Only path operands; a write's contents are ordinary text.
                operands = node.args[:2] if name in ('rename', 'replace') else node.args[:1] if name in ('open', 'Path', 'remove', 'unlink') else []
                operands += [kw.value for kw in node.keywords if kw.arg in ('file', 'path')]
                if any(isinstance(arg, ast.Constant) and isinstance(arg.value, str)
                       and ENV_PATH.search(arg.value) for arg in operands):
                    return True
        return False
    if language in ('sh', 'bash', 'zsh'):
        return shell_access(code)
    # Other interpreters: recognize literal file operation arguments.
    return bool(re.search(r"(?:readFile(?:Sync)?|writeFile(?:Sync)?|open|createReadStream|createWriteStream)\s*\(\s*['\"][^'\"]*" + ENV_PATH.pattern, code))


def substitutions(text):
    quote = None
    i = 0
    while i < len(text):
        char = text[i]
        if char == "\\" and quote != "'":
            i += 2
            continue
        if char in ("'", '"'):
            if quote is None:
                quote = char
            elif quote == char:
                quote = None
        if quote != "'":
            match = re.match(r"\$\((.*?)\)|`([^`]+)`", text[i:], re.DOTALL)
            if match:
                yield next(part for part in match.groups() if part)
                i += len(match[0])
                continue
        i += 1


def shell_access(command):
    # Heredoc bodies are data. Unquoted bodies still execute substitutions.
    lines = command.splitlines(keepends=True)
    executable = []
    pending = []
    body = []
    for line in lines:
        if pending:
            delimiter, quoted, language = pending[0]
            if line.strip() == delimiter:
                content = ''.join(body)
                if language and code_access(content, language):
                    return True
                if language == 'apply_patch' and patch_access(content):
                    return True
                body = []
                pending.pop(0)
            else:
                body.append(line)
            if line.strip() != delimiter and not quoted:
                for sub in substitutions(line):
                    if shell_access(sub):
                        return True
            continue
        for match in re.finditer(r"<<-?\s*(['\"]?)([\w-]+)\1", line):
            prefix = line[:match.start()]
            words = shlex.split(prefix)
            language = Path(words[0]).name if words else ''
            if language not in ('sh', 'bash', 'zsh', 'apply_patch', 'node', 'nodejs') and not language.startswith('python'):
                language = ''
            pending.append((match[2], bool(match[1]), language))
        executable.append(line)
    command = ''.join(executable)
    # Substitutions in executable text run even inside double quotes.
    for sub in substitutions(command):
        if shell_access(sub):
            return True
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=';&|<>()\n')
        lexer.whitespace = ' \t\r'
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return bool(ENV_PATH.search(command))
    segments = []
    segment = []
    for token in tokens + [';']:
        if token in (';', '&&', '||', '|', '&', '(', ')') or token.isspace():
            if segment:
                segments.append(segment)
            segment = []
        else:
            segment.append(token)
    for args in segments:
        # Redirection targets are files, including for echo and printf.
        for i, arg in enumerate(args[:-1]):
            if arg in ('<', '>', '>>', '<>', '>|') and ENV_PATH.search(args[i + 1]):
                return True
        name = Path(args[0]).name
        if name in ('sh', 'bash', 'zsh') and '-c' in args:
            if shell_access(args[args.index('-c') + 1]):
                return True
            continue
        if name.startswith('python') or name in ('node', 'nodejs'):
            flag = next((flag for flag in ('-c', '-e', '--eval') if flag in args), None)
            if flag:
                if code_access(args[args.index(flag) + 1], name):
                    return True
                continue
        if name in ('echo', 'printf'):
            continue
        if name == 'git' and 'commit' in args:
            args = list(args)
            for option in ('-m', '--message'):
                while option in args:
                    i = args.index(option)
                    del args[i:i + 2]
            args = [arg for arg in args if not arg.startswith('--message=')]
        elif name in ('rg', 'grep', 'egrep', 'fgrep', 'find'):
            args = list(args[1:])
            # Search expressions/globs are not file operands.
            options = ('-e', '--regexp', '-g', '--glob', '--iglob',
                       '--include', '--exclude', '-name', '-iname', '-path', '-regex')
            explicit_pattern = any(a in ('-e', '--regexp') or a.startswith('--regexp=') for a in args)
            remaining = []
            value_options = ('-A', '-B', '-C', '-m', '--max-count', '--context',
                             '--after-context', '--before-context', '-t', '--type',
                             '-T', '--type-not', '--encoding', '--max-depth')
            i = 0
            while i < len(args):
                if args[i] in ('-f', '--file'):
                    if i + 1 < len(args) and ENV_PATH.search(args[i + 1]):
                        return True
                    explicit_pattern = True
                    i += 2
                elif args[i].startswith('--file='):
                    if ENV_PATH.search(args[i]):
                        return True
                    explicit_pattern = True
                    i += 1
                elif args[i] in value_options:
                    i += 2
                elif args[i] in options:
                    i += 2
                elif any(args[i].startswith(o + '=') for o in options):
                    i += 1
                else:
                    remaining.append(args[i])
                    i += 1
            if name != 'find' and not explicit_pattern and '--files' not in remaining:
                for i, arg in enumerate(remaining):
                    if not arg.startswith('-'):
                        del remaining[i]
                        break
            args = remaining
        if any(ENV_PATH.search(arg) for arg in args):
            return True
    return False


def file_access(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in ('path', 'file_path', 'filePath', 'filename', 'target_file', 'paths', 'file_paths'):
                if any(ENV_PATH.search(path) for path in strings(item)):
                    return True
            elif key in ('cmd', 'command') and isinstance(item, str):
                if shell_access(item):
                    return True
            elif key in ('patch', 'input') and isinstance(item, str):
                if patch_access(item):
                    return True
            elif isinstance(item, (dict, list)) and file_access(item):
                return True
    elif isinstance(value, list):
        return any(file_access(item) for item in value)
    return False


def patch_access(patch):
    # Inspect destinations, not added/deleted document contents.
    return any(ENV_PATH.search(line) for line in patch.splitlines()
               if line.startswith(('*** Add File:', '*** Update File:',
                                   '*** Delete File:', '*** Move to:', '+++ ', '--- ')))


def inspect(event, values):
    if event.get('hook_event_name') != 'PreToolUse':
        return {}
    payload = event.get('tool_input', {})
    blocked = file_access(payload)
    if isinstance(payload, str):
        blocked = patch_access(payload)
    if not blocked:
        inputs = list(strings(payload))
        blocked = any(value in text for value in values for text in inputs)
    return denial(GUIDANCE) if blocked else {}


def main():
    try:
        event = json.load(sys.stdin)
        if event.get("hook_event_name") != "PreToolUse":
            print("{}")
            return
        root = Path(__file__).resolve().parents[2]
        result = inspect(event, secret_values(root))
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
