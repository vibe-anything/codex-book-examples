#!/usr/bin/env python3
"""Scan tracked files and reachable Git history without printing matched values."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path, PurePosixPath


SECRET_RULES = (
    ("private-key-header", re.compile(rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
    ("aws-access-key", re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b")),
    ("github-token", re.compile(rb"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,255}\b")),
    ("github-fine-grained-token", re.compile(rb"\bgithub_pat_[A-Za-z0-9_]{50,255}\b")),
    ("slack-token", re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,255}\b")),
    ("jwt", re.compile(rb"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")),
    (
        "credential-assignment",
        re.compile(
            rb"(?im)^\s*(?:export\s+)?[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY|ANON[_-]?KEY)[A-Z0-9_]*\s*[:=]\s*['\"]?([A-Za-z0-9_./+=:@-]{8,})"
        ),
    ),
)

PLACEHOLDER_VALUES = {
    b"example",
    b"placeholder",
    b"changeme",
    b"change-me",
    b"replace-me",
    b"replace_me",
    b"your-value",
    b"your_value",
}

SUSPICIOUS_FILENAMES = re.compile(
    r"(?i)(?:^|/)(?:credentials?(?:\.[^/]*)?|id_(?:rsa|dsa|ecdsa|ed25519)|[^/]*private[^/]*key[^/]*)$"
)


def git(repo: Path, *args: str, input_bytes: bytes | None = None) -> bytes:
    return subprocess.run(
        ["git", "-C", str(repo), *args],
        input=input_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout


def is_env_file(path: str) -> bool:
    name = PurePosixPath(path).name
    return name == ".env" or name.startswith(".env.")


def is_allowed_env_sample(path: str, content: bytes) -> bool:
    if PurePosixPath(path).name != ".env.sample":
        return False

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith(b"#") or b"=" not in line:
            continue
        value = line.split(b"=", 1)[1].strip().strip(b"'\"").lower()
        if not value:
            continue
        if value in PLACEHOLDER_VALUES or value.startswith((b"your_", b"your-", b"<", b"${")):
            continue
        return False
    return True


def line_number(content: bytes, offset: int) -> int:
    return content.count(b"\n", 0, offset) + 1


def fingerprint(rule: str, matched: bytes) -> str:
    return hashlib.sha256(rule.encode() + b"\0" + matched).hexdigest()[:12]


def scan_content(path: str, content: bytes, location: str) -> list[dict[str, object]]:
    findings: list[dict[str, object]] = []

    if is_env_file(path) and not is_allowed_env_sample(path, content):
        findings.append({"kind": "env-file", "location": location, "path": path})

    if SUSPICIOUS_FILENAMES.search(path):
        findings.append({"kind": "suspicious-filename", "location": location, "path": path})

    for rule, pattern in SECRET_RULES:
        for match in pattern.finditer(content):
            value = match.group(1) if rule == "credential-assignment" else match.group(0)
            lowered = value.lower().strip(b"'\"")
            if rule == "credential-assignment" and (
                lowered in PLACEHOLDER_VALUES
                or lowered.startswith((b"your_", b"your-", b"<", b"${", b"process.env"))
                or re.fullmatch(rb"[A-Z][A-Z0-9_]{7,}", value) is not None
            ):
                continue
            findings.append(
                {
                    "kind": "secret-pattern",
                    "rule": rule,
                    "location": location,
                    "path": path,
                    "line": line_number(content, match.start()),
                    "fingerprint": fingerprint(rule, value),
                    "match": "<redacted>",
                }
            )
    return findings


def current_files(repo: Path) -> list[tuple[str, bytes]]:
    paths = [p.decode("utf-8", "surrogateescape") for p in git(repo, "ls-files", "-z").split(b"\0") if p]
    files = []
    for path in paths:
        file_path = repo / path
        try:
            content = str(file_path.readlink()).encode() if file_path.is_symlink() else file_path.read_bytes()
            files.append((path, content))
        except (FileNotFoundError, IsADirectoryError):
            continue
    return files


def history_blobs(repo: Path) -> tuple[dict[str, bytes], dict[str, list[tuple[str, str]]]]:
    commits = [c.decode() for c in git(repo, "rev-list", "--all").splitlines()]
    blob_locations: dict[str, list[tuple[str, str]]] = defaultdict(list)

    for commit in commits:
        entries = git(repo, "ls-tree", "-r", "-z", commit).split(b"\0")
        for entry in entries:
            if not entry:
                continue
            metadata, raw_path = entry.split(b"\t", 1)
            _mode, object_type, oid = metadata.split(b" ", 2)
            if object_type != b"blob":
                continue
            path = raw_path.decode("utf-8", "surrogateescape")
            blob_locations[oid.decode()].append((commit, path))

    blobs = {oid: git(repo, "cat-file", "blob", oid) for oid in blob_locations}
    return blobs, blob_locations


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".", help="Git repository root")
    args = parser.parse_args()
    repo = Path(args.repo).resolve()

    git(repo, "rev-parse", "--is-inside-work-tree")
    findings: list[dict[str, object]] = []

    tracked_files = current_files(repo)
    for path, content in tracked_files:
        findings.extend(scan_content(path, content, "working-tree"))

    blobs, locations = history_blobs(repo)
    for oid, content in blobs.items():
        for commit, path in locations[oid]:
            findings.extend(scan_content(path, content, commit))

    unique = {json.dumps(item, sort_keys=True): item for item in findings}
    result = {
        "status": "findings" if unique else "clean",
        "tracked_files_scanned": len(tracked_files),
        "history_blobs_scanned": len(blobs),
        "findings": list(unique.values()),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    return 1 if unique else 0


if __name__ == "__main__":
    raise SystemExit(main())
