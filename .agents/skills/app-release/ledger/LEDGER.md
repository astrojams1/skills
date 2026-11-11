# App release skill ledger

Skill version **2.24.0**. This index preserves sanitized outcomes and lessons across
apps; each application's repository remains authoritative for current progress.
Dates describe observations, not guarantees that provider state remains unchanged.

## Lessons incorporated into v2.24.0 (2026-11-11)

- Hanzi Cards reached its first App Store run with its listing's privacy, support and marketing URLs, and its in-app
  privacy and support links, all pointing at one marketing page that had neither a policy nor a contact address. The
  privacy-link standard passed because the URL appeared in the source. The audit now fails when
  `listing.privacyPolicyUrl` equals the marketing or support URL (new `distinctStore` check). The run published the
  app's own privacy and support pages, repointed the links and shipped them in build 6. `audit --all` passes for every
  current app.

## Lessons incorporated into v2.23.1 (2026-11-10)

- The daily review task points to its reference. That reference now sets up Node 22 and exports the skills
  with the same run ID used for review and logging.

## Lessons incorporated into v2.23.0 (2026-11-10)

- Rewritten in the house style from `skill-writing`; no behavior change. The owner asked that every skill read as one
  author wrote it, plainly. `SKILL.md` now follows the shared shape (A run, Authority, Rules, Report) and carries the
  canonical Run rules block for the daily review run, whose reference keeps only its own detail. The full script and
  command table moved to `references/scripts.md`, and the App Store Connect API boundary detail to `references/ios.md`.
  The privacy and app types references were reworded the same way.

## Lessons incorporated into v2.22.0 (2026-11-10)

- The daily review-submission Mac task's steps, approvals and Never list moved from its stored prompt into
  `references/daily-review-run.md`; the prompt is now a pointer, so the two cannot drift.
- A run fixes every gap it finds before submitting and defers only on a named gate; its summary lists what was left
  open. An unclear materiality call is settled by building and comparing, not by deferring at once (James, 2026-11-10).

## Lessons incorporated into v2.21.0 (2026-11-07)

- App Review rejected Plenty 1.0 twice over in one message. **2.3.4:** its preview showed the recording in a device frame
  on a background band, which the skill's own example spec and media guide suggested. `references/media.md` now says
  full screen only, with boxed captions placed per scene, and `app-preview.swift check` refuses a render whose border is
  one flat colour in every frame. A caption's note now takes the caption's box and follows its lines. **5 (China):** the
  listing named ChatGPT and OpenAI while China mainland was a storefront, and `pricing` turned every territory on, so a
  rerun would have restored it. `pricing.excludeTerritories` now keeps storefronts off, and `submit` refuses, before any
  write, a listing that names an unlicensed AI service while China mainland is on sale.

## Lessons incorporated into v2.20.0 (2026-11-07)

- No app is manual and there is no device check before release. `listing` writes `AFTER_APPROVAL` for every run,
  `submit --confirm` refuses anything else for every run, and store data no longer has a release setting.
- An unsent draft submission no longer stops the daily run: Nametag's was empty and blocked it. `submit` reuses it.

## Lessons incorporated into v2.19.0 (2026-11-07)

- The owner chose release on approval for every app, so the unattended guard now requires `AFTER_APPROVAL` instead of
  `MANUAL`. A held version would have kept each app occupied until someone released it, stopping the daily run.
- Preview videos need no owner approval, so a preview is never a reason to wait; the run makes, checks and places it.

## Lessons incorporated into v2.18.2 (2026-11-07)

- A wrapper timeout can hide the control provider's diagnostic. One bounded longer call may expose
  it; longer waits alone are not a repair. Verify recovery against the intended surface.
- Inspect returned provider identity. An empty MCP Apps provider is not an Apple browser session,
  and a failed native inventory leaves installed applications uninspected.
- Preserve another agent’s active PWA/team; a second tab may share its state. Verify the entity and
  access in an independent authorized browser before mutating. Saved-passkey selection can complete
  normal sign-in; respond only to an actual tool/security challenge when one appears.

## Lessons incorporated into v2.18.1 (2026-11-07)

- Check destination-filesystem headroom for candidate and original restoration,
  including installer staging, before QA mutation. Host SSD free space does not
  establish owned-volume capacity. Preserve rollback/data and use installed,
  format-compatible storage methods; verify restoration before closing the issue.
- Persist native QA recovery state before mutation and guard each cleanup stage
  independently. One optional window-geometry assertion previously stopped data
  restoration; failure injection now proves later shutdown/data stages still run.
- Resolve owned app/data paths before Shutdown or from exact offline metadata;
  post-Shutdown `get_app_container` can fail with code 149. Verify the full
  original bundle/data manifest, preferences, auth/fixtures and device state.
- Current captures and observed gestures guide unknown OS window geometry.
  Preserve target/account/run guards; no shared resets or invented owner step.

## Lessons incorporated into v2.18.0 (2026-11-07)

- A daily unattended run needed one rule for what occupies an app, and `submit --confirm` did not read `releaseType`, so
  an `AFTER_APPROVAL` version could publish on approval and a rejected submission could be replaced. `review-sweep.mjs`
  and the `APP_RELEASE_UNATTENDED` guard now stop both; a person's run is unchanged.

## Lessons incorporated into v2.17.2 (2026-11-07)

- `simctl --set` and Xcode runner routing are separate. The helper verifies Apple's original launcher
  then passes one `-DVTSimulatorSetLocation=<path>` argument for that process only; split syntax is not
  equivalent. Destination discovery plus a real passing UI test established recovery on observed Xcode.
- Share a small pool by OS/device coverage, reserve the exact UUID and restore changed settings/boot
  state. App-specific devices need a contention/isolation reason. Preserve existing data during adoption.
- A built-in preference is distinct from code injection or an ad-hoc-signed launcher. Retain the
  signature/identity/entitlement guard and reject ambiguous duplicate forwarded routing options.

## Lessons incorporated into v2.17.1 (2026-11-05)

- An approved build with recorded physical-device verification stayed at Pending Developer Release
  after a status check. An active authorized launch now proceeds to release in the same invocation
  once all conditions are met. Explicit holds, read-only requests and scheduled timing still apply.
  Provider approval, release request acceptance and storefront availability have separate evidence.

## Lessons incorporated into v2.17.0 (2026-11-05)

- Plenty went to App Review with no app preview, header, search creative or nomination. The agent read the requirement,
  skipped it and reported it as optional. Only prose asked for them, and the docs contradicted themselves ("Every
  release" beside "optional slots alone are not release blockers"), while `submit` checked only source standards. Now
  `asc.mjs status` prints each item and `submit --confirm` reads the version's live placements and refuses, before any
  write, unless each has a result or a reason in `promotion.waived`. The contradictory wording is gone.
- The same run reported a build as out to testers when `Release QA` had no testers, so the owner saw nothing in
  TestFlight. `testers` printed success on the build's state alone. It now adds the account holder to an empty group,
  invites anyone uninvited, reports the count and fails rather than report a build nobody can receive.

## Lessons incorporated into v2.16.2 (2026-11-05)

- Every Plenty widget rendered as a blank block on a Tinted Home Screen, which no contact sheet or log showed. `references/verification.md` now requires checking Default, Dark, Clear and Tinted on a real Home Screen, and says how to draw a safe face.

## Lessons incorporated into v2.16.1 (2026-11-05)

- Plenty's first widget app on a new group failed `archive` with a misleading "Authentication failed", though the key
  worked. The cause was an app group that did not exist: there is no public API for it and API-key signing cannot create
  one. `references/ios.md` now gives the portal route, the `group.` prefix trap and the team check, and warns against
  touching the repository during an archive.

## Lessons incorporated into v2.16.0 (2026-11-05)

- The owner asked that every app have a user feedback mechanism, done the same way, and that existing apps find what
  they lack and fix themselves. Added the app standards: `references/standards.md`, `assets/standards.json` and
  `standards.mjs audit` (`--json`, `--all`). The first entries are Send Feedback (a pre-filled email to `feedback.email`,
  so no backend, SDK or privacy-answer change; references in `assets/feedback/`) and the in-app privacy and support links
  `app-types.md` already required. Each run audits at its start, a missing standard becomes an `issue.standard.<id>`
  gate fixed in that run's build, and `archive`, `bundle`, `release` and `submit --confirm` refuse without it, `submit`
  before any write. A new standard is a catalog entry; an opt-out needs a recorded reason in the config.
- The first sweep passed Pipsqueak's privacy link on a heading called "Privacy" with no link behind it, so a bare quoted
  word no longer counts: a URL, a route or a name such as `privacyURL` does. Dot folders and vendored skills never count:
  the skill's own reference copies reach every app through the submodule and the tracked `.claude/` and `.agents/` copies.

## Lessons incorporated into v2.15.2 (2026-11-05)

- Importron's focused corrections repeatedly labeled all launch marketing outside scope; an actual library audit
  found four screenshots and zero videos. The existing shared preview requirement had not been followed.
  Added explicit per-asset preparation/placement evidence and a rule against blanket scope exclusions while
  preserving an already accepted first-version review. Uploaded assets do not establish placement or publication.
- The installed Xcode had no Simulator GUI. Public XCTest open-URL automation exercised the unmodified Release
  document handler instead. Initial captures exposed a changed post-install container, persistent synthetic
  StoreKit state and asynchronous/duplicate-label consent controls. Corrected fixture staging and native UI
  selection passed actual nine-result Health save/readback and protected reopen; the final26.5-second preview
  passed format and visual checks. Added this supported capture route without weakening Release provenance.

## Lessons incorporated into v2.15.1 (2026-11-05)

- Importron build10 received a Guideline2.1 information request asking why each PDF import is paid.
  Price and free allowance were documented, but the usage-based business rationale was missing.
  Added a conditional consumable review checklist: paid unit/value, rationale, free features,
  duplicate/overlap and retry accounting, plus factual separation from Apple framework access.
  Review-package changes can reuse the verified binary; reply and resubmission remain separate.
- The Browser connector exposed only an empty MCP Apps inventory, but documented native Computer Use
  could read the owner's signed-in Chrome. Added this supported fallback, correct-team verification,
  and the distinction between queued navigation and a successful read before an owner handoff.

## Lessons incorporated into v2.15.0 (2026-11-05)

- Füd's universal "At the table" header went live in both slots with the App Store Connect crop preview unchecked, and
  the run and the agent relaying it reported that as a caveat. Checked afterwards, the search card cut off the
  headline on iPhone, iPad and iPhone Duo. Three things went wrong: the design assumed a centred crop of the full
  canvas, when Apple keeps only the band y 415-1865 of 2950; "no sign-in" was concluded from one browser while the
  owner's Chrome was signed in; and the old advice to check Preview before `place` could not be followed, because
  Preview shows only what a slot holds and Browse Assets lists only approved images.
- Added `assets crops DIR` (Apple's own render per slot, available straight after upload) and a `cropChecked` gate on
  `assets submit` and `assets place`, tied to the file's hash. Unit and CLI tested; `assets crops` was also run against
  Füd's live library. The fix for Füd is a dedicated 3:2 search file, in App Review on its own.

## Lessons incorporated into v2.14.0 (2026-11-04)

- The owner asked for a YouTube Short after Füd 1.3.0 shipped. The App Store preview's fixed device
  frame could not serve it: on a phone YouTube's title stack covers the bottom fifth, so a device large
  enough to read hides "Who ate this?" and the Add button, and a device small enough to show them is a
  thumbnail. `app-preview.swift render` now takes a per-clip `shift` (the device eases up or down to
  each scene's subject), `fade` bands (background over the top and bottom, so the device passes
  under captions and controls without an edge) and caption `centerX`. A darwin render test reads
  pixels back from a test-pattern cut. The promotion checklist lists the Short; posting stays the
  owner's. The owner then judged that tour would get no engagement: a Short needs a hook, a payoff
  and sound, and a series. `render` gained `zoom`/`focus` punch-ins, per-clip `move` and caption
  `size`/`box`/`pop`; youtube-shorts gained `soundtrack.mjs` and the "Make it worth watching" rules.
- The owner then asked for the pipeline as a skill for every app and a follow-up skill for the channel's metrics:
  **app-shorts** (registry from every `app-release.config.json`, calendar, recording, Studio/API posting) and
  **youtube-growth** (analytics, decisions, comments, policy). The promotion checklist's Shorts row now runs both,
  and a release with a visible feature queues an episode.

## Lessons incorporated into v2.13.0 (2026-11-03)

- The owner launched the astrojams apps website (https://astrojams-apps.vercel.app) for every app on the personal
  James Thompson team, kept current like the Ouro site. The release path now has an **astrojams website** gate:
  personal-team apps run the `astrojams-website` skill at the Ouro gate's moments. An app with no website of its own
  uses its page there as `listing.marketingUrl`; Newsworthy and Space Worms keep their own sites.

## Lessons incorporated into v2.12.1 (2026-11-02)

- On a version in `PENDING_DEVELOPER_RELEASE`, `assets place` placed the approved header and
  search-results creative, then Apple refused an approved iPhone Duo screenshot placement (409
  "Creating a placement is not permitted in AppStoreVersion's current state") and the run stopped
  halfway. Screenshot and app preview placements ride on an editable version; on an approved or
  released one `place` now skips those slots with a printed line and still places the creative
  (`versionLockedPlacement`, unit-tested). No App Store Connect call was made for this fix.

## Lessons incorporated into v2.12.0 (2026-11-02)

- Asset Library image review requested the sparse image field but omitted the image
  `include`; live readback therefore hid this run's own newly attached image and
  triggered a false conflict. Explicit image inclusion restores the authoritative
  linkage. The real CLI regression models query-dependent projection; unknown,
  ambiguous, duplicate and foreign resources still stop the action.
- Standalone image review now reads all iOS version pages before opening a draft
  and requires a completed app approval, including pending manual release. An
  initial version waiting/in review or an `ACCEPTED` item with unresolved companion
  items is insufficient. All selected new images must be ready before any draft
  or attachment; processing images no longer produce a partial submission.
- Screenshots and app previews retain real native capture requirements. Header
  and search creative may use supporting photography/illustration and optional,
  owner-authorized AI model lifestyle art, with factual UI references and no fake
  endorsements; Apple hardware and branding restrictions still apply.

## Lessons incorporated into v2.11.0 (2026-11-02)

- The owner launched the Ouro apps website (https://ouro-apps.vercel.app) as the marketing page for every Ouro LLC
  app and asked never to have to say it is out of date. The release path now has an **Ouro website** gate: Ouro apps
  run the `ouro-website` skill when the record and listing exist, after each submission, on release and whenever the
  name, subtitle, copy or screenshots change, and their `listing.marketingUrl` is the app's page on that site. The
  site flips "Coming soon" to the App Store badge by itself within six hours of a release; the skill covers the rest.

## Lessons incorporated into v2.10.0 (2026-11-01)

- Füd 1.3.0: the owner asked for a high-quality video tour on the product page and for every other way Apple offers
  to present and promote an app, recorded here so every app does the same. [promotion](../references/promotion.md)
  is now a per-release checklist (preview, promotional text, header and search creative, featuring nomination) with
  the conditional ones (custom product pages, product page tests, In-App Events, Smart App Banner, ratings prompt) and
  the medical device declaration that blocks updates from early 2027.
- Apple deprecated `appPreviewSets`/`appPreviews` in API 4.5.1; previews now go through the Asset Library. `asc.mjs
  assets` uploads and places videos (`APP_PREVIEW` per device profile, `previewFrame` for the poster) and
  `asc.mjs nominate --confirm` sends featuring nominations. `app-preview.swift` renders a preview from simulator
  recordings with AVFoundation alone and checks it against the spec. Two writer deadlocks were found and fixed while
  making Füd's preview: silent audio must run ahead of the video, and the audio input must be finished as soon as it
  is complete, or AVAssetWriter stops taking frames.
- A simulator recording only writes frames when the screen changes; list the bursts to find cut points instead of
  scrubbing. Rehearse the tour first so one-time consent prompts and slow first loads stay out of the take.

## Lessons incorporated into v2.8.5 (2026-10-31)

- Füd 1.2.0: the owner asked to replace build 247 in App Review with 248, which fixed a banner they disliked.
  `asc.mjs` could submit, attach a build and cancel a rejected submission, but it had no command for
  withdrawing a version that was waiting for review.
- `withdraw --confirm` now does it: `withdrawPlan` picks the one WAITING_FOR_REVIEW or IN_REVIEW submission
  that holds this version (it stops on none or several), cancels it, waits for the cancel to settle and reads
  the version back. It was run against Füd: the submission was canceled and the version read back
  DEVELOPER_REJECTED. `attach-build 248` and `submit --confirm` then opened a new submission, which read back
  WAITING_FOR_REVIEW with release MANUAL. A test covers the plan. Consumers only need to bump the submodule.

## Lessons incorporated into v2.8.3 (2026-10-31)

- A diagnosed rejection must improve the shared release process as well as the current app. Preserve
  the actual reviewer request, identify the missed earlier check, add a scoped prevention and verify it.
- Review-information and attachment gaps are rejection causes too. Check the submitted build's actual
  setup flow and every requested answer; keep a required physical-device demo distinct from simulator
  footage or a written phone check.
- Recheck applicable lessons on later submissions. Prepared/verified skill source, delivery/adoption,
  resubmission acceptance and store approval remain separate; pending publication alone does not block
  an otherwise complete authorized resubmission.

## Runs

| Run | App ledger | Outcome | Token / dollar cost |
|---|---|---|---|
| [2026-11-02 Asset Library review](runs/2026-11-02-asset-review.md) ([JSON](runs/2026-11-02-asset-review.json)) | Shared maintenance; app-specific state remains in its own ledger | Explicit image include, approved-version and complete-image-set preflights; creative artwork guidance clarified; provider mutations excluded | Unknown / no new paid service |
| [2026-11-01 Füd preview and promotion](runs/2026-11-01-fud-preview-promotion.md) | [Füd release records](https://github.com/wendigo124/FSRN_Subs/blob/main/store/ledger.json) | App preview rendered from simulator footage with `app-preview.swift`, uploaded through the Asset Library; promotion checklist, `nominate` and video `assets` added for every app | Unknown / no new paid service |
| [2026-10-31 no mirroring dependency](runs/2026-10-31-no-mirroring.md) | Shared process maintenance; current app state remains in its own ledger | Mirroring is never required or initiated as a release dependency; preserve completed exact-build approval and ask only for genuinely missing evidence | Unknown / no new paid service |
| [2026-10-31 direct review attachments](runs/2026-10-31-direct-review-attachments.md) | [Nametag release records](https://github.com/astrojams1/nametag/blob/main/store/ledger.json) | Inspect the existing reply/file chooser and reconcile saved media before adding transfer tools or repeating owner handoffs; actual media coverage, upload and resubmission remain independent | Unknown / no new paid service |
| [2026-10-31 rejection prevention](runs/2026-10-31-rejection-prevention.md) | [Nametag release records](https://github.com/astrojams1/nametag/blob/main/store/ledger.json) | Root-caused rejections require a verified reusable prevention and later preflight recheck; app-specific evidence stays scoped; Nametag Notes saved while required physical recording remains outstanding | Unknown / no new paid service |
| [2026-10-30 Giraffe Stretch first TestFlight](runs/2026-10-30-giraffe-stretch-testflight.md) | App repository `store/ledger.json` (local, no remote yet) | Bare Xcode project archived, uploaded and READY_FOR_BETA_TESTING through the script; six run issues fixed and verified; owner device check pending | Unknown / no paid services |
| [2026-10-27 Rhythm instrumental rebuild](runs/2026-10-27-rhythm-musical-reset.md) | [Canonical app ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json) | 0.7.0 (8) VALID / IN_BETA_TESTING; instrumental rebuild, native playback and CI verified; listening unverified | Unknown / unknown |
| [2026-10-27 Rhythm one beat](runs/2026-10-27-rhythm-one-beat.md) | [Canonical app ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json) | 0.6.0 (7) VALID / IN_BETA_TESTING; one button, CI/native playback verified; physical listening unverified | Unknown / unknown |
| [2026-10-26 Rhythm procedural roots](runs/2026-10-26-rhythm-procedural-roots.md) | [Canonical app ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json) | 0.5.0 (6) VALID / IN_BETA_TESTING; fresh procedural one-drop performances and native playback verified; physical listening unverified | Unknown / unknown |
| [2026-10-26 Rhythm instrument-loading correction](runs/2026-10-26-rhythm-instrument-loading.md) | [Canonical app ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json) | 0.4.1 (5) VALID / IN_BETA_TESTING; actual native loader failure reproduced and fixed; physical listening unverified | Unknown / unknown |
| [2026-10-26 Rhythm band-inspired TestFlight](runs/2026-10-26-rhythm-band-testflight.md) | [Canonical app ledger](https://github.com/astrojams1/rhythm/blob/main/store/ledger.json) | 0.4.0 (4) VALID / IN_BETA_TESTING; CI passes; physical listening remains unverified | Unknown / unknown |
| [2026-10-26 SSD XCTest routing](runs/2026-10-26-ssd-xctest-routing.md) | [Canonical skill issue log](runs/2026-10-26-ssd-xctest-routing.json); live app evidence remains in Nametag | Original Apple runner reaches the existing SSD set with one process-local equals-form preference; real UI smoke passes on iOS 18.4 and latest 27.1, 1 test/0 failures each; 25 independent CLI cases and shared pool guidance added | Unknown / no new paid service |
| [2026-10-26 control-route diagnostics and Safari recovery](runs/2026-10-26-control-route.md) | Shared guidance maintenance; live state in Data Center’s app ledger | Supported Safari route, app identity and internal TestFlight delivery verified; owner invited; concurrent PWA preserved; initialization-recovery cause unproven | Unknown / no new paid service |
| [2026-10-26 UI signal correction](runs/2026-10-26-ui-signal.md) | Shared guidance maintenance; app release evidence remains in its own ledger | Owner-identified active surface and unlocked report take precedence over inferred tool state; unavailable binding and app-access denial remain distinct | Unknown / no new paid service |
| [2026-10-26 session continuity](runs/2026-10-26-session-continuity.md) | [Canonical skill issue log](runs/2026-10-26-session-continuity.json); [app history](https://github.com/astrojams1/nametag/blob/main/store/runs.md) | Guidance preserves known app/profile/tab and distinct session observations; 166 release tests, required local checks and independent dry-run pass; live session/privacy recovery unverified | Unknown / no new paid service |
| [2026-10-25 issue logging and closure](runs/2026-10-25-issue-closure.md) | [Canonical skill issue log](runs/2026-10-25-issue-closure.json) | Both encountered issues fixed and verified; read-only completion check passes;166 release tests pass | Unknown / no new paid service |
| [2026-10-25 Nametag native purchase recovery](runs/2026-10-25-nametag-native-purchases.md) | [Canonical app ledger](https://github.com/astrojams1/nametag/blob/main/store/ledger.json) | 16 local native StoreKit checks pass; both IAP review images COMPLETE and products READY_TO_SUBMIT; review blocked by unpublished App Privacy answers | Unknown / no paid services or purchases |
| [2026-10-25 Nametag TestFlight milestone](runs/2026-10-25-nametag-testflight.md) | [Canonical app ledger](https://github.com/astrojams1/nametag/blob/main/store/ledger.json) | Build 1 VALID and installed in TestFlight; owner device check complete; IAP/native QA, privacy, review and public launch remain open | Unknown / no paid services or purchases |
| [2026-09-16 Newsworthy snapshot](runs/2026-09-16-newsworthy.md) ([JSON](runs/2026-09-16-newsworthy.json)) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Web live; Apple binary/listing saved; both store releases incomplete | Unknown / unknown |
| [2026-09-16 Newsworthy review milestone](runs/2026-09-16-newsworthy-review-submitted.md) ([JSON](runs/2026-09-16-newsworthy-review-submitted.json)) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Apple WAITING_FOR_REVIEW; paid release unverified; Google owner/device and host gates remain | Unknown / unknown |
| [2026-09-16 Newsworthy tax/native gallery milestone](runs/2026-09-16-newsworthy-native-gallery.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | W-9 Active; Android v6 core UI/recovery checked and gallery ready; banking and store gates remain | Unknown / unknown |
| [2026-09-16 Newsworthy capture corrections](runs/2026-09-16-newsworthy-capture-corrections.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | About removed; clean widget capture brief recorded; new native capture evidence pending at handoff | Unknown / unknown |
| [2026-09-16 Newsworthy widget evidence and replacement review](runs/2026-09-16-newsworthy-widget-runtime.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Apple small/medium captured and replacement WAITING_FOR_REVIEW; Android update loop diagnosed, fix unverified at handoff | Unknown / unknown |
| [2026-09-16 Newsworthy Android partial verification](runs/2026-09-16-newsworthy-android-partial-verification.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | APK 8 stable for 65 seconds; initial refresh succeeded; recurring execution, fresh compact resize and theme fix unverified at handoff | Unknown / unknown |
| [2026-09-16 Newsworthy surface design contracts](runs/2026-09-16-newsworthy-surface-design.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | 189 local app tests reported passing; APK 9 compact 2×2 dark approved/captured; contract checks are not native rendering tests | Unknown / unknown |
| [2026-09-17 Newsworthy review information request](runs/2026-09-17-newsworthy-review-information.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Guideline 2.1 information request; Notes saved; empty internal TestFlight group; physical recording/testing pending | Unknown / unknown |
| [2026-09-17 Newsworthy native header and TestFlight invitation](runs/2026-09-17-newsworthy-native-chrome.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Invitation resolved and physical launch owner-confirmed; native glass-header fix still awaiting replacement-build verification | Unknown / unknown |
| [2026-09-17 Newsworthy build 7 resubmission](runs/2026-09-17-newsworthy-review-resubmission.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Physical demo/reply delivered; build 7 version and submission WAITING_FOR_REVIEW; neither approval nor public release established | Unknown / unknown |
| [2026-09-24 Newsworthy notification checkpoint](runs/2026-09-24-newsworthy-notification-release.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Backend deployed and privacy aligned; build 21 processing; APNs setup, physical delivery and resubmission pending | Unknown / unknown |
| [2026-09-24 Newsworthy notification resubmission](runs/2026-09-24-newsworthy-notification-resubmission.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Build 21 VALID/IN_BETA_TESTING; APNs handoff OK; physical subscription controls verified; both Apple review states WAITING_FOR_REVIEW; banner/tap unobserved | Unknown / unknown |
| [2026-09-24 Newsworthy store follow-up](runs/2026-09-24-newsworthy-store-followup.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | iOS 21 still waiting; Apple paid/address and Google verification gates remain; Android artifact predates current features; Firebase project created, Android push setup pending | Unknown / unknown |
| [2026-09-24 Newsworthy Android push and renewed Apple request](runs/2026-09-24-newsworthy-android-push-apple-request.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Android 12 delivery/shade/cold-start tap verified on emulator; physical Android untested; Apple 21 rejected under 2.1 with new recording pending | Unknown / unknown |
| [2026-09-24 Newsworthy recording correction and resubmission](runs/2026-09-24-newsworthy-recording-correction-resubmission.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Earlier new-recording interpretation corrected; original attachment verified; new 39-second video/reply/Notes delivered; build 21 WAITING_FOR_REVIEW | Unknown / unknown |
| [2026-10-22 Importron app-record creation](runs/2026-10-22-importron-app-record.md) | [Canonical app ledger](https://github.com/astrojams1/importron/blob/main/store/ledger.json) | Browser creation independently verified through the API; access-settings warning did not mean record creation failed | Unknown / unknown |
| 2026-10-19 v2.0.0 consolidation | Newsworthy [`store/ledger.json`](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json); Space Worms [`local-skills/app-store-release/ledger.json`](https://github.com/astrojams1/space-worms-2/blob/main/local-skills/app-store-release/ledger.json) | Both apps moved onto the shared scripts and ledger format; see v2.0.0 below | Unknown / unknown |

The initial Newsworthy record is a **historical extraction**, not an agent claim to have
finished the release. It includes a user-reported W-9 completion awaiting readback,
an acknowledged address-correction request awaiting Apple approval, completed
privacy/DSA steps, a fixed Android build still needing visual verification, and
Google device/phone/testing gates. No private addresses, phone, tax or banking data
are stored here. See its canonical ledger before resuming.

## Lessons incorporated into v2.9.0 (2026-10-31)

- Giraffe Stretch 1.0 (Kids Category, `kidsAgeBand` FIVE_AND_UNDER) was held by an automated Guideline 2.1
  information request asking how it meets Guideline 1.3: third-party analytics, third-party advertising, data
  shared with third parties and other data collected. Its notes had said only that the app collects no data
  and shows no ads. The answers, checked against the code, went into the review notes and the version was
  resubmitted the same day. The message was read in App Store Connect where the owner was signed in; the API
  still has no Resolution Center.
- `submit` now reads the saved review notes of a Kids Category app and refuses before any write, naming each
  unanswered question (`kidsReviewNotesProblems`, with unit and submit-path tests). Apps without a
  `kidsAgeBand` make no extra read. `app-types.md` gains a kids apps section.
- This is the first script-level prevention under v2.8.3's rejection recovery loop: SKILL.md cites it as
  the example of a preflight check, iOS "When App Review rejects" gains a "Prevent a repeat" step and the
  Play gotchas a pointer to the loop. Consumers only bump the submodule; no config or store data changes.

## Lessons incorporated into v2.8.2 (2026-10-30)

- Giraffe Stretch 1.0: the agent asked the owner to name an App Review contact, then for a phone, then
  searched the vault and the activity ledger (both refused by the session's permission checks), while every
  other app on the team carried an established review contact with a phone in App Store Connect. The owner
  had to type a number and was rightly annoyed.
- `review-details` now finds what the team already has through the API: with no contact named and none on
  the version, it takes the team's newest complete contact, name and phone together (`teamReviewContact`);
  a named contact without a run phone gets that same person's number from the team's other apps
  (`reviewPhoneOnFile`, email match first, then name, then newest). Another person's number is never used
  and no contact value is printed. Tests cover both paths; consumers only bump the submodule.

## Lessons incorporated into v2.8.1 (2026-10-30)

- Füd 1.2.0: `asc.mjs listing` created the new version, then refused with "No editable
  App Info" because it had read App Info before the version existed. An immediate rerun
  saved the listing.
- `listing` now re-reads App Info after preparing a version, a few times while Apple
  creates the record (`awaitEditableInfo`, with a regression test). No config or store data
  changes; consumers only bump the submodule.
- Asked whether Füd 1.2.0 was in TestFlight, `status` could not say: it listed builds without
  their beta state. `status` now shows each recent build's internal and external TestFlight
  state and which groups hold the newest build (`testflightState`, `testflightGroups`, with a
  test), read-only. The `testflight` command adds builds, so it is not a substitute.

## Lessons incorporated into v2.7.3 (2026-10-26)

- Rhythm's initial TestFlight run had working API credentials, a registered bundle ID
  and a signed IPA, but no App Store Connect app record. The API limitation was
  already in the iOS reference; the owner still had to ask why UI was required.
- Promote that boundary into startup guidance and explain it in the first relevant
  update. A registered bundle is separate from an app record. Keep working credentials
  and independent preparation distinct from an unavailable UI route. No script or
  configuration format changes; consumer migration is a shared-skill pointer update.

## Lessons incorporated into v2.7.2 (2026-10-26)

- Bind the exact active app/profile/tab named by the owner first. Preserve an
  explicit unlocked/sign-in report when the connector cannot inspect that surface.
- A lock diagnostic or unavailable in-app browser is a tool observation. It does
  not establish desktop lock or Apple sign-out, and does not justify repeating
  an unchanged unlock/sign-in request.
- An explicit app-access denial applies across routes; native host-app binding
  cannot be used to reach an unavailable embedded browser through that denial.

## Lessons incorporated into v2.7.1 (2026-10-26)

- Resume the last working app/PWA, profile and tab before starting a new login.
  Inventory failure or a fresh tab's authentication failure does not invalidate it.
- Persist control, Apple authentication, selected team and vault observations
  independently. Reinspect the same surface after reported sign-in; an unchanged
  connector error is not grounds for another identical owner handoff.
- Keep actual human security challenges separate from authorized ordinary UI
  navigation. Retain Fastlane's owner-password fallback restriction.
- After a known unpublished-privacy rejection, verify publication before retrying
  submission. Documentation validation does not prove live-session recovery.

## Lessons incorporated into v2.7.0 (2026-10-25)

- Log execution issues promptly as issue.* gates, preserving diagnosis, recovery
  and verification history. Reconcile command/test/provider failures before finish.
- `ledger.mjs issues` is a read-only completion check, separate from structural
  validation and generated-view integrity. Open issues and failed/uncertain gates
  block success; evidence-free exclusions or legacy inferred closures cannot pass.
- Fix issues within the agent's control in the same invocation. Genuine external
  dependencies remain open and the run partial, with exact next actions.

## Lessons incorporated into v2.6.1 (2026-10-25)

- Image-only Asset Library review must inspect the complete held resource set of
  an existing draft. A draft can also hold an app or IAP version; submitting the
  whole draft would send those items too. Refuse mixed, unknown or duplicate
  resources before attachment, read back additions and the final exact image set,
  and verify actual submitted state. Preserve conflicts and uncertain outcomes.

## Lessons incorporated into v2.6.0 (2026-10-25)

- Verify the actual XCTest launcher's Apple identity and service entitlements;
  a strict-valid ad-hoc copy can still be rejected by dtarbiter. The new read-only
  `native-qa.mjs preflight` rejects that known failure and accepts the original.
- A separately identified local StoreKitTest simulator host can exercise unchanged
  production purchase methods when stock XCTest cannot discover the designated
  SSD set. Keep local API checks, UI gestures and physical/store evidence distinct.
- Required IAP review screenshots still attach to the parent product after the v2
  metadata migration. `iap-review-screenshots` verifies ownership, preserves
  conflicting/uncertain assets and requires delivery/checksum readback.

## Lessons incorporated into v2.5.2 (2026-10-25)

- A missing public privacy-write API and unavailable browser do not rule out Fastlane's documented
  privacy action with an existing authorized Apple ID owner/admin session. Check that session
  separately; the App Store Connect API key cannot replace it. Prepared JSON is not publication.
- Preserve existing answers before using the action, which replaces usage rows. Its normal login
  can fall back to stored owner credentials; an available cache is not a session-only guarantee.
  Verify actual rows and the published result rather than relying on a reported published flag.

## Lessons incorporated into v2.5.1 (2026-10-24)

- Automatic internal-group access does not establish TestFlight testability. Füd's processed build was
  initially blocked by missing export compliance. Verify the exact release/build, group membership and
  internal beta state on both automatic and manual paths; never repeat an unverified group mutation.
- Keep optional marketing assets and future SDK/date requirements separate from current submission
  requirements. Honor existing authorization for methods and routine listing work; a UI tool's lock
  diagnostic is not independent evidence of the owner's desktop state.

## Lessons incorporated into v2.5.0 (2026-10-23)

- Füd's reviewed native workspace differs from Expo regeneration. An optional tracked-native path
  evaluates release configuration without replacing the project, preserves locked Pods and applies
  the chosen build number through Xcode. Required native entry points must be tracked, with no
  symlink indirection; all flat-workspace project references and the shared scheme are checked.
- Reuse an already verified local distribution identity/profile through optional manual single-app
  signing. Automatic signing and prebuild remain defaults. Array-valued required entitlements retain
  their actual type; strict signature and expected app version checks precede the verification receipt.
- Invalidate the previous summary before replacing artifacts on a rerun. Upload checks the recorded
  artifact digest and release target. Isolated orchestration fixtures do not prove native rendering,
  actual Xcode export or App Store submission; those stay separate in the app ledger.

## Lessons incorporated into v2.4.7 (2026-10-23)

- Füd: a correctly pasted .p8 was flattened into a single-line credential field. Normalize its PEM
  armor and whitespace before signing; a generated P-256 signing regression proves identity is
  preserved. Unicode item titles require stable IDs in secret references, not another owner handoff.

## Lessons incorporated into v2.4.6 (2026-10-23)

- Space Worms: placing Asset Library images on an already-approved version fails with 409 "The asset must be in the
  APPROVED state because the parent is already approved". `asc.mjs assets submit --confirm` sends the listed,
  processed images to App Review in their own submission; `place` follows once they are approved.

## Lessons incorporated into v2.4.5 (2026-10-23)

- An isolated SSD-backed APFS sparse image with ownership enabled on that image recovered simulator
  creation, boot and app installation after repeated sample-content copy `EPERM` errors. The shared SSD
  remained unchanged; this is an optional workaround, not a proven root cause or rendering verification.
  The app later crashed after launch returned a PID; inspect continued execution and crash diagnostics
  before reporting healthy startup, and verify actual UI separately.
- Reuse the owned image/device, verify capacity and backing identity, and replace only a confirmed empty,
  unused QA path. Never disturb shared/default devices, shared-volume ownership, TCC or CoreSimulator.
  Current local disk-image syntax and supported UI capture policy remain authoritative.
- App-specific paths, UUIDs, builds and current native verification belong in the app's canonical ledger.
- Validation: 103 release, 53 management, 138 spec, identity, 8 screenshot-fit and skill validation pass;
  YouTube 5 pass / 1 explicit ffmpeg skip. Read-only consumer inspection found no command/config migration.
  Discovery regenerated; no runtime scripts, consumer copies or provider state were manually changed.

## Lessons incorporated into v2.4.4 (2026-10-23)

- An inventory lock report contradicted by the owner did not prevent a supported direct Chrome
  binding. Current Atlas roles, the same free cluster's successful resume, original hostname and
  IDLE state were then verified. Scope failures to their observed route rather than the whole Mac.
- The provider's normal device-code entry page recovered a disabled prefilled CLI login control.
  Its later email security challenge remained a separate boundary when the mail connector withheld
  the code. Neither recovery requires extracting session cookies or weakening security settings.

## Lessons incorporated into v2.4.3 (2026-10-23)

- A store API key excluding one app and an inert PWA organization selector did not establish missing
  account access. The PWA's supported Open in Chrome handoff preserved the existing session; the regular
  browser then exposed the correct organization and existing app. Verify the same account/entity after
  the handoff. This is a supported alternative when observed controls fail, not a universal PWA defect.
- Shared account setup is scoped to the app's verified legal entity/account. Do not assume every app
  uses one historical personal team. Browser access, API authorization and signing authority are
  separate evidence, and none justifies bypassing provider security restrictions.

## Lessons incorporated into v2.4.2 (2026-10-23)

- App Store Connect status and metadata commands must validate their API/store inputs independently of
  Xcode signing settings. Requiring an unverified signing team prevented an authorized read from even
  reaching Apple and concealed the actual provider response. Archive/upload validation remains strict;
  no signing identity is inferred from API access. Null required fields are missing, just like blanks.
- End-to-end CLI regressions use synthetic keys and a mocked API: absent/blank signing settings permit
  read-only status, an API denial remains visible, missing API inputs produce no requests, and incomplete
  signing settings still prevent archive work. No live account or consumer state is changed by this fix.

## Lessons incorporated into v2.4.1 (2026-10-22)

- Notes-only review updates must retain this same-app/version's existing contact fields. Previously,
  undefined configured names were omitted from the PATCH but compared against Apple's retained names,
  falsely failing after saving Notes. Build and verify the actual complete payload instead.
- Retain omitted Notes/demo requirement and untouched demo credentials; require a complete explicit
  contact plus runtime phone for creation, or a new phone when the contact identity changes. Do not
  borrow unrelated app contacts. Redact names, email and phone in readback errors.
- Mocked before/after regression proves the original failure; privacy, missing contact, explicit
  override and lost-response coverage use synthetic contacts only. Live app work stays in its ledger.

## Lessons incorporated into v2.4.0 (2026-10-22)

- Consumable/nonconsumable review requires an explicit `inAppPurchaseVersion` target. Bind it through
  the app's IAP collection, exact StoreKit product ID and that product's review-version collection.
  A retained product ID alone does not authorize a current review target or arbitrary draft items.
- Optional targets retain no-config behavior and subscription ownership guards. Rejected replacements,
  pending submissions, attachment readback and final submit use the same complete verified target set.
  Mock regressions cover mismatches, foreign/duplicate items and unknown write outcomes; no live Apple
  mutations were performed by this shared-skill change.
- A missing IAP related resource can make an include-bearing product GET return 404. Check the plain
  product and separate documented relationships before treating this as failed product creation.

## Lessons incorporated into v2.3.1 (2026-10-22)

- Exhaust useful authorized work and supported alternatives before handing a release back. A failed
  UI route limits only the affected interaction/capture; it does not establish that builds, backend
  work or listing preparation need the owner. Keep actual provider restrictions and security boundaries.
- Reserve `waiting_user` for demonstrated human dependencies; record agent/environment failures and
  recovery separately. Show available previews inline while retaining native capture/QA provenance limits.

## Lessons incorporated into v2.3.0 (2026-10-22)

- A first-subscription submission contains distinct product and group review-version items. Treating
  every non-leaderboard item as an app version falsely rejected a valid subscription draft. Optional
  store-data targets now bind both versions through their API parents before attachment and submission.
- Compound submission safety remains strict: unknown, duplicate, ambiguous and foreign resources are
  conflicts; partial attachment resumes through readback, and both submission/version states are read
  independently after submit. Mock API regressions cover ownership refusal and zero-mutation behavior.
- Apple rejected a schema-valid include list containing both experiment variants. Item reads now request
  all relationship fields but expand only supported resource types; the corrected query and ownership
  chain were verified read-only against the real empty draft. No submission or attachment was performed
  by that verification.
- During the Importron upload, an independent processed/testable build readback advanced while its
  upload resource still reported processing. The iOS gotchas preserve these separate observations and
  require state inspection before retrying; this patch does not alter upload polling or claim COMPLETE.
- Newsworthy and Space Worms have no configured subscription review targets and retain their existing
  config/command contracts. Importron supplies explicit targets in its own store data. This shared
  change itself performed no provider writes or app-repository changes; live evidence stays in each app.

## Lessons incorporated into v2.2.2 (2026-10-22)

- Importron's record was created in an authorized signed-in Chrome session and independently read back
  through the public API. Apple reported success for creation but a failure saving user-access settings;
  the expected draft record still existed. Separate the two outcomes, verify identity before retrying,
  and compare actual/intended access instead of silently treating the warning as harmless for every app.
- This documentation patch changes no config fields or command contracts. Newsworthy, Space Worms and
  Importron use the same existing app-ID setting; consumer pointer updates follow merge.

## Lessons incorporated into v2.2.1 (2026-10-22)

- An API limitation was incorrectly presented as owner-only work during Importron onboarding. Historical
  proof shows Space Worms' record was created in the owner's signed-in browser session on 2026-10-12:
  [commit e4eeecba](https://github.com/astrojams1/space-worms-2/commit/e4eeecba35e41251ddcdc2e8b74c9ce5d8019b5e).
  The workflow now creates or reuses records through authorized browser UI, verifies identity and
  platform, and persists `ios.ascAppId`; Apple's documented Xcode Organizer flow is a fallback.
- Existing session authorization remains in force. Failed UI automation is a tooling blocker, not proof
  that the owner must create an app. This documentation correction does not establish that Importron's
  record was created or that any build was uploaded or submitted.
- Compatibility review covers Newsworthy (`vendor/skills`), Space Worms (`skills`) and Importron
  (`skills`): no config or command contract changes; consumer submodule bumps follow merge.

## Lessons incorporated into v2.2.0 (2026-10-20)

- Space Worms' owner, reading App Store Connect's "New Ways to Market Apps" banner: every app uses the product page
  header, the search-results creative and iPhone Duo screenshots. `asc.mjs assets` lists, uploads and places them
  through the Asset Library (`appAssetLibraryImages`, `appAssetLibraryPlacements`, OpenAPI 4.5.1); the live specs
  came from `appAssetLibraryRefData`. The Duo profile holds 10 screenshots for both displays together.

## Lessons incorporated into v2.1.1 (2026-10-20)

- Space Worms build 12: `ios-release.mjs archive` failed bundling because Metro's shared cache in the system
  temporary folder held a DOM-component entry pointing into another checkout of the same app. Archives and Android
  bundles now run with a fresh `<build>/tmp` as `TMPDIR` (`lib/build-tmp.mjs`), so every release bundles from its
  own checkout alone.

## Lessons incorporated into v2.1.0 (2026-10-20)

- Space Worms' owner, preparing its first update: every update rechecks the store screenshots and copy against the
  build and ships release notes written for the app's audience (features and what feels faster, no jargon).
  `asc.mjs listing` now refuses an update whose `listing.whatsNew` is empty, where it used to skip the notes silently.

## Lessons incorporated into v2.0.0 (2026-10-19)

Audit of Newsworthy and Space Worms, which had each grown its own release skill since v1.0.11:

- **One process, per-app data.** Both apps now run the same scripts from this skill with an
  `app-release.config.json` and a store data file; each keeps a thin repository skill for its own facts.
  Space Worms' hardened App Store Connect, iOS and Android scripts became the base; Newsworthy contributed
  `promote`, push and widget checks, Play listing and artwork through the API, paid pricing, and the
  hold-for-review commit.
- **Local builds, no EAS.** Both apps had already moved store builds to the owner's Mac (14–15 October)
  after the shared free plan's 15 monthly iOS credits ran out; EAS submission and the stalled-upload
  fallback are gone from the instructions. Newsworthy uploaded the first locally built `.ipa` (build 28,
  2026-10-14, `altool --upload-package`, VALID and in Release QA, recorded in its open PR #210); Space Worms'
  local archives have only been validated so far.
- **One ledger format.** Space Worms kept only a hand-written ledger; Newsworthy kept a JSON gate ledger
  (112 gates, about 30 of them product verification) plus a build ledger. Both now keep the JSON gate ledger
  with a generated view (release gates first, product verification after), a hand-written run log, and an
  entry per record in the owner's shared activity ledger. `status` flags gates idle for a week.
- **Play commits differ by situation.** `ERROR_IF_IN_REVIEW` keeps a testing upload from cancelling a review
  (Space Worms); `changesNotSentForReview=true` is required while a submission stands rejected, and then a
  separate `:validate` refuses the edit (Newsworthy version 16). Both are now flags of one script.
- **An API commit publishes Play's last saved listing**, discarding a console "Save as draft".
- **Rejections:** App Review's message is not in the API; read the owner's email through the Gmail
  connector before asking. Google's News and Magazines policy needs publisher details in the app.

## Lessons incorporated into v1.0.0

- Reconcile authorization with the current task. Repeatedly asking for already
  authorized routine form details slowed progress; new support communication or
  binding attestations still follow the actual active policy.
- Test all supported authenticated paths before declaring a user-only blocker.
  A connector without project access did not prevent using the signed-in dashboard.
- Preserve request acceptance vs completion. Apple support receipt is not an
  address update; W-9 submission is not an active paid agreement; an uploaded
  binary is not store review or release.
- Inspect the existing US tax-form row. The add-form country picker can be a
  dead end when the required form already exists.
- Store asset source/provenance beside copy and upload automation. Native evidence
  exposed an Android decoder bug that web verification had missed.
- Separate emulator startup crashes from app failures. Reuse working SDKs and
  record environment fixes rather than committing downloaded SDKs or credentials.
- Stalled EAS upload had a successful official Apple uploader fallback after
  checking remote state and canceling the duplicate queue item.
- Check current docs: Expo's Android submit path now supports initial internal
  release creation with an existing app/service account; manual first upload is
  not a permanent universal rule.

## Lessons incorporated into v1.0.1

- API review drafts and actual submissions are separate. Attach the intended
  version, resolve validation errors from source evidence, then submit the draft
  and independently read back both version and submission.
- Current availability uses v2 resources. Enabled territories and automatic
  release settings do not prove sale eligibility; the seed app reached review
  while all territories still reported `CANNOT_SELL`.
- A locked host blocks native capture and signed-in native UI, not authenticated
  API work. Continue independent safe paths; do not claim missing visual checks.
- Keep the original handoff snapshot unchanged. This second milestone records
  Apple acceptance at 2026-09-16T04:53:38.974Z, with W-9 processing, banking,
  address correction and public sale still independently unverified.

## Lessons incorporated into v1.0.2

- Signed-in tax-form readback promoted the W-9 from owner-reported to verified
  Active; banking and agreement readiness still required separate evidence.
- Supported emulator screenshot controls preserve native PNG sources for store
  art. Record the working shortcut as a dated observation and check local settings.
- Verify the corrected existing native artifact before rebuilding. Name the
  feature/device scope: foreground success does not verify widgets or real devices.

## Lessons incorporated into v1.0.3

- Plan capture content and native size coverage before composing listing artwork.
  User choices about removed screens, wallpaper and icon clutter belong in the
  app brief; reusable guidance should preserve those choices without exporting
  one app's design preferences to other products.
- Supported widget sizes in source and visually verified variants are separate
  facts. Preserve original native evidence and leave blocked captures pending.
- A developer-withdrawn review is not a reviewer rejection. Preserve the previous
  submission milestone as history and read current replacement/build state from
  the canonical app ledger.

## Lessons incorporated into v1.0.4

- A real widget viewport may be framed in editable artwork when wallpaper
  controls are unavailable. Preserve the original capture and describe the
  composition honestly; framing does not prove the wallpaper was changed.
- Diagnose flicker and interrupted resize from native logs before assigning blame
  to control tooling or the user. Package/receiver scheduling loops can recreate
  widgets during interaction. Source-supported sizes still need native checks.
- Distinguish the diagnosed cause, proposed source fix, replacement build and
  verified outcome. Replacement review acceptance remains separate from release.

## Lessons incorporated into v1.0.5

- Verify continued refresh scheduling after an update-loop fix; an initial success,
  pending recurring job and observed recurring execution are separate evidence.
- Switch themes without new data to expose colors retained in rendered spans.
- Distinguish provider dimensions from an existing launcher item's minimum span;
  cached sizing remains a hypothesis until fresh native resize checks resolve it.

## Lessons incorporated into v1.0.6

- Verify design token consumption across surfaces, including semantic sizes,
  baselines and theme resources; build success or token generation is insufficient.
- Exercise known regressions and actual pre-fix artifacts. Source guards fail on
  unsupported structures; do not silently accept a changed baseline.
- Keep source/rendered-prop contracts and actual native captures separate. One
  approved size/theme does not verify the remaining native surface matrix.

## Lessons incorporated into v1.0.7

- Obtain the actual review message before fixing an assumed defect. User-pasted
  text can unblock response preparation when correspondence UI access fails.
- API review state, browser access and correspondence are distinct capabilities.
  Keep the requested response in both Notes and reply; preserve contact phone in
  the Notes mutation without copying its value into the public ledger.
- TestFlight readiness and an empty group do not prove invitation, installation
  or QA. A physical-device/latest-OS recording request needs physical evidence.

## Lessons incorporated into v1.0.8

- Record SDK/runtime/device coverage and inspect OS-generated native chrome.
  Older simulator captures and JS prop checks do not prove newer physical-OS
  appearance or verification of a source fix.
- Group build availability, invitation state and direct tester-build relationships
  are distinct evidence. Read back the invitation and confirm installation instead
  of treating an empty direct list or an imagined Resend control as decisive.

## Lessons incorporated into v1.0.9

- A reply/attachment is not a resubmission. Resolve the addressed rejected item,
  submit the existing submission, and read back both review states and the build.
- Retain the original recording, document any initial-idle trim/audio removal,
  and claim only visible coverage. Submission acceptance is not approval or live.
- Cloud listing size can describe a dataless placeholder. Inspect download
  metadata and verify real media bytes/hashes before diagnosing an upload failure.

## Notification checkpoint lessons

The September 24 notification checkpoint adds operational lessons without
changing the v1.0.9 instructions: distinguish signing capability, delivery
credentials, Expo tickets, APNs handoff receipts and physical visibility; compare
store disclosures with the shipped manifest; reuse authenticated paths while
preserving production secret access boundaries.

The later resubmission milestone records successful APNs handoff and physical
subscription changes while retaining the banner/tap visibility limit. Refresh
browser sessions and check key inventory before repeating credential creation;
verify the selected build and both Apple review states after submission.

The store follow-up records a superseded Android artifact and unresolved account
gates. Prior build verification does not cover later features or listing claims;
a generic document acknowledgment does not establish case linkage or a corrected
legal record.

## Lessons incorporated into v1.0.10

- Pair notification receipt evidence with actual presentation and cold-start tap;
  identify the artifact and emulator/physical coverage precisely.
- Attribute an emulator interruption to its observed failing process; a SystemUI
  ANR is not evidence of an app crash.
- Treat each new review message and recording request independently. An omitted
  earlier guideline is not approval, and an older video cannot verify new features.

## Lessons incorporated into v1.0.11

- Separate the reviewer's words from an inferred reason for repeating a request.
  Inspect existing attachment access/provenance and saved Notes before asking the
  owner to redo work; recommend extra coverage without claiming it was explicit.
- Inspect each supplied recording and preserve unshown OS/build limits. A new
  file, feature coverage and successful submission do not establish latest-OS QA.

## Add a run

Update the app's ledger after each material step. At a milestone/handoff, write a
sanitized dated snapshot under `runs/`, link the canonical app ledger, record the
skill version and actual outcome, and append a row here. A concise incremental
milestone note can link the canonical ledger and new artifacts instead of
duplicating the entire event history. New evidence can correct
an older snapshot in a clearly dated note, not by silently rewriting its history.
Keep measured costs separate from unavailable metrics. Refresh discovery copies
with the repository's `bin/manage.sh link` after changing the source skill, and run
`node --test tests/app-release/*.test.mjs` after changing a script.


### 2026-11-03 — Importron PDF / File Provider QA

Version2.12.2 documents simulator-side bookmark diagnostics and a narrowly validated Debug-only document-open lane that preserves actual reader/parser, StoreKit, Health handoff and clinical queries. Files resolution errors and incomplete materialization must be distinguished from extraction errors. Failed selector/profile retries remain evidence; the alternate lane must not be presented as successful standard selection. Distribution excludes its entrypoint; manual release still waits for exact-build physical QA. Importron verifies its private report independently and uses only invented fixtures in Health and Git. No source medical records or account contacts are included in this lesson.

### 2026-11-10 — Plenty 4.1(a): names of the services a companion app works with

Version 2.23.2 adds a pre-submission checklist for apps that must name another company's service. Plenty 1.0 was
rejected under Guideline 4.1(a) for metadata that "resembles" Codex, ChatGPT and Claude; the names were in the
description and on the app's own screens in every screenshot, with no logos. The earlier guidance said only never to
name another trademark, which such an app cannot do. The owner chose to contest after a store search found dozens of
approved trackers naming the same services; the reply and notes were sent and the outcome is pending in Plenty's
ledger. Adoption: Plenty's notes already carry the explanation; no other current app names a third-party service.
