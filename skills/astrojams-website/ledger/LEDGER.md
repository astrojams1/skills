# astrojams-website — ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Each run's details belong in the
owner's shared activity ledger; the site's history is its git log.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-03 | Initial skill, modelled on `ouro-website` 1.1.0: App Store Connect audit of the personal team (`scripts/audit.mjs`, which prefers a main checkout over its worktrees and flags only apps with no Marketing URL), content and asset rules, verification and deploy steps. Site built with Newsworthy and Space Worms live and Importron, Data Center and Rhythm coming soon. | The owner asked for a site like the Ouro one for the apps under the astrojams brand, kept current the same way. |

## Lessons

- 2026-11-03: The personal team's five records are all real apps, so `excluded` starts empty. Space Worms
  (`com.spaceworms.app`) belongs even though its bundle prefix differs.
- 2026-11-03: Rhythm and Data Center had no store screenshots. Data Center's came from its `docs/images` phone captures;
  Rhythm's from a headless capture of its 0.7.0 `dist/` at 402×874@3× (idle and playing). Replace both with store
  screenshots when their listings get them.
