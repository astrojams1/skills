# Recording an app for a Short

Every episode is a fresh, real recording of the shipped (or about-to-ship) app doing the thing the episode is about.
No mock-ups, no faked results: the number on screen is the number the app returned in that take.

## The rig (iOS simulator)

1. **A Release build against synthetic data.** Build the app's Release configuration for the simulator. Point it at a
   local or staging backend seeded with a believable synthetic household (Füd: `e2e-server.cjs` with
   `E2E_SHOWCASE=1`, a family of You, Leo and Maya). Never record a real person's data, and never the production
   account. Sign in by seeding the session (Füd's `seed-session.py`), not by typing credentials on camera.
2. **A leased device from the shared pool.** Follow the owner's simulator rules. Run the SSD mount script, lease
   the exact UUID, record its prior state, and run `simctl status_bar override --time 9:41` with full battery and
   signal. At the end, even after a failure, restore everything: uninstall the build, clear the status bar, shut
   down, release the lease.
3. **Get the one-time prompts out of the way off camera** (consent dialogs, onboarding, permission sheets),
   unless the prompt is the point of the episode.
4. **Record into `/Volumes/SharedSimulators/<app>-recordings/`** with `simctl io <udid> recordVideo
   --codec=h264 --force`, then copy the take to the app's project home on SSD
   (`/Volumes/ssd/projects/<app>/store-media/shorts/source/`) and delete the staged copy. `SimRenderServer`
   cannot write to `/Volumes/ssd` directly. Stop a recording with SIGINT so the file is finalised.
5. **Drive the app** with the iOS Simulator tool (tap, `text` for typing, swipes). Wait about 1.5 s after
   opening a screen before typing, or the first characters land before the field exists. Screenshots lag by about
   one frame: take two before acting on what you see.

## When the Simulator tool refuses

The iOS Simulator tool refuses scheduled (unattended) sessions, so step 5 fails in the daily Mac pass. That is a
blocked route, not a blocked Short. Try these, in order, before deferring, and name each one tried in the event:

1. **A web build, if the app has one.** Space Worms records its real 1.0.1 game from the web export in headless
   Chromium (sw-challenge-02, 2026-11-10). Same rules: the shipped build, a real result, nothing edited.
2. **The app's own UI test as the driver.** Keep steps 1 to 4 (Release build, leased device, status bar,
   `simctl io <udid> recordVideo`), and drive the take with the app's UI test instead of the tool. A bare
   `xcodebuild` cannot see a leased device in the SSD pool, so route it to the leased device's set through
   `app-release`'s helper (`references/verification.md`, "Route XCTest to the designated device set"):
   `node <skills>/app-release/scripts/native-qa.mjs xcodebuild --device-set <leased set path> -- test -scheme <app>
   -destination id=<udid> -only-testing:<UITestTarget>/ShortsTakes/test_<episode>`. If the app has no
   `ShortsTakes` UI test yet, write one in the app's repository (its `AGENTS.md`, own branch, PR, merged when CI
   passes). It launches against the synthetic data, waits about 1.5 s per screen, types the rehearsed input and holds
   on the result. It changes no shipped code, so it is not a change to the app. Stop the recording with SIGINT once
   the test ends, then restore the device as step 2 says.
3. **`simctl --set <leased set path>` alone** for a moment that needs no taps: a deep link (`simctl openurl`), a launch argument that opens
   the screen, or an ambient loop recorded as it plays.

Defer only when all three fail, with the error from each, and still make every Short that a working route allows.

## Rehearse the inputs, then record

Some features have variable output: AI features, search, scores, game outcomes. Run candidate inputs through the
real feature first (its API or a quick unrecorded pass). Keep the ones whose real result is surprising, funny or
clear. Results vary between runs, so caption what the recorded take actually returned, not the rehearsal. In Füd's
"crusts" episode the rehearsal said "2½ slices", but the take returned "Pizza Crust · 220 cal · Estimated". The take,
not the rehearsal, set the caption.

Drop inputs whose result is wrong or embarrassing (a dish matched to the wrong food), not just dull. A Short that
shows the app getting it wrong teaches viewers not to trust it.

## Find the moments

Draw contact sheets of each take (`app-preview.swift sheet <take> <out.png> 30`, then finer ones around each
event). Write down the source times of: typing start and end, the tap, the wait, the result landing, the
payoff row, the confirmation. The edit spec is built from those times.

## Games and ambient apps

Record longer and pick moments: a near-miss, a win, a satisfying chain or a calm loop. A loop that returns to its
first frame invites rewatches. The channel's best Short so far (about 1.3K views, 207% average viewed on day 3) is a
7-second calm alphabet loop. Keep gameplay real, with no edited scores.
