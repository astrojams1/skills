# Connecting the YouTube APIs

Two APIs serve the growth loop. **YouTube Analytics API** (read-only) gives per-video views, engaged views, average
view percentage, watch time, likes, comments, shares and subscribers. **YouTube Data API v3** lists videos and
comments and can reply to comments, update titles and descriptions, set thumbnails and captions, and upload.

## What the owner sets up once

Signed in as the Google account that owns the channel:

1. **Google Cloud Console → New project** (for example "app-shorts").
2. **APIs & Services → Library:** enable **YouTube Data API v3** and **YouTube Analytics API**.
3. **OAuth consent screen (Google Auth Platform):** user type External, with app name and support email. Add the four
   scopes below under Data Access. Add your own address as a test user. Then **Publish app** (status "In
   production"). In Testing mode Google expires the refresh token after 7 days, which breaks unattended reads.
   Unverified "In production" apps show a warning screen at consent and are limited to 100 users, which is fine
   for one owner. **Publish app stays disabled until Branding has a home page, a privacy policy link and their
   domain under Authorized domains.** A home page alone did not unlock it (seen 2026-11-04). The privacy link must
   be a live page, never a dead link. For this owner-only client the owner chose Füd's policy
   (`https://fud-web-lovat.vercel.app/privacy`), so `fud-web-lovat.vercel.app` is authorized too. Once published the
   page says "Your app requires verification"; that is the sensitive scopes, and one owner can ignore it. The New
   Project form insists on a billing account, but the project came out with none linked, and these APIs need none.
4. **Clients → Create client → Desktop app.** Leave "Use this client for an AI-powered agent" unticked. Google says
   it is for clients that use Google MCP tools, and this one calls the REST APIs. **The secret is shown only at
   creation,** so use Download JSON in that dialog. An agent doing this should not screenshot the dialog, since the secret
   is on it. Find the button by label and take the values from the file without printing them. Put the client ID
   and secret in 1Password as a new item **"YouTube API"** in vault **"API Tokens"**, with fields `client id` and
   `client secret`.
5. Tell the agent. It runs `node yt-api.mjs auth`, which opens Google's consent page. Sign in and allow. The
   refresh token is written to the same item, through a private template file, never an argument.
   - **The owner's service account is read-only** (2026-11-04: `op item edit` fails with "Couldn't update the item",
     even for a same-title edit). A failed save loses the token.
   - So run `auth --token-file PATH`. It writes the token to a mode-600 file for the owner to add to the item as a
     field named `refresh token`. Then compare the two without printing them and move the file to the Trash.
   - With the owner's yes in chat, an agent can give the consent itself in the owner's signed-in Chrome.
     `--print-url` prints the URL for its own tab instead of opening the default browser. A second consent only re-confirms the access already granted.

Scopes (all four are requested at consent):

- `youtube.readonly`: videos, comments. The Analytics API also requires it.
- `yt-analytics.readonly`: analytics.
- `youtube.force-ssl`: comments, metadata.
- `youtube.upload`: uploads and thumbnails.

## Limits to know

- **Quota** (Data API revision history, read 2026-11-04): the default pool is 10,000 units a day. Reads cost about
  1 unit; `videos.update`, `thumbnails.set`, `comments.insert` and `commentThreads.insert` 50; `captions.insert` 400. Since
  2025-12-04 an upload costs about 100 units, and since 2026-06-01 `videos.insert` has its own bucket (about 100
  uploads a day). Analytics queries have a separate, larger allowance.
- **Public uploads need no audit any more.** Since **2026-11-02** videos uploaded by unaudited API projects are no
  longer forced private (they had been since 2020). With no `privacyStatus` an upload defaults to public. The
  pipeline never schedules (James, 2026-11-12): `yt-api.mjs upload` always sends `public`.
- **Making a scheduled video public now:** `videos.update` with `part=status`, `privacyStatus: "public"` and no
  `publishAt`, sending every other status field back (the part is replaced whole, so a field left out resets).
  `yt-api.mjs publish --episode ID --confirm` does this, reads it back until YouTube shows public with no publish
  time, and marks the episode `live` with `postedAt` set to that moment, so the 72-hour verdict starts then. Used
  2026-11-12 on 13 Shorts; each read back public within seconds.
  `yt-api.mjs upload` states `selfDeclaredMadeForKids` and `containsSyntheticMedia` every time.
- **Shorts thumbnails:** since **2026-11-03** `thumbnails.set` accepts custom thumbnails for Shorts after
  processing (with a new `shortsAspectRatio` property). Retry later if it fails right after upload.
- **Not in the API:** "Related video" on a Short, pinning a comment, and the Shorts feed metrics ("Shown in feed",
  "viewed vs. swiped away"). Pinning and Related video are not used at all: Studio needs the owner's sign-in
  (2026-11-12). Read the feed metrics in Studio only in a browser already signed in.
- **A description changes with `videos.update` (part `snippet`),** 50 units. The call replaces the whole snippet, so
  `yt-api.mjs update --description-file` sends the title, category, tags and languages back as they were, then
  reads the video back.
- **Analytics lag 48–72 hours.** The first real read is at day 3; `videos.list` gives near-real-time public counts
  for a same-day sanity check. Shorts can be split with the `creatorContentType` dimension (`SHORTS`).
- **Views vs. engaged views:** public views now count every start (2025-03-31) and, for all formats, the first
  frame (2026-08-24). Compare Shorts on `engagedViews`.

## Without the API (works today)

Studio in Chrome: Content → Shorts → a Short → Analytics. The Overview tab shows views, engaged views, "viewed vs.
swiped away", average view duration and percentage, likes and subscribers. Copy the numbers into the episode's
`metrics` as a snapshot with `"source": "studio"` and the read time. `get_page_text` on the Analytics page is
enough; no screenshots of the owner's channel go into any repository.
