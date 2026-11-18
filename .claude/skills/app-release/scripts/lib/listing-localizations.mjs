// listing-localizations.mjs
// Pure helpers for App Store listings in more than one language: the store data's `listing.localizations` object,
// checked before anything is sent, and the comparison with what is live that makes the daily run ship it.
// Shared by asc.mjs (`listing`, `status`) and review-sweep.mjs (`sweep`). Sources and dates are in references/ios.md,
// "Listing localizations".

// APP_STORE_LOCALES are the locale shortcodes Apple's App Store Connect API takes for localized metadata, from
// "Managing metadata in your app by using locale shortcodes" (developer.apple.com/documentation/appstoreconnectapi/
// managing-metadata-in-your-app-by-using-locale-shortcodes, read 2026-11-18). Copy a code exactly; `es-MX` is a
// locale here and `es` is not.
export const APP_STORE_LOCALES = [
  'ar-SA', 'bn-BD', 'ca', 'zh-Hans', 'zh-Hant', 'hr', 'cs', 'da', 'nl-NL', 'en-AU', 'en-CA', 'en-GB', 'en-US', 'fi',
  'fr-FR', 'fr-CA', 'de-DE', 'el', 'gu-IN', 'he', 'hi', 'hu', 'id', 'it', 'ja', 'kn-IN', 'ko', 'ms', 'ml-IN', 'mr-IN',
  'no', 'or-IN', 'pl', 'pt-BR', 'pt-PT', 'pa-IN', 'ro', 'ru', 'sk', 'sl-SI', 'es-MX', 'es-ES', 'sv', 'ta-IN', 'te-IN',
  'th', 'tr', 'uk', 'ur-PK', 'vi',
];

// The fields one localization carries. Support, marketing and privacy policy URLs come from the primary listing.
export const LOCALIZATION_FIELDS = ['name', 'subtitle', 'keywords', 'description', 'promotionalText', 'whatsNew'];

// LOCALIZATION_LIMITS are Apple's maximums in characters. Apple's help page says keywords take "up to 100 bytes"
// (Platform version information), but what Apple enforces is 100 characters in every language: its own API error
// reads "Keywords for Thai cannot be longer than 100 characters" (developer.apple.com/forums/thread/705360), and live
// Japanese, Chinese and Russian keyword fields run past 100 bytes at 100 characters or fewer (checked 2026-11-18).
// Keywords are counted in UTF-16 units, the strictest reading of "characters": a combining mark counts as one.
export const LOCALIZATION_LIMITS = { name: 30, subtitle: 30, keywords: 100, promotionalText: 170, description: 4000, whatsNew: 4000 };

// Apple requires a name on every new App Info localization (AppInfoLocalizationCreateRequest) and marks Description
// and Keywords required on every version localization (Platform version information).
export const REQUIRED_LOCALIZATION_FIELDS = ['name', 'description', 'keywords'];

// The fields Apple takes only with a new version; a difference in one of them ships the app (daily-review-run.md).
export const SHIPPING_LOCALIZATION_FIELDS = ['name', 'subtitle', 'keywords', 'description'];

const text = value => typeof value === 'string' ? value.trim() : '';
const characters = value => [...value].length;

// localizationEntries returns the store data's localizations as [locale, copy] pairs, in the order written.
export function localizationEntries(listing) {
  const map = listing && listing.localizations;
  return map && typeof map === 'object' && !Array.isArray(map) ? Object.entries(map) : [];
}

// localizationProblems names everything wrong with `listing.localizations` before any write: the shape, a locale
// Apple does not accept or that repeats the primary one, a missing required field, a field this shape does not
// carry, a field over Apple's limit, and the pictographic symbols `characterProblems` finds in the primary listing.
export function localizationProblems(listing, characterProblems) {
  if (!listing || listing.localizations === undefined) return [];
  const map = listing.localizations;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return ['listing.localizations must be an object keyed by locale code'];
  const problems = [];
  const primary = listing.locale || 'en-US';
  for (const [locale, copy] of Object.entries(map)) {
    const where = 'listing.localizations.' + locale;
    if (!APP_STORE_LOCALES.includes(locale)) {
      const base = locale.toLowerCase().split(/[-_]/)[0];
      const near = APP_STORE_LOCALES.filter(code => code.toLowerCase().split('-')[0] === base);
      problems.push(where + ': ' + JSON.stringify(locale) + ' is not an App Store Connect locale code' + (near.length ? '; did you mean ' + near.join(' or ') + '?' : ''));
    }
    if (locale === primary) problems.push(where + ': ' + locale + ' is the primary listing.locale; its copy belongs in listing itself');
    if (!copy || typeof copy !== 'object' || Array.isArray(copy)) {
      problems.push(where + ' must be an object with ' + LOCALIZATION_FIELDS.join(', '));
      continue;
    }
    for (const field of Object.keys(copy)) {
      if (!LOCALIZATION_FIELDS.includes(field)) {
        problems.push(where + '.' + field + ' is not a localized field (' + LOCALIZATION_FIELDS.join(', ') + '); URLs come from the primary listing');
      } else if (copy[field] !== null && typeof copy[field] !== 'string') {
        problems.push(where + '.' + field + ' must be text');
      }
    }
    for (const field of REQUIRED_LOCALIZATION_FIELDS) if (!text(copy[field])) problems.push(where + '.' + field + ' is required');
    if (text(copy.name) && characters(text(copy.name)) < 2) problems.push(where + '.name must be at least two characters');
    for (const field of LOCALIZATION_FIELDS) {
      const value = text(copy[field]);
      if (!value) continue;
      const size = field === 'keywords' ? value.length : characters(value);
      if (size > LOCALIZATION_LIMITS[field]) problems.push(where + '.' + field + ' is ' + size + ' characters; Apple allows ' + LOCALIZATION_LIMITS[field]);
    }
    if (characterProblems) for (const problem of characterProblems(copy)) problems.push(where + '.' + problem);
  }
  return problems;
}

// localizationText is what one localization sends, trimmed, without empty fields.
export function localizationText(copy) {
  const out = {};
  for (const field of LOCALIZATION_FIELDS) if (text(copy && copy[field])) out[field] = text(copy[field]);
  return out;
}

// localizationChanges compares the store data's localizations with the live App Info and version localizations
// (each a list of Apple resources). `changed` names the shipping fields that differ, `missing` the locales Apple
// lacks in either place, and `unlisted` the live locales store data does not name, which are reported and never
// deleted. An empty field in store data is not a change, as for the primary listing.
export function localizationChanges(listing, infoLocalizations = [], versionLocalizations = []) {
  const primary = (listing && listing.locale) || 'en-US';
  const byLocale = items => new Map(items.map(item => [item.attributes.locale, item.attributes]));
  const info = byLocale(infoLocalizations);
  const version = byLocale(versionLocalizations);
  const wanted = localizationEntries(listing);
  const named = new Set(wanted.map(([locale]) => locale));
  const changed = [];
  const missing = [];
  for (const [locale, copy] of wanted) {
    if (locale === primary) continue;
    if (!info.has(locale) || !version.has(locale)) {
      missing.push(locale);
      continue;
    }
    const live = { ...version.get(locale), ...info.get(locale) };
    const fields = SHIPPING_LOCALIZATION_FIELDS.filter(field => text(copy?.[field]) && text(copy[field]) !== text(live[field]));
    if (fields.length) changed.push({ locale, fields });
  }
  const unlisted = [...new Set([...info.keys(), ...version.keys()])].filter(locale => locale !== primary && !named.has(locale)).sort();
  return { changed, missing, unlisted };
}

// localizationSummary is one line for a report, or '' when nothing needs shipping.
export function localizationSummary(changes) {
  const parts = [];
  if (changes.missing.length) parts.push('localizations not live: ' + changes.missing.join(', '));
  for (const entry of changes.changed) parts.push(entry.locale + ' differs in ' + entry.fields.join(', '));
  return parts.join('; ');
}
