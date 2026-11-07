# Rhythm — instrumental rebuild after rejected music

Run `rhythm-musical-reset-release-20261027`, app-release v2.7.3 with the Rhythm
Capacitor adapter. [Canonical ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json)
and [run history](https://github.com/astrojams1/rhythm/blob/main/store/runs.md).

Personal internal TestFlight **0.7.0 (8)** is VALID / IN_BETA_TESTING. Upload COMPLETE,
zero errors/warnings, exact notes and existing one-tester Release QA group read back.
Signed source `0ce8827`; all 45 audio resources match
source; Debug simulator probe excluded. Actual WKWebView loads 34 recordings,
advances and pauses/resumes. iOS and Android compile; 22 Node and 18 local browser
checks pass. Native archives are local; no paid native build service invoked.
GitHub Actions and token costs are not measured.

The owner rejected the previous percussion-only result and delegated the
artistic choices. A bass-led instrumental arrangement now develops original melodic
phrases, harmony and orchestration while preserving one play/pause button. Source
licenses and hashes accompany the individual recordings. No reference-song audio
is bundled. Three rendered iterations and a quantized-score audit are documented.
Neither spectrograms nor unique floating-point event hashes establish musical quality.
The rejected version had four distinct eight-bar scores across the measured window;
the revision has 116/128. This is structural evidence, not listening approval.

Minor discovery, patch and plot-layout failures recovered with observed checks.
An initial payload assertion compared inconsistent path orderings; sorted relative
paths pass the full byte-integrity/signature/probe-exclusion check. CI attempt one
passed Node/build, then downloaded Ubuntu packages very slowly. Its cancellation,
404 live-log read and completed diagnostic log are retained; a fresh-runner retry
remained slow. CI-only commit `d7c25cd` routes the same signed Ubuntu packages through
the primary HTTPS mirror. [CI 40543587798](https://github.com/astrojams1/rhythm/actions/runs/40543587798)
then passes all 22 Node and 18 browser checks in 2m32s. Application bytes are unchanged.

Musical acceptance and physical-device listening remain unverified, alongside earlier
generic UI-connector coverage limits. No public release, external invites or Android
upload.
