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
#                  and create .claude/skills/ symlinks for Claude Code discovery
#   check          Verify skills are initialized, unmodified, up-to-date, and linked
#   sync           Pull latest skills from upstream main and refresh symlinks
#   status         Show current skills state (commit, branch, available skills)

set -euo pipefail

SKILLS_REMOTE="https://github.com/astrojams1/skills.git"
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

submodule_initialized() {
    local root="$1"
    [ -d "$root/$SUBMODULE_PATH/.git" ] || [ -f "$root/$SUBMODULE_PATH/.git" ]
}

skills_dir() {
    local root="$1"
    echo "$root/$SUBMODULE_PATH/skills"
}

# Create/update .claude/skills/ symlinks so Claude Code discovers skills natively.
# Each skill gets a file symlink: .claude/skills/<name>.md → ../../skills/skills/<name>/SKILL.md
# Claude Code discovers skills by scanning for .md files in .claude/skills/.
link_skills() {
    local root="$1"
    local sdir
    sdir="$(skills_dir "$root")"

    if [ ! -d "$sdir" ]; then
        yellow "No skills directory found at $sdir — skipping symlink creation"
        return
    fi

    mkdir -p "$root/.claude/skills"

    local linked=0
    for skill in "$sdir"/*/; do
        [ -d "$skill" ] || continue
        [ -f "$skill/SKILL.md" ] || continue

        local name
        name="$(basename "$skill")"
        local link_path="$root/.claude/skills/$name.md"
        local target="../../$SUBMODULE_PATH/skills/$name/SKILL.md"

        # Migrate old directory symlinks to new file symlinks
        local old_link="$root/.claude/skills/$name"
        if [ -L "$old_link" ]; then
            rm "$old_link"
        fi

        if [ -L "$link_path" ]; then
            # Symlink exists — verify it points to the right place
            local current_target
            current_target="$(readlink "$link_path")"
            if [ "$current_target" = "$target" ]; then
                continue
            fi
            # Wrong target — remove and re-create
            rm "$link_path"
        elif [ -e "$link_path" ]; then
            # Non-symlink file/dir exists — skip to avoid overwriting user content
            yellow "SKIP: $link_path exists and is not a symlink (won't overwrite)"
            continue
        fi

        ln -s "$target" "$link_path"
        linked=$((linked + 1))
    done

    # Remove stale symlinks (skills that were removed upstream)
    for link in "$root/.claude/skills"/*.md; do
        [ -L "$link" ] || continue
        local name
        name="$(basename "$link" .md)"
        if [ ! -d "$sdir/$name" ]; then
            rm "$link"
            yellow "Removed stale symlink: .claude/skills/$name.md"
        fi
    done

    if [ "$linked" -gt 0 ]; then
        green "Linked $linked skill(s) into .claude/skills/"
    fi
}

# Check that .claude/skills/ symlinks are correct
check_skill_links() {
    local root="$1"
    local sdir
    sdir="$(skills_dir "$root")"
    local issues=0

    if [ ! -d "$root/.claude/skills" ]; then
        red "FAIL: .claude/skills/ directory missing — Claude Code cannot discover skills"
        echo "  Run: $(basename "$0") install  (or sync to recreate links)"
        return 1
    fi

    for skill in "$sdir"/*/; do
        [ -d "$skill" ] || continue
        [ -f "$skill/SKILL.md" ] || continue

        local name
        name="$(basename "$skill")"
        local link_path="$root/.claude/skills/$name.md"
        local expected_target="../../$SUBMODULE_PATH/skills/$name/SKILL.md"

        if [ ! -e "$link_path" ]; then
            red "FAIL: Missing symlink .claude/skills/$name.md"
            issues=$((issues + 1))
        elif [ ! -L "$link_path" ]; then
            yellow "WARN: .claude/skills/$name.md exists but is not a symlink"
            issues=$((issues + 1))
        else
            local actual_target
            actual_target="$(readlink "$link_path")"
            if [ "$actual_target" != "$expected_target" ]; then
                red "FAIL: .claude/skills/$name.md points to wrong target"
                echo "  Expected: $expected_target"
                echo "  Actual:   $actual_target"
                issues=$((issues + 1))
            fi
        fi
    done

    return "$issues"
}

# Ensure .claude/settings.json has a SessionStart hook that initializes
# the skills submodule. Without this, symlinks are broken on fresh clones
# until the submodule is manually initialized.
ensure_session_hook() {
    local root="$1"
    local settings="$root/.claude/settings.json"
    local hook_cmd="git submodule update --init --recursive"

    mkdir -p "$root/.claude"

    python3 -c "
import json, sys, os
settings_path, hook_cmd = sys.argv[1], sys.argv[2]
data = {}
if os.path.isfile(settings_path):
    with open(settings_path) as f:
        data = json.load(f)
hooks = data.setdefault('hooks', {})
session_hooks = hooks.setdefault('SessionStart', [])
if any(h.get('type') == 'command' and h.get('command') == hook_cmd for h in session_hooks):
    sys.exit(0)
session_hooks.insert(0, {'type': 'command', 'command': hook_cmd})
with open(settings_path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
print('added')
" "$settings" "$hook_cmd"
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
            # Ensure hook and symlinks are current (idempotent)
            link_skills "$target"
            ensure_session_hook "$target"
            if [ -d "$target/.claude" ]; then
                git -C "$target" add .claude/skills .claude/settings.json 2>/dev/null || true
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

    # Create .claude/skills/ symlinks so Claude Code discovers skills natively
    bold "Linking skills into .claude/skills/ for Claude Code discovery..."
    link_skills "$target"

    # Add SessionStart hook to auto-initialize submodule in new sessions
    bold "Adding SessionStart hook for automatic submodule initialization..."
    ensure_session_hook "$target"

    # Stage changes
    git -C "$target" add .gitmodules "$SUBMODULE_PATH"
    # Stage .claude/ config (symlinks + settings.json)
    if [ -d "$target/.claude" ]; then
        git -C "$target" add .claude/skills .claude/settings.json 2>/dev/null || true
    fi

    green "Skills submodule installed successfully."
    echo ""
    bold "Next steps:"
    echo "  1. Commit:  git commit -m \"chore: add astrojams1/skills submodule\""
    echo "  2. Update your claude.md and agents.md (see skill-orchestrator SKILL.md Step 5)"
    echo "  3. Run:     ./skills/bin/manage.sh status"
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
            echo "  Run: $(basename "$0") sync"
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

    # 8. SessionStart hook
    local settings_file="$root/.claude/settings.json"
    if [ -f "$settings_file" ] && python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
hooks = data.get('hooks', {}).get('SessionStart', [])
sys.exit(0 if any(h.get('command') == 'git submodule update --init --recursive' for h in hooks) else 1)
" "$settings_file" 2>/dev/null; then
        green "PASS: SessionStart hook initializes submodule"
    else
        yellow "WARN: No SessionStart hook found — skills may not load on fresh clones"
        echo "  Run: $(basename "$0") sync  (adds the hook automatically)"
        warnings=$((warnings + 1))
    fi

    # 9. Claude Code skill symlinks
    if check_skill_links "$root"; then
        green "PASS: .claude/skills/ symlinks are correct"
    else
        red "FAIL: .claude/skills/ symlinks are missing or broken"
        echo "  Run: $(basename "$0") sync  (recreates symlinks)"
        failures=$((failures + 1))
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

    # Refresh .claude/skills/ symlinks (picks up new/removed skills)
    bold "Refreshing .claude/skills/ symlinks..."
    link_skills "$root"

    # Ensure SessionStart hook exists (migrates older installs)
    ensure_session_hook "$root"

    if [ -d "$root/.claude" ]; then
        git -C "$root" add .claude/skills .claude/settings.json 2>/dev/null || true
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
            if [ -f "$skill_md" ]; then
                # Extract description from frontmatter
                desc="$(sed -n '/^---$/,/^---$/{ /^description:/,/^[a-z]/{ s/^description: *//p; s/^ *//p; } }' "$skill_md" | head -2 | tr '\n' ' ' | sed 's/ *$//')"
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
  install [dir]   Add the skills submodule to a target repo (defaults to cwd)
  check           Verify skills are initialized, unmodified, and up-to-date
  sync            Pull latest skills from upstream main and stage the update
  status          Show current skills state, commit info, and available skills
  help            Show this help message

Examples:
  # Install into current project
  ./skills/bin/manage.sh install

  # Install into a specific project
  /path/to/skills/bin/manage.sh install /path/to/my-project

  # Check if skills are healthy
  ./skills/bin/manage.sh check

  # Update to latest
  ./skills/bin/manage.sh sync

  # See what you have
  ./skills/bin/manage.sh status
HELP
}

# ── Main ─────────────────────────────────────────────────────────────

main() {
    local cmd="${1:-help}"
    shift || true

    case "$cmd" in
        install) cmd_install "$@" ;;
        check)   cmd_check "$@" ;;
        sync)    cmd_sync "$@" ;;
        status)  cmd_status "$@" ;;
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
