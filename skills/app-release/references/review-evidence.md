# Review evidence and reply-only requests

**Follow the current message's requested next step.** A rejection does not always call for a new build or submission.
Apple's 4.3/4.2.6 message observed on 2026-11-14 asked for a reply, with no resubmission when disputing the finding.
This checklist implements that request and Apple's [review reply process](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages/).
It does not add a gate to unrelated apps.

## Read the whole request

- Match the team, app, submission, version and attached build before preparing answers.
- Expand each new message. If accessibility text stops mid-sentence or omits a numbered list, inspect the rendered
  message in screenshots, scrolling to its end. An accessibility tree can omit text that is visible on screen.
- Preserve the guideline, all questions, attachments and the requested action in the app's records.
- Keep three facts separate: what Apple says, what the evidence proves, and what remains unknown.

## Originality and template questions

For a 4.3/4.2.6 request, answer the actual questions in order. The observed nine-part request covered:

| Question | Evidence to prepare |
|---|---|
| Purpose and problem | Explain the real workflow in your own words, beyond the marketing description. |
| Intended users | Name the specific audience and its task. |
| Unmet need | Describe concrete differences and limits; do not claim no competing app exists without evidence. |
| Beta testing and changes | Give real feedback examples and the fixes present in the submitted build. Keep simulator QA, owner use and external beta feedback distinct. |
| Standalone product or suite | Compare its scope with the other apps on the same account. |
| Consolidation | Explain whether another app could contain it and why it has a separate purpose. |
| Shared code or assets on the account | Inspect source and resources; name shared components and their role. |
| Shared third-party code or content | Identify frameworks, libraries and content sources; explain the app's own work. |
| Content provider and submitting account | Verify who provided the concept, content and brand, and who submits it. Do not infer ownership or legal authority from a repository name. |

Check these against the **submitted build's source and retained QA records**. Later features are not proof about
that build. State gaps honestly. Do not invent beta testers, endorsements, exclusive features, rights or client facts.
Describe generated media and development tools accurately; their use alone does not establish a commercial template.
The relevant platform rules are [4.3 and 4.2.6](https://developer.apple.com/app-store/review/guidelines/#design).

If Apple says to reply without resubmitting, send the complete, evidenced reply through the authorized session.
Read it back. Keep the version and issue open while Apple considers it. A sent reply is not a new submission,
approval or public release. If a requested fact is missing, prepare the rest and record that exact dependency.

## A rejection repeats after a fix

Read the new message and its attachments before extending the old diagnosis. A prior fix, passing fixture test or
new build does not prove that the new review encountered the same path. Recheck the exact build, saved Notes and
all reachable app or embedded-web flows relevant to the complaint. For changed third-party pages, retain the date
and observed behavior. Do not present a suspected cause as Apple's finding.

If the new message gives no reproducible path and the cause remains unknown after these checks, reply with the
verified behavior and ask Apple for the screen, steps or screenshot needed to reproduce it. Keep the issue open.
Do not create unrelated purchases, claim an earlier guideline is cleared, or blindly resubmit the same package.
