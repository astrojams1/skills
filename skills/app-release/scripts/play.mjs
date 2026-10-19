#!/usr/bin/env node
// play.mjs
// Google Play store presence through the Play Developer API: the default-language listing text, contact details and
// listing graphics from the app's store data (`google`), and a read-only status of what Play holds. Bundles and tracks
// are android-release.mjs's job. Every change happens in one edit that is read back before it commits; anything wrong
// deletes the edit. The service account needs "Manage store presence" on the app for these writes. Run from the app
// repository.
//
//   node play.mjs status            listing text, contact details, image hashes against the repository, tracks
//   node play.mjs listing [--hold]  replace the listing text and contact details, read back, commit
//   node play.mjs images [--hold]   replace the listing graphics in order, compare Play's SHA-256 with ours, commit
//
// An API commit publishes Play's last saved listing, so a listing left in Play Console as "Save as draft" is lost:
// save console changes with Save before running a write here (Newsworthy, 15 October 2026).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStoreData } from './lib/config.mjs';
import { commitEdit, playAccount, setup, withEdit } from './android-release.mjs';

// IMAGE_TYPES are the listing image types this script manages, with Play's count limits.
export const IMAGE_TYPES = { icon: [1, 1], featureGraphic: [1, 1], phoneScreenshots: [2, 8], sevenInchScreenshots: [0, 8], tenInchScreenshots: [0, 8] };
// LISTING_FIELDS are the listing attributes the store data owns; contact fields live on the app details.
export const LISTING_FIELDS = ['title', 'shortDescription', 'fullDescription', 'video'];
export const DETAIL_FIELDS = { contactEmail: 'contactEmail', contactWebsite: 'contactWebsite', contactPhone: 'contactPhone', defaultLanguage: 'defaultLanguage' };
// LIMITS are Play's listing text lengths.
export const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };

let CONFIG = null;
let GOOGLE = null;

// listingProblems checks the store data's listing text against Play's limits before any edit opens.
export function listingProblems(google) {
  const problems = [];
  for (const field of ['title', 'shortDescription', 'fullDescription']) {
    const text = google[field];
    if (!text) problems.push(field + ' is missing');
    else if (text.length > LIMITS[field]) problems.push(field + ' is ' + text.length + ' characters; Play allows ' + LIMITS[field]);
  }
  return problems;
}

// listingBody returns the listing attributes to send, leaving out ones the store data does not set.
export function listingBody(google) {
  const body = { language: google.locale || 'en-US' };
  for (const field of LISTING_FIELDS) if (google[field] !== undefined) body[field] = google[field];
  return body;
}

// detailsBody returns the app-details fields the store data sets, or null when it sets none.
export function detailsBody(google) {
  const body = {};
  for (const field of Object.keys(DETAIL_FIELDS)) if (google[field]) body[DETAIL_FIELDS[field]] = google[field];
  return Object.keys(body).length ? body : null;
}

// mismatchedFields names the fields Play echoed differently from what was sent.
export function mismatchedFields(sent, saved) {
  return Object.keys(sent).filter(key => (saved || {})[key] !== sent[key]);
}

// imagePlan resolves the store data's images to repository paths per type, checking Play's count limits. A type may
// list files or name an asset manifest ({ manifest, base, prefix }) whose android entries under `prefix` are used in
// order of file name.
export function imagePlan(images, readManifest) {
  const plan = {};
  for (const type of Object.keys(images || {})) {
    if (!IMAGE_TYPES[type]) throw new Error('Unknown Play image type ' + type + '; use ' + Object.keys(IMAGE_TYPES).join(', '));
    const spec = images[type];
    let files;
    if (typeof spec === 'string') files = [spec];
    else if (Array.isArray(spec)) files = spec;
    else {
      const entries = readManifest(spec.manifest).filter(entry => entry.platform === 'android' && (!spec.prefix || entry.file.startsWith(spec.prefix)));
      files = entries.map(entry => (spec.base ? join(spec.base, entry.file) : entry.file)).sort();
    }
    const [min, max] = IMAGE_TYPES[type];
    if (files.length < min || files.length > max) throw new Error('Play takes ' + min + ' to ' + max + ' ' + type + '; the store data lists ' + files.length);
    plan[type] = files;
  }
  return plan;
}

// describeImages formats what Play holds for one image type: a summary line and one line per image.
export function describeImages(type, images) {
  return [type + ': Play holds ' + images.length + ' (not in the store data)'].concat(images.map((image, index) => '  ' + (index + 1) + '. ' + image.id + ' sha256 ' + image.sha256));
}

const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
// contentType names the media type Play's image upload expects; Play takes only PNG and JPEG.
export function contentType(file) {
  const extension = extname(file).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  throw new Error(file + ' is not a PNG or JPEG');
}

// load reads the configuration and the store data's google section.
function load() {
  CONFIG = setup().config;
  const store = loadStoreData(CONFIG);
  GOOGLE = store.google || {};
  return store;
}

// plan reads the image plan with manifest paths relative to the repository.
function plan() {
  return imagePlan(GOOGLE.images, path => JSON.parse(readFileSync(resolve(CONFIG.root, path), 'utf8')));
}

// compareImages reads what Play holds for each planned type and compares its hashes, in order, with the repository's.
async function compareImages(api, listing, images) {
  const results = {};
  for (const type of Object.keys(images)) {
    const held = ((await api(listing + '/' + type)).images || []).map(image => image.sha256);
    const expected = images[type].map(file => sha256(resolve(CONFIG.root, file)));
    results[type] = { held: held.length, expected: expected.length, match: JSON.stringify(held) === JSON.stringify(expected) };
  }
  return results;
}

// status prints what Play holds, changing nothing.
async function status(account) {
  const locale = GOOGLE.locale || 'en-US';
  const images = GOOGLE.images ? plan() : {};
  await withEdit(account, async (api, edit) => {
    const listing = await api(edit + '/listings/' + locale).catch(error => ({ error: error.message }));
    if (listing.error) console.log('Listing ' + locale + ': ' + listing.error);
    else {
      const sent = listingBody(GOOGLE);
      delete sent.language;
      const differs = mismatchedFields(sent, listing);
      console.log('Listing ' + locale + ': "' + listing.title + '"; ' + (differs.length ? 'differs from the store data in ' + differs.join(', ') : 'matches the store data'));
    }
    const details = await api(edit + '/details');
    console.log('Details: default language ' + details.defaultLanguage + ', contact ' + [details.contactEmail, details.contactWebsite].filter(Boolean).join(', '));
    for (const [type, result] of Object.entries(await compareImages(api, edit + '/listings/' + locale, images))) {
      console.log(type + ': Play holds ' + result.held + '; ' + (result.match ? 'matches' : 'differs from') + ' the repository (' + result.expected + ' listed)');
    }
    // Types the store data does not list (graphics kept only in Play) are listed with their hashes.
    for (const type of ['icon', 'featureGraphic', 'phoneScreenshots'].filter(item => !images[item])) {
      for (const line of describeImages(type, (await api(edit + '/listings/' + locale + '/' + type)).images || [])) console.log(line);
    }
    for (const track of (await api(edit + '/tracks')).tracks || []) {
      const releases = (track.releases || []).map(release => release.status + ' ' + (release.versionCodes || []).join(',')).join('; ');
      console.log('track ' + track.track + ': ' + (releases || 'empty'));
    }
  });
}

// listing replaces the listing text and contact details, reads both back and commits.
async function listing(account, hold) {
  if (!GOOGLE.title) throw new Error('The store data has no google listing (references/config.md)');
  const problems = listingProblems(GOOGLE);
  if (problems.length) throw new Error('The store data\'s Play listing is not ready: ' + problems.join('; '));
  const body = listingBody(GOOGLE);
  const details = detailsBody(GOOGLE);
  await withEdit(account, async (api, edit) => {
    const saved = await api(edit + '/listings/' + body.language, { method: 'PUT', body: body });
    const differs = mismatchedFields(body, saved);
    if (differs.length) throw new Error('Listing readback mismatch on ' + differs.join(', ') + '; nothing was committed');
    if (details) {
      const current = await api(edit + '/details');
      const savedDetails = await api(edit + '/details', { method: 'PUT', body: Object.assign({}, current, details) });
      const detailDiffers = mismatchedFields(details, savedDetails);
      if (detailDiffers.length) throw new Error('Details readback mismatch on ' + detailDiffers.join(', ') + '; nothing was committed');
    }
    return commitEdit(api, edit, hold);
  });
  console.log('Committed the ' + body.language + ' listing text' + (details ? ' and contact details' : '') + (hold ? ' (held: send it for review in Publishing overview)' : '') + '.');
}

// images replaces each planned image type in order and commits only when every type reads back identical.
async function images(account, hold) {
  const locale = GOOGLE.locale || 'en-US';
  const files = plan();
  if (!Object.keys(files).length) throw new Error('The store data lists no Play images');
  await withEdit(account, async (api, edit) => {
    const base = edit + '/listings/' + locale;
    for (const [type, list] of Object.entries(files)) {
      await api(base + '/' + type, { method: 'DELETE' });
      for (const file of list) {
        const path = resolve(CONFIG.root, file);
        const { image } = await api(base + '/' + type + '?uploadType=media', { method: 'POST', upload: readFileSync(path), contentType: contentType(path) });
        if (image.sha256 !== sha256(path)) throw new Error(file + ': Play received sha256 ' + image.sha256);
        console.log(type + ': uploaded ' + file);
      }
    }
    for (const [type, result] of Object.entries(await compareImages(api, base, files))) {
      if (!result.match) throw new Error(type + ' read back differently from what was uploaded; nothing was committed');
    }
    return commitEdit(api, edit, hold);
  });
  console.log('Committed the ' + locale + ' listing graphics' + (hold ? ' (held: send them for review in Publishing overview)' : '') + '.');
}

async function main(args) {
  const command = args[0];
  const hold = args.includes('--hold');
  const unknown = args.slice(1).filter(arg => arg !== '--hold');
  if (!['status', 'listing', 'images'].includes(command) || unknown.length) {
    console.log('Usage: node skills/skills/app-release/scripts/play.mjs status | listing [--hold] | images [--hold]');
    process.exitCode = command ? 1 : 0;
    return;
  }
  load();
  const account = playAccount();
  if (command === 'status') await status(account);
  if (command === 'listing') await listing(account, hold);
  if (command === 'images') await images(account, hold);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
