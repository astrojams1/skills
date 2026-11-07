# Hacker News

For **developer tools only**. Hacker News readers write software, so a tool built for that work can reach people
who would install it. Anything else stays off Hacker News. A game, a news app or a family app gets no `hackerNews`
block, and nothing here applies to it.

Hacker News's rules govern everything here: [Show HN](https://news.ycombinator.com/showhn.html),
[guidelines](https://news.ycombinator.com/newsguidelines.html) and [FAQ](https://news.ycombinator.com/newsfaq.html).
Read them again before each post; they change. When this page and theirs disagree, theirs wins.

## Who posts

The Mac pass posts the link from the owner's own Hacker News account, in the browser where they are already signed in.
The owner decided this on 2026-11-07, knowing that Hacker News asks people not to automate posting: "I'm typically
already signed in to hacker news so you should have no problem posting", then "Skill posts it itself". Their account
and their sites carry the risk. So keep each post to what Hacker News asks of a person:

- **A link and a title, nothing more.** Leave the text field empty, since Hacker News asks for no generated text in posts.
  Never comment, reply, vote or flag, in this thread or any other.
- **The owner answers the thread.** A Show HN is from the maker, who is "around to discuss". Put the thread link at the
  top of the run's report so they see it.
- **Never sign in.** If the browser is not signed in to Hacker News, or no browser can be reached, log the item `deferred`
  with a `retry_after` and move on. Never enter a password, never create an account, and never use any account but the
  owner's.

## Is the app a fit?

Give the profile a `hackerNews` block only when all of these are true:

- **It is a developer tool.** Its main users write, ship or run software. Examples: a git, API, log, database,
  terminal or simulator tool, a local model runner, or a developer's utility for the Mac. An app that developers merely
  like is not one.
- **People can try it now, without signing up.** A free download, a free trial or open source. A paid-only download,
  a waitlist, a landing page or a signup wall does not qualify (Show HN: "make it easy for users to try your thing out").
- **It is substantial.** Show HN asks for no "quickly-generated one-offs". A point release ("Foo 1.3.1 is out") is not a
  reason to post; a major overhaul can be.
- **The owner made it.**

```json
"hackerNews": {
  "url": "https://...",
  "title": "Show HN: Name – what it does, in plain words",
  "tryIt": "Free download on the Mac App Store; no account",
  "notes": ["Facts for the owner's first comment in the thread: why it exists, how it works, what is unfinished"]
}
```

- **`url`** is where someone can try it: the store page, the repository, or a page with a download link. It is not a
  landing page.
- **`title`** starts with `Show HN: ` and fits in 80 characters. Write it plainly, with no hype words, exclamation marks or
  shouting. `check` enforces this.
- **`notes`** holds facts only, with no prose to paste. The owner writes any comment.

Add a backlog item for it: `{"id": "show-hn", "title": "Show HN", "channel": "hacker-news", "runner": "mac",
"impact": 4, "effort": 1}`.

## Posting

1. `node $R/marketing.mjs hn --app <id>`. This searches Hacker News (`hn.algolia.com`) for earlier stories with the app's
   URL or a Show HN naming it, reads the ledger, and says `due` or `not due` with the reason. Run it right before posting,
   on the same day.
2. **Not due:** log the item `skipped` with the reason as `reason`. When `hn` says it was already discussed or reposted,
   also set `dropped: true`; it is finished for good. Otherwise log `deferred` with a `retry_after`.
3. **Due:** in the owner's signed-in browser, open the `submit` link. It is Hacker News's own form, filled with the
   profile's title and URL. Check that both fields match the profile exactly and the text field is empty, then press
   submit once. If Hacker News refuses the post (rate limit, duplicate, "you're posting too fast") or the page is unexpected,
   do not retry and do not change the title to get past it. Log `failed` with the message.
4. **Verify.** Open the new item, or find it with `hn`, and confirm the title, URL and the owner's username. Log an
   `action` with `channel: "hacker-news"`, `status: "ok"`, `operation: "Show HN posted"` and the item URL as `evidence`.
   Lead the run's report with "Show HN is live, answer the thread:", the item URL and the `notes`.
5. **Later runs:** `hn` lists the story. Log its points and comments as a `finding`. Never repost to get a better result
   outside the limits below.

## Limits `hn` enforces

- **One post a month, across all apps.** Hacker News says posting your own work is fine "part of the time".
- **No second try after real attention.** If a story about the app got 10 or more points, or 5 or more comments, in
  the last year, there is no repost.
- **At most one repost.** It is allowed only when the earlier story got no real attention, and only 14 days or more
  after it. The limit is two submissions per app in any 365 days.

## Never

- Never ask anyone to upvote, comment or share the link, and never post it anywhere asking for votes. Hacker News
  penalises or bans sites for this.
- Never delete and resubmit.
- Never use a second account, and never create an account.
- Never write comments or replies for the thread.
