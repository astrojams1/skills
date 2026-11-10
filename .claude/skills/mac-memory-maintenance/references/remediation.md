# Evidence-based remedies

## RAM

Identify pressure episodes and application families that grew. Compare process count, per-process growth, compression and same-boot swap rates. A larger workload, many chats/tabs, GPU/model allocations and a leak have different remedies.

Inspect exact executables, parents, service ownership, open files/sockets and related active jobs. Read app/chat status when available. Avoid capturing full arguments or environment variables. An idle helper may be waiting for legitimate requests.

A demonstrably abandoned user-owned tool helper may receive SIGTERM after rechecking UID, PID, start time and executable immediately before signalling. Wait up to 20 seconds; check exit and pressure. Never force-kill; allow at most three terminations per run, one at a time. Ambiguous candidates stay running.

Trace a repeatedly respawning/leaking helper to its launcher. Fix established duplicate launchers, missing shutdown hooks, runaway concurrency or documented cache bounds. Back up the exact configuration, make one narrow change and verify validity/functionality. Revert failures and stop after one failed attempt. Preserve CI runners, photo exports, sync tasks, login items and app services unless their faulty configuration is established.

Prefer a lasting cleanup/concurrency/cache fix over nightly restarts. Check official docs before version-dependent changes. Prepare disruptive updates or app restarts for the owner. Never quit the app hosting Codex automatically.

## Storage

Start with the scan and its deltas, then drill down into large/growing directories using bounded allocated-size measurements. Inspect metadata first. Look for repeated downloads/build outputs, package caches, unbounded logs, snapshots/backups and orphaned artifacts.

`python3 scripts/resources.py clean-caches` previews files unused/unmodified for 30 days in fixed regenerable-cache roots: Homebrew downloads, pip caches and npm debug logs. Inspect the preview; check no affected package manager is working; then use `--apply`. The helper rejects symlink roots, never follows symlinks, caps deletion at 2 GiB per run and rechecks identity before unlinking. A zero-byte result is valid. Never point it at personal folders or databases.

Use documented package-manager maintenance for larger caches when appropriate, such as npm cache verification/garbage collection or uv cache pruning. Read installed help/official docs first. Avoid uninstalling versions/dependencies or removing offline assets without evaluating impact. Live tool servers may use npm `_npx` installations; age alone never justifies deleting these.

Before npm cache maintenance, check cache ownership. An initial verification failed because 12 entries (six directories and six files) in `/Users/astro/.npm/_cacache` were root-owned. Noninteractive sudo was unavailable. Do not repeat a known failing verification every night; check whether the ownership defect persists, record/defer the exact administrative ownership repair, and continue other work. Never use sudo npm. Re-run npm verification only after ownership is corrected. The defect is confirmed; its contribution to recurring disk growth is still a hypothesis.

October 21 evidence identified hundreds of abandoned `swsim-*` profiles produced by Space Worms scratch browser benchmarks, plus inactive Chrome code-sign application clones. The scripts created profiles in `os.tmpdir()` and force-killed Chrome without removing profiles. Moving repositories to SSD did not relocate these temporary outputs. For recurrence, resolve the current user temp directory, measure selected test-profile prefixes, and inspect sibling `X/com.google.Chrome.code_sign_clone`. APFS clones share data: apparent `du` allocation must never be presented as reclaimable physical space. Check live executable paths, process references, open files and profile lock PIDs before any action; preserve active clones and all personal browser state. Archive uncertain profile state to SSD with verified content before internal removal. Chromium’s own clone cleanup helper targets only a validated six-character clone suffix; inspect the current source before using it. Browser tests should use SSD profiles, own their launched browser, call CDP `Browser.close`, wait for exit, and then remove only their own disposable profile. On the installed Chrome 155 build, both SIGTERM and a CDP-close trial left an application clone; a trial using `--disable-features=MacAppCodeSignClone` for the disposable headless test process exited with code zero, removed its SSD profile, and left no new clone. Keep that override scoped to short-lived benchmark processes; it controls update-related application cloning, not code-signature verification. Verify with a launch/close cycle and subsequent clone-count check instead of assuming graceful exit suffices. Do not change global browser behavior or `TMPDIR` for all apps. Source: https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/mac/code_sign_clone_manager.mm .

Protected macOS cache directories can yield incomplete `du` results. The helper surfaces this as a coverage warning with the target and keeps `complete: false`. Do not retry privileged scans or seek Full Disk Access merely to make a run look clean; keep the lower-bound measurement and disclose the coverage gap.

Browser HTTP cache can be reclaimed through supported maintenance when the browser is closed and the cache identity is verified. Preserve cookies, sessions, passwords, history and profiles. Large app support folders and VM images are not automatically disposable.

Inspect Codex worktrees through app artifacts and chat status. Archive only eligible inactive worktrees with the supported tool; do not delete them on disk. Histories, generated images and plugins are user data or installed capabilities, not generic caches.

Container volumes/images, backups, snapshots, Trash and Downloads may hold valuable state. Inventory specific candidates and prepare removal for the owner where data loss or restore capability is involved. Never blanket-prune Docker, empty Trash or delete Time Machine/APFS snapshots unattended.

Lasting fixes include bounded logs, cache/artifact retention, repairing failed cleanup, removing confirmed duplicate jobs and preventing repeated full downloads. Tie every change to an observed producer. Preserve current outputs and recovery paths. Bound this skill's own state so it cannot become a storage problem.

## Verify and record

Record actual filesystem available bytes before/after, selected files' allocated bytes and deletion errors separately. Concurrent writers, APFS sharing and delayed reclamation make these differ. For RAM, record pressure/compression/swap and target RSS; swap usage may not fall immediately. Check affected functionality. Later samples substantiate lasting fixes.

Keep compact `actions.jsonl` entries with timestamp, evidence/confidence, exact target/action, backup/rollback, measurements, outcome and follow-up. Distinguish confirmed causes, plausible candidates and unknowns. Escalate a specific unresolved issue instead of declaring the computer fixed after one healthy snapshot.

## References

- [Apple: Activity Monitor memory usage](https://support.apple.com/en-au/guide/activity-monitor/actmntr1004/mac)
- [Apple XNU: memory pressure notifications](https://github.com/apple-oss-distributions/xnu/blob/main/doc/vm/memorystatus_notify.md) describes internal levels; exported sysctl values are converted to dispatch masks.
- [OpenAI: local scheduled tasks](https://learn.chatgpt.com/docs/automations?surface=app)

## Simulator storage

Follow the simulator-storage and shared-pool policy in `/Users/astro/AGENTS.md`. Device sets and test-clone stores must resolve to SSD; audit default `~/Library/Developer/CoreSimulator/Devices`, `XCTestDevices`, and `XCPGDevices` as well as custom sets. Keep simulator logs/caches and exported runtime downloads on SSD where supported. A custom `simctl --set` does not move the default set or route Xcode automatically; use the app-release native QA helper for per-process routing.

For an authorized device-state relocation, avoid active jobs, preserve UUIDs/app data and stable paths, verify content and original metadata, keep a verified SSD rollback copy, and prove live boot/app access before removing the internal duplicate. Boot-status completion, a launch PID and a nonempty screenshot do not prove usable UI: open the captured image, verify the expected app content rather than a boot logo/blank display, and bind that review to the screenshot hash before cleanup. Check open files by original, resolved SSD and retained-original paths. macOS copying can add or reassign `com.apple.provenance`; retain the OS-managed value rather than stripping or rewriting it to force equality. Compare all other original attributes exactly and keep raw before/after manifests. Verify copied BSD flags (including document-tracked files), directory sticky bits and symlink modification times too; copy tools can omit/recreate them even when file data matches. Restore copied metadata from the inactive source, then rerun the comparison. `ditto` may interpret AppleDouble sidecars: retain the originals as files when exact tree preservation is required. A copy/hash mismatch stops the path switch until explained and verified.

Distinguish device data from installed runtime backing. Modern Xcode runtime images may live in the SIP-protected MobileAsset store; mounted `/Library/Developer/CoreSimulator/Volumes` paths do not establish physical placement. Do not move protected assets or weaken SIP. Verify the actual backing filesystem and report any residual internal storage explicitly; putting runtime export archives on SSD does not relocate their installed payloads.

Before any bulk simulator migration, prove native CoreSimulator service read/write access at the destination with an owned disposable probe, then remove that probe. Shell read/write access does not prove service access. On this Mac, direct physical SSD device sets returned EPERM and appeared empty despite valid data; the existing SSD-backed APFS image worked, and a new image-backed volume passed the same native probe. Preserve existing permissions/security settings, roll back any failed live migration before continuing, and prefer the verified image-backed storage path. Keep the image file on SSD and verify its actual mount/backing identity; keep separate writable device-set/test-clone directories inside it. Do not create replacement internal data when an image is absent.

A mount helper must be tested by an actual inactive detach/reattach roundtrip; an already-mounted no-op is insufficient. On this Mac, launchd could query an existing simulator image but could not attach it, including through the normal image opener. The failed background job was removed. Simulator tasks use the verified interactive-session storage preflight at `~/Library/Application Support/SimulatorStorage/mount.py` to mount both known SSD images before native commands, and fail closed when SSD storage is unavailable. Do not claim login-time mounting works from a successful no-op. After rolling back a device set, reverify its backup against current source state: native rediscovery may change temporary-directory timestamps even when all file content remains identical.
