# App profiles

Keep the workflow shared and the app facts separate. Copy the Pipsqueak profile for a newly requested app, replacing its ID, mailbox, team identities, goals, qualification, discovery queries, links and authority. Do not automatically enroll other apps merely because Jinjin mentions them in the same inbox.

The profile records `app_id`, display name, mailbox, outreach owner, coordinator, timezone, goals, qualification requirements, discovery queries, followup policy, verified links and action authority. Links without verified current access remain null. Profile fields are configuration, not a replacement for reading the email.

Persist live lead contacts, thread/message identifiers, current permissions, scheduling IDs and runtime state only in the private deployment ledger. Git contains reusable instructions and app context, never copied mail bodies or the live CRM. A cloud deployment stores its selected profile beside its lead register so the worker can run without local files.

The committed Pipsqueak profile is inactive and leaves mailbox, sending authority and account identities unset. Load the configured profile and original authorization reference from the private deployment ledger before acting. A copied profile does not authorize unrelated accounts, new apps or expanded commitments. Sign as the connected account owner; the originator's cold outreach remains theirs.

Default timing is a fallback: an explicit request or existing agreement in the thread takes precedence. A followup after three business days means weekdays in the profile timezone, excluding known holidays; do not assume a recipient's timezone from an email server timestamp. After the first gentle warm-lead nudge, wait seven business days and flag the stalled thread to the owner instead of sending another automatic nudge. A blank/unclear reply may get one clarification if the team has not already sent one; thereafter wait for clarification or an owner decision.
