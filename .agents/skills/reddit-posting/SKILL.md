---
name: reddit-posting
description: Write, post and follow up Reddit posts and replies for a project, such as recruiting app testers, test-for-test swaps or launch notes, in a wildly concise voice that matches the subreddit. Use when asked to post on Reddit, recruit testers there, answer Reddit comments, or keep a Reddit outreach log.
metadata:
  version: "1.1.0"
---

# Reddit posting

**Write short, plain, useful posts that read like the subreddit's best regulars.** Log each one, so the next session
knows what was said, where, and what is owed.

Done means: the owner approved every post and reply on its exact text. Each is logged with its URL and any promise
made or kept.

## A run

1. **Read the project's Reddit file** before drafting: the path its agent instructions name, default
   `docs/reddit.md`. It holds the campaign, the approved copy, links, and an append-only log of posts and replies.
   If it is missing, create it with those sections.
2. **Learn the subreddit.** Check [references/subreddits.md](references/subreddits.md). If the subreddit's rules and
   three recent posts are not on record, ask the owner to paste them (text or screenshots). Record what you learn in
   the project's file. From a checkout of the skills repository, also add general observations to that reference.
3. **Draft** the exact title and body in a code block, ready to paste. Show the title's character count. Fill every
   link. Never post a placeholder.
4. **Approve and post.** The owner approves and posts, then gives you the URL. Log the date, subreddit, title, URL
   and what was promised (for example "test their app back").
5. **Manage.** When the owner pastes the thread (or a screenshot), draft a one-line reply for every comment that needs
   one. Batch them for one approval. Keep promises: if a swap was offered, do the other app's test and say so in one
   line. Log each reply and each promise kept.
6. **Close.** When the goal is met, post one line ("Full, thanks.") if the thread is still active. Log the outcome.

## Voice: wildly concise

- **Title:** 8 words or fewer. Say what it is and what you want.
- **Body:** 5 short lines at most. One ask. Links last, one per line.
- **Reply:** one line. Two if a question needs an answer and a thank-you.
- **Cut the filler:** greetings, backstory, adjectives, apologies, emoji, hashtags, "I hope", "feel free", "any
  feedback appreciated", and a closing thanks paragraph.
- **Make the ask simply.** Say what you need and how to help, in the words you would say to a person. No taglines,
  slogans, pitch lines or product adjectives. Describe the product only if the ask needs it, in one plain clause.
  Follow the project's messaging rules (for example, words it never uses).
- **Match the subreddit first.** If regulars use `[Test for test]` titles or a fixed
  template, use it.

[references/tone.md](references/tone.md) has templates and before/after cuts.

## Rules

- **The owner posts; the agent drafts.** Reddit is blocked for agent tools (the desktop built-in browser, Claude in
  Chrome and web fetch) as of 2026-10-15. Don't route around it with curl, mirrors or other tools.
- **The owner signs in** if a later session can reach Reddit. Never type, store or ask for the Reddit password.
- **Approve every post and reply.** Each needs the owner's yes on the exact text before it is sent, even if they said
  future ones need none.
- **Never game Reddit.** Never buy upvotes, testers or reviews. Never use a second account. Never post the same text
  to several subreddits on the same day. No unsolicited DMs. No delete-and-repost.

## Gotchas

- **Many subreddits remove tester requests (2026-10-15).** r/androiddev does. Post only where the rules allow it.
- **Check the Play account before recruiting (2026-11-07).** Google's rule of 12 testers for 14 days covers only
  personal accounts created after 2023-11-13. Recruit for it only then. Where it applies, testers must join with the
  Google account on their phone. Leaving before day 14 does not count, and 15 to 20 testers covers drop-offs. Closed
  testers must buy a paid app, so say how that is handled.
- **Keep contact details out.** No owner email or phone in a post unless the project's copy already publishes it.

## Ledger

[ledger/LEDGER.md](ledger/LEDGER.md) is append-only. Read it before a run. Each run's record and posts go in the
project's own Reddit file. The copy installed in a project is rebuilt on refresh, so a row added there is lost. Don't
edit the installed copy or the skills submodule. Add a row here only from a checkout of the skills repository, for
lessons that should change this skill.
