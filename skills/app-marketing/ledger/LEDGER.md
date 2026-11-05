# app-marketing: ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Per-run facts live in `marketing/` in
`astrojams1/app-sites`, and in the owner's activity ledger.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-05 | Initial skill: per-app profiles, derived item state, append-only ledger and metrics, cloud and Mac runners | The owner asked for continuous marketing across apps that never depends on them |

## Lessons

- 2026-11-05: Cloud sessions reach App Store Connect, Google and 1Password over the network, and have Chromium and ffmpeg, but hold no `op` and no service-account token. The vault is the only gap. Probe a cloud environment instead of assuming: the first plan assumed less than was true.
- 2026-11-05: A routine created without `mcp_connections` receives every connected account, PayPal and Gmail included. Clear them.
