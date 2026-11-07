# Recording an app for a Short

Every episode is a fresh, real recording of the shipped (or about-to-ship) app doing the thing the episode is about.
No mock-ups, no faked results: the number on screen is the number the app returned in that take.

## The rig (iOS simulator)

1. **A Release build against synthetic data.** Build the app's Release configuration for the simulator, pointed at a
   local or staging backend seeded with a believable synthetic household (Füd: `e2e-server.cjs` with
   `E2E_SHOWCASE=1`, a family of You, Leo and Maya). Never record a real person's data, and never the production
   account. Sign in by seeding the session (Füd's `seed-session.py`), not by typing credentials on camera.
2. **A leased device from the shared pool.** Follow the owner's simulator rules: run the SSD mount script, lease
   the exact UUID, record its prior state, `simctl status_bar override --time 9:41` with full battery and
   signal, and restore everything (uninstall the build, clear the status bar, shut down, release the lease) at
   the end, even after a failure.
3. **Get the one-time prompts out of the way off camera** (consent dialogs, onboarding, permission sheets),
   unless the prompt is the point of the episode.
4. **Record into `/Volumes/SharedSimulators/<app>-recordings/`** with `simctl io <udid> recordVideo
   --codec=h264 --force`, then copy the take to the app's project home on SSD
   (`/Volumes/ssd/projects/<app>/store-media/shorts/source/`) and delete the staged copy. `SimRenderServer`
   cannot write to `/Volumes/ssd` directly. Stop a recording with SIGINT so the file is finalised.
5. **Drive the app** with the iOS Simulator tool (tap, `text` for typing, swipes). Wait about 1.5 s after
   opening a screen before typing, or the first characters land before the field exists. Screenshots lag by about
   one frame: take two before acting on what you see.

## Rehearse the inputs, then record

For anything with variable output (AI features, search, scores, game outcomes), run candidate inputs through the
real feature first (its API or a quick unrecorded pass) and keep the ones whose real result is surprising, funny or
clear. Results vary between runs, so caption what the recorded take actually returned, not the rehearsal. Füd's
"crusts" episode came back as "Pizza Crust · 220 cal · Estimated" on the take after the rehearsal said
"2½ slices": the take, not the rehearsal, set the caption.

Drop inputs whose result is wrong or embarrassing (a dish matched to the wrong food), not just dull. A Short that
shows the app getting it wrong teaches viewers not to trust it.

## Find the moments

Draw contact sheets of each take (`app-preview.swift sheet <take> <out.png> 30`, then finer ones around each
event) and write down the source times of: typing start and end, the tap, the wait, the result landing, the
payoff row, the confirmation. The edit spec is built from those times.

## Games and ambient apps

Record longer and pick moments: a near-miss, a win, a satisfying chain or a calm loop. A loop that returns to its
first frame invites rewatches. The channel's best Short so far (about 1.3K views, 207% average viewed on day 3) is a
7-second calm alphabet loop. Keep gameplay real, with no edited scores.
