# Connecting the YouTube APIs

Two APIs serve the growth loop. **YouTube Analytics API** (read-only) gives per-video views, engaged views, average
view percentage, watch time, likes, comments, shares and subscribers. **YouTube Data API v3** lists videos and
comments and can reply to comments, update titles and descriptions, set thumbnails and captions, and upload.

## What the owner sets up once

Signed in as the Google account that owns the channel:

1. **Google Cloud Console → New project** (for example "app-shorts").
2. **APIs & Services → Library:** enable **YouTube Data API v3** and **YouTube Analytics API**.
3. **OAuth consent screen:** user type External; app name and support email; add the three scopes below; add your
   own address as a test user. Then **Publish app** (status "In production"). In Testing mode Google expires the
   refresh token after 7 days, which breaks unattended reads. Unverified "In production" apps show a warning
   screen at consent and are limited to 100 users, which is fine for one owner.
4. **Credentials → Create OAuth client ID → Desktop app.** Put its client ID and client secret in 1Password as a new
   item **"YouTube API"** in vault **"API Tokens"**, with fields `client id` and `client secret`.
5. Tell the agent. It runs `node yt-api.mjs auth`, which opens Google's consent page: sign in, allow, and the
   refresh token is written to the same item (through a private template file, never an argument). If the vault's
   service account is read-only, add the `refresh token` field yourself from the value the agent cannot see. In
   that case the agent says so and stops.

Scopes (all four are requested at consent): `youtube.readonly` (videos, comments; the Analytics API also requires
it), `yt-analytics.readonly` (analytics), `youtube.force-ssl` (comments, metadata) and `youtube.upload` (uploads and
thumbnails).

## Limits to know

- **Quota** (Data API revision history, read 2026-11-04): the default pool is 10,000 units a day. Reads cost about
  1 unit; `videos.update`, `thumbnails.set` and `commentThreads.insert` 50; `captions.insert` 400. Since
  2025-12-04 an upload costs about 100 units, and since 2026-06-01 `videos.insert` has its own bucket (about 100
  uploads a day). Analytics queries have a separate, larger allowance.
- **Public uploads need no audit any more.** Since **2026-11-02** videos uploaded by unaudited API projects are no
  longer forced private (they had been since 2020). With no `privacyStatus` an upload defaults to public. To
  schedule, upload as `private` with `status.publishAt`; it only works on a never-published private video.
  `yt-api.mjs upload` states `selfDeclaredMadeForKids` and `containsSyntheticMedia` every time.
- **Shorts thumbnails:** since **2026-11-03** `thumbnails.set` accepts custom thumbnails for Shorts after
  processing (with a new `shortsAspectRatio` property). Retry later if it fails right after upload.
- **Not in the API:** "Related video" on a Short, pinning a comment, and the Shorts feed metrics ("Shown in feed",
  "viewed vs. swiped away"). Use Studio for those.
- **Analytics lag 48–72 hours.** The first real read is at day 3; `videos.list` gives near-real-time public counts
  for a same-day sanity check. Shorts can be split with the `creatorContentType` dimension (`SHORTS`).
- **Views vs. engaged views:** public views now count every start (2025-03-31) and, for all formats, the first
  frame (2026-08-24). Compare Shorts on `engagedViews`.

## Without the API (works today)

Studio in Chrome: Content → Shorts → a Short → Analytics. The Overview tab shows views, engaged views, "viewed vs.
swiped away", average view duration and percentage, likes and subscribers. Copy the numbers into the episode's
`metrics` as a snapshot with `"source": "studio"` and the read time. `get_page_text` on the Analytics page is
enough; no screenshots of the owner's channel go into any repository.
