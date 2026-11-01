# 2026-11-01: Füd 1.3.0 app preview and App Store promotion

Skill 2.9.1 → 2.10.0. App ledger: [Füd release records](https://github.com/wendigo124/FSRN_Subs/blob/main/store/ledger.json).

The owner asked for a high-quality video tour for the product page, for every other way Apple offers to present
and promote an app, and for all of it to land in this skill so every app does the same, before submitting 1.3.0.

| Step | Result |
|---|---|
| Research | Apple's pages and API docs read 2026-11-01: previews moved to the Asset Library (API 4.5.1 deprecated `appPreviewSets`), 886x1920 for every Face ID/Dynamic Island/Duo iPhone, 15–30 s, ≤30 fps, audio track required; header/search creatives, Duo, custom product pages, product page tests, In-App Events, nominations (API since 3.8), promotional text, Smart App Banner, ratings prompt, medical device declaration (blocks updates from early 2027) |
| Capture | Release-configuration simulator build of the submitted source on an iPhone 17 simulator, seeded synthetic family, one rehearsal (consent prompt, meal choice that reads well), then one 226 s take |
| Cut | `app-preview.swift render`: 8 clips, 6 captions in the app's font on its screenshot artboard, sign-in disclosure on the last frame; 29.3 s, 886x1920, 30 fps, H.264 with silent stereo AAC; `check` passed |
| Upload | `asc.mjs assets upload/place` on `APP_PREVIEW` / `IPHONE_DYNAMIC_ISLAND_MEDIUM_PROFILE`, poster at 14.5 s; results in the app ledger |

| Issue | Fix | Verified |
|---|---|---|
| Render hung with the writer never accepting video | Feed silence up to 1 s ahead of the video, only while the audio input is ready | Render ran past the first stall |
| Render hung again in the last second | Mark the audio input finished as soon as the silence is complete | Full 878-frame render in 9 s; `check` passed |
| A described home-cooked dish matched a restaurant entry with no fiber, so the day's fiber total read "—" | App/API follow-up, kept out of the cut; not a release-process issue | Recorded in the app ledger |

Cost: no paid service beyond the app's own OpenAI calls for three described meals.
