# app-release SSD XCTest routing maintenance release ledger

Updated: 2026-10-26T15:54:32+00:00

Repository: https://github.com/astrojams1/skills

Objective: Route the original XCTest runner to existing SSD QA devices and reuse shared coverage

Generated from `2026-10-26-ssd-xctest-routing.json` by the app-release skill's `ledger.mjs`; never edit this view. Its event history is append-only.

## Run issues

| Gate | State | Owner | Evidence basis | Updated | Result | Next action |
|---|---|---|---|---|---|---|
| issue.ssd-runner-routing | done | agent | observed | 2026-10-26 | Root cause was mismatched device-set selection: simctl --set did not route Xcode discovery/UI runner. The original Apple launcher with one equals-form process-local preference discovers both SSD devices and passes the real compatibility UI smoke; the new helper itself passes latest iOS 27.1 UI smoke and restores prior boot state. All 18 launcher/routing tests and 25 independent CLI subprocess cases pass. Parent code review is clean. No device creation, data deletion, persistent preference or binary modification was needed for this fix. | — |
| issue.diagnostic-file-inventory | done | agent | observed | 2026-10-26 | Read current rg/ls inventory, actual existing session-continuity run format, current references and verified live native logs. The absent optional files were not required; subsequent reads use present source files. No missing file is treated as a product blocker. | — |
| issue.validation-python | done | agent | observed | 2026-10-26 | The same screenshot-fit suite passes all8 checks using the existing bundled Python containing numpy/Pillow. The system-Python skip is retained as historical evidence; no global package or runtime was changed. | — |
| issue.management-command-scope | done | agent | observed | 2026-10-26 | The supported standalone source operation bin/manage.sh link succeeds; all 65 management regressions pass, including consumer check behavior. Source diff whitespace check passes. No management code change was needed; check remains a consumer-only command. | — |

## Product verification gates

| Gate | State | Owner | Evidence basis | Updated | Result | Next action |
|---|---|---|---|---|---|---|
| verification.local-checks | done | agent | observed | 2026-10-26 | 172 app-release tests including18 launcher/routing tests,65 management checks,142 specification checks, identity,8 bundled-Python image-fit checks and skill validator pass. YouTube5 pass with1 existing unavailable-ffmpeg skip. Seven checkout configs across5apps normalize; preflight compatibility and config fields unchanged. | — |
| verification.live-ui-smoke | done | agent | observed | 2026-10-26 | The original Apple launcher passed the real UI smoke on existing SSD iOS 18.4 compatibility device (1 test, 0 failures). The new shared helper itself then passed the same smoke on latest installed iOS 27.1 SSD device (1 test, 0 failures, exit 0); the device was restored from Shutdown to Shutdown. Checks cover launch, open editor, name-field existence, Cancel and home verification. These are runtime-specific reachability/interaction proofs, not the full application QA matrix. | — |
| verification.independent-cli | done | agent | observed | 2026-10-26 | Independent review found no defects in the exact current source hashes. All 25 real CLI subprocess fixtures passed with system-tool calls mocked and an actual fixture child executable: literal argv, stdout/stderr, exit status, denied launcher gates, duplicate routing and path validation. The independent full Node 22 regression suite also passed all 172 tests. This verifies command orchestration; supplied real UI smoke remains one compatibility-runtime test. | — |

## Evidence and history

### 1. issue.ssd-runner-routing — in_progress

2026-10-26T15:45:41+00:00 · observed · agent

Default Xcode discovery omitted SSD devices although simctl selected the designated set. The earlier copied/ad-hoc-signed launcher was a separate identity denial. Controlled queries now show the original launcher reaches both SSD devices using exactly one equals-form process-local preference; root live UI smoke passes. Shared helper and regression verification are in progress.

- /Volumes/ssd/builds/nametag/evidence/native-followup/routing-confirmation.json
- /Volumes/ssd/builds/nametag/evidence/native-followup/ui-test.log

Next: Verify narrow command transport and fail-closed preflight, then review live evidence and source changes before publication

### 2. issue.diagnostic-file-inventory — failed

2026-10-26T15:45:41+00:00 · observed · agent

Initial optional reads guessed a workflow directory, historical run filename and gitignore that are absent in this source checkout. No product or external state changed. Actual paths must come from current file inventory.

- AGENTS.md
- skills/app-release/ledger/runs/2026-10-26-session-continuity.json

Next: Read authoritative existing file inventory and actual native evidence, then continue source implementation

### 3. issue.diagnostic-file-inventory — done

2026-10-26T15:45:41+00:00 · observed · agent

Read current rg/ls inventory, actual existing session-continuity run format, current references and verified live native logs. The absent optional files were not required; subsequent reads use present source files. No missing file is treated as a product blocker.

- skills/app-release/ledger/runs/2026-10-26-session-continuity.json
- skills/app-release/references/verification.md
- /Volumes/ssd/builds/nametag/evidence/native-followup/ui-test.log

### 4. issue.validation-python — in_progress

2026-10-26T15:47:07+00:00 · observed · agent

The system Python lacks numpy/Pillow, so the required screenshot-fit suite reported a dependency skip rather than running. Source tests otherwise passed.

- /Volumes/ssd/builds/app-release-ssd-routing/fit.log

Next: Run the same fit suite with the existing bundled Python that includes image dependencies, without global installation

### 5. issue.validation-python — done

2026-10-26T15:48:05+00:00 · observed · agent

The same screenshot-fit suite passes all8 checks using the existing bundled Python containing numpy/Pillow. The system-Python skip is retained as historical evidence; no global package or runtime was changed.

- /Volumes/ssd/builds/app-release-ssd-routing/fit.log
- /Volumes/ssd/builds/app-release-ssd-routing/fit-bundled.log

### 6. verification.local-checks — done

2026-10-26T15:48:06+00:00 · observed · agent

172 app-release tests including18 launcher/routing tests,65 management checks,142 specification checks, identity,8 bundled-Python image-fit checks and skill validator pass. YouTube5 pass with1 existing unavailable-ffmpeg skip. Seven checkout configs across5apps normalize; preflight compatibility and config fields unchanged.

- /Volumes/ssd/builds/app-release-ssd-routing/release.log
- /Volumes/ssd/builds/app-release-ssd-routing/manage.log
- /Volumes/ssd/builds/app-release-ssd-routing/spec.log
- /Volumes/ssd/builds/app-release-ssd-routing/identity.log
- /Volumes/ssd/builds/app-release-ssd-routing/fit-bundled.log
- /Volumes/ssd/builds/app-release-ssd-routing/youtube.log
- /Volumes/ssd/builds/app-release-ssd-routing/skill.log
- /Volumes/ssd/builds/app-release-ssd-routing/consumer-compatibility.json

### 7. verification.live-ui-smoke — done

2026-10-26T15:49:12+00:00 · observed · agent

The original Apple xcodebuild with one equals-form process-local SSD-set preference executed a real UI smoke on the existing reserved compatibility device: launch, Customize tap, name-field existence, Cancel tap and home verification. One test passed with0failures in8.498seconds. This proves runner reachability and those interactions on that runtime; it does not establish the full app QA matrix or newest-OS coverage.

- /Volumes/ssd/builds/nametag/evidence/native-followup/ui-test.log
- /Volumes/ssd/builds/nametag/evidence/native-followup/ssd-runner-smoke.xcresult

### 8. issue.ssd-runner-routing — done

2026-10-26T15:49:12+00:00 · observed · agent

Root cause was mismatched device-set selection: simctl --set did not route Xcode discovery/UI runner. The original Apple launcher with exactly one -DVTSimulatorSetLocation=<path> argument discovers bothSSD devices and passes the real UI smoke. New helper validates the existing absolute set, preflights the original launcher, rejects duplicate routing and forwards argv without a shell or persistent changes. All18launcher/routing tests pass, including zero execution for denied identity. No device creation, data deletion, shared-service reset or binary modification was used.

- /Volumes/ssd/builds/nametag/evidence/native-followup/routing-confirmation.json
- /Volumes/ssd/builds/nametag/evidence/native-followup/ui-test.log
- /Volumes/ssd/builds/app-release-ssd-routing/release.log
- /Volumes/ssd/builds/app-release-ssd-routing/launcher-preflight.json

### 9. issue.management-command-scope — failed

2026-10-26T15:50:03+00:00 · observed · agent

After successful source discovery refresh, bin/manage.sh check rejected this standalone source repository because that command is consumer-only. The chained diff check therefore did not run. This was a command-scope mistake; source management tests had already passed.

- bin/manage.sh
- /Volumes/ssd/builds/app-release-ssd-routing/manage.log

Next: Use source link plus management regression tests, rerun diff check and preserve the failed command as issue history

### 10. issue.management-command-scope — done

2026-10-26T15:50:03+00:00 · observed · agent

The supported standalone source operation bin/manage.sh link succeeds; all 65 management regressions pass, including consumer check behavior. Source diff whitespace check passes. No management code change was needed; check remains a consumer-only command.

- bin/manage.sh
- /Volumes/ssd/builds/app-release-ssd-routing/manage.log

### 11. verification.independent-cli — done

2026-10-26T15:53:32+00:00 · observed · agent

Independent review found no defects in the exact current source hashes. All 25 real CLI subprocess fixtures passed with system-tool calls mocked and an actual fixture child executable: literal argv, stdout/stderr, exit status, denied launcher gates, duplicate routing and path validation. The independent full Node 22 regression suite also passed all 172 tests. This verifies command orchestration; supplied real UI smoke remains one compatibility-runtime test.

- /Volumes/ssd/builds/nametag/evidence/native-followup/shared-runner-review.json
- /Volumes/ssd/builds/nametag/evidence/native-followup/shared-runner-fixtures/results.json
- /Volumes/ssd/builds/nametag/evidence/native-followup/shared-runner-fixtures/app-release-tests-ssd-tmp.log

### 12. verification.live-ui-smoke — done

2026-10-26T15:54:32+00:00 · observed · agent

The original Apple launcher passed the real UI smoke on existing SSD iOS 18.4 compatibility device (1 test, 0 failures). The new shared helper itself then passed the same smoke on latest installed iOS 27.1 SSD device (1 test, 0 failures, exit 0); the device was restored from Shutdown to Shutdown. Checks cover launch, open editor, name-field existence, Cancel and home verification. These are runtime-specific reachability/interaction proofs, not the full application QA matrix.

- /Volumes/ssd/builds/nametag/evidence/native-followup/ui-test.log
- /Volumes/ssd/builds/nametag/evidence/native-followup/latest-ui-run.json
- /Volumes/ssd/builds/nametag/evidence/native-followup/ui-test-latest.log
- /Volumes/ssd/builds/nametag/evidence/native-followup/ssd-runner-latest.xcresult

### 13. issue.ssd-runner-routing — done

2026-10-26T15:54:32+00:00 · observed · agent

Root cause was mismatched device-set selection: simctl --set did not route Xcode discovery/UI runner. The original Apple launcher with one equals-form process-local preference discovers both SSD devices and passes the real compatibility UI smoke; the new helper itself passes latest iOS 27.1 UI smoke and restores prior boot state. All 18 launcher/routing tests and 25 independent CLI subprocess cases pass. Parent code review is clean. No device creation, data deletion, persistent preference or binary modification was needed for this fix.

- /Volumes/ssd/builds/nametag/evidence/native-followup/routing-confirmation.json
- /Volumes/ssd/builds/nametag/evidence/native-followup/ui-test.log
- /Volumes/ssd/builds/nametag/evidence/native-followup/latest-ui-run.json
- /Volumes/ssd/builds/nametag/evidence/native-followup/shared-runner-review.json
