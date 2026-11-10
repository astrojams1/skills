# Cloud deployment

Use a hosted scheduler with connected Gmail and a private, writable, durable cloud ledger. Keep lead records apart
from the skill's Git source. The user asked for cloud runs, so never quietly swap in the desktop automation tool's
local cron or heartbeat. A hosted run needs the skill instructions, the app profile, the Gmail connection and a
writable durable ledger, all without this Mac. A local heartbeat, local cron job or sandbox file does not count.

For the first Pipsqueak deployment, the private ChatGPT Page titled `Pipsqueak warm lead followup ledger` holds the
app profile, runtime instructions, JSON lead register and JSONL skill activity. The Pages tools give a supported
hosted scheduler through a Page auto-update controller and its managed worker.

## Set it up

1. **Find or make the Page.** Read the intended Page and its instructions if one exists. Otherwise create a private
   Page for this deployment. Take block schemas from the Pages tools themselves, or from a Page-writing skill where
   the host has one. This skill bundles none, so read them before writing.
   - Put enough runtime guidance in a native Agent Instructions block for a cloud worker to run without a local
     checkout.
   - Include the owner's send authority, the actual mailbox, and the skill source URL and version.
   - Include the email-reading and idempotency rules, the Pipsqueak goal and iPhone requirement, the followup policy
     and the ledger schema.
   - Never embed credentials.
2. **Find or make the controller.** Read `get_page_auto_update` and `list_page_automations`. Reuse the worker that
   already serves this app. Never make a duplicate. If no controller exists, `set_page_auto_update` with a kept
   idempotency key creates the hosted controller. Read back its ID and state. The controller keeps the Page and
   workers in line. It must never send lead followups itself.
3. **Make the worker.** Use `create_controller_automation` with the exact active controller ID for the lead worker.
   Include the full Page URL. Tell the worker to read the current Page instructions, profile and register before
   Gmail. For this deployment the default is daily at 08:00, 10:00, 12:00, 14:00, 16:00 and 18:00 in
   `America/Los_Angeles`, unless the user changes it. Give the schedule an explicit time zone. Keep any timing the
   user asked for.
4. **Verify.** Read back `list_page_automations`. Check that the worker is active and enabled, has `runtime:cloud`,
   and has the intended schedule and time zone. Record the exact provider IDs and the verified settings in the
   private ledger. After a failed or unclear creation, check the existing schedules before you retry. A paused worker
   may already exist.

## Keep it running

- **Split the jobs.** The controller keeps the Page state and watches its worker. The worker does the mail actions. A
  controller may check the existing settings without adding or changing schedules on each run.
- **A receipt is not a run.** When a run is requested to test it, tell a run acceptance receipt apart from a finished
  run. Verify the real mailbox read and the cloud ledger update before you say the worker works end to end.
- **Outages show.** A cloud or connector outage must surface. Never fall back to sending from an untracked local job.
- **Update on purpose.** The cloud copy is a deployed version of the Git skill. When the skill changes, bring the
  Page instructions and source revision up to date by hand. Don't assume the scheduler loads local files or a
  private GitHub URL. The source URL helps review. The Page's runtime copy keeps the worker self-contained. Keep
  action keys, opt-outs and open handoffs when you update the deployment.
- **Stay quiet.** Say nothing on unchanged or non-actionable scans. Notify only on real new interest, a coordination
  step sent, confirmed progress, a failure, or an action the owner must take.
- **One sender.** Never set up a second sender for the same app, mailbox or threads.
