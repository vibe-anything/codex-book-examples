#!/usr/bin/env python3
"""Git 추적 파일과 이력의 비밀 흔적을 값 노출 없이 검사한다."""

from __future__ import annotations

import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


MAX_TEXT_BLOB_BYTES = 5 * 1024 * 1024
ALLOWED_ENV_FILES = {".env.sample", ".env.example", ".env.template"}

TOKEN_RULES = (
    ("개인 키", re.compile(r"-----BEGIN (?:RSA |DSA |EC |OPENSSH |PGP )?PRIVATE KEY-----")),
    ("AWS 액세스 키", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("GitHub 토큰", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|github_pat_[A-Za-z0-9_]{40,255})\b")),
    ("Slack 토큰", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    ("Stripe 비밀 키", re.compile(r"\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b")),
    ("OpenAI API 키", re.compile(r"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b")),
    ("Anthropic API 키", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b")),
    ("Google API 키", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("npm 토큰", re.compile(r"\bnpm_[A-Za-z0-9]{20,}\b")),
    ("Vercel Blob 토큰", re.compile(r"\bvercel_blob_rw_[A-Za-z0-9_-]{20,}\b")),
    ("JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    ("자격 증명 포함 DB URL", re.compile(r"\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?)://[^\s:/]+:[^\s@/]+@")),
)

SUSPICIOUS_NAME_RE = re.compile(
    r"(?i)\b([A-Z0-9_.-]*(?:api[_-]?key|secret|token|password|passwd|private[_-]?key|service[_-]?key)[A-Z0-9_.-]*)\b\s*[:=]\s*(.+)"
)
SAFE_VALUE_RE = re.compile(
    r"(?i)(?:example|sample|dummy|fake|test|changeme|replace|your[_-]|redacted|not-a-secret|super-secret|secret-key|placeholder)"
)
ENV_NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]{2,}$")


@dataclass(frozen=True)
class Finding:
    kind: str
    path: str
    source: str
    line: int | None = None


def git(*args: str, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        ["git", *args],
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def forbidden_env_path(path: str) -> bool:
    name = Path(path).name.lower()
    return (name == ".env" or name.startswith(".env.")) and name not in ALLOWED_ENV_FILES


def extract_literal(raw_value: str) -> str:
    value = raw_value.strip().rstrip(",;")
    if not value:
        return ""
    if value[0] in {'"', "'", "`"}:
        quote = value[0]
        end = value.find(quote, 1)
        return value[1:end] if end >= 1 else value[1:]
    return value.split("#", 1)[0].strip().split()[0] if value.split() else ""


def literal_looks_safe(value: str) -> bool:
    if len(value) < 12:
        return True
    if ENV_NAME_RE.fullmatch(value):
        return True
    if SAFE_VALUE_RE.search(value):
        return True
    references = ("process.env", "import.meta.env", "os.getenv", "getenv(", "${", "env[")
    return any(reference in value for reference in references)


def scan_text(text: str, path: str, source: str) -> list[Finding]:
    findings: list[Finding] = []
    code_suffixes = {".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"}
    for line_number, line in enumerate(text.splitlines(), 1):
        matched_rule = False
        for rule_name, pattern in TOKEN_RULES:
            if pattern.search(line):
                findings.append(Finding(rule_name, path, source, line_number))
                matched_rule = True
        if matched_rule:
            continue

        assignment = SUSPICIOUS_NAME_RE.search(line)
        if not assignment:
            continue
        raw_value = assignment.group(2).lstrip()
        if Path(path).suffix.lower() in code_suffixes and raw_value[:1] not in {'"', "'", "`"}:
            continue
        value = extract_literal(raw_value)
        if value and not literal_looks_safe(value):
            findings.append(Finding("비밀 의심 리터럴", path, source, line_number))
    return findings


def read_blob(oid: str) -> tuple[bytes | None, str | None]:
    try:
        object_type = git("cat-file", "-t", oid).stdout.decode().strip()
        if object_type != "blob":
            return None, None
        size = int(git("cat-file", "-s", oid).stdout.decode().strip())
        if size > MAX_TEXT_BLOB_BYTES:
            return None, f"큰 blob 미검사: {oid[:12]} ({size} bytes)"
        return git("cat-file", "-p", oid).stdout, None
    except (subprocess.CalledProcessError, UnicodeDecodeError, ValueError) as error:
        return None, f"blob 읽기 실패: {oid[:12]} ({type(error).__name__})"


def decode_text(data: bytes) -> str | None:
    if b"\0" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def main() -> int:
    try:
        root = git("rev-parse", "--show-toplevel").stdout.decode().strip()
        os.chdir(root)
    except (subprocess.CalledProcessError, UnicodeDecodeError):
        print("Git 비밀 검사: WARNING")
        print("확인 범위: Git 저장소 루트를 확인하지 못함")
        return 2

    findings: set[Finding] = set()
    warnings: list[str] = []
    scanned_worktree = 0
    scanned_blobs = 0
    scanned_commit_messages = 0
    binary_blobs = 0

    try:
        tracked_paths = [
            item.decode("utf-8", "surrogateescape")
            for item in git("ls-files", "-z").stdout.split(b"\0")
            if item
        ]
        for path in tracked_paths:
            if forbidden_env_path(path):
                findings.add(Finding("금지된 .env 파일", path, "현재 추적 파일"))
                continue
            file_path = Path(path)
            if not file_path.is_file() or file_path.is_symlink():
                continue
            if file_path.stat().st_size > MAX_TEXT_BLOB_BYTES:
                warnings.append(f"큰 추적 파일 미검사: {path}")
                continue
            data = file_path.read_bytes()
            text = decode_text(data)
            if text is None:
                continue
            scanned_worktree += 1
            findings.update(scan_text(text, path, "현재 추적 파일"))

        object_paths: dict[str, set[str]] = {}
        history = git("rev-list", "--objects", "--all", check=False)
        if history.returncode != 0:
            warnings.append("도달 가능한 Git 커밋 이력을 읽지 못함")
        else:
            for raw_line in history.stdout.splitlines():
                decoded = raw_line.decode("utf-8", "surrogateescape")
                oid, separator, path = decoded.partition(" ")
                if separator and path:
                    object_paths.setdefault(oid, set()).add(path)

        commit_log = git("log", "--all", "--format=%H%x00%B%x1e", check=False)
        if commit_log.returncode != 0:
            warnings.append("Git 커밋 메시지를 읽지 못함")
        else:
            for raw_record in commit_log.stdout.split(b"\x1e"):
                raw_record = raw_record.strip()
                if not raw_record:
                    continue
                raw_oid, separator, raw_message = raw_record.partition(b"\0")
                if not separator:
                    warnings.append("Git 커밋 메시지 형식을 해석하지 못함")
                    continue
                message = decode_text(raw_message)
                if message is None:
                    warnings.append(f"커밋 메시지 디코딩 실패: {raw_oid[:12].decode(errors='replace')}")
                    continue
                commit_oid = raw_oid.decode("ascii", "replace")
                scanned_commit_messages += 1
                findings.update(
                    scan_text(message, "<커밋 메시지>", f"커밋 {commit_oid[:12]}")
                )

        index_entries = git("ls-files", "--stage", "-z").stdout.split(b"\0")
        for raw_entry in index_entries:
            if not raw_entry:
                continue
            metadata, separator, raw_path = raw_entry.partition(b"\t")
            fields = metadata.split()
            if not separator or len(fields) < 3 or fields[2] != b"0":
                continue
            oid = fields[1].decode()
            path = raw_path.decode("utf-8", "surrogateescape")
            object_paths.setdefault(oid, set()).add(path)

        for oid, paths in object_paths.items():
            for path in paths:
                if forbidden_env_path(path):
                    findings.add(Finding("금지된 .env 파일", path, f"Git blob {oid[:12]}"))

            allowed_paths = [path for path in paths if not forbidden_env_path(path)]
            if not allowed_paths:
                continue
            data, warning = read_blob(oid)
            if warning:
                warnings.append(warning)
                continue
            if data is None:
                continue
            text = decode_text(data)
            if text is None:
                binary_blobs += 1
                continue
            scanned_blobs += 1
            for path in allowed_paths:
                findings.update(scan_text(text, path, f"Git blob {oid[:12]}"))

        shallow = git("rev-parse", "--is-shallow-repository").stdout.decode().strip()
        if shallow == "true":
            warnings.append("얕은 clone이라 원격의 전체 커밋 이력을 증명할 수 없음")
        if binary_blobs > 0:
            warnings.append(f"바이너리 또는 비 UTF-8 blob {binary_blobs}개의 내용 미검사")
    except (OSError, subprocess.CalledProcessError, UnicodeDecodeError) as error:
        warnings.append(f"검사 중 읽기 오류: {type(error).__name__}")

    ordered_findings = sorted(
        findings,
        key=lambda item: (item.path, item.source, item.line or 0, item.kind),
    )
    if ordered_findings:
        status = "BLOCKED"
        exit_code = 1
    elif warnings:
        status = "WARNING"
        exit_code = 2
    else:
        status = "PASS"
        exit_code = 0

    print(f"Git 비밀 검사: {status}")
    print(
        "확인 범위: "
        f"현재 추적 텍스트 {scanned_worktree}개, Git 텍스트 blob {scanned_blobs}개, "
        f"커밋 메시지 {scanned_commit_messages}개, 바이너리 blob {binary_blobs}개"
    )
    print(f"발견 건수: {len(ordered_findings)}")
    for finding in ordered_findings[:50]:
        line = str(finding.line) if finding.line is not None else "-"
        print(
            f"- {finding.kind} | 경로={finding.path} | 위치={finding.source} | 줄={line}"
        )
    if len(ordered_findings) > 50:
        print(f"- 추가 발견 {len(ordered_findings) - 50}건은 값 노출 방지를 위해 생략")
    for warning in sorted(set(warnings)):
        print(f"주의: {warning}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
