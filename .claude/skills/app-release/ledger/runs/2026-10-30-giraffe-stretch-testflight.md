# Giraffe Stretch first TestFlight build — October 30, 2026

A new native SwiftUI + SpriteKit app (plain `.xcodeproj`, no Expo, no CocoaPods) on the Ouro LLC team reached
internal TestFlight through `ios-release.mjs` with skill 2.8.0's changes:

- `archive --build-number 1` ran before the App Store Connect record existed, archived unsigned
  (`ios.archiveSigning: "export"`, because Ouro has no registered devices) and signed at export with
  Apple Distribution: Ouro LLC; the script's own checks passed.
- After the owner created the record (app `6828792901`), `validate` reported VERIFY SUCCEEDED, `upload` delivered
  `851dc16c-1470-4026-9f56-fefe2853f019` and Apple processed it VALID.
- `testers` created the missing internal group Release QA through the API and read back
  READY_FOR_BETA_TESTING; the owner's user was added as an internal tester (INVITED).
- `asc.mjs listing`, `age-rating`, `pricing` and `screenshots` saved and verified the Kids (5 and under) listing.

Issues and fixes (all reproduced, fixed and rerun):

| Issue | Fix | Verified |
|---|---|---|
| `archive` required Expo config and CocoaPods | `ios.project` bare-project mode | Real archive + 6 fixture tests (fail on 2.7.3) |
| Automatic archive signing needs registered devices | `ios.archiveSigning: "export"` | Real Ouro export signed for distribution |
| `archive` required `ascAppId` before the record existed | `archive --build-number N` runs without it | Real archive before record creation |
| `testers` failed for a new app with no groups | Create the group only when the app has no internal groups | Real run + 3 tests |
| Description with ✓ failed mid-write (INVALID_CHARACTERS) | `listing` refuses dingbats/emoji before writing | Real listing rerun + 2 tests |
| Age rating PATCH required `socialMedia` | Store data answers it; example updated | Real age-rating rerun |

Record creation still needed the owner: Claude's desktop control is view-only in browsers and the App Store Connect
PWA, Claude in Chrome's profile was signed out, and 1Password was not yet connected to Claude. The owner created the
record from the exact fields given, and an API watcher continued the release when it appeared.

Token cost, dollar cost and elapsed time were not measured.
