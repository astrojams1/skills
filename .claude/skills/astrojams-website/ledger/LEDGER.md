# astrojams-website — ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Each run's details belong in the
owner's shared activity ledger; the site's history is its git log.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-03 | Initial skill, modelled on `ouro-website` 1.1.0: App Store Connect audit of the personal team (`scripts/audit.mjs`, which prefers a main checkout over its worktrees and flags only apps with no Marketing URL), content and asset rules, verification and deploy steps. Site built with Newsworthy and Space Worms live and Importron, Data Center and Rhythm coming soon. | The owner asked for a site like the Ouro one for the apps under the astrojams brand, kept current the same way. |
| 1.1.0 | 2026-11-03 | The site moved from its own repository into `astrojams1/app-sites` as `sites/astrojams`, built from the `packages/showcase` integration it shares with the Ouro site; paths, commands, the audit's default `--site` and the shared-change rule updated. | The owner wanted an update to either site to update the other. |

## Lessons

- 2026-11-03: The personal team's five records are all real apps, so `excluded` starts empty. Space Worms
  (`com.spaceworms.app`) belongs even though its bundle prefix differs.
- 2026-11-03: Rhythm and Data Center had no store screenshots. Data Center's came from its `docs/images` phone captures;
  Rhythm's from a headless capture of its 0.7.0 `dist/` at 402×874@3× (idle and playing). Replace both with store
  screenshots when their listings get them.
- 2026-11-03: Comparing a site's build before and after moving its code needs normalising first: Astro's scope ids
  (`data-astro-cid-*`) and hashed asset names come from file paths, so they all change while the pages stay the same.
