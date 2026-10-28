#!/usr/bin/env python3
"""Read-only access to the separate legacy project knowledge kit.

This bridge forwards the selected kit command and its output and exit status.
It does not import, merge, promote, or synchronise either knowledge graph.
"""

from __future__ import annotations

import argparse
import io
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile


KIT = Path(__file__).resolve().parent / "project_kit"
REPOSITORY = Path(__file__).resolve().parents[2]
KIT_PREFIX = "docs/knowledge/project_kit/"
TASKS = ("business", "product", "pitch", "technical", "validation", "operations")


def positive_timeout(value: str) -> float:
    try:
        result = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("timeout must be a positive finite number") from exc
    if not 0 < result < float("inf"):
        raise argparse.ArgumentTypeError("timeout must be a positive finite number")
    return result


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    selection = result.add_mutually_exclusive_group()
    selection.add_argument("--kit-root", type=Path,
                           help="Registry and source root; defaults to the bundled project_kit")
    selection.add_argument("--snapshot-head", action="store_true",
                           help="Read a temporary Git HEAD kit without checkout line-ending conversion")
    result.add_argument("--timeout", type=positive_timeout, default=60.0,
                        help="Maximum subprocess time in seconds (default: 60)")
    commands = result.add_subparsers(dest="command", required=True)
    status = commands.add_parser("status", help="Read the kit status, including validation issues")
    status.add_argument("--as-of")
    validate = commands.add_parser("validate", help="Run the kit's own read-only validation")
    validate.add_argument("--strict", action="store_true")
    validate.add_argument("--as-of")
    search = commands.add_parser("search", help="Read the kit's results and preserve their stale labels")
    search.add_argument("query")
    search.add_argument("--task", choices=TASKS)
    search.add_argument("--limit", type=int, default=20)
    search.add_argument("--include-archive", action="store_true")
    search.add_argument("--include-drafts", action="store_true")
    search.add_argument("--full-text", action="store_true")
    impact = commands.add_parser("impact", help="Read impact inside the legacy kit only")
    impact.add_argument("id")
    return result


def child_command(args: argparse.Namespace) -> list[str]:
    command = [sys.executable, str(args.kit_script), "--root", str(args.kit_root.resolve()), args.command]
    if args.command in ("status", "validate"):
        if args.as_of:
            command.extend(("--as-of", args.as_of))
        if args.command == "validate" and args.strict:
            command.append("--strict")
    elif args.command == "search":
        if args.task:
            command.extend(("--task", args.task))
        command.extend(("--limit", str(args.limit)))
        for name in ("include_archive", "include_drafts", "full_text"):
            if getattr(args, name):
                command.append("--" + name.replace("_", "-"))
        command.extend(("--", args.query))
    elif args.command == "impact":
        command.extend(("--", args.id))
    return command


def write_bytes(stream, data: bytes | str | None) -> None:
    if not data:
        return
    if isinstance(data, str):
        data = data.encode("utf-8")
    if hasattr(stream, "buffer"):
        stream.buffer.write(data)
        stream.buffer.flush()
    else:
        stream.write(data.decode("utf-8", errors="replace"))
        stream.flush()


def run_query(args: argparse.Namespace, env: dict[str, str]) -> int:
    try:
        process = subprocess.run(child_command(args), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 timeout=args.timeout, check=False, env=env)
    except subprocess.TimeoutExpired as exc:
        write_bytes(sys.stdout, exc.stdout)
        write_bytes(sys.stderr, exc.stderr)
        print("Legacy kit query timed out; no result was promoted or registered.", file=sys.stderr)
        return 124
    except OSError as exc:
        print(f"Could not launch legacy kit CLI: {exc}", file=sys.stderr)
        return 2
    write_bytes(sys.stdout, process.stdout)
    write_bytes(sys.stderr, process.stderr)
    return process.returncode


def git_read(arguments: list[str], timeout: float, env: dict[str, str]) -> bytes:
    """Read Git output without a shell; preserve stderr on failure."""
    result = subprocess.run(["git", "-C", str(REPOSITORY), *arguments], stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=timeout, check=False, env=env)
    if result.returncode:
        write_bytes(sys.stderr, result.stderr)
        raise ValueError(f"Git snapshot command failed (exit {result.returncode}).")
    return result.stdout


def extract_kit(archive: bytes, directory: Path) -> Path:
    """Extract only regular files under the expected prefix, rejecting unsafe paths."""
    root = directory.resolve()
    seen: set[str] = set()
    with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
        for member in zipped.infolist():
            name = member.filename
            parts = name.rstrip("/").split("/")
            if (not name or "\\" in name or name.startswith("/")
                    or any(part in ("", ".", "..") or ":" in part for part in parts)):
                raise ValueError(f"Unsafe Git archive path: {name!r}")
            path = PurePosixPath(name)
            if name in ("docs/", "docs/knowledge/", KIT_PREFIX):
                if not member.is_dir():
                    raise ValueError(f"Invalid Git archive directory: {name!r}")
                continue
            if not name.startswith(KIT_PREFIX):
                raise ValueError(f"Unexpected Git archive path: {name!r}")
            identity = str(path).casefold()
            if identity in seen:
                raise ValueError(f"Duplicate Git archive path: {name!r}")
            seen.add(identity)
            mode = member.external_attr >> 16
            if stat.S_ISLNK(mode) or (mode and stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)):
                raise ValueError(f"Unsupported Git archive entry: {name!r}")
            destination = root.joinpath(*path.parts)
            if not destination.resolve().is_relative_to(root):
                raise ValueError(f"Git archive path escapes temporary directory: {name!r}")
            if member.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                with zipped.open(member) as source, destination.open("xb") as target:
                    shutil.copyfileobj(source, target)
    kit = root / "docs" / "knowledge" / "project_kit"
    if not (kit / "kb.py").is_file() or not (kit / "registry" / "knowledge.json").is_file():
        raise ValueError("Git HEAD snapshot does not contain the kit CLI and registry.")
    return kit


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    if not args.snapshot_head:
        args.kit_root = args.kit_root or KIT
        args.kit_script = KIT / "kb.py"
        if not args.kit_script.is_file():
            print("Legacy kit CLI not found; no data was changed.", file=sys.stderr)
            return 2
        return run_query(args, env)
    try:
        commit = git_read(["rev-parse", "--verify", "HEAD^{commit}"], args.timeout, env).decode("ascii").strip()
        if len(commit) not in (40, 64) or any(c not in "0123456789abcdef" for c in commit):
            raise ValueError("Git returned an invalid HEAD commit identifier.")
        archive = git_read(["-c", "core.autocrlf=false", "archive", "--format=zip", commit,
                            "docs/knowledge/project_kit"], args.timeout, env)
        with tempfile.TemporaryDirectory(prefix="aethon-kit-head-") as temporary:
            args.kit_root = extract_kit(archive, Path(temporary))
            args.kit_script = args.kit_root / "kb.py"
            print(f"Legacy kit snapshot at Git HEAD {commit}; uncommitted changes excluded. "
                  "Validation uses the snapshot's unconverted files; the working tree is unchanged.",
                  file=sys.stderr, flush=True)
            return run_query(args, env)
    except subprocess.TimeoutExpired as exc:
        write_bytes(sys.stderr, exc.stderr)
        print("Git HEAD snapshot timed out; no data was changed.", file=sys.stderr)
        return 124
    except (OSError, ValueError, UnicodeError, zipfile.BadZipFile) as exc:
        print(f"Could not prepare Git HEAD snapshot: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
