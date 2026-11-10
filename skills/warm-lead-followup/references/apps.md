# App profiles

Keep the workflow shared and the app facts apart. To add an app the owner asked for, copy the Pipsqueak profile.
Replace its ID, mailbox, team identities, goals, qualification, discovery queries, links and authority. Don't enroll
another app just because Jinjin mentions it in the same inbox.

## What a profile holds

A profile records `app_id`, display name, mailbox, outreach owner, coordinator and time zone. It also holds goals,
qualification needs, discovery queries, followup policy, verified links and action authority. A link stays null
until its current access is verified. Profile fields are settings. They never replace reading the email.

## What stays private

Keep live lead contacts, thread and message IDs, current permissions, scheduling IDs and runtime state only in the
private deployment ledger. Git holds reusable instructions and app context. It never holds copied mail bodies or
the live lead list. A cloud deployment keeps its chosen profile beside its lead register, so the worker runs
without local files.

The committed Pipsqueak profile is inactive. It leaves the mailbox, sending authority and account identities unset.
Load the configured profile and the original authorization reference from the private deployment ledger before you
act. A copied profile does not authorize unrelated accounts, new apps or bigger commitments. Sign as the connected
account owner. The cold outreach stays with the person who sent it.

## Pipsqueak

Look for speech-language experts who can steer app activities, parent guidance and priorities.

- Confirm iPhone access before hands-on review or testing. It is not proof of expert fit, and unknown access does
  not block an intro call. An Android-only expert may still advise, but can't be given iPhone testing.
- Verify any app or TestFlight link, and the current access steps, before you share them.
- Ask for feedback on workflow and priorities. Don't assume an endorsement.
- Never ask for records that identify a child or patient.

## Timing

The default timing is a fallback. A request or an agreement already in the thread comes first.

- **First followup:** after three business days. Count weekdays in the profile's time zone, leaving out known
  holidays. Don't guess a recipient's time zone from an email server timestamp.
- **After the one gentle nudge:** wait seven business days. Then flag the stalled thread to the owner instead of
  sending another automatic nudge.
- **A blank or unclear reply:** it may get one clarification, if the team has not sent one already. After that, wait
  for the person to clarify or for an owner decision.
