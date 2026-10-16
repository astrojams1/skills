---
name: reddit-posting
description: Write, post and follow up Reddit posts and replies for a project, such as recruiting app testers, test-for-test swaps or launch notes, in a wildly concise voice that matches the subreddit. Use when asked to post on Reddit, recruit testers there, answer Reddit comments, or keep a Reddit outreach log.
metadata:
  version: "1.0.1"
---

# Reddit posting

Short, plain, useful posts that read like the subreddit's best regulars, logged
so the next session knows what was said, where, and what is owed.

## Voice: wildly concise

- Title: 8 words or fewer. Say what it is and what you want.
- Body: 5 short lines at most. One ask. Links last, one per line.
- Reply: one line. Two if a question needs an answer and a thank-you.
- Cut greetings, backstory, adjectives, apologies, emoji, hashtags, "I hope",
  "feel free", "any feedback appreciated", and a closing thanks paragraph.
- Make the ask simply: what you need and how to help, in the words you would
  say to a person. No taglines, slogans, pitch lines or product adjectives;
  describe the product only if the ask needs it, in one plain clause. Follow the
  project's messaging rules (for example, words it never uses).
- Match the subreddit's format before your own taste: if regulars use
  `[Test for test]` titles or a fixed template, use it.

[references/tone.md](references/tone.md) has templates and before/after cuts.

## Access and permission

- Reddit is blocked for agent tools (the desktop built-in browser, Claude in
  Chrome and web fetch) as of 2026-10-15. Do not route around it with curl,
  mirrors or other tools. The owner posts; the agent drafts.
- If a later session can reach Reddit: the owner signs in themselves. Never
  type, store or ask for the Reddit password.
- Every post and reply needs the owner's yes on the exact text before it is
  sent, even if they have said future ones need none. Batch replies into one
  approval to keep that cheap.
- Never buy upvotes, testers or reviews; never use a second account; never
  post the same text to several subreddits the same day; no unsolicited DMs;
  no delete-and-repost.

## Workflow

1. **Read the project's Reddit file** before drafting: the path its agent
   instructions name, default `docs/reddit.md`. It holds the campaign, the
   approved copy, links, and an append-only log of posts and replies. Create it
   if missing, with those sections.
2. **Learn the subreddit.** Check [references/subreddits.md](references/subreddits.md).
   If the subreddit's rules and three recent posts are not on record, ask the
   owner to paste them (text or screenshots), then record what you learn there
   (generic observations only) and in the project's file.
3. **Draft** the exact title and body in a code block, ready to paste. Show the
   character count of the title. Fill every link; never post a placeholder.
4. **Approve and post.** The owner approves and posts, then gives you the URL.
   Log date, subreddit, title, URL and what was promised (for example "test
   their app back").
5. **Manage.** When the owner pastes the thread (or a screenshot), draft one-line
   replies for every comment that needs one, batched for one approval. Keep
   promises: if a swap was offered, do the other app's test and say so in one
   line. Log each reply and each promise kept.
6. **Close.** When the goal is met, post one line ("Full, thanks.") if the
   thread is still active, and log the outcome.

## Gotchas

- Many subreddits remove tester requests outright (r/androiddev does). Post
  only where the rules allow it.
- Google Play closed tests: testers must join with the Google account on their
  phone, and leaving before day 14 does not count. Recruit 15 to 20 for 12.
  Paid apps must be bought by closed testers; say how that is handled.
- Read-only Reddit mirrors (Redlib) are often down or block bots; do not
  depend on them.
- Do not paste the owner's email or phone into a post unless the project's
  copy already publishes it.

## Ledger

[ledger/LEDGER.md](ledger/LEDGER.md) is append-only. Read it before a run; add a
row after, with lessons that should change this skill. Project posts go in the
project's own file, not here.
