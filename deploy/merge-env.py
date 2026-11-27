#!/usr/bin/env python3
"""Merge incoming env into remote .env. Empty local values do not wipe remote."""
from __future__ import annotations

import sys
from pathlib import Path


def parse(path: str) -> dict[str, str]:
    out: dict[str, str] = {}
    p = Path(path)
    if not p.exists():
        return out
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        k = k.strip()
        v = v.strip()
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        if k:
            out[k] = v
    return out


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: merge-env.py <remote.env> <incoming.env>", file=sys.stderr)
        return 2
    remote_path, incoming_path = sys.argv[1], sys.argv[2]
    remote = parse(remote_path)
    local = parse(incoming_path)
    for k, v in local.items():
        if v == "" and k in remote and remote[k] != "":
            continue
        remote[k] = v
    remote["WA_PROFILE"] = "prod"
    remote["WA_AUTH_DIR"] = ".wa-auth"
    for k in ("WA_SKIP_CONNECT", "WA_ALLOW_CONNECT", "WA_AUTH_DIR_LOCAL", "WA_DEVICE_NAME"):
        remote.pop(k, None)
    Path(remote_path).write_text(
        "\n".join(f"{k}={v}" for k, v in remote.items()) + "\n",
        encoding="utf-8",
    )
    print(f"env keys: {len(remote)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
