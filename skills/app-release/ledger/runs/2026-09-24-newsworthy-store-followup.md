# Newsworthy — store readiness follow-up

Recorded: **2026-09-24**. Skill version: **1.0.9**. Token/cost metrics: unknown.

This sanitized checkpoint records fresh readbacks supplied by the release task.
The [canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md)
remains authoritative; earlier snapshots remain unchanged.

## Fresh store gates

- iOS build **21** remained **WAITING_FOR_REVIEW**. Approval and public
  availability were not established.
- Apple Business showed **Paid Apps: Pending User Info**, no bank account,
  **W-9 Active** and **DSA Active**. The old legal address remained visible.
  These are separate gates; an active tax form does not establish paid readiness.
- Google **Create app** remained disabled. Real Android device verification and
  phone verification were still required.

## Support correspondence evidence

The Gmail connector failed with a reauthentication requirement, but the existing
signed-in Gmail browser worked. Apple support requested proof on **September 18**.
A generic developer email on **September 20** acknowledged receiving documents
and said review was pending. That email did **not explicitly identify the case**,
so exact case linkage was not established. Neither the generic acknowledgment nor
the earlier proof request establishes that Apple corrected the legal address;
the fresh Business page still showed the old address.

No private email text, case number, address or personal details are retained here.

## Android artifact and push setup

Android **AAB 11** predates the Settings and notification changes. Its prior
verification does not cover the current source or listing scope, so a replacement
artifact and appropriate native checks are still needed before release.

The current Android configuration lacked **`googleServicesFile`**, and the
Firebase account had no Newsworthy project. A project form was prepared with the
Newsworthy name, but Firebase terms remained unchecked pending explicit legal
confirmation. **No Firebase project or key was created** at this checkpoint.

## Lessons

- Re-evaluate artifact coverage whenever source features or listing claims change.
  A build verified for an earlier scope must be superseded for the new scope;
  old verification cannot be carried forward as proof of new functionality.
- A generic document-receipt email proves only what it says. Preserve uncertain
  case linkage, pending review and an unchanged legal record as separate facts.
- Test existing authenticated alternatives when a connector needs reauthentication.
  A functioning signed-in browser can unblock reading without new credentials.
- A prepared setup form is not provisioned infrastructure. Record unchecked terms,
  required confirmation and absent project/key state without implying completion.
