# Scripts

The scripts are in this skill's `scripts/` (Node 22, no dependencies, except `app-preview.swift`). Run them from the
app repository, where they find its configuration, with `S=skills/skills/app-release/scripts` (or
`vendor/skills/...` where the repository's own `skills/` folder is taken).

| Script | Does |
|---|---|
| `ledger.mjs` | Gate and issue ledger: `init`, `record`, `status`, `render`, `check`, `validate`, `issues` (verified issue closure) |
| `ios-release.mjs` | Local Xcode `archive`, `validate`, `upload`, `testers` (the internal group), `beta-group` (What to Test, any named group and Beta App Review), `release`, `next-build-number` |
| `asc.mjs` | App Store Connect: `status`, `listing`, `age-rating`, `pricing`, `screenshots`, `assets` (Asset Library images and app preview videos; `assets crops` saves Apple's crops of creative for checking), `nominate --confirm` (featuring nominations), `events [--confirm | submit --confirm]` (In-App Events), `iap-review-screenshots`, `review-details`, `review-attachment`, `game-center`, `attach-build`, `testflight`, `submit --confirm`, `withdraw --confirm`, `release --confirm` |
| `app-preview.swift` | macOS AVFoundation, no ffmpeg: `render` an App Store preview from simulator recordings, `check` a file against Apple's preview spec, `sheet` and `frame` to review the cut. The same spec, with per-clip `shift` and `fade`, renders a 1080x1920 YouTube Short (`swift $S/app-preview.swift …`) |
| `review-sweep.mjs` | Unattended review submissions: read-only `sweep` of every team's apps (live version, occupancy, repository, build commit, changed files), `claim`/`finish` per-app locks and dedupe, `run` to call the other scripts with the unattended guard ([iOS](ios.md), "Unattended review submissions") |
| `standards.mjs` | `audit` this app against the shared [app standards](standards.md) (`--json`; `--all` sweeps every app, read-only; `--offline` skips reading the published App Privacy label) |
| `privacy-label.mjs` | `check` the privacy manifests, the store data's `appPrivacy` and the label the App Store publishes against each other; `read <id>` prints a published label; `init` writes `appPrivacy` from the manifest; `confirm --evidence` records a label read back in App Store Connect ([privacy](privacy.md#the-privacy-label-gate)) |
| `more-apps.mjs` | `write --swift FILE` or `--ts FILE` the app's bundled More apps list from astrojams1/app-sites; `list` shows it ([standards](standards.md#more-apps)) |
| `native-qa.mjs` | Read-only launcher `preflight`; `xcodebuild --device-set PATH -- …` routes the original Apple launcher to an existing QA set |
| `android-release.mjs` | Local Gradle `bundle`, `verify`, `apk`, `release`, `upload`, `promote`, `tracks`, `next-version-code` |
| `play.mjs` | Play store presence: `status`, `listing`, `images` |
