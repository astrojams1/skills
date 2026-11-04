# Policy risks for a templated Shorts pipeline

Read 2026-11-04. These policies decide whether a channel that publishes many similar-shaped Shorts keeps its reach,
its monetisation and its existence.

## Spam: automated or synthetic mass-production (removal)

The spam policy bans using automation or AI to produce many similar videos with minimal changes. Its own example is
channels using "the exact same background music and repetitive AI generated imagery across many videos"; it also
says "posting a few variations of a video is ok". Three strikes in 90 days can terminate a channel.
(support.google.com/youtube/answer/2801973)

For this pipeline:

- **Vary the bed.** `soundtrack.mjs` derives tempo, key, progression, pattern and feel from a seed (default: the
  output file's name); record its printed signature as the episode's `music`, and `shorts.mjs record` warns on a
  repeat. The first Füd series shared one bed across three Shorts before this rule existed.
- **Vary the input and the hook,** not just the caption text. A series is the same shape with a different real
  moment each time.
- **A human approves each concept and watches each final cut** before it is posted. Automate rendering, checks and
  packaging, not taste.

Enforcement is active: YouTube's CEO named low-quality AI content a 2026 priority, and such channels were
terminated in late January 2026 (tubefilter.com/2026/01/29/youtube-ai-slop-channel-crackdown-bans).

## Inauthentic content (monetisation)

Since 2025-07-15 the Partner Program's "repetitious content" is "inauthentic content": videos that look made with
a template, mass-produced content, and slideshows or scrolling text with little narrative cannot be monetised, and
the whole channel can lose monetisation. A shared intro and outro is fine when each video has its own idea.
(support.google.com/youtube/answer/1311392)

## Altered or synthetic content (disclosure)

Disclose realistic synthetic content (real-looking people, places or events that did not happen) and AI music
that is the video's main focus. Production help and clearly unrealistic effects are exempt. A real screen recording
of the app with code-synthesised sound effects and bed answers "No"; that reading is an inference, so answer "Yes"
whenever a Short adds realistic generated imagery or voice. API: `status.containsSyntheticMedia`.
(support.google.com/youtube/answer/14328491)

## Made for kids

A video is made for kids when children are its primary audience, or one of its audiences, judged by subject,
characters, music and style. A Short aimed at parents (a parent's lunch, logging dinner for the family) is general
audience. A calm alphabet loop for toddlers may well be made for kids. Decide truthfully per Short: answering
"made for kids" turns off comments and Test & Compare. (support.google.com/youtube/answer/9528076)

## One channel or several

One channel carries every app today. Separate channels for different audiences (kids' games and a news app) are
allowed, but the spam policy covers "coordinated networks of channels", and an owner whose channel is terminated
may not use or create others (support.google.com/youtube/answer/2802168). Creating a channel is the owner's
decision, never the agent's.
