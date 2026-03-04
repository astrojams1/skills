#!/usr/bin/env bash
# Skills Management CLI
# Manage astrojams1/skills as a git submodule in any project.
#
# Usage (from a target project that has skills/ submodule):
#   ./skills/bin/manage.sh status
#   ./skills/bin/manage.sh check
#   ./skills/bin/manage.sh sync
#
# Usage (install into a new project):
#   /path/to/skills/bin/manage.sh install [target-dir]
#
# Commands:
#   install [dir]  Add the skills submodule to a target repo (defaults to cwd)
#                  and materialize .claude/skills/ markdown files for Claude Code discovery
#   check          Verify skills are initialized, unmodified, up-to-date, and linked
#                  Auto-fixes missing skill files and stale hooks in place
#   sync           Pull latest skills from upstream main and refresh skill files
#   link           Recreate .claude/skills/ skill files (no network, no staging)
#   status         Show current skills state (commit, branch, available skills)

set -euo pipefail

SKILLS_REMOTE="${SKILLS_REMOTE:-https://github.com/astrojams1/skills.git}"
SUBMODULE_PATH="skills"

# ── Helpers ──────────────────────────────────────────────────────────

red()    { printf '\033[1;31m%s\033[0m\n' "$*"; }
green()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[1;33m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

die() { red "ERROR: $*" >&2; exit 1; }

# Detect whether we're running from inside the submodule or the project root.
# Returns the project root directory.
find_project_root() {
    # If we're inside the skills repo used as a submodule, go up to project root
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    # Script is at <project>/skills/bin/manage.sh
    local candidate
    candidate="$(dirname "$(dirname "$script_dir")")"

    if [ -f "$candidate/.gitmodules" ] && grep -q "$SUBMODULE_PATH" "$candidate/.gitmodules" 2>/dev/null; then
        echo "$candidate"
        return
    fi

    # Fallback: current working directory
    echo "$(pwd)"
}

# Check if skills submodule exists and is initialized
submodule_exists() {
    local root="$1"
    [ -f "$root/.gitmodules" ] && grep -q "path = $SUBMODULE_PATH" "$root/.gitmodules" 2>/dev/null
}

# Detect when this script is being run from the standalone skills source repo
# (instead of from a consumer repo that mounts skills/ as a submodule).
is_standalone_skills_repo() {
    local root="$1"
    [ -f "$root/bin/manage.sh" ] && [ -d "$root/skills" ] && ! submodule_exists "$root"
}

submodule_initialized() {
    local root="$1"
    [ -d "$root/$SUBMODULE_PATH/.git" ] || [ -f "$root/$SUBMODULE_PATH/.git" ]
}

skills_dir() {
    local root="$1"
    echo "$root/$SUBMODULE_PATH/skills"
}

# Check if a skill is marked as internal (not for consumer repos).
# Internal skills have `internal: true` in their SKILL.md frontmatter.
_is_internal_skill() {
    local skill_dir="$1"
    [ -f "$skill_dir/SKILL.md" ] && sed -n '/^---$/,/^---$/p' "$skill_dir/SKILL.md" | grep -q '^internal: *true'
}

# Copy skill directories so Claude Code and Codex discover skills natively.
#
# Claude Code scans: .claude/skills/<name>/SKILL.md
# Codex scans:       .agents/skills/<name>/SKILL.md
#
# Full directory copies (not symlinks) because Claude Code has a confirmed bug
# where skill discovery does not resolve symlinks
# (https://github.com/anthropics/claude-code/issues/14836).
link_skills() {
    local root="$1"
    local sdir
    sdir="$(skills_dir "$root")"

    if [ ! -d "$sdir" ]; then
        yellow "No skills directory found at $sdir — skipping skill file creation"
        return
    fi

    mkdir -p "$root/.claude/skills" "$root/.agents/skills"

    local refreshed=0
    for skill in "$sdir"/*/; do
        [ -d "$skill" ] || continue
        [ -f "$skill/SKILL.md" ] || continue

        # Skip internal skills — they are only for the skills repo itself
        if _is_internal_skill "$skill"; then
            continue
        fi

        local name
        name="$(basename "$skill")"

        # Migrate old flat-file copies (<name>.md) to directories
        for discovery_dir in "$root/.claude/skills" "$root/.agents/skills"; do
            local old_flat="$discovery_dir/$name.md"
            if [ -f "$old_flat" ] && [ ! -d "$old_flat" ]; then
                rm "$old_flat"
            fi
        done
        # Remove old symlinks (any format)
        if [ -L "$root/.claude/skills/$name" ]; then
            rm "$root/.claude/skills/$name"
        fi
        if [ -L "$root/.agents/skills/$name" ]; then
            rm "$root/.agents/skills/$name"
        fi

        # Copy to .claude/skills/<name>/  (for Claude Code)
        _sync_skill_dir "$sdir/$name" "$root/.claude/skills/$name" && refreshed=$((refreshed + 1))

        # Copy to .agents/skills/<name>/  (for Codex)
        _sync_skill_dir "$sdir/$name" "$root/.agents/skills/$name" && refreshed=$((refreshed + 1))
    done

    # Remove stale skill directories (skills removed upstream)
    _remove_stale_skills "$sdir" "$root/.claude/skills"
    _remove_stale_skills "$sdir" "$root/.agents/skills"

    # Remove internal skills from consumer discovery dirs (may exist from older installs)
    for skill in "$sdir"/*/; do
        [ -d "$skill" ] || continue
        if _is_internal_skill "$skill"; then
            local name
            name="$(basename "$skill")"
            for discovery_dir in "$root/.claude/skills" "$root/.agents/skills"; do
                if [ -d "$discovery_dir/$name" ]; then
                    rm -rf "$discovery_dir/$name"
                    yellow "Removed internal skill from consumer discovery: $discovery_dir/$name"
                fi
            done
        fi
    done

    if [ "$refreshed" -gt 0 ]; then
        green "Refreshed skills in .claude/skills/ and .agents/skills/"
    fi
}

# Sync a single skill directory: cp -r source to dest if content differs.
# Returns 0 (true) if the copy was refreshed, 1 if already up-to-date.
_sync_skill_dir() {
    local src="$1" dest="$2"
    if [ -d "$dest" ] && diff -rq "$src" "$dest" >/dev/null 2>&1; then
        return 1  # already up-to-date
    fi
    rm -rf "$dest"
    cp -r "$src" "$dest"
    return 0
}

# Remove skill directories under $target_dir that no longer exist in $source_dir.
_remove_stale_skills() {
    local source_dir="$1" target_dir="$2"
    [ -d "$target_dir" ] || return 0
    for entry in "$target_dir"/*/; do
        [ -d "$entry" ] || continue
        local name
        name="$(basename "$entry")"
        if [ ! -d "$source_dir/$name" ]; then
            rm -rf "$entry"
            yellow "Removed stale skill directory: $entry"
        fi
    done
    # Also clean up any leftover flat .md files from older versions
    for flat in "$target_dir"/*.md; do
        [ -f "$flat" ] || continue
        rm "$flat"
        yellow "Removed legacy flat skill file: $flat"
    done
}

# Check that .claude/skills/ and .agents/skills/ directories mirror source skills
check_skill_links() {
    local root="$1"
    local sdir
    sdir="$(skills_dir "$root")"
    local issues=0

    for target_dir in "$root/.claude/skills" "$root/.agents/skills"; do
        local label
        label="$(echo "$target_dir" | sed "s|$root/||")"

        if [ ! -d "$target_dir" ]; then
            red "FAIL: $label/ directory missing"
            echo "  Run: $(basename "$0") install  (or sync to recreate)"
            issues=$((issues + 1))
            continue
        fi

        for skill in "$sdir"/*/; do
            [ -d "$skill" ] || continue
            [ -f "$skill/SKILL.md" ] || continue

            # Skip internal skills — they are only for the skills repo itself
            if _is_internal_skill "$skill"; then
                continue
            fi

            local name
            name="$(basename "$skill")"
            local dest="$target_dir/$name"

            if [ ! -d "$dest" ]; then
                red "FAIL: Missing skill directory $label/$name/"
                issues=$((issues + 1))
            elif [ ! -f "$dest/SKILL.md" ]; then
                red "FAIL: $label/$name/ exists but has no SKILL.md"
                issues=$((issues + 1))
            elif ! diff -rq "$sdir/$name" "$dest" >/dev/null 2>&1; then
                red "FAIL: $label/$name/ content is stale"
                issues=$((issues + 1))
            fi
        done
    done

    return "$issues"
}

# Ensure .claude/settings.json has a SessionStart hook that initializes
# the skills submodule. Without this, .claude/skills can break on fresh clones
# until the submodule is manually initialized.
#
# Claude Code expects the nested format:
#   hooks.SessionStart = [{ matcher: "", hooks: [{ type, command }] }]
# Older versions of this script wrote a flat format (without matcher/hooks
# nesting) which Claude Code silently ignores.  This function detects and
# migrates the old format automatically.
ensure_session_hook() {
    local root="$1"
    local settings="$root/.claude/settings.json"
    local hook_cmd="ROOT=\$(git rev-parse --show-toplevel 2>/dev/null || pwd); git -C \"\$ROOT\" submodule update --init --recursive && { git -C \"\$ROOT/skills\" fetch origin main --quiet 2>/dev/null && git -C \"\$ROOT\" submodule update --remote --merge skills 2>/dev/null || true; } && \"\$ROOT\"/skills/bin/manage.sh link"

    mkdir -p "$root/.claude"

    python3 -c "
import json, sys, os
settings_path, hook_cmd = sys.argv[1], sys.argv[2]
old_cmd = 'git submodule update --init --recursive'
old_compound_cmd = 'git submodule update --init --recursive && ./skills/bin/manage.sh link'
old_root_cmd = 'ROOT=\$(git rev-parse --show-toplevel 2>/dev/null || pwd); git -C \"\$ROOT\" submodule update --init --recursive && \"\$ROOT\"/skills/bin/manage.sh link'
data = {}
if os.path.isfile(settings_path):
    with open(settings_path) as f:
        data = json.load(f)
hooks = data.setdefault('hooks', {})
session_hooks = hooks.setdefault('SessionStart', [])

# Check if hook already exists in correct nested format
for group in session_hooks:
    if isinstance(group, dict) and 'hooks' in group:
        for h in group.get('hooks', []):
            if h.get('type') == 'command' and h.get('command') == hook_cmd:
                sys.exit(0)

# Remove stale skill hooks — old simple command or new compound command
# in either flat format (type+command without nesting) or nested format
stale = {old_cmd, old_compound_cmd, old_root_cmd, hook_cmd}
remaining = []
was_migrated = False
for e in session_hooks:
    if isinstance(e, dict) and 'hooks' not in e:
        # Flat-format entry
        if e.get('type') == 'command' and e.get('command') in stale:
            was_migrated = True
            continue
    elif isinstance(e, dict) and 'hooks' in e:
        # Nested-format entry — drop stale inner hooks
        kept = [h for h in e['hooks']
                if not (h.get('type') == 'command' and h.get('command') in stale)]
        if len(kept) < len(e['hooks']):
            was_migrated = True
        if not kept:
            continue
        e = dict(e, hooks=kept)
    remaining.append(e)

# Insert hook in correct nested format
remaining.insert(0, {
    'matcher': '',
    'hooks': [{'type': 'command', 'command': hook_cmd}]
})
hooks['SessionStart'] = remaining

with open(settings_path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
print('migrated' if was_migrated else 'added')
" "$settings" "$hook_cmd"
}

# Remove the skills SessionStart hook from .claude/settings.json.
# Preserves all other hooks and settings.  Deletes settings.json if it
# becomes empty after removal.
remove_session_hook() {
    local root="$1"
    local settings="$root/.claude/settings.json"

    [ -f "$settings" ] || return 0

    python3 -c "
import json, sys, os

settings_path = sys.argv[1]
if not os.path.isfile(settings_path):
    sys.exit(0)

with open(settings_path) as f:
    data = json.load(f)

hooks = data.get('hooks', {})
session_hooks = hooks.get('SessionStart', [])

# Remove all skills-related hooks (any command referencing skills/bin/manage.sh
# or the legacy submodule-only commands)
legacy_cmds = {
    'git submodule update --init --recursive',
    'git submodule update --init --recursive && ./skills/bin/manage.sh link',
}

remaining = []
for e in session_hooks:
    if isinstance(e, dict) and 'hooks' in e:
        kept = [h for h in e['hooks']
                if not (h.get('type') == 'command' and
                        (h.get('command', '') in legacy_cmds or
                         'skills/bin/manage.sh' in h.get('command', '')))]
        if kept:
            remaining.append(dict(e, hooks=kept))
    elif isinstance(e, dict) and 'hooks' not in e:
        cmd = e.get('command', '')
        if cmd in legacy_cmds or 'skills/bin/manage.sh' in cmd:
            continue
        remaining.append(e)
    else:
        remaining.append(e)

if remaining:
    hooks['SessionStart'] = remaining
else:
    hooks.pop('SessionStart', None)

if not hooks:
    data.pop('hooks', None)

if data:
    with open(settings_path, 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')
else:
    os.remove(settings_path)
    print('removed')
    sys.exit(0)
print('cleaned')
" "$settings" 2>/dev/null || true
}

# Detect and clean up stale lowercase agent instruction files.
# Older conventions used claude.md / agents.md; current convention
# is uppercase CLAUDE.md / AGENTS.md.
# Returns 0 if changes were made, 1 if nothing to do.
cleanup_lowercase_agent_files() {
    local root="$1"
    local cleaned=false

    # Explicit pairs: lowercase → UPPERCASE (avoids tr mangling the extension)
    local pair
    for pair in "claude.md:CLAUDE.md" "agents.md:AGENTS.md"; do
        local lc_file="${pair%%:*}"
        local uc_file="${pair##*:}"

        if [ -f "$root/$lc_file" ]; then
            if [ -f "$root/$uc_file" ]; then
                # Both exist — remove the lowercase one (superseded)
                yellow "WARN: Stale lowercase $lc_file found alongside $uc_file"
                rm "$root/$lc_file"
                green "  FIXED: Removed $lc_file (superseded by $uc_file)"
                cleaned=true
            else
                # Only lowercase exists — rename to uppercase
                yellow "WARN: Found lowercase $lc_file (should be $uc_file)"
                mv "$root/$lc_file" "$root/$uc_file"
                green "  FIXED: Renamed $lc_file → $uc_file"
                cleaned=true
            fi
        fi
    done

    if [ "$cleaned" = true ]; then
        return 0
    fi
    return 1
}

# ── Commands ─────────────────────────────────────────────────────────

cmd_install() {
    local target="${1:-$(pwd)}"
    target="$(cd "$target" && pwd)"

    bold "Installing skills submodule into: $target"

    # Must be a git repo
    if ! git -C "$target" rev-parse --git-dir >/dev/null 2>&1; then
        die "$target is not a git repository"
    fi

    # Check if already installed
    if submodule_exists "$target"; then
        if submodule_initialized "$target"; then
            yellow "Skills submodule already installed and initialized."
            # Ensure hook and skill files are current (idempotent)
            link_skills "$target"
            ensure_session_hook "$target"
            if [ -d "$target/.claude" ]; then
                git -C "$target" add .claude/skills .claude/settings.json 2>/dev/null || true
            fi
            if [ -d "$target/.agents" ]; then
                git -C "$target" add .agents/skills 2>/dev/null || true
            fi
            yellow "Run 'check' to verify integrity or 'sync' to update."
            exit 0
        else
            bold "Submodule registered but not initialized. Initializing..."
            git -C "$target" submodule update --init --recursive
            link_skills "$target"
            ensure_session_hook "$target"
            if [ -d "$target/.claude" ]; then
                git -C "$target" add .claude/skills .claude/settings.json 2>/dev/null || true
            fi
            if [ -d "$target/.agents" ]; then
                git -C "$target" add .agents/skills 2>/dev/null || true
            fi
            green "Submodule initialized."
            exit 0
        fi
    fi

    # Add the submodule
    bold "Adding submodule..."
    git -C "$target" submodule add "$SKILLS_REMOTE" "$SUBMODULE_PATH"
    git -C "$target" submodule update --init --recursive

    # Configure to track main
    local gitmodules="$target/.gitmodules"
    if ! grep -q "branch = main" "$gitmodules" 2>/dev/null; then
        bold "Configuring submodule to track main branch..."
        git -C "$target" config -f .gitmodules "submodule.$SUBMODULE_PATH.branch" main
    fi

    # Copy skill directories for Claude Code and Codex discovery
    bold "Copying skills into .claude/skills/ and .agents/skills/ for agent discovery..."
    link_skills "$target"

    # Add SessionStart hook to auto-initialize submodule in new sessions
    bold "Adding SessionStart hook for automatic submodule initialization..."
    ensure_session_hook "$target"

    # Clean up stale lowercase agent instruction files (claude.md → CLAUDE.md)
    cleanup_lowercase_agent_files "$target" || true

    # Stage changes
    git -C "$target" add .gitmodules "$SUBMODULE_PATH"
    # Stage skill discovery directories and settings
    if [ -d "$target/.claude" ]; then
        git -C "$target" add .claude/skills .claude/settings.json 2>/dev/null || true
    fi
    if [ -d "$target/.agents" ]; then
        git -C "$target" add .agents/skills 2>/dev/null || true
    fi

    green "Skills submodule installed successfully."
    echo ""
    bold "Next steps:"
    echo "  1. Commit:  git commit -m \"chore: add astrojams1/skills submodule\""
    echo "  2. Update your CLAUDE.md and AGENTS.md (see skill-orchestrator SKILL.md Step 5)"
    echo "  3. Run:     ./skills/bin/manage.sh status"
}

cmd_uninstall() {
    local target="${1:-}"
    local root

    if [ -n "$target" ]; then
        root="$(cd "$target" && pwd)"
    else
        root="$(find_project_root)"
    fi

    bold "Uninstalling skills from: $root"

    if ! submodule_exists "$root"; then
        # No submodule registered — still clean up any leftover artifacts
        local cleaned=false
        if [ -d "$root/.claude/skills" ]; then
            rm -rf "$root/.claude/skills"
            cleaned=true
        fi
        if [ -d "$root/.agents/skills" ]; then
            rm -rf "$root/.agents/skills"
            cleaned=true
        fi
        if [ -f "$root/.claude/settings.json" ]; then
            remove_session_hook "$root"
            cleaned=true
        fi
        # Remove leftover skills directory (orphaned from a partial removal)
        if [ -d "$root/$SUBMODULE_PATH" ]; then
            rm -rf "$root/$SUBMODULE_PATH"
            cleaned=true
        fi
        if [ "$cleaned" = true ]; then
            green "Cleaned up leftover artifacts (no submodule was registered)"
        else
            yellow "Nothing to uninstall — no skills submodule or artifacts found"
        fi
        return 0
    fi

    # Warn about local modifications
    local skills_path="$root/$SUBMODULE_PATH"
    if submodule_initialized "$root" && ! git -C "$skills_path" diff --quiet 2>/dev/null; then
        yellow "Warning: skills submodule has local modifications that will be lost"
    fi

    # 1. Deinitialize the submodule
    git -C "$root" submodule deinit -f "$SUBMODULE_PATH" 2>/dev/null || true

    # 2. Remove from git index and .gitmodules
    git -C "$root" rm -f "$SUBMODULE_PATH" 2>/dev/null || true

    # 3. Remove leftover directory (git rm may not clean everything)
    rm -rf "$root/$SUBMODULE_PATH"

    # 4. Clean cached module data
    rm -rf "$root/.git/modules/$SUBMODULE_PATH"

    # 5. Remove skill discovery directories
    if [ -d "$root/.claude/skills" ]; then
        rm -rf "$root/.claude/skills"
    fi
    if [ -d "$root/.agents/skills" ]; then
        rm -rf "$root/.agents/skills"
    fi

    # 6. Remove SessionStart hook
    remove_session_hook "$root"

    # Stage the cleanup
    if [ -f "$root/.gitmodules" ]; then
        git -C "$root" add .gitmodules 2>/dev/null || true
    fi
    if [ -d "$root/.claude" ]; then
        git -C "$root" add .claude/ 2>/dev/null || true
    fi
    if [ -d "$root/.agents" ]; then
        git -C "$root" add .agents/ 2>/dev/null || true
    fi

    green "Skills uninstalled successfully."
    bold "Changes are staged. To commit:"
    echo "  git commit -m \"chore: remove skills submodule\""
}

cmd_reinstall() {
    local target="${1:-}"
    local root

    if [ -n "$target" ]; then
        root="$(cd "$target" && pwd)"
    else
        root="$(find_project_root)"
    fi

    bold "Reinstalling skills in: $root"
    echo ""

    # Preserve the configured remote URL before uninstalling
    local remote_url="$SKILLS_REMOTE"
    if submodule_exists "$root"; then
        remote_url="$(git -C "$root" config -f .gitmodules "submodule.$SUBMODULE_PATH.url" 2>/dev/null || echo "$SKILLS_REMOTE")"
    fi

    # Step 1: Uninstall
    bold "Step 1/2: Removing existing integration..."
    cmd_uninstall "$root"
    echo ""

    # Step 2: Fresh install (SKILLS_REMOTE carries the preserved URL)
    bold "Step 2/2: Installing fresh..."
    SKILLS_REMOTE="$remote_url" cmd_install "$root"
}

cmd_check() {
    local root
    root="$(find_project_root)"
    local failures=0
    local warnings=0

    bold "Checking skills integrity in: $root"
    echo ""

    # 1. Submodule registered?
    if ! submodule_exists "$root"; then
        if is_standalone_skills_repo "$root"; then
            red "FAIL: This appears to be the standalone skills repository, not a consumer repo"
            echo "  Run this from your project root instead: ./skills/bin/manage.sh check"
            exit 1
        fi
        red "FAIL: No skills submodule found in .gitmodules"
        echo "  Run: $(basename "$0") install"
        exit 1
    fi
    green "PASS: Skills submodule registered in .gitmodules"

    # 2. Submodule initialized?
    if ! submodule_initialized "$root"; then
        red "FAIL: Skills submodule is not initialized (empty)"
        echo "  Run: git submodule update --init --recursive"
        exit 1
    fi
    green "PASS: Skills submodule is initialized"

    # 2.5. Submodule at recorded pointer?
    # Ephemeral environments (e.g. Codex) may start with the submodule checked
    # out at an old commit that doesn't match the parent repo's recorded pointer.
    # This causes a chicken-and-egg problem: the old manage.sh lacks features
    # (like auto-sync) needed to self-heal. Resetting to the recorded pointer
    # before any other checks ensures we run the correct manage.sh version.
    local recorded_sha actual_sha
    recorded_sha="$(git -C "$root" ls-tree HEAD "$SUBMODULE_PATH" 2>/dev/null | awk '{print $3}')"
    actual_sha="$(git -C "$root/$SUBMODULE_PATH" rev-parse HEAD 2>/dev/null)"
    if [ -n "$recorded_sha" ] && [ -n "$actual_sha" ] && [ "$recorded_sha" != "$actual_sha" ]; then
        yellow "WARN: Submodule at ${actual_sha:0:8} but recorded pointer is ${recorded_sha:0:8}"
        bold "  Auto-fixing: resetting submodule to recorded pointer..."
        if git -C "$root" submodule update --init --recursive 2>/dev/null; then
            actual_sha="$(git -C "$root/$SUBMODULE_PATH" rev-parse HEAD 2>/dev/null)"
            green "  FIXED: Reset to recorded pointer ${actual_sha:0:8}"
        else
            red "  Could not reset submodule. Run: git submodule update --init --recursive"
            failures=$((failures + 1))
        fi
        warnings=$((warnings + 1))
    fi

    # 3. Tracking main branch?
    local branch
    branch="$(git -C "$root" config -f .gitmodules "submodule.$SUBMODULE_PATH.branch" 2>/dev/null || true)"
    if [ "$branch" = "main" ]; then
        green "PASS: Submodule tracks 'main' branch"
    else
        yellow "WARN: Submodule branch is '${branch:-<not set>}' (expected 'main')"
        warnings=$((warnings + 1))
    fi

    # 4. Local modifications? (corruption/tampering detection)
    local skills_path="$root/$SUBMODULE_PATH"
    if git -C "$skills_path" diff --quiet 2>/dev/null; then
        green "PASS: No local modifications detected"
    else
        red "FAIL: Local modifications detected in skills submodule"
        echo "  Modified files:"
        git -C "$skills_path" diff --name-only 2>/dev/null | sed 's/^/    /'
        echo "  To restore: git -C $SUBMODULE_PATH checkout ."
        failures=$((failures + 1))
    fi

    # 5. Untracked files in skills?
    local untracked
    untracked="$(git -C "$skills_path" ls-files --others --exclude-standard 2>/dev/null || true)"
    if [ -z "$untracked" ]; then
        green "PASS: No untracked files in skills submodule"
    else
        yellow "WARN: Untracked files found in skills submodule"
        echo "$untracked" | sed 's/^/    /'
        warnings=$((warnings + 1))
    fi

    # 6. Up-to-date with remote?
    bold "Fetching upstream to compare..."
    if git -C "$skills_path" fetch origin main --quiet 2>/dev/null; then
        local local_sha remote_sha
        local_sha="$(git -C "$skills_path" rev-parse HEAD 2>/dev/null)"
        remote_sha="$(git -C "$skills_path" rev-parse origin/main 2>/dev/null)"

        if [ "$local_sha" = "$remote_sha" ]; then
            green "PASS: Skills are up-to-date with upstream (${local_sha:0:8})"
        else
            local behind
            behind="$(git -C "$skills_path" rev-list --count HEAD..origin/main 2>/dev/null || echo "?")"
            yellow "WARN: Skills are $behind commit(s) behind upstream"
            echo "  Local:  ${local_sha:0:8}"
            echo "  Remote: ${remote_sha:0:8}"
            bold "  Auto-fixing: syncing submodule to upstream main..."
            if git -C "$root" submodule update --remote --merge "$SUBMODULE_PATH" 2>/dev/null; then
                local new_sha
                new_sha="$(git -C "$skills_path" rev-parse HEAD 2>/dev/null)"
                green "  FIXED: Updated ${local_sha:0:8} → ${new_sha:0:8}"
            else
                yellow "  Could not auto-sync (network issue?). Run manually: $(basename "$0") sync"
            fi
            warnings=$((warnings + 1))
        fi
    else
        yellow "WARN: Could not fetch upstream (network issue?)"
        warnings=$((warnings + 1))
    fi

    # 7. Spec validation
    local spec_test="$skills_path/tests/test_skills_spec.py"
    if [ -f "$spec_test" ]; then
        bold "Running spec validation..."
        if python3 "$spec_test" >/dev/null 2>&1; then
            green "PASS: All skills conform to Agent Skills spec"
        else
            red "FAIL: Spec validation failed"
            echo "  Run: python3 $spec_test"
            failures=$((failures + 1))
        fi
    else
        yellow "WARN: Spec validator not found at $spec_test"
        warnings=$((warnings + 1))
    fi

    # 8. SessionStart hook (must be in nested matcher/hooks format with compound command)
    local settings_file="$root/.claude/settings.json"
    local expected_hook_cmd='ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd); git -C "${ROOT}" submodule update --init --recursive && { git -C "${ROOT}/skills" fetch origin main --quiet 2>/dev/null && git -C "${ROOT}" submodule update --remote --merge skills 2>/dev/null || true; } && "${ROOT}"/skills/bin/manage.sh link'
    expected_hook_cmd=${expected_hook_cmd//\$\{ROOT\}/\$ROOT}
    local hook_status=""
    if [ -f "$settings_file" ]; then
        hook_status="$(python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
new_cmd = sys.argv[2]
old_compound_cmd = 'git submodule update --init --recursive && ./skills/bin/manage.sh link'
old_cmd = 'git submodule update --init --recursive'
old_root_cmd = 'ROOT=\$(git rev-parse --show-toplevel 2>/dev/null || pwd); git -C \"\$ROOT\" submodule update --init --recursive && \"\$ROOT\"/skills/bin/manage.sh link'
for group in data.get('hooks', {}).get('SessionStart', []):
    if isinstance(group, dict) and 'hooks' in group:
        for h in group.get('hooks', []):
            if h.get('command') == new_cmd:
                print('ok')
                sys.exit(0)
            if h.get('command') == old_root_cmd:
                print('old_link_only')
                sys.exit(0)
            if h.get('command') in (old_cmd, old_compound_cmd):
                print('old_nested')
                sys.exit(0)
    # Detect old flat format (type+command without nesting)
    if isinstance(group, dict) and 'hooks' not in group:
        if group.get('command') in (new_cmd, old_cmd, old_compound_cmd, old_root_cmd):
            print('flat')
            sys.exit(0)
print('missing')
" "$settings_file" "$expected_hook_cmd" 2>/dev/null)"
    fi
    case "$hook_status" in
        ok)
            green "PASS: SessionStart hook initializes submodule and refreshes skill files"
            ;;
        old_link_only)
            yellow "WARN: SessionStart hook does not auto-sync skills to latest upstream"
            bold "  Auto-fixing: updating hook to include upstream sync..."
            ensure_session_hook "$root"
            green "  FIXED: SessionStart hook updated"
            warnings=$((warnings + 1))
            ;;
        old_nested)
            yellow "WARN: SessionStart hook does not refresh skill files (old command)"
            bold "  Auto-fixing: updating hook to include skill file refresh..."
            ensure_session_hook "$root"
            green "  FIXED: SessionStart hook updated"
            warnings=$((warnings + 1))
            ;;
        flat)
            yellow "WARN: SessionStart hook uses old flat format (Claude Code ignores it)"
            bold "  Auto-fixing: migrating hook to correct nested format..."
            ensure_session_hook "$root"
            green "  FIXED: SessionStart hook migrated"
            warnings=$((warnings + 1))
            ;;
        *)
            yellow "WARN: No SessionStart hook found — skills may not load on fresh clones"
            bold "  Auto-fixing: adding SessionStart hook..."
            ensure_session_hook "$root"
            green "  FIXED: SessionStart hook added"
            warnings=$((warnings + 1))
            ;;
    esac

    # 9. Skill discovery directories (auto-fix if missing or stale)
    if check_skill_links "$root"; then
        green "PASS: .claude/skills/ and .agents/skills/ are current"
    else
        yellow "WARN: Skill discovery directories are missing or stale — auto-fixing..."
        link_skills "$root"
        # Re-check after fix
        if check_skill_links "$root" 2>/dev/null; then
            green "  FIXED: skill directories refreshed"
            warnings=$((warnings + 1))
        else
            red "FAIL: Skill discovery directories could not be auto-fixed"
            echo "  Run: $(basename "$0") sync  (refreshes skill directories)"
            failures=$((failures + 1))
        fi
    fi

    # 10. Internal skills leaked into consumer discovery dirs
    # (check_skill_links skips internal skills, so link_skills cleanup may
    #  never run if all non-internal skills are fine — clean up explicitly)
    local sdir
    sdir="$(skills_dir "$root")"
    for skill in "$sdir"/*/; do
        [ -d "$skill" ] || continue
        if _is_internal_skill "$skill"; then
            local name
            name="$(basename "$skill")"
            for discovery_dir in "$root/.claude/skills" "$root/.agents/skills"; do
                if [ -d "$discovery_dir/$name" ]; then
                    yellow "WARN: Internal skill '$name' found in consumer discovery dir"
                    rm -rf "$discovery_dir/$name"
                    green "  FIXED: Removed $discovery_dir/$name"
                    warnings=$((warnings + 1))
                fi
            done
        fi
    done

    # 11. Stale lowercase agent instruction files
    if cleanup_lowercase_agent_files "$root"; then
        warnings=$((warnings + 1))
    fi

    # Summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    if [ "$failures" -gt 0 ]; then
        red "CHECK FAILED: $failures failure(s), $warnings warning(s)"
        exit 1
    elif [ "$warnings" -gt 0 ]; then
        yellow "CHECK PASSED with $warnings warning(s)"
        exit 0
    else
        green "ALL CHECKS PASSED"
        exit 0
    fi
}

cmd_sync() {
    local root
    root="$(find_project_root)"

    bold "Syncing skills to latest upstream main..."

    if ! submodule_exists "$root"; then
        if is_standalone_skills_repo "$root"; then
            die "This appears to be the standalone skills repository. Run sync from your consumer repo root: ./skills/bin/manage.sh sync"
        fi
        die "No skills submodule found. Run: $(basename "$0") install"
    fi

    if ! submodule_initialized "$root"; then
        bold "Submodule not initialized. Initializing first..."
        git -C "$root" submodule update --init --recursive
    fi

    local skills_path="$root/$SUBMODULE_PATH"

    # Record current commit
    local before_sha
    before_sha="$(git -C "$skills_path" rev-parse HEAD 2>/dev/null)"

    # Pull latest
    git -C "$root" submodule update --remote --merge "$SUBMODULE_PATH"

    local after_sha
    after_sha="$(git -C "$skills_path" rev-parse HEAD 2>/dev/null)"

    if [ "$before_sha" = "$after_sha" ]; then
        green "Already up-to-date (${before_sha:0:8})"
    else
        local count
        count="$(git -C "$skills_path" rev-list --count "$before_sha".."$after_sha" 2>/dev/null || echo "?")"
        green "Updated: ${before_sha:0:8} → ${after_sha:0:8} ($count new commit(s))"

        # Show what changed
        bold "Changes:"
        git -C "$skills_path" log --oneline "$before_sha".."$after_sha" 2>/dev/null | sed 's/^/  /'

        # Stage the submodule pointer update
        git -C "$root" add "$SUBMODULE_PATH"
        echo ""
        bold "Staged. To commit:"
        echo "  git commit -m \"chore: sync skills submodule to latest main\""
    fi

    # Refresh skill directories (picks up new/removed skills)
    bold "Refreshing skill directories..."
    link_skills "$root"

    # Ensure SessionStart hook exists (migrates older installs)
    ensure_session_hook "$root"

    if [ -d "$root/.claude" ]; then
        git -C "$root" add .claude/skills .claude/settings.json 2>/dev/null || true
    fi
    if [ -d "$root/.agents" ]; then
        git -C "$root" add .agents/skills 2>/dev/null || true
    fi
}

cmd_link() {
    local root
    root="$(find_project_root)"

    if is_standalone_skills_repo "$root"; then
        # In the author repo: copy skills/ into .claude/skills/ and .agents/skills/
        bold "Standalone skills repo detected — linking skills for local discovery..."
        link_skills_standalone "$root"
        return
    fi

    if ! submodule_exists "$root"; then
        die "No skills submodule found. Run: $(basename "$0") install"
    fi

    if ! submodule_initialized "$root"; then
        die "Skills submodule not initialized. Run: git submodule update --init --recursive"
    fi

    link_skills "$root"
}

# Copy skill directories from skills/ into .claude/skills/ and .agents/skills/
# for the standalone author repo (where skills/ is NOT a submodule).
link_skills_standalone() {
    local root="$1"
    local sdir="$root/skills"

    if [ ! -d "$sdir" ]; then
        die "No skills/ directory found at $root"
    fi

    mkdir -p "$root/.claude/skills" "$root/.agents/skills"

    local refreshed=0
    for skill in "$sdir"/*/; do
        [ -d "$skill" ] || continue
        [ -f "$skill/SKILL.md" ] || continue

        local name
        name="$(basename "$skill")"

        # Copy to .claude/skills/<name>/  (for Claude Code)
        _sync_skill_dir "$sdir/$name" "$root/.claude/skills/$name" && refreshed=$((refreshed + 1))

        # Copy to .agents/skills/<name>/  (for Codex)
        _sync_skill_dir "$sdir/$name" "$root/.agents/skills/$name" && refreshed=$((refreshed + 1))
    done

    _remove_stale_skills "$sdir" "$root/.claude/skills"
    _remove_stale_skills "$sdir" "$root/.agents/skills"

    if [ "$refreshed" -gt 0 ]; then
        green "Refreshed skills in .claude/skills/ and .agents/skills/"
    else
        green "Skills in .claude/skills/ and .agents/skills/ are up-to-date"
    fi
}

cmd_status() {
    local root
    root="$(find_project_root)"

    bold "Skills Status"
    echo ""

    # Submodule info
    if ! submodule_exists "$root"; then
        red "Skills submodule: NOT INSTALLED"
        echo "  Run: $(basename "$0") install"
        exit 0
    fi

    if ! submodule_initialized "$root"; then
        yellow "Skills submodule: REGISTERED but NOT INITIALIZED"
        echo "  Run: git submodule update --init --recursive"
        exit 0
    fi

    local skills_path="$root/$SUBMODULE_PATH"
    green "Skills submodule: INSTALLED"

    # Current commit
    local sha date
    sha="$(git -C "$skills_path" rev-parse HEAD 2>/dev/null)"
    date="$(git -C "$skills_path" log -1 --format='%ci' 2>/dev/null)"
    echo "  Commit:  ${sha:0:8}"
    echo "  Date:    $date"

    # Branch tracking
    local branch
    branch="$(git -C "$root" config -f .gitmodules "submodule.$SUBMODULE_PATH.branch" 2>/dev/null || echo "<not set>")"
    echo "  Tracks:  $branch"

    # Remote
    local remote_url
    remote_url="$(git -C "$root" config -f .gitmodules "submodule.$SUBMODULE_PATH.url" 2>/dev/null || echo "<unknown>")"
    echo "  Remote:  $remote_url"

    # Local modifications?
    if ! git -C "$skills_path" diff --quiet 2>/dev/null; then
        yellow "  Modified: YES (local changes detected)"
    fi

    # Available skills
    local sdir
    sdir="$(skills_dir "$root")"
    echo ""
    bold "Available Skills:"
    if [ -d "$sdir" ]; then
        for skill in "$sdir"/*/; do
            [ -d "$skill" ] || continue
            local name desc skill_md
            name="$(basename "$skill")"
            skill_md="$skill/SKILL.md"

            # Skip internal skills — they are only for the skills repo itself
            if _is_internal_skill "$skill"; then
                continue
            fi

            if [ -f "$skill_md" ]; then
                # Extract description from frontmatter
                desc="$(sed -n '/^---$/,/^---$/{ /^description:/,/^[a-z]/{ s/^description: *//p; s/^ *//p; } }' "$skill_md" | sed '/^[>|]-\{0,1\}$/d' | head -2 | tr '\n' ' ' | sed 's/ *$//')"
                # Truncate long descriptions
                if [ ${#desc} -gt 80 ]; then
                    desc="${desc:0:77}..."
                fi
                echo "  - $name"
                [ -n "$desc" ] && echo "    $desc"
            else
                yellow "  - $name (missing SKILL.md)"
            fi
        done
    else
        yellow "  No skills directory found at $sdir"
    fi
}

cmd_help() {
    cat <<'HELP'
Skills Management CLI

Usage: manage.sh <command> [options]

Commands:
  install [dir]     Add the skills submodule to a target repo (defaults to cwd)
  uninstall [dir]   Completely remove the skills submodule and all artifacts
  reinstall [dir]   Wipe existing integration and rebuild from scratch
  check             Verify skills are initialized, unmodified, and up-to-date
                    Auto-fixes missing skill files and stale hooks in place
  sync              Pull latest skills from upstream main and stage the update
  link              Recreate .claude/skills/ skill files (no network, no staging)
  status            Show current skills state, commit info, and available skills
  help              Show this help message

Examples:
  # Install into current project
  ./skills/bin/manage.sh install

  # Install into a specific project
  /path/to/skills/bin/manage.sh install /path/to/my-project

  # Check if skills are healthy
  ./skills/bin/manage.sh check

  # Update to latest
  ./skills/bin/manage.sh sync

  # Wipe and rebuild a broken integration
  ./skills/bin/manage.sh reinstall

  # Completely remove skills from a project
  ./skills/bin/manage.sh uninstall

  # See what you have
  ./skills/bin/manage.sh status
HELP
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
    local cmd="${1:-help}"
    shift || true

    case "$cmd" in
        install)   cmd_install "$@" ;;
        uninstall) cmd_uninstall "$@" ;;
        reinstall) cmd_reinstall "$@" ;;
        check)     cmd_check "$@" ;;
        sync)      cmd_sync "$@" ;;
        link)      cmd_link "$@" ;;
        status)    cmd_status "$@" ;;
        help|-h|--help) cmd_help ;;
        *)
            red "Unknown command: $cmd"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
