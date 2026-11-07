# app-release Asset Library maintenance release ledger

Updated: 2026-11-02T18:27:32+00:00

Repository: https://github.com/astrojams1/skills

Objective: Fix Asset Library image linkage, first-approved-version and complete-image-set preflights; clarify creative artwork scope

Generated from `2026-11-02-asset-review.json` by the app-release skill's `ledger.mjs`; never edit this view. Its event history is append-only.

## Run issues

| Gate | State | Owner | Evidence basis | Updated | Result | Next action |
|---|---|---|---|---|---|---|
| issue.image-linkage | done | agent | observed | 2026-11-02 | Added explicit image include; full CLI synthetic transport now attaches both intended images, independently reads each/final exact set and verifies WAITING_FOR_REVIEW. Existing conflict and uncertain-write guards pass. | — |
| issue.first-version | done | agent | observed | 2026-11-02 | Reads all iOS version pages before opening a draft; no-approved, waiting, in-review, unknown and partially ACCEPTED states stop with zero draft/item writes. Approved pending-release and legacy live states pass. | — |
| issue.partial-images | done | agent | observed | 2026-11-02 | Missing, processing, failed, rejected and unknown selected images stop the batch before draft creation; already reviewed/in-review images remain retained. | — |
| issue.creative-scope | done | agent | observed | 2026-11-02 | Scoped native capture requirements to screenshots/previews; creative photography/illustration and optional authorized generated model artwork preserve factual UI and Apple device/branding limits. Ouro docs separate lifestyle field with visible disclosure/provenance. | — |
| issue.fixture-setup | done | agent | observed | 2026-11-02 | Corrected real placement enums and initialized CLI receipt; main now fails for the demonstrated image projection and missing preflights, then all200 release tests pass. | — |
| issue.validation-environment | done | agent | observed | 2026-11-02 | System and bundled Python lack PyYAML; reused existing project validator venv and validated both skills successfully without installing packages. | — |

## Evidence and history

### 1. issue.image-linkage — in_progress

2026-11-02T18:23:55+00:00 · observed · agent

Live image readback omitted appAssetLibraryImage because include omitted it despite sparse fields requesting it; explicit-include probe recovered the owned linkage.

- Saved live apple-asset-review.json and image-link-probe.json; CLI query/projection regression reproduces conflict on main

Next: Verify scoped correction and required repository suites

### 2. issue.first-version — in_progress

2026-11-02T18:23:55+00:00 · observed · agent

Image-only helper opened a draft although the first app version was still awaiting review; Apple requires assets with the first version until it is approved.

- Apple submit-assets-from-asset-library, checked 2026-11-02; no-approved-version regression fails on main

Next: Verify scoped correction and required repository suites

### 3. issue.partial-images — in_progress

2026-11-02T18:23:55+00:00 · observed · agent

The command skipped a processing selected image and attached only the ready subset.

- CLI UPLOAD_COMPLETE regression fails on main; selected image readiness must be checked before draft creation

Next: Verify scoped correction and required repository suites

### 4. issue.creative-scope — in_progress

2026-11-02T18:23:55+00:00 · observed · agent

Media guidance applied screenshot-only constraints to all creative assets, excluding supporting photography and illustration.

- Apple asset-best-practices and marketing/guidelines, checked 2026-11-02

Next: Verify scoped correction and required repository suites

### 5. issue.fixture-setup — in_progress

2026-11-02T18:23:55+00:00 · observed · agent

Initial CLI regression used invalid placement enums and obscured stderr with missing receipt; corrected to real supported enums and initialized receipt.

- Corrected regressions-before.log now reproduces actual query conflict and missing preflight, not fixture setup

Next: Verify scoped correction and required repository suites

### 6. issue.fixture-setup — done

2026-11-02T18:27:32+00:00 · observed · agent

Corrected real placement enums and initialized CLI receipt; main now fails for the demonstrated image projection and missing preflights, then all200 release tests pass.

- regressions-before.log, regressions-after.log, release.log under /Volumes/ssd/projects/skills/artifacts/asset-review-readback

### 7. issue.validation-environment — done

2026-11-02T18:27:32+00:00 · observed · agent

System and bundled Python lack PyYAML; reused existing project validator venv and validated both skills successfully without installing packages.

- /Volumes/ssd/projects/skills/rejection-prevention/validator-venv; quick_validate.py reports Skill is valid for app-release and ouro-website

### 8. issue.image-linkage — done

2026-11-02T18:27:32+00:00 · observed · agent

Added explicit image include; full CLI synthetic transport now attaches both intended images, independently reads each/final exact set and verifies WAITING_FOR_REVIEW. Existing conflict and uncertain-write guards pass.

- tests/app-release/asset-submit-cli.test.mjs; tests/app-release/asset-submit.test.mjs;200 release tests pass

### 9. issue.first-version — done

2026-11-02T18:27:32+00:00 · observed · agent

Reads all iOS version pages before opening a draft; no-approved, waiting, in-review, unknown and partially ACCEPTED states stop with zero draft/item writes. Approved pending-release and legacy live states pass.

- tests/app-release/asset-submit.test.mjs; tests/app-release/asset-submit-cli.test.mjs; Apple status and asset-review help checked2026-11-02

### 10. issue.partial-images — done

2026-11-02T18:27:32+00:00 · observed · agent

Missing, processing, failed, rejected and unknown selected images stop the batch before draft creation; already reviewed/in-review images remain retained.

- tests/app-release/asc.test.mjs; CLI readiness regressions perform GET requests only

### 11. issue.creative-scope — done

2026-11-02T18:27:32+00:00 · observed · agent

Scoped native capture requirements to screenshots/previews; creative photography/illustration and optional authorized generated model artwork preserve factual UI and Apple device/branding limits. Ouro docs separate lifestyle field with visible disclosure/provenance.

- references/media.md; ouro-website/references/assets.md; current Apple primary docs; both skill validators pass
