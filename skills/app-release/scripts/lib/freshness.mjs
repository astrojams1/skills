// freshness.mjs
// Tells a release run when the copy of this skill it is running from is behind the skills repository's main, so an
// app repository's submodule is updated before a release relies on outdated instructions or scripts. Best effort: a
// fetch that fails or takes too long reports nothing rather than slowing or stopping a release.

import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = dirname(dirname(fileURLToPath(import.meta.url)));

// git runs one git command in the skill's checkout and returns its trimmed output, or null on failure.
function git(args, timeout) {
  const result = spawnSync('git', ['-C', SCRIPTS].concat(args), { encoding: 'utf8', timeout: timeout || 15000 });
  return result.status === 0 ? result.stdout.trim() : null;
}

// freshnessMessage turns how far the checkout is behind main into a line to print, or null when it is current.
export function freshnessMessage(behind, checkout) {
  if (!behind) return null;
  return 'The app-release skill in ' + checkout + ' is ' + behind + ' commit' + (behind === 1 ? '' : 's') + ' behind the skills repository\'s main. ' +
    'Update it before relying on its instructions or scripts (git -C ' + checkout + ' fetch origin main && git -C ' + checkout +
    ' checkout origin/main, then commit the submodule pointer); see references/maintaining.md.';
}

// checkFreshness fetches the skills repository's main and reports how far this checkout is behind it.
export function checkFreshness(env) {
  if ((env || process.env).APP_RELEASE_SKIP_FRESHNESS) return null;
  const checkout = git(['rev-parse', '--show-toplevel']);
  if (!checkout) return null;
  if (git(['fetch', '--quiet', 'origin', 'main'], 15000) === null) return null;
  const behind = Number(git(['rev-list', '--count', 'HEAD..FETCH_HEAD']));
  return Number.isInteger(behind) ? freshnessMessage(behind, checkout) : null;
}
