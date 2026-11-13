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
- 1.4.0 (2026-11-12): The app-marketing Mac pass starts the weekly pass, on a Wednesday or when the last completed weekly pass (`vmw-weekly-` run id) is more than 7 days old. The `vegas-microworks-marketing` Mac task is paused and replaced. It ran in the default permission mode and stalled on its first prompt, and only the owner can set a task's mode, so the pass moved into `app-marketing-mac`, which runs in Auto mode.
- 1.5.0 (2026-11-13): When the Mac pass carries the weekly pass, it starts no Short makers: it lists due Shorts for the pass's Shorts stage, which makes them one at a time, and it never hands back while a helper runs (James, 2026-11-12: at most three subagents on the Mac). On 2026-11-13 three makers ran at once beside the LOB maker, and the fourth Short (`vmw-software-by-name-01`) was rendered and never posted when the run's helpers were lost.
- Run 2026-11-12 (first full weekly pass): shipped four tools and three guides (the whole ideas list) and scheduled eight Shorts, one per tool or guide. Lessons: a fresh worktree needs `npm ci` before `npm test`; Nevada and county licensing sites refuse automated fetches, so check facts in the browser or against the statute at leg.state.nv.us; give each parallel Shorts builder its own look and loop folder up front; never a dark green or gold palette for this brand; an episode's `music` must be a string for `shorts.mjs record`. The site playbook carries the first and the palette rule.
