"""Find byte-identical native assets; equality does not establish authorship.

Run from the repository root with Git and GitHub CLI installed.
--ref audits a committed baseline instead.
"""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

UPSTREAM = "b2378abb1a0c64149bb7621815b849d89602de23"
FORMATS = ("svg", "png", "webp")

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--ref", help="native Git revision to audit")
args = parser.parse_args()

tree = json.loads(subprocess.check_output(
    ["gh", "api", f"repos/selfhst/icons/git/trees/{UPSTREAM}?recursive=1"]
))
if tree.get("truncated") is not False:
    raise RuntimeError("Upstream tree is incomplete")

upstream = {}
for item in tree["tree"]:
    if item["type"] == "blob" and item["path"].split("/")[0] in FORMATS:
        upstream.setdefault(item["sha"], []).append(item["path"])

native = {}
if args.ref:
    output = subprocess.check_output(
        ["git", "ls-tree", "-r", "--full-tree", args.ref, "--", *FORMATS], text=True
    )
    for line in output.splitlines():
        entry, path = line.split("\t")
        native[path] = entry.split()[2]
else:
    for format in FORMATS:
        for path in Path(format).rglob("*"):
            if not path.is_file():
                continue
            data = path.read_bytes()
            native[str(path)] = hashlib.sha1(
                f"blob {len(data)}\0".encode() + data
            ).hexdigest()

matches = [(path, upstream[sha]) for path, sha in sorted(native.items()) if sha in upstream]
for path, copies in matches:
    print(f"{path}\t{', '.join(copies)}")
print(f"{len(matches)} duplicate assets among {len(native)} native files; selfhst/icons@{UPSTREAM}")
raise SystemExit(bool(matches))
