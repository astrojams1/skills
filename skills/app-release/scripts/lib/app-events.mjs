// app-events.mjs
// Store data `events`: App Store In-App Events as data. Checks each entry against Apple's published limits, turns it
// into App Store Connect API attributes, and plans what `asc.mjs events` creates, updates or leaves alone, and which
// events `asc.mjs submit` sends to App Review with the version that carries them. Pure functions: no network.
// Limits read from Apple on 2026-11-19: https://developer.apple.com/help/app-store-connect/offer-in-app-events/offer-in-app-events
// and https://developer.apple.com/app-store/in-app-events/ (see references/promotion.md, "In-App Events").

export const EVENT_BADGES = ['LIVE_EVENT', 'PREMIERE', 'CHALLENGE', 'COMPETITION', 'NEW_SEASON', 'MAJOR_UPDATE', 'SPECIAL_EVENT'];
export const EVENT_PURPOSES = ['APPROPRIATE_FOR_ALL_USERS', 'ATTRACT_NEW_USERS', 'KEEP_ACTIVE_USERS_INFORMED', 'BRING_BACK_LAPSED_USERS'];
export const EVENT_PRIORITIES = ['HIGH', 'NORMAL'];
export const EVENT_PURCHASE = ['NO_COST_ASSOCIATED', 'IN_APP_PURCHASE'];
// EVENT_TEXT_LIMITS are Apple's character limits for an event's reference name and each localization's text.
export const EVENT_TEXT_LIMITS = { referenceName: 64, name: 30, shortDescription: 50, longDescription: 120 };
// EVENT_MEDIA: the event card is landscape 16:9, the details page portrait 9:16 (images: .jpg, .jpeg, .png).
export const EVENT_MEDIA = {
  EVENT_CARD: { field: 'card', min: [1920, 1080], max: [3840, 2160] },
  EVENT_DETAILS_PAGE: { field: 'details', min: [1080, 1920], max: [2160, 3840] },
};
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
export const EVENT_MIN_DURATION = 15 * MINUTE;
export const EVENT_MAX_DURATION = 31 * DAY;
export const EVENT_MAX_PROMOTION = 14 * DAY;
// EDITABLE_EVENT_STATES can change and go to App Review; the others are with Apple or over.
export const EDITABLE_EVENT_STATES = ['DRAFT', 'READY_FOR_REVIEW', 'REJECTED'];
export const SUBMITTED_EVENT_STATES = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'ACCEPTED', 'APPROVED', 'PUBLISHED'];
// A price in event text is rejected by App Review, so currency amounts are refused before upload.
const PRICE = /[$€£¥₹]\s?\d|\d\s?(?:USD|EUR|GBP|dollars?)\b|\bfree\s+trial\b/i;

// compareVersions orders dotted version strings numerically.
export function compareVersions(a, b) {
  const left = String(a).split('.').map(Number);
  const right = String(b).split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff) return diff;
  }
  return 0;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

// eventTime parses one of an entry's ISO 8601 times (with an offset), or returns NaN.
function eventTime(value) {
  return typeof value === 'string' && ISO.test(value) ? Date.parse(value) : NaN;
}

// textProblems checks one localization's name and descriptions.
function textProblems(label, text) {
  const problems = [];
  if (!text || typeof text !== 'object') return [label + ' is missing'];
  for (const field of ['name', 'shortDescription', 'longDescription']) {
    const value = text[field];
    if (typeof value !== 'string' || !value.trim()) problems.push(label + '.' + field + ' is empty');
    else if ([...value].length > EVENT_TEXT_LIMITS[field]) problems.push(label + '.' + field + ' is ' + [...value].length + ' characters; Apple allows ' + EVENT_TEXT_LIMITS[field]);
    else if (PRICE.test(value)) problems.push(label + '.' + field + ' names a price, which App Review rejects');
    else if (value.length > 3 && value === value.toUpperCase() && /[A-Z]/.test(value)) problems.push(label + '.' + field + ' is all capitals');
  }
  return problems;
}

// eventProblems lists what is wrong with one store-data event; `now` (ms) checks that the dates are still ahead.
export function eventProblems(entry, now) {
  if (!entry || typeof entry !== 'object') return ['an event is not an object'];
  const problems = [];
  const ref = entry.referenceName;
  if (typeof ref !== 'string' || !ref.trim()) problems.push('an event has no referenceName');
  else if ([...ref].length > EVENT_TEXT_LIMITS.referenceName) problems.push(ref + ': referenceName is over 64 characters');
  const label = typeof ref === 'string' && ref.trim() ? ref : 'event';
  const add = list => list.forEach(problem => problems.push(label + ': ' + problem));
  const own = [];
  if (!EVENT_BADGES.includes(entry.badge)) own.push('badge must be one of ' + EVENT_BADGES.join(', '));
  if (entry.purpose !== undefined && !EVENT_PURPOSES.includes(entry.purpose)) own.push('purpose must be one of ' + EVENT_PURPOSES.join(', '));
  if (entry.priority !== undefined && !EVENT_PRIORITIES.includes(entry.priority)) own.push('priority must be HIGH or NORMAL');
  if (entry.purchaseRequirement !== undefined && !EVENT_PURCHASE.includes(entry.purchaseRequirement)) own.push('purchaseRequirement must be ' + EVENT_PURCHASE.join(' or '));
  // Apple's API calls deepLink optional, but App Review refuses an event without one: POST /v1/reviewSubmissionItems
  // answered 409 ENTITY_ERROR.ATTRIBUTE.REQUIRED "You must provide a value for the attribute 'deepLink'" (Rhythm, 2026-11-24).
  if (typeof entry.deepLink !== 'string' || !entry.deepLink.trim()) {
    own.push('deepLink is required (App Review refuses an event without one): a URL scheme or universal link the app declares');
  } else {
    try { new URL(entry.deepLink); } catch { own.push('deepLink is not a URL'); }
  }
  if (typeof entry.why !== 'string' || entry.why.trim().length < 20) own.push('why must say what really happens in the app during the event (Apple takes only real, time-bound events)');
  if (entry.shipsWith !== undefined && !/^\d+(\.\d+){0,2}$/.test(String(entry.shipsWith))) own.push('shipsWith must be the first app version that carries the event');
  const start = eventTime(entry.start);
  const end = eventTime(entry.end);
  const publish = entry.publish === undefined ? start : eventTime(entry.publish);
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(publish)) {
    own.push('start, end and publish must be ISO 8601 times with an offset, such as 2026-12-14T00:00:00-08:00');
  } else {
    if (end - start < EVENT_MIN_DURATION) own.push('an event lasts at least 15 minutes');
    if (end - start > EVENT_MAX_DURATION) own.push('an event lasts at most 31 days');
    if (publish > start) own.push('publish is after start');
    if (start - publish > EVENT_MAX_PROMOTION) own.push('publish is more than 14 days before start');
    if (typeof now === 'number' && start <= now) own.push('start has passed; Apple takes only a future start');
  }
  if (entry.territories !== undefined && (!Array.isArray(entry.territories) || !entry.territories.length || entry.territories.some(item => !/^[A-Z]{3}$/.test(item)))) {
    own.push('territories must be a list of three-letter territory codes, or left out for every storefront');
  }
  own.push(...textProblems('text', entry.text));
  for (const [locale, text] of Object.entries(entry.localizations || {})) own.push(...textProblems('localizations.' + locale, text));
  const media = entry.media || {};
  for (const [type, spec] of Object.entries(EVENT_MEDIA)) {
    if (typeof media[spec.field] !== 'string' || !media[spec.field].trim()) own.push('media.' + spec.field + ' (' + type + ') is required');
    else if (!/\.(png|jpe?g)$/i.test(media[spec.field])) own.push('media.' + spec.field + ' must be a .png or .jpg image');
  }
  add(own);
  return problems;
}

// imageSize reads the pixel size of a PNG or JPEG from its bytes, or returns null.
export function imageSize(bytes) {
  if (bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47) return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
      }
      offset += 2 + length;
    }
  }
  return null;
}

// mediaProblem checks one image's pixel size against Apple's range and aspect ratio for its asset type.
export function mediaProblem(type, size) {
  const spec = EVENT_MEDIA[type];
  if (!size) return type + ' image size could not be read';
  const [width, height] = size;
  if (width < spec.min[0] || height < spec.min[1] || width > spec.max[0] || height > spec.max[1]) {
    return type + ' image is ' + width + 'x' + height + '; Apple takes ' + spec.min.join('x') + ' to ' + spec.max.join('x');
  }
  if (Math.abs(width / height - spec.min[0] / spec.min[1]) > 0.01) return type + ' image is ' + width + 'x' + height + ', not ' + (spec.min[0] > spec.min[1] ? '16:9' : '9:16');
  return null;
}

// utc writes an entry's time as Apple's UTC form.
function utc(value) {
  return new Date(eventTime(value)).toISOString();
}

// eventAttributes builds the appEvents attributes for an entry; `allTerritories` fills a schedule left open.
export function eventAttributes(entry, allTerritories, primaryLocale) {
  const attributes = {
    referenceName: entry.referenceName,
    badge: entry.badge,
    purpose: entry.purpose || 'APPROPRIATE_FOR_ALL_USERS',
    priority: entry.priority || 'NORMAL',
    purchaseRequirement: entry.purchaseRequirement || 'NO_COST_ASSOCIATED',
    primaryLocale: primaryLocale,
    territorySchedules: [{
      territories: [...(entry.territories || allTerritories)].sort(),
      publishStart: utc(entry.publish === undefined ? entry.start : entry.publish),
      eventStart: utc(entry.start),
      eventEnd: utc(entry.end),
    }],
  };
  if (entry.deepLink) attributes.deepLink = entry.deepLink;
  return attributes;
}

// sameSchedule compares Apple's schedules with the wanted ones by time instant and territory set.
function sameSchedule(live, wanted) {
  if (!Array.isArray(live) || live.length !== wanted.length) return false;
  return wanted.every((schedule, index) => {
    const other = live[index];
    return other && Date.parse(other.eventStart) === Date.parse(schedule.eventStart) && Date.parse(other.eventEnd) === Date.parse(schedule.eventEnd) &&
      Date.parse(other.publishStart) === Date.parse(schedule.publishStart) &&
      [...(other.territories || [])].sort().join() === schedule.territories.join();
  });
}

// attributeChanges lists the attributes Apple holds differently from the wanted ones.
export function attributeChanges(live, wanted) {
  const changed = [];
  for (const [key, value] of Object.entries(wanted)) {
    if (key === 'territorySchedules') {
      if (!sameSchedule(live.territorySchedules, value)) changed.push(key);
    } else if ((live[key] || null) !== (value || null)) {
      changed.push(key);
    }
  }
  return changed;
}

// eventPlan matches store data's events to the app's events by reference name: create the new ones, update an
// editable one whose attributes differ, keep a matching one, and report (never touch) one Apple already holds.
export function eventPlan(entries, existing, allTerritories, primaryLocale) {
  return entries.map(entry => {
    const wanted = eventAttributes(entry, allTerritories, primaryLocale);
    const live = existing.find(item => item.attributes.referenceName === entry.referenceName && item.attributes.eventState !== 'ARCHIVED');
    if (!live) return { action: 'create', entry, attributes: wanted };
    const changes = attributeChanges(live.attributes, wanted);
    const state = live.attributes.eventState;
    if (!changes.length) return { action: 'keep', entry, id: live.id, state };
    if (EDITABLE_EVENT_STATES.includes(state)) return { action: 'update', entry, id: live.id, state, attributes: wanted, changes };
    return { action: 'locked', entry, id: live.id, state, changes };
  });
}

// eventReviewTargets picks the events `submit` sends with `version`: an event whose `shipsWith` is that version or an
// earlier one (or that names none), that Apple holds in an editable state and whose start is still ahead. `missing` names a listed
// event for this version that `asc.mjs events --confirm` has not created yet, so the version is not sent without it.
// `held` are this version's events already waiting for or in review, so a retry recognises its own submission.
export function eventReviewTargets(entries, existing, version, now) {
  const targets = [];
  const held = [];
  const missing = [];
  const skipped = [];
  const unlinked = [];
  for (const entry of entries) {
    if (entry.shipsWith !== undefined && compareVersions(version, entry.shipsWith) < 0) continue;
    const live = existing.find(item => item.attributes.referenceName === entry.referenceName && item.attributes.eventState !== 'ARCHIVED');
    if (!live) {
      if (eventTime(entry.start) > now) missing.push(entry.referenceName);
      else skipped.push(entry.referenceName + ' (its start has passed)');
      continue;
    }
    if (['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(live.attributes.eventState)) held.push({ relation: 'appEvent', type: 'appEvents', id: live.id });
    if (!EDITABLE_EVENT_STATES.includes(live.attributes.eventState)) continue;
    if (eventTime(entry.start) <= now) {
      skipped.push(entry.referenceName + ' (its start has passed)');
      continue;
    }
    // App Review refuses an event without a deep link, after the submission is already open; stop before any write.
    if (!live.attributes.deepLink) unlinked.push(entry.referenceName);
    targets.push({ relation: 'appEvent', type: 'appEvents', id: live.id });
  }
  return { targets, held, missing, skipped, unlinked };
}
