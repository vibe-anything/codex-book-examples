#!/usr/bin/env python3
"""Git 추적 파일과 도달 가능한 이력에서 비밀 후보를 값 노출 없이 찾는다."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import subprocess
import sys


MAX_BLOB_BYTES = 2 * 1024 * 1024
ENV_BASENAME = "." + "env"
ALLOWED_ENV_SUFFIXES = {"example", "sample", "template", "dist", "defaults"}

HIGH_CONFIDENCE_RULES = (
    ("개인 키", re.compile(rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
    ("AWS 접근 키", re.compile(rb"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("GitHub 토큰", re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{36,255}\b")),
    ("OpenAI 키", re.compile(rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b")),
    ("Google API 키", re.compile(rb"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("Slack 토큰", re.compile(rb"\bxox[baprs]-[0-9A-Za-z-]{20,}\b")),
)

REVIEW_RULES = (
    (
        "자격 증명이 포함된 URL",
        re.compile(rb"(?i)\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s/:]+:[^\s/@]{8,}@"),
    ),
    (
        "비밀 이름에 직접 할당된 긴 값",
        re.compile(
            rb"(?i)(?:secret|token|password|passwd|api[_-]?key|service[_-]?key|private[_-]?key)"
            rb"[ \t]*[:=][ \t]*[\"']?([^\s\"'`]{16,})"
        ),
    ),
)

PLACEHOLDER_MARKERS = (
    b"example",
    b"sample",
    b"placeholder",
    b"replace",
    b"dummy",
    b"fake",
    b"test",
    b"process" + b"." + b"env",
    b"${",
    b"<",
)


def git(repo: Path, *args: str, input_bytes: bytes | None = None) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(message or f"git {' '.join(args)} 실패")
    return result.stdout


def is_sensitive_env_path(path: str) -> bool:
    name = Path(path).name.lower()
    if name == ENV_BASENAME:
        return True
    prefix = f"{ENV_BASENAME}."
    if not name.startswith(prefix):
        return False
    suffix = name.removeprefix(prefix)
    return suffix not in ALLOWED_ENV_SUFFIXES


def is_binary(content: bytes) -> bool:
    return b"\0" in content[:8192]


def scan_content(content: bytes) -> tuple[set[str], set[str]]:
    high: set[str] = set()
    review: set[str] = set()

    for name, pattern in HIGH_CONFIDENCE_RULES:
        if pattern.search(content):
            high.add(name)

    for name, pattern in REVIEW_RULES:
        for match in pattern.finditer(content):
            candidate = match.group(match.lastindex or 0).lower()
            if any(marker in candidate for marker in PLACEHOLDER_MARKERS):
                continue
            review.add(name)
            break

    return high, review


def tracked_paths(repo: Path) -> list[str]:
    output = git(repo, "ls-files", "-z")
    return [part.decode("utf-8", "surrogateescape") for part in output.split(b"\0") if part]


def historical_env_paths(repo: Path) -> set[str]:
    output = git(repo, "log", "--all", "--name-only", "--format=", "-z")
    paths = {
        part.decode("utf-8", "surrogateescape").strip("\n")
        for part in output.split(b"\0")
        if part.strip(b"\n")
    }
    return {path for path in paths if is_sensitive_env_path(path)}


def historical_blobs(repo: Path) -> list[tuple[str, str, int]]:
    objects = git(repo, "rev-list", "--objects", "--all").decode("utf-8", "surrogateescape")
    object_paths: dict[str, str] = {}
    for line in objects.splitlines():
        object_id, separator, path = line.partition(" ")
        if separator and object_id not in object_paths:
            object_paths[object_id] = path

    if not object_paths:
        return []

    request = "".join(f"{object_id}\n" for object_id in object_paths).encode()
    checks = git(
        repo,
        "cat-file",
        "--batch-check=%(objectname) %(objecttype) %(objectsize)",
        input_bytes=request,
    ).decode("ascii", "replace")

    blobs: list[tuple[str, str, int]] = []
    for line in checks.splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[1] == "blob" and parts[2].isdigit():
            blobs.append((parts[0], object_paths[parts[0]], int(parts[2])))
    return blobs


def historical_commit_messages(repo: Path) -> list[tuple[str, bytes]]:
    output = git(repo, "log", "--all", "--format=%H%x00%B%x00")
    parts = output.split(b"\0")
    messages: list[tuple[str, bytes]] = []
    for index in range(0, len(parts) - 1, 2):
        commit_id = parts[index].strip().decode("ascii", "replace")
        message = parts[index + 1]
        if commit_id:
            messages.append((commit_id, message))
    return messages


def add_findings(
    findings: set[tuple[str, str, str]],
    scope: str,
    path: str,
    names: set[str],
) -> None:
    for name in names:
        findings.add((scope, path, name))


def main() -> int:
    parser = argparse.ArgumentParser(description="Git 비밀 노출을 읽기 전용으로 검사합니다.")
    parser.add_argument("--repo", default=".", help="검사할 Git 저장소 경로")
    args = parser.parse_args()
    repo = Path(args.repo).resolve()

    blocked: set[tuple[str, str, str]] = set()
    review: set[tuple[str, str, str]] = set()
    skipped: set[tuple[str, str]] = set()

    try:
        root = Path(git(repo, "rev-parse", "--show-toplevel").decode().strip()).resolve()
        paths = tracked_paths(root)

        for path in paths:
            if is_sensitive_env_path(path):
                blocked.add(("현재", path, "추적 중인 환경 파일"))
                continue

            file_path = root / path
            try:
                size = file_path.stat().st_size
                if size > MAX_BLOB_BYTES:
                    skipped.add(("현재", path))
                    continue
                content = file_path.read_bytes()
            except (OSError, ValueError):
                skipped.add(("현재", path))
                continue

            if is_binary(content):
                skipped.add(("현재", path))
                continue
            high, candidates = scan_content(content)
            add_findings(blocked, "현재", path, high)
            add_findings(review, "현재", path, candidates)

        for path in historical_env_paths(root):
            blocked.add(("이력", path, "커밋 이력의 환경 파일"))

        for object_id, path, size in historical_blobs(root):
            if is_sensitive_env_path(path):
                continue
            if size > MAX_BLOB_BYTES:
                skipped.add(("이력", path))
                continue
            content = git(root, "cat-file", "blob", object_id)
            if is_binary(content):
                skipped.add(("이력", path))
                continue
            high, candidates = scan_content(content)
            add_findings(blocked, "이력", path, high)
            add_findings(review, "이력", path, candidates)

        for commit_id, message in historical_commit_messages(root):
            high, candidates = scan_content(message)
            location = f"커밋 메시지 {commit_id[:12]}"
            add_findings(blocked, "이력", location, high)
            add_findings(review, "이력", location, candidates)
    except RuntimeError as error:
        print("검사 상태: WARNING")
        print(f"검사 실패: {error}")
        return 1

    status = "BLOCKED" if blocked else "WARNING" if review or skipped else "PASS"
    print(f"검사 상태: {status}")
    print(f"차단 발견: {len(blocked)}건")
    print(f"수동 검토 후보: {len(review)}건")
    print(f"검사 생략: {len(skipped)}건")

    for scope, path, rule in sorted(blocked):
        print(f"차단: [{scope}] {path} ({rule})")
    for scope, path, rule in sorted(review):
        print(f"검토: [{scope}] {path} ({rule}, 값은 표시하지 않음)")
    for scope, path in sorted(skipped):
        print(f"생략: [{scope}] {path} (바이너리 또는 2 MiB 초과)")

    return 2 if blocked else 1 if review or skipped else 0


if __name__ == "__main__":
    sys.exit(main())
