import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, parseArgs, pem, serviceToken } from '../../skills/ouro-website/scripts/audit.mjs';

const catalog = {
  site: { url: 'https://ouro-apps.vercel.app' },
  developer: { teamId: 'TEAM' },
  apps: [
    { appStoreId: '1', slug: 'fud', name: 'Füd', fullName: 'Füd: Family Food Tracker', subtitle: 'Food tracking for your family' },
    { appStoreId: '2', slug: 'nametag', name: 'Nametag', fullName: 'Nametag: Little Hellos', subtitle: 'Cute badges for parent meetups' }
  ],
  excluded: [{ appStoreId: '9', name: 'Old placeholder', reason: 'never released' }]
};
const row = (appStoreId, name, subtitle, released = false) => ({ appStoreId, bundleId: 'b' + appStoreId, name, subtitle, latest: null, released });

test('a matching team needs nothing', () => {
  const team = [row('1', 'Füd: Family Food Tracker', 'Food tracking for your family', true), row('2', 'Nametag: Little Hellos', 'Cute badges for parent meetups'), row('9', 'Old placeholder', '')];
  const { actions, rows } = compare(team, catalog, { apps: { 1: {} } }, []);
  assert.deepEqual(actions, []);
  assert.deepEqual(rows.map(r => r.status), ['site: available', 'site: coming soon', 'excluded']);
});

test('new records, renames, unsynced releases and departed apps become actions', () => {
  const team = [row('1', 'Füd: Family Meals', 'Food tracking for your family'), row('2', 'Nametag: Little Hellos', 'Badges for parents', true), row('5', 'Bedtime Stories', 'Stories for little ones')];
  const { actions } = compare(team, catalog, { apps: {} }, []);
  assert.equal(actions.length, 4);
  assert.match(actions.join('\n'), /Add or exclude Bedtime Stories/);
  assert.match(actions.join('\n'), /name is now "Füd: Family Meals"/);
  assert.match(actions.join('\n'), /subtitle is now "Badges for parents"/);
  assert.match(actions.join('\n'), /Nametag is released but the site still says coming soon/);
  const departed = compare([row('2', 'Nametag: Little Hellos', '')], catalog, { apps: {} }, []).actions;
  assert.match(departed.join('\n'), /Füd \(1\) is in the catalog but not on the App Store Connect team/);
});

test('marketing URLs that do not point at the site are app-repository follow-ups', () => {
  const configs = [
    { dir: '/code/fud', config: { storeData: 'store/store.json', ios: { ascAppId: '1' } }, listing: { marketingUrl: 'https://old.example' } },
    { dir: '/code/nametag', config: { storeData: 'store/store.json', ios: { ascAppId: 2 } }, listing: { marketingUrl: 'https://ouro-apps.vercel.app/nametag/' } }
  ];
  const { followUps, rows } = compare([row('1', 'Füd: Family Food Tracker', 'Food tracking for your family')], catalog, { apps: {} }, configs);
  assert.equal(followUps.length, 1);
  assert.match(followUps[0], /Füd: set listing\.marketingUrl to https:\/\/ouro-apps\.vercel\.app\/fud\//);
  assert.equal(rows[0].repo, '/code/fud');
});

test('the service-account token comes from the environment or the token file, prefix stripped', () => {
  assert.equal(serviceToken({ OP_KEY: 'OP_KEY=ops_abc' }, () => ''), 'ops_abc');
  assert.equal(serviceToken({}, () => '# token\n\n`OP_KEY=ops_fromFile123`\n'), 'ops_fromFile123');
  assert.throws(() => serviceToken({}, () => 'nothing here'), /No 1Password service-account token/);
});

test('pem restores armor and line breaks', () => {
  const body = 'A'.repeat(100);
  assert.equal(pem(body), '-----BEGIN PRIVATE KEY-----\n' + 'A'.repeat(64) + '\n' + 'A'.repeat(36) + '\n-----END PRIVATE KEY-----\n');
});

test('arguments', () => {
  assert.deepEqual(parseArgs(['--pull', '123', '--out', '/tmp/x', '--json']), { site: '/Volumes/ssd/code/app-sites/sites/ouro', code: '/Volumes/ssd/code', json: true, pull: '123', out: '/tmp/x' });
  assert.throws(() => parseArgs(['--nope']), /Unknown argument/);
});
