# Read RAM and disk measurements

## RAM

Use memory pressure, compressed memory and swap activity together. Low free RAM alone is normal.
Use `memory_pressure -Q` only to read pressure. Its free percentage differs from the Activity Monitor graph.
The exported `kern.memorystatus_vm_pressure_level` uses dispatch masks (1 normal, 2 warning, 4 critical).
Keep other values unknown. The internal kernel enum uses different values.

RSS includes shared pages and leaves out some compressed and GPU memory. Group helpers by app with their
executable paths and parent processes. Treat large processes and growth candidates as leads. Compare boot time,
PID, start time and executable identity. Never compare recycled PIDs. Compare swap counters within the same boot only.

## Disk

On this 16 GiB Mac, less than 20 GiB of free disk space is a warning. Less than 10 GiB is urgent.
These targets are local to this Mac. Check a fast fall even above them. Disk headroom helps swap, and
RAM pressure and disk space each need their own check.

A storage scan logs folder sizes and comparable deltas in the shared ledger. Scan history has a 90-day
retention limit and an 8 MiB size limit. If free space falls without growth in the scanned roots, inspect the
current user's macOS temporary directory and its sibling `X/com.google.Chrome.code_sign_clone`. Moving projects leaves those paths in place.
Treat denied access and timeouts as unknown usage. Leave external-volume roots out of local totals. Missing or
moved roots and changes in scan coverage cannot count as zero-size deletions. APFS sharing, nested roots and
snapshots keep directory sizes from adding up to exact disk use.

## Sampler setup

The sampler runs briefly every 15 minutes and does not stop processes or delete caches. The nightly agent uses its
samples for evidence. Keep 14 days of samples with a 32 MiB total cap and a 4 MiB daily cap. The daily cap allows for
physical footprint fields in addition to RSS. Treat fields that lack permission as unknown.

If history is missing, check the LaunchAgent and report any gaps. Leave power settings and schedules in place on
normal runs. The LaunchAgent uses an identical copy of `scripts/resources.py` at
`~/Library/Application Support/CodexResourceMaintenance/runtime/resources.py`. This small internal copy avoids
launchd privacy failures on the SSD. When the collector changes, update that copy and log its SHA-256. Check a
real LaunchAgent run, since an interactive run cannot verify launchd access.
