# Durable lead state and activity events

## Skill activity

Every invocation has one unique `run_id` and records start, meaningful action/finding, verify and end. Each event is one JSON object with required `v:1`, UTC ISO-8601 `ts`, `run_id`, canonical `skill`, `agent`, `event` (`start|action|finding|verify|end`) and `status` (`running|ok|failed|skipped|deferred|partial`). Optional fields are `targets`, `operation`, `evidence`, `metrics_before`, `metrics_after`, `artifacts`, `rollback`, `reason`, `next`, `elapsed_ms`.

Use source identifiers, decisions and counts rather than message contents or complete command arguments. Never put secrets, full mail text, health records or unrelated personal data in activity events. Keep an event below 16 KiB.

On the owner's Mac, append to `/Users/astro/Library/Application Support/AgentActivityLedger/events.jsonl`. The bundled helper defaults to this location on the owner's account. It uses the shared parent-directory `.lock`, private permissions and fsync, and compresses archives after 8 MiB. Feed one JSON object on stdin to `python3 scripts/activity_ledger.py`; use `--path` only for an explicitly configured destination or isolated tests. Read only relevant recent events and preserve archives.

A hosted run has no such filesystem. There, append the same JSONL schema to the private cloud ledger's activity section, with guarded Page edits and readback. Record `local_mirror: deferred` in structured evidence; do not claim the Mac ledger was written. The cloud ledger is durable run storage, while transient sandbox files are not. A later local run may import cloud events by `(run_id,event,ts)` without duplicating them. Report a failed append rather than claiming the invocation was recorded.

## Private lead register

Keep a machine-readable JSON object in the private cloud Page, with `schema_version:1`, `apps`, `leads`, `actions`, `scan`, and `runtime`. The Page's readable summary is a view of this object; update both in a guarded edit. Keep the live register out of Git.

Each lead is keyed by `(app_id,mailbox,thread_id)` and contains:

- Contact and role; `temperature` (`unknown|cold|warm`), `stage` (`needs_context|needs_clarification|waiting_on_lead|waiting_on_us|meeting_proposed|meeting_scheduled|testing|feedback_due|active|closed|do_not_contact`), and concise decision rationale.
- `last_message_id`, `last_inbound_message_id`, `last_team_message_id`, relevant `source_message_ids`, `last_reviewed_at` and a Gmail thread link. These IDs refer to messages actually read; a timestamp alone is not deduplication.
- Qualification facts and source: for Pipsqueak `iphone_access` is `unknown|yes|no`; distinguish a statement from a verified install. Keep expertise and device access separate.
- `next_action`, `next_owner` (`agent|lead|James|Jinjin`), `due_at`, `last_team_touch_at`, `nudge_count`, and any meeting/access/feedback evidence. Keep every open lead actionable even when waiting.
- `stop_reason` for an opt-out, decline or close. An opt-out suppresses outreach to that contact across related threads for the app. Do not reset it because a scan rediscovers an old message.

An action contains a deterministic `key` (app/mailbox/thread/trigger-message/kind), `run_id`, `status` (`claimed|sent|verified|failed|unknown|cancelled`) and `claimed_at`. It also holds the intended operation and recipient IDs, provider message or event IDs when present, and the last reconciliation result. Claims must be persisted and read back before sending. A stale or unknown claim requires reconciliation and, if still unresolved, owner review; elapsed time is not permission to resend. Claims and action history survive scan watermarks and retries.

`scan` records query coverage, continuation tokens, the last fully completed watermark, and failure state. Save partial progress without advancing the successful watermark. Always rescan open/due threads and use an overlap for new discovery. `runtime` records hosted controller/worker IDs, returned schedule, timezone, runtime, enabled state, skill source version and verified run evidence. Distinguish provider-observed facts from desired settings.

## Page concurrency and recovery

Read the Page and retain its returned target ID, stream, block IDs/hashes and sequence. Replace only the register/summary blocks being changed. Append activity events with the same guards. A stale guard requires a fresh read and reconciliation, never an unguarded overwrite. Two runs may read the same snapshot; only one guarded claim may win. Read back the winning claim before acting. Persist a completed action and its verified evidence before processing another external action.

On a Page write timeout, reread before retrying. On a send timeout, search Sent and reread the thread before any retry. If outcome remains unknown, record it and ask the owner to resolve that specific action. Never claim exactly-once delivery: this protocol prevents blind retries and makes uncertainty visible.
