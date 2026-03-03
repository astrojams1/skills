#!/usr/bin/env python3
"""Test: Validate all skills conform to the Agent Skills specification.

Specification: https://agentskills.io/specification

Checks per skill directory:
  - Contains a SKILL.md file
  - SKILL.md has valid YAML frontmatter (delimited by ---)
  - Required field 'name': 1-64 chars, lowercase alphanumeric + hyphens,
    no leading/trailing/consecutive hyphens, must match parent directory name
  - Required field 'description': 1-1024 chars, non-empty
  - Optional 'license': must be a string if present
  - Optional 'compatibility': 1-500 chars if present
  - Optional 'metadata': map of string keys to string values if present
  - Optional 'allowed-tools': must be a string if present
  - Optional 'internal': boolean, marks skills as repo-internal (not distributed)
  - Body (after frontmatter) recommended under 500 lines
"""

import os
import re
import sys


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS_DIR = os.path.join(REPO_ROOT, "skills")

KNOWN_FIELDS = {
    "name",
    "description",
    "license",
    "compatibility",
    "metadata",
    "allowed-tools",
    "internal",
}

# Matches valid names: lowercase alphanumeric segments separated by single hyphens
NAME_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


class SpecValidator:
    """Validates skills against the Agent Skills specification."""

    def __init__(self):
        self.passes = 0
        self.failures = 0
        self.warnings = 0

    def passed(self, msg):
        self.passes += 1
        print(f"  PASS: {msg}")

    def failed(self, msg):
        self.failures += 1
        print(f"  FAIL: {msg}")

    def warned(self, msg):
        self.warnings += 1
        print(f"  WARN: {msg}")

    # ── Frontmatter parsing ──────────────────────────────────────────

    def parse_frontmatter(self, filepath):
        """Parse YAML frontmatter from a SKILL.md file.

        Returns (frontmatter_dict, body_lines, error_message).
        On error the first two values are None.
        """
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        if not content.startswith("---"):
            return None, None, "File does not start with frontmatter delimiter (---)"

        # Find the closing --- (skip the first line)
        lines = content.split("\n")
        closing_idx = None
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                closing_idx = i
                break

        if closing_idx is None:
            return None, None, "No closing frontmatter delimiter (---) found"

        frontmatter_text = "\n".join(lines[1:closing_idx])
        body_lines = lines[closing_idx + 1 :]

        frontmatter, error = self.parse_simple_yaml(frontmatter_text)
        if error:
            return None, None, error

        return frontmatter, body_lines, None


    def parse_simple_yaml(self, text):
        """Parse a constrained YAML subset used by SKILL frontmatter."""
        data = {}
        lines = text.splitlines()
        i = 0

        def parse_scalar(raw):
            raw = raw.strip()
            if raw in {"", "null", "~"}:
                return ""
            if (raw.startswith('"') and raw.endswith('"')) or (raw.startswith("'" ) and raw.endswith("'")):
                return raw[1:-1]
            return raw

        while i < len(lines):
            line = lines[i]
            if not line.strip():
                i += 1
                continue
            if line.startswith(' ') or line.startswith('	'):
                return None, f"Invalid YAML in frontmatter: unexpected indentation on line {i + 1}"
            if ':' not in line:
                return None, f"Invalid YAML in frontmatter: missing ':' on line {i + 1}"

            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()

            if not key:
                return None, f"Invalid YAML in frontmatter: empty key on line {i + 1}"

            if value in {'>-', '|-', '>', '|'}:
                i += 1
                block = []
                while i < len(lines):
                    blk_line = lines[i]
                    if not blk_line.strip():
                        block.append('')
                        i += 1
                        continue
                    if blk_line.startswith('  '):
                        block.append(blk_line[2:])
                        i += 1
                        continue
                    break
                data[key] = ' '.join(part.strip() for part in block if part.strip())
                continue

            if value == '':
                i += 1
                nested = {}
                while i < len(lines):
                    nested_line = lines[i]
                    if not nested_line.strip():
                        i += 1
                        continue
                    if not nested_line.startswith('  '):
                        break
                    entry = nested_line[2:]
                    if ':' not in entry:
                        return None, f"Invalid YAML in frontmatter: missing ':' on line {i + 1}"
                    nk, nv = entry.split(':', 1)
                    nested[nk.strip()] = parse_scalar(nv)
                    i += 1
                data[key] = nested
                continue

            data[key] = parse_scalar(value)
            i += 1

        if not isinstance(data, dict) or not data:
            return None, "Frontmatter is empty"
        return data, None

    # ── Field validators ─────────────────────────────────────────────

    def validate_name(self, name, dir_name):
        """Validate the required 'name' field."""
        if not isinstance(name, str):
            self.failed(
                f"'name' must be a string, got {type(name).__name__}"
            )
            return

        self.passed(f"'name' is present: {name}")

        # Length
        if len(name) < 1 or len(name) > 64:
            self.failed(
                f"'name' must be 1-64 characters (got {len(name)})"
            )
        else:
            self.passed(f"'name' length is valid ({len(name)} chars)")

        # Pattern (lowercase alphanumeric + single hyphens, no edge hyphens)
        if not NAME_PATTERN.match(name):
            if re.search(r"[A-Z]", name):
                self.failed("'name' must not contain uppercase letters")
            elif name.startswith("-") or name.endswith("-"):
                self.failed(
                    "'name' must not start or end with a hyphen"
                )
            elif "--" in name:
                self.failed(
                    "'name' must not contain consecutive hyphens (--)"
                )
            elif not re.match(r"^[a-z0-9-]+$", name):
                self.failed(
                    "'name' may only contain lowercase letters, numbers, and hyphens"
                )
            else:
                self.failed("'name' has invalid format")
        else:
            self.passed(
                "'name' format is valid (lowercase alphanumeric with single hyphens)"
            )

        # Must match parent directory name
        if name != dir_name:
            self.failed(
                f"'name' ({name}) does not match directory name ({dir_name})"
            )
        else:
            self.passed("'name' matches parent directory name")

    def validate_description(self, description):
        """Validate the required 'description' field."""
        if not isinstance(description, str):
            self.failed(
                f"'description' must be a string, got {type(description).__name__}"
            )
            return

        if len(description) < 1:
            self.failed("'description' must not be empty")
        elif len(description) > 1024:
            self.failed(
                f"'description' exceeds 1024 characters (got {len(description)})"
            )
        else:
            self.passed(f"'description' is valid ({len(description)} chars)")

    def validate_optional_fields(self, frontmatter):
        """Validate optional fields when present."""
        # license
        if "license" in frontmatter:
            if not isinstance(frontmatter["license"], str):
                self.failed(
                    f"'license' must be a string, got {type(frontmatter['license']).__name__}"
                )
            else:
                self.passed("'license' is a valid string")

        # compatibility
        if "compatibility" in frontmatter:
            compat = frontmatter["compatibility"]
            if not isinstance(compat, str):
                self.failed(
                    f"'compatibility' must be a string, got {type(compat).__name__}"
                )
            elif len(compat) < 1 or len(compat) > 500:
                self.failed(
                    f"'compatibility' must be 1-500 characters (got {len(compat)})"
                )
            else:
                self.passed(
                    f"'compatibility' is valid ({len(compat)} chars)"
                )

        # metadata
        if "metadata" in frontmatter:
            metadata = frontmatter["metadata"]
            if not isinstance(metadata, dict):
                self.failed(
                    f"'metadata' must be a mapping, got {type(metadata).__name__}"
                )
            else:
                all_valid = all(
                    isinstance(k, str) and isinstance(v, str)
                    for k, v in metadata.items()
                )
                if not all_valid:
                    self.failed(
                        "'metadata' values must all be strings"
                    )
                else:
                    self.passed(
                        f"'metadata' is a valid string mapping ({len(metadata)} entries)"
                    )

        # allowed-tools
        if "allowed-tools" in frontmatter:
            at = frontmatter["allowed-tools"]
            if not isinstance(at, str):
                self.failed(
                    f"'allowed-tools' must be a string, got {type(at).__name__}"
                )
            else:
                self.passed("'allowed-tools' is a valid string")

        # Warn on unknown top-level fields
        unknown = set(frontmatter.keys()) - KNOWN_FIELDS
        if unknown:
            self.warned(
                f"Unknown frontmatter fields: {', '.join(sorted(unknown))}"
            )

    def validate_body(self, body_lines, skill_dir):
        """Check body length recommendation and file references."""
        if body_lines is None:
            return
        count = len(body_lines)
        if count > 500:
            self.warned(
                f"SKILL.md body is {count} lines (recommended: under 500)"
            )
        else:
            self.passed(f"SKILL.md body is within recommended length ({count} lines)")

        # Validate that referenced files exist (markdown links to local files)
        body_text = "\n".join(body_lines)
        link_pattern = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
        for match in link_pattern.finditer(body_text):
            target = match.group(2)
            # Skip URLs and anchors
            if target.startswith(("http://", "https://", "#")):
                continue
            ref_path = os.path.join(skill_dir, target)
            if os.path.isfile(ref_path):
                self.passed(f"Referenced file exists: {target}")
            else:
                self.failed(f"Referenced file not found: {target}")

    # ── Top-level validation ─────────────────────────────────────────

    def validate_skill(self, skill_dir):
        """Validate a single skill directory against the spec."""
        dir_name = os.path.basename(skill_dir.rstrip("/"))
        print(f"\nValidating skill: {dir_name}/")

        skill_md = os.path.join(skill_dir, "SKILL.md")

        # SKILL.md must exist
        if not os.path.isfile(skill_md):
            self.failed("SKILL.md not found")
            return
        self.passed("SKILL.md exists")

        # Parse frontmatter
        frontmatter, body_lines, error = self.parse_frontmatter(skill_md)
        if error:
            self.failed(error)
            return
        self.passed("YAML frontmatter is valid")

        # Required: name
        if "name" not in frontmatter:
            self.failed("Required field 'name' is missing")
        else:
            self.validate_name(frontmatter["name"], dir_name)

        # Required: description
        if "description" not in frontmatter:
            self.failed("Required field 'description' is missing")
        else:
            self.validate_description(frontmatter["description"])

        # Optional fields
        self.validate_optional_fields(frontmatter)

        # Body length and file references
        self.validate_body(body_lines, skill_dir)

    def run(self):
        """Discover and validate all skills."""
        print("Agent Skills Specification Compliance Test")
        print(f"Spec: https://agentskills.io/specification")
        print(f"Skills directory: {SKILLS_DIR}")

        if not os.path.isdir(SKILLS_DIR):
            print(f"\nFAIL: Skills directory not found: {SKILLS_DIR}")
            return 1

        # Collect skill directories (skip regular files)
        entries = sorted(os.listdir(SKILLS_DIR))
        skill_dirs = [
            os.path.join(SKILLS_DIR, e)
            for e in entries
            if os.path.isdir(os.path.join(SKILLS_DIR, e))
        ]

        if not skill_dirs:
            print(f"\nFAIL: No skill directories found under {SKILLS_DIR}/")
            return 1

        print(f"\nFound {len(skill_dirs)} skill(s)")

        for skill_dir in skill_dirs:
            self.validate_skill(skill_dir)

        # Summary
        print(f"\n{'=' * 50}")
        print(
            f"Results: {self.passes} passed, {self.failures} failed, "
            f"{self.warnings} warnings"
        )

        if self.failures > 0:
            print("OVERALL: FAIL")
            return 1

        print("OVERALL: PASS")
        return 0


if __name__ == "__main__":
    validator = SpecValidator()
    sys.exit(validator.run())
