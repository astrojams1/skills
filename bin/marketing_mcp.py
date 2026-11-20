#!/usr/bin/env python3
"""Prepare a GitHub Contents API update through MCP and confirm the remote receipt."""
import copy
import datetime as dt
import json
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile

import marketing_gate as gate


def blob_id(store, head):
    return store.git("rev-parse", "--verify", head + ":state.json").stdout.strip()


def prepare(args):
    if args.operation == "init":
        raise RuntimeError("Initialize the coordination branch before enrolling the cloud routine")
    store = gate.GitState(args.repo, args.group)
    head = store.head()
    if not head:
        raise RuntimeError("Coordination branch has not been initialized")
    original = store.read(head)
    proposed = copy.deepcopy(original)
    reply = gate.transition(proposed, args, gate.utcnow(), secrets.token_hex(24))
    if proposed == original:
        return reply
    content = store.encode(head, proposed)
    receipt = {
        "repo": str(Path(args.repo).resolve()),
        "group": args.group,
        "blob": store.git("hash-object", "--stdin", data=content).stdout.strip(),
        "expires": proposed["active"]["expires"] if proposed["active"] else None,
        "reply": reply,
    }
    # Local-only receipt contains the capability. Neither the connector nor Git needs it.
    with tempfile.NamedTemporaryFile(prefix="marketing-mcp-", suffix=".json", mode="w",
                                     delete=False) as f:
        json.dump(receipt, f)
        local_path = f.name
    return {
        "status": "awaiting-commit",
        "receipt": local_path,
        "update": {
            "branch": store.ref.removeprefix("refs/heads/"),
            "path": "state.json",
            "message": "[skip ci] Advance marketing run state",
            "sha": blob_id(store, head),
            "content": content,
        },
    }


def confirm(path):
    receipt = json.loads(Path(path).read_text())
    store = gate.GitState(receipt["repo"], receipt["group"])
    head = store.head()
    if not head:
        raise RuntimeError("Coordination branch missing")
    store.read(head)
    if blob_id(store, head) != receipt["blob"]:
        return {"status": "unconfirmed"}
    if receipt["expires"] and dt.datetime.fromisoformat(receipt["expires"]) <= gate.utcnow():
        return {"status": "lost"}
    return receipt["reply"]


def main(argv):
    try:
        if argv[:1] == ["prepare"]:
            result = prepare(gate.parse_args(argv[1:]))
        elif len(argv) == 2 and argv[0] == "confirm":
            result = confirm(argv[1])
        else:
            print("Usage: marketing_mcp.py prepare <gate arguments> | confirm RECEIPT", file=sys.stderr)
            return 2
        print(json.dumps(result))
        return 0
    except (RuntimeError, ValueError, OSError, subprocess.SubprocessError, KeyError) as exc:
        print(json.dumps({"status": "unavailable", "error": str(exc) if isinstance(exc, RuntimeError)
                          else type(exc).__name__}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
