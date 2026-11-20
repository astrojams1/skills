# Marketing schedules shared by Claude and Codex

Both providers use the same business repository, group, job and nominal occurrence ID. The live schedule definitions, original Claude instructions, machine paths and rollback copies are private to the installation. Existing delivery workflows retain their queues and provider records.

## Running a pass

A scheduled occurrence uses the scheduled local date and time, such as `2026-11-21.0530`. An opened issue uses `issue.<number>.<created_at Unix seconds>`. Use the existing routine's timezone and pass scope throughout, including after midnight or a handoff.

1. Read the group's status with `python3 bin/marketing_gate.py --repo CHECKOUT --group GROUP status`. The repository must be a private origin shared by both workers. Initialize it once using `init` before enrolling the schedule.
2. Use the same command prefix with `claim --job JOB --slot SLOT --engine claude` or `codex`. Only `acquired` permits work. Save its token privately. A running claim excludes every other job in that group. A finished occurrence stays finished. If another occurrence needs resumption, recover its actual job, capabilities and nominal slot.
3. Read the returned checkpoint, pending effects, business ledger and any unmerged work before continuing. Put durable paths, branch names, PRs and provider IDs in checkpoints. For a remote worker, push recoverable work before yielding. Keep credentials, recipient details and message bodies out of coordination records.
4. Run `checkpoint --token TOKEN --note REFERENCE` at milestones and at least every 20 minutes. Each accepted mutation refreshes the 90-minute lease. An explicit `yield` makes an interrupted pass immediately available. On `lost` or an unavailable store, stop all work and cancel helpers. A replacement receives a new token.
5. Before each externally visible change, claim its stable business operation with `begin --token TOKEN --effect KEY --note REFERENCE`. The key identifies the underlying action across providers and schedule slots. Use existing queue IDs, stable request IDs or provider idempotency keys. Only `started` permits execution. On `already-resolved`, reuse the receipt. On `reconcile`, look up the existing intent in the live provider and business ledger. When a result is verified, run `resolve --token TOKEN --effect KEY --note RECEIPT`. A group keeps one pending external operation at a time.
6. If a request has an unknown outcome, checkpoint it. Retry only with the same provider-enforced idempotency key, or after verifying the previous worker has stopped and the provider definitively rejected or never received the request. For a verified safe retry, record the evidence with `retry --token TOKEN --effect KEY --note EVIDENCE` and acquire a fresh `begin` before executing. Keep an unverifiable outcome pending. Provider-specific senders and queues remain the delivery authority.
7. Run `done --token TOKEN --note RECEIPT` after verifying the original skill's completion criteria. Unresolved effects prevent completion. Only the current owner can advance a pass.

## Storage and cloud access

Each group uses an orphan branch named `marketing-coordination-v1-<group>` in its private business repository. Git writers compare and swap the expected branch head. The branch holds coordination state and disables Git deployments. Leave the branch out of application PRs. Older finished slots and receipts remain available through immutable ancestor commits. The active file stays small enough for a GitHub connector.

Cloud sessions with restricted branch permissions can run `marketing_mcp.py prepare` followed by the same gate arguments. Submit the exact returned file content and expected blob SHA through GitHub's create-or-update-file operation. Run `marketing_mcp.py confirm RECEIPT`. Only confirmed results authorize action. A conflict requires a new read and proposal. If the connector fails, the other provider can still claim the work. Keep the local receipt private.

## Cutover and recovery

Export original briefs, schedule and event registrations. Start the shared gate on Claude, verify the saved instruction, then enroll that job on Codex at the cutover instant. Treat any earlier in-flight runs as legacy work. Reconcile such a run explicitly before handing it to a new worker.

`marketing_due.py --catalog FILE --plan` previews nominal work offline without claims. In normal mode the dispatcher resumes expired or yielded work before starting a new pass in that group. A short head start alternates by local date. Use the portfolio's own registries and operating procedures to verify production work. Use a separate disposable group for coordination tests.

To roll back, stop both Codex entry points and remove the job from its catalog. Wait for workers to stop, inspect pending operations in the group and reconcile them before restoring the saved Claude instructions. Preserve the private coordination history for subsequent handoffs.

## Local Codex worker

`marketing_worker.py` polls the private catalog and starts a subscription-authenticated Codex CLI only after acquiring work. It uses two independent worker lanes, an OS lock per lane and the shared remote gate. It saves each assignment privately, checks the durable completion or yield on exit, and backs off after a failed launch or quota error. An expired group lease can be recovered from another host. An inherited lane lock also lets a restarted supervisor detect a surviving local process.

Use `--check` with the catalog, runtime directory and worker protocol template to inspect login, heartbeat, cooldown and worker state without claiming anything. A `PAUSED` file beside the catalog stops new local claims. The native Codex recovery automation checks the supervisor hourly from the signed-in local host. It restarts the supervisor when needed and can run a single poll with the same mutex and remote ownership rules. Claude cloud schedules remain available while the Mac sleeps.
