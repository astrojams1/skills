// build-tmp.mjs
// Gives each release build its own empty temporary folder. Metro keeps its transform cache in the system temporary
// folder, shared by every checkout and app on the Mac, and a cached Expo DOM entry can carry a relative path into
// another checkout: Space Worms' build 12 archive failed on 2026-10-20 resolving GameSurface.jsx from a different
// worktree. A per-build TMPDIR makes Metro, and anything else that uses the temporary folder, start clean.

import { chmodSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/** freshBuildTmp empties and returns `<out>/tmp`, private to the owner, for a build's TMPDIR. */
export function freshBuildTmp(out) {
  const dir = join(out, 'tmp');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  chmodSync(dir, 0o700);
  return dir;
}
