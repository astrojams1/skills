// review-state.mjs
// Decides, from App Store Connect's own records, whether an app has a public version and whether anything is already
// occupying its next review. Pure so the daily sweep and `asc.mjs submit` apply one rule and tests can pin it.

export const LIVE_VERSION_STATES = ['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'];
// A version in one of these is finished with or still a draft; every other state, known or not, is treated as occupied.
const FREE_VERSION_STATES = ['PREPARE_FOR_SUBMISSION', 'REPLACED_WITH_NEW_VERSION'];
const FINISHED_SUBMISSION_STATES = ['COMPLETE'];

// UNATTENDED_ENV is set by `review-sweep.mjs run`. With it, asc.mjs cannot run `release`, withdraw, replace a submission
// or change a price, and any listing it writes sets the owner's standing choice: Apple releases the version on approval.
export const UNATTENDED_ENV = 'APP_RELEASE_UNATTENDED';
export const UNATTENDED_RELEASE_TYPE = 'AFTER_APPROVAL';
export const unattended = env => (env || process.env)[UNATTENDED_ENV] === '1';

export const versionStateOf = version => version.attributes.appVersionState || version.attributes.appStoreState;

const newestFirst = (a, b) => String(b.attributes.createdDate).localeCompare(String(a.attributes.createdDate));

// liveVersion returns the newest public version of the given versions, or null when the app has never launched.
export function liveVersion(versions) {
  return [...versions].sort(newestFirst).find(version => LIVE_VERSION_STATES.includes(versionStateOf(version))) || null;
}

// occupancy lists everything that must stop a new submission: any version newer than the live one that is past draft
// (including approved and waiting for release), and any submission that has not completed. `draftOk` is the id of a
// submission the caller may reuse, because it is the draft this run's own version is going into.
export function occupancy(versions, submissions, { draftOk = false } = {}) {
  const live = liveVersion(versions);
  const reasons = [];
  for (const version of versions) {
    if (live && version.id === live.id) continue;
    if (live && String(version.attributes.createdDate) < String(live.attributes.createdDate)) continue;
    const state = versionStateOf(version);
    if (!FREE_VERSION_STATES.includes(state) && !LIVE_VERSION_STATES.includes(state)) {
      reasons.push('version ' + version.attributes.versionString + ' is ' + state);
    }
  }
  for (const submission of submissions) {
    const state = submission.attributes.state;
    if (FINISHED_SUBMISSION_STATES.includes(state)) continue;
    if (draftOk && state === 'READY_FOR_REVIEW') continue;
    reasons.push('review submission ' + submission.id + ' is ' + state);
  }
  return reasons;
}

// unattendedSubmitRefusal returns why an unattended run must not submit this version, or null. It runs on a fresh read
// immediately before the submission goes to Apple.
export function unattendedSubmitRefusal(version, versions, submissions) {
  const releaseType = version.attributes.releaseType;
  if (releaseType !== UNATTENDED_RELEASE_TYPE) return 'Version ' + version.attributes.versionString + ' has releaseType ' + releaseType + ', so approval would not release it; an unattended run submits ' + UNATTENDED_RELEASE_TYPE + ' versions only. Run `asc.mjs listing` first.';
  const reasons = occupancy(versions.filter(item => item.id !== version.id), submissions, { draftOk: true });
  return reasons.length ? 'App Store Connect shows unresolved review state: ' + reasons.join('; ') + '.' : null;
}
