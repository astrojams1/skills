import test from 'node:test';
import assert from 'node:assert/strict';
import { chinaAiProblem, listingCharacterProblems, localizationWritePlan } from '../../skills/app-release/scripts/asc.mjs';
import { APP_STORE_LOCALES, localizationChanges, localizationProblems, localizationSummary } from '../../skills/app-release/scripts/lib/listing-localizations.mjs';
import { listingReason } from '../../skills/app-release/scripts/review-sweep.mjs';

const spanish = { name: 'Plenty', subtitle: 'Cuenta regresiva', keywords: 'cuenta,regresiva,fecha', description: 'Una cuenta regresiva.', promotionalText: 'Nuevo', whatsNew: 'La página ahora está en español.' };
const primary = { locale: 'en-US', name: 'Plenty', supportUrl: 'https://example.com/support', marketingUrl: 'https://example.com/', privacyPolicyUrl: 'https://example.com/privacy' };
const resource = (id, locale, attributes = {}) => ({ id, attributes: { locale, ...attributes } });

test('the United States storefront languages are accepted locale codes', () => {
  for (const code of ['en-US', 'ar-SA', 'zh-Hans', 'zh-Hant', 'fr-FR', 'ko', 'pt-BR', 'ru', 'es-MX', 'vi']) assert.ok(APP_STORE_LOCALES.includes(code), code);
  assert.equal(APP_STORE_LOCALES.length, 50);
});

test('a valid localization passes, and no localizations is no problem', () => {
  assert.deepEqual(localizationProblems({ ...primary, localizations: { 'es-MX': spanish } }, listingCharacterProblems), []);
  assert.deepEqual(localizationProblems(primary, listingCharacterProblems), []);
});

test('locale codes, the primary locale and the shape are checked', () => {
  const problems = localizationProblems({ ...primary, localizations: { es: spanish, 'en-US': spanish, 'ko-KR': spanish } });
  assert.match(problems.find(p => p.includes('"es"')), /did you mean es-MX or es-ES/);
  assert.ok(problems.some(p => p.includes('en-US is the primary listing.locale')));
  assert.match(problems.find(p => p.includes('"ko-KR"')), /did you mean ko\?/);
  assert.deepEqual(localizationProblems({ ...primary, localizations: [spanish] }), ['listing.localizations must be an object keyed by locale code']);
  assert.ok(localizationProblems({ ...primary, localizations: { 'fr-FR': 'Bonjour' } })[0].includes('must be an object'));
});

test('required fields, unknown fields and limits are checked', () => {
  const problems = localizationProblems({ ...primary, localizations: { 'fr-FR': {
    name: 'P', subtitle: 'x'.repeat(31), keywords: '', description: 'd'.repeat(4001), promotionalText: 'p'.repeat(171), whatsNew: 'w'.repeat(4001), supportUrl: 'https://x',
  } } });
  for (const expected of [/keywords is required/, /name must be at least two/, /subtitle is 31 characters; Apple allows 30/, /description is 4001 characters/,
    /promotionalText is 171 characters/, /whatsNew is 4001 characters/, /supportUrl is not a localized field/]) {
    assert.ok(problems.some(p => expected.test(p)), String(expected));
  }
});

test('keywords are limited to 100 characters in every language, as Apple enforces, not 100 bytes', () => {
  const chinese = { ...spanish, keywords: '倒'.repeat(101) };
  assert.match(localizationProblems({ ...primary, localizations: { 'zh-Hans': chinese } })[0], /keywords is 101 characters; Apple allows 100/);
  assert.deepEqual(localizationProblems({ ...primary, localizations: { 'zh-Hans': { ...chinese, keywords: '倒'.repeat(100) } } }), [], '300 bytes, 100 characters');
  assert.deepEqual(localizationProblems({ ...primary, localizations: { ru: { ...spanish, keywords: 'я'.repeat(100) } } }), []);
  // a Thai combining mark counts as a character of its own
  assert.match(localizationProblems({ ...primary, localizations: { th: { ...spanish, keywords: 'กิ'.repeat(51) } } })[0], /keywords is 102 characters/);
  assert.deepEqual(localizationProblems({ ...primary, localizations: { 'zh-Hans': { ...spanish, name: '倒'.repeat(30) } } }), [], 'names count characters');
});

test('pictographic symbols are refused in a localization as in the primary listing', () => {
  const problems = localizationProblems({ ...primary, localizations: { 'es-MX': { ...spanish, description: 'Listo ✓' } } }, listingCharacterProblems);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /listing\.localizations\.es-MX\.description contains "✓"/);
});

test('a new language is created with its locale and the primary URLs', () => {
  const plan = localizationWritePlan('es-MX', spanish, primary, true);
  assert.deepEqual(plan.info, { action: 'create', attributes: { locale: 'es-MX', name: 'Plenty', subtitle: 'Cuenta regresiva', privacyPolicyUrl: 'https://example.com/privacy' } });
  assert.deepEqual(plan.version, { action: 'create', attributes: { locale: 'es-MX', description: 'Una cuenta regresiva.', keywords: 'cuenta,regresiva,fecha',
    promotionalText: 'Nuevo', supportUrl: 'https://example.com/support', marketingUrl: 'https://example.com/', whatsNew: 'La página ahora está en español.' } });
});

test('an existing language is patched, and release notes follow the whatsNewPlan rule', () => {
  const plan = localizationWritePlan('es-MX', spanish, primary, false, { info: { id: 'info-es' }, version: { id: 'ver-es' } });
  assert.equal(plan.info.action, 'update');
  assert.equal(plan.info.id, 'info-es');
  assert.equal(plan.info.attributes.locale, undefined);
  assert.equal(plan.version.id, 'ver-es');
  assert.equal(plan.version.attributes.whatsNew, undefined, 'no release notes before a version is live');
  assert.throws(() => localizationWritePlan('es-MX', { ...spanish, whatsNew: ' ' }, primary, true), /listing\.localizations\.es-MX\.whatsNew/);
  assert.equal(localizationWritePlan('es-MX', { ...spanish, subtitle: '' }, primary, true).info.attributes.subtitle, undefined, 'an empty field is not sent');
});

test('a language missing live or different in a shipping field is a change; one only live is reported', () => {
  const listing = { ...primary, localizations: { 'es-MX': spanish, 'fr-FR': { ...spanish, name: 'Plenty FR' } } };
  const info = [resource('a', 'en-US', { name: 'Plenty' }), resource('b', 'es-MX', { name: 'Plenty', subtitle: 'Otra' }), resource('c', 'de-DE', { name: 'Plenty' })];
  const version = [resource('d', 'en-US'), resource('e', 'es-MX', { description: 'Una cuenta regresiva.', keywords: 'cuenta,regresiva,fecha', promotionalText: 'Viejo', whatsNew: 'Viejo' })];
  const changes = localizationChanges(listing, info, version);
  assert.deepEqual(changes, { changed: [{ locale: 'es-MX', fields: ['subtitle'] }], missing: ['fr-FR'], unlisted: ['de-DE'] });
  assert.equal(localizationSummary(changes), 'localizations not live: fr-FR; es-MX differs in subtitle');
  const same = localizationChanges({ ...primary, localizations: { 'es-MX': { ...spanish, subtitle: 'Otra', promotionalText: 'Changed' } } }, info, version);
  assert.deepEqual(same.changed, [], 'promotional text and release notes never ship an app');
  assert.equal(localizationSummary(same), '');
  assert.deepEqual(localizationChanges(primary, info, version), { changed: [], missing: [], unlisted: ['de-DE', 'es-MX'] });
});

test('a language present only on the App Info is still missing', () => {
  const listing = { ...primary, localizations: { 'es-MX': spanish } };
  assert.deepEqual(localizationChanges(listing, [resource('b', 'es-MX', { name: 'Plenty' })], []).missing, ['es-MX']);
});

test('the sweep ships a languages-only change as a listing candidate', () => {
  assert.equal(listingReason({ fields: [], localizations: { changed: [], missing: ['es-MX'], unlisted: [] } }), 'localizations not live: es-MX');
  assert.equal(listingReason({ fields: ['subtitle'], localizations: { changed: [{ locale: 'fr-FR', fields: ['keywords'] }], missing: [], unlisted: [] } }), 'subtitle; fr-FR differs in keywords');
  assert.equal(listingReason({ fields: [], localizations: { changed: [], missing: [], unlisted: ['de-DE'] } }), '', 'a live language absent from store data ships nothing');
  assert.equal(listingReason({ problem: 'no live en-US localization' }), '');
  assert.equal(listingReason({ fields: ['name'] }), 'name');
});

test('the China mainland check reads every language', () => {
  const listing = { ...primary, description: 'A countdown.', localizations: { 'zh-Hans': { ...spanish, description: '由ChatGPT提供' } } };
  assert.match(chinaAiProblem(listing, true), /names ChatGPT/);
  assert.equal(chinaAiProblem(listing, false), null);
});

test('complianceRefusal names the unanswered App Compliance forms from Apple\'s 409', async () => {
  const { complianceRefusal } = await import('../../skills/app-release/scripts/asc.mjs');
  const apple = 'PATCH /v1/reviewSubmissionItems/x -> 409 [{"code":"STATE_ERROR.ENTITY_STATE_INVALID","meta":{"associatedErrors":{"/v1/appInfos/a":['
    + '{"code":"STATE_ERROR.PPM.compliance.form.SECURITYASF395E.enforcement.PENDING_COLLECT.NEW_APP_SUBMISSION_BLOCK"},'
    + '{"code":"STATE_ERROR.PPM.compliance.form.AIGENERATEFD1DE.enforcement.PENDING_COLLECT.NEW_APP_SUBMISSION_BLOCK"},'
    + '{"code":"STATE_ERROR.PPM.compliance.form.NEWFORM123.enforcement.PENDING_COLLECT.NEW_APP_SUBMISSION_BLOCK"}]}}}]';
  const refusal = complianceRefusal(apple);
  assert.match(refusal, /App Compliance/);
  assert.match(refusal, /Security Assessment \(China mainland\); AI Generated or Synthetic Content \(China mainland\); NEWFORM123/);
  assert.match(refusal, /owner answers it/);
  assert.equal(complianceRefusal('PATCH /v1/x -> 409 [{"code":"STATE_ERROR.ENTITY_STATE_INVALID"}]'), null);
  assert.equal(complianceRefusal(undefined), null);
});
