# Rhythm — native instrument-loading correction

Run `rhythm-instrument-fix-20261026-e5`, shared app-release v2.7.3, Rhythm Capacitor adapter.
Canonical evidence: [app ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json)
and [run log](https://github.com/astrojams1/rhythm/blob/main/store/runs.md).

The owner reported failed instrument loading in 0.4.0. Actual iOS 27.1 WKWebView
reproduction found Capacitor media fetch returned an intact WAV body with status 0.
A full byte-range request returns HTTP 206. The corrected loader retains response
and exact PCM validation; native replay loads 27 hits, advances AudioWorklet music,
changes vibe, and pauses/resumes. A Debug-simulator-only check is excluded from the
signed distribution binary. Browser-only testing / process launch had missed this.

**0.4.1 (5) is VALID / IN_BETA_TESTING** in the existing personal internal group.
Upload COMPLETE, no errors/warnings, group membership and beta notes verified.
Signed clean source `31c985e`; all packaged
instrument hashes and audio modules match source. 29 Node and 22 local browser tests
pass; iOS and Android compile. CI provider completion is recorded in the app ledger.

Reusable lesson: verify bundled media in the native URL-scheme path, including
actual loader and playback progression, before treating web tests as native evidence.
The Capacitor-specific fix and repeatable probe belong to Rhythm's repository guide.
The shared verification workflow already distinguishes compilation, launch, interaction
and physical listening; no new shared workflow code was needed.

Internal beta delivery is complete. Broader QA remains partial: physical listening,
subjective musical quality and previously observed UI connector limits remain open.
Costs and token metrics were not measured. No paid service, public submission,
external tester invitation or credentials changes occurred.

Final verification: CI 40432102772 succeeds with 29 Node / 24 browser checks on
`d1d61db` (runtime unchanged from signed `31c985e`). A slow hosted-runner Ubuntu
download timed out; fresh-runner retry recovered that operation in 47 seconds.
Trace then showed all assertions passing in a combined transport/mixer flow but
exhausting its 60-second budget. Independent scenario budgets preserve every real
UI/gain check and pass CI. Both issues are closed in the canonical app ledger.
