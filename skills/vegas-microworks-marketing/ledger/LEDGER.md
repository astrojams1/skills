# vegas-microworks-marketing: ledger

Append versions and lessons here. The shared activity ledger holds the record of each run.

## Versions

| Version | Date | Change | Why |
|---|---|---|---|
| 1.0.0 | 2026-11-10 | Move Node and worktree setup into the skill. Keep the marketing playbook in the site repo. | Keep the Mac task prompt to a pointer. |
| 1.1.0 | 2026-11-11 | Point to the cloud outreach routine; the Mac pass no longer builds waves. | Outreach runs in the cloud so it doesn't depend on the Mac. |

- 1.2.0 (2026-11-12): No gambling imagery in any Vegas Microworks material. The owner's standing rule was not written in this skill, and a slot-machine YouTube Short was made and scheduled; it was taken down before going live.
- 1.3.0 (2026-11-12): The owner's autonomy rule is quoted in Authority. The stored prompt now fetches and reads this skill from `origin/main`, not the stale side checkout. Gotchas record why the weekly run never started: no permission mode on the task, so its first read waited on a prompt. The site repo's playbooks now set prices, target named bills, refuse gambling words, add an opt-out to every email and measure visits per approach (astrojams1/vegas-microworks#13).
- 1.3.1 (2026-11-12): Gotcha: a `run_scheduled_task` test run inherits the launching session's permission mode, so it can't prove the cron run starts without a prompt.
