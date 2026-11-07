# Rhythm — one beat, one button

Run `rhythm-one-beat-release-20261027`, app-release v2.7.3 and the Rhythm Capacitor adapter.
[Canonical ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json)
and [run log](https://github.com/astrojams1/rhythm/blob/main/store/runs.md).

Personal internal TestFlight **0.6.0 (7)** is VALID / IN_BETA_TESTING. Upload COMPLETE
without errors/warnings; exact notes and existing one-tester Release QA group verified.
Signed source `756fa14`; CI 40531183543 passes
20 Node and 18 browser checks. iOS/Android compile; actual WKWebView loads 7 hits,
advances and pauses/resumes. Distribution audio matches source; Debug probe excluded.

The owner removed all user-facing channels and controls except play/pause. A single
procedural percussion beat replaces five presets. Spectrograms establish signal observations, not subjective musical quality.

A real recovery regression was caught: failed processors must rebuild the graph.
Synthetic events and Playwright page routes did not reliably exercise Chromium
worklets. Injecting a real exception through addModule verifies both engines.
Awaiting painted canvas pixels corrects early blank screenshots. SciPy handles the
reference decoder's WAVEEXTENSIBLE output. These app-specific corrections are
verified in the app tests/scripts and canonical issue history.

New defects are closed. The broader audit remains partial for physical listening
and earlier generic UI-connector coverage. No public submission, external invites,
Android upload or paid builder. Costs/tokens are not measured.
