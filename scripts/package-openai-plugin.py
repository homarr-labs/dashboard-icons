#!/usr/bin/env python3
"""Validate and package the public Dashboard Icons plugin using the standard library."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import struct
import subprocess
import sys
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import zipfile


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "plugins/dashboard-icons"
FILES = {"plugin.json", "mcp.json", "assets/logo.png"}
TOOLS = {"match_icons", "search_icons", "get_icon", "get_icon_svg", "browse_icons", "list_categories"}
ENDPOINT = "https://dashboardicons.com/api/mcp/public"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(files):
    require(set(files) == FILES, f"Package inventory must be exactly {sorted(FILES)}")
    plugin = json.loads(files["plugin.json"])
    require(plugin["$schema"] == "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", "Invalid plugin schema")
    require(plugin["name"] == SOURCE.name, "Plugin name must match its source directory")
    require(re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", plugin["version"]), "Use a stable semantic version, such as 0.1.0")
    require(set(plugin) <= {"$schema", "name", "version", "description", "homepage", "repository", "license", "keywords", "author", "extensions"}, "Unexpected plugin fields")
    require(set(plugin["extensions"]) == {"com.openai"}, "Unexpected plugin extensions")
    openai = plugin["extensions"]["com.openai"]
    require(set(openai) <= {"interface", "review", "publication"}, "App bindings, hooks, and executable components are not allowed")
    interface = openai["interface"]
    for field, limit in {"displayName": 30, "shortDescription": 30, "longDescription": 4000}.items():
        value = interface[field]
        require(isinstance(value, str) and value.strip() and len(value) <= limit, f"Invalid {field}")
    require(interface["category"] == "Developer Tools", "Unexpected listing category")
    prompts = interface["defaultPrompt"]
    require(isinstance(prompts, list) and 1 <= len(prompts) <= 3, "Provide one to three starter prompts")
    require(all(isinstance(value, str) and value.strip() and len(value) <= 128 and "\n" not in value and "@" not in value for value in prompts), "Invalid starter prompt")
    require(len({" ".join(value.split()) for value in prompts}) == len(prompts), "Duplicate starter prompts")
    for field in ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"):
        url = urlsplit(interface[field])
        require(url.scheme == "https" and url.hostname and not url.username and not url.password and len(interface[field]) <= 1024, f"Invalid {field}")
    for field in ("logo", "composerIcon"):
        require(interface[field] == "./assets/logo.png", f"Invalid {field} reference")
    logo = files["assets/logo.png"]
    require(24 <= len(logo) <= 5 * 1024 * 1024 and logo[:8] == b"\x89PNG\r\n\x1a\n" and logo[12:16] == b"IHDR", "Logo must be a PNG under 5 MiB")
    width, height = struct.unpack(">II", logo[16:24])
    require(256 <= width == height <= 4096, "Logo must be square and 256–4096 pixels")
    mcp = json.loads(files["mcp.json"])
    require(mcp == {
        "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        "mcpServers": {"dashboard-icons": {
            "type": "streamable-http", "url": ENDPOINT,
            "extensions": {"com.openai": {"auth": {"type": "none"}}},
        }},
    }, "MCP must use only the public endpoint with no authentication, headers, or local commands")
    review = openai.get("review", {})
    require(set(review) <= {"prompts", "test_cases", "demo_recording_url", "commerce", "commerce_description"}, "Unexpected review fields; never package reviewer credentials")
    if "test_cases" in review:
        cases = review["test_cases"]
        require(set(cases) == {"positive", "negative"}, "Declare positive and negative review cases together")
        for group, count in (("positive", 5), ("negative", 3)):
            require(isinstance(cases[group], list) and len(cases[group]) == count, f"Provide exactly {count} {group} review cases")
            fields = ("description", "prompt")
            if group == "positive":
                fields += ("tools_triggered", "expected_behavior")
            for case in cases[group]:
                require(all(isinstance(case.get(field), str) and case[field].strip() for field in fields), f"Invalid {group} review case")
    require(set(openai.get("publication", {})) <= {"release_notes", "countries", "translations"}, "Unexpected publication fields")
    return plugin


def archive(files):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as output:
        for name, content in sorted(files.items()):
            entry = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, content)
    with zipfile.ZipFile(buffer) as output:
        require(output.testzip() is None, "Invalid ZIP checksum")
        contents = {name: output.read(name) for name in output.namelist()}
        require(len(output.namelist()) == len(FILES) and contents == files, "ZIP differs from validated source")
        validate(contents)
    return buffer.getvalue()


def verify_endpoint():
    request = Request(ENDPOINT, data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}).encode(), headers={
        "Content-Type": "application/json", "Accept": "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25",
        "User-Agent": "DashboardIconsRelease/0.1.0",
    })
    with urlopen(request, timeout=20) as response:
        require(response.geturl() == ENDPOINT, "Public MCP endpoint must not redirect")
        body = response.read(1024 * 1024 + 1)
    require(len(body) <= 1024 * 1024, "MCP discovery response exceeds 1 MiB")
    result = json.loads(body)
    require(result.get("id") == 1 and "error" not in result, "MCP discovery failed")
    tools = result["result"]["tools"]
    require(len(tools) == len(TOOLS) and {tool["name"] for tool in tools} == TOOLS, "Public MCP must advertise exactly the six public icon tools")
    for tool in tools:
        annotations = tool.get("annotations", {})
        require(all(type(annotations.get(field)) is bool for field in ("readOnlyHint", "openWorldHint", "destructiveHint")), f"Missing boolean annotations: {tool['name']}")
        require(annotations["readOnlyHint"] and not annotations["destructiveHint"], f"Unsafe tool annotations: {tool['name']}")
        schema = tool["inputSchema"]
        inputs = set(schema.get("properties", {})) | set(schema.get("required", []))
        require(not inputs & {"context", "conversation_context", "conversation_id", "llm_model", "model"}, f"Unnecessary conversation/model inputs: {tool['name']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-check", action="store_true", help="Validate source and ZIP round-trip offline; write no files")
    parser.add_argument("--output", type=Path, default=ROOT / "dist/openai-plugin")
    args = parser.parse_args()
    require(not SOURCE.is_symlink(), "Package source cannot be a symlink")
    files = {}
    for path in SOURCE.rglob("*"):
        require(not path.is_symlink(), f"Package cannot contain symlinks: {path}")
        if path.is_file():
            files[path.relative_to(SOURCE).as_posix()] = path.read_bytes()
    plugin = validate(files)
    package = archive(files)
    if args.self_check:
        invalid = dict(files)
        mcp = json.loads(invalid["mcp.json"])
        mcp["mcpServers"]["dashboard-icons"]["headers"] = {"Authorization": "Bearer forbidden"}
        invalid["mcp.json"] = json.dumps(mcp).encode()
        try:
            validate(invalid)
        except ValueError:
            pass
        else:
            raise ValueError("Self-check failed: static credentials were accepted")
        print(f"Validated {plugin['name']} {plugin['version']}: three files, references, branding, and ZIP round-trip (offline)")
        return
    verify_endpoint()
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    dirty = subprocess.check_output(["git", "status", "--porcelain", "--", "plugins/dashboard-icons", "scripts/package-openai-plugin.py"], cwd=ROOT, text=True).strip()
    require(not dirty, "Commit package and builder changes before producing a versioned artifact")
    require(args.output.resolve() != SOURCE and SOURCE not in args.output.resolve().parents, "Write artifacts outside the package source")
    args.output.mkdir(parents=True, exist_ok=True)
    filename = f"dashboard-icons-openai-{plugin['version']}.zip"
    checksum = hashlib.sha256(package).hexdigest()
    (args.output / filename).write_bytes(package)
    (args.output / f"{filename}.sha256").write_text(f"{checksum}  {filename}\n")
    openai = plugin["extensions"]["com.openai"]
    review = openai.get("review", {})
    publication = openai.get("publication", {})
    gaps = ["Verified publisher identity and required portal verification, scans, and attestations", "Review cases executed against this version in the intended ChatGPT/Codex host"]
    if not openai["interface"].get("developerName"):
        gaps.append("Selected verified developer name")
    if not review.get("demo_recording_url"):
        gaps.append("Reviewer-accessible recording of real interactions")
    if "commerce" not in review:
        gaps.append("Publisher's commerce declaration")
    if "countries" not in publication:
        gaps.append("Publisher's country availability choice")
    cases = review.get("test_cases", {})
    if len(cases.get("positive", [])) != 5 or len(cases.get("negative", [])) != 3:
        gaps.append("Five positive and three negative review cases")
    report = {
        "status": "draft_not_submission_ready", "package": filename, "version": plugin["version"],
        "source_revision": revision, "sha256": checksum, "files": sorted(files),
        "endpoint": ENDPOINT, "verified_public_tools": sorted(TOOLS), "remaining_submission_evidence": gaps,
    }
    (args.output / "release-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, TypeError, OSError) as error:
        sys.exit(f"Plugin packaging failed: {error}")
