import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, parseArgs, pem, primaryConfigs, serviceToken } from '../../skills/astrojams-website/scripts/audit.mjs';

const catalog = {
  site: { url: 'https://astrojams-apps.vercel.app' },
  developer: { teamId: 'TEAM' },
  apps: [
    { appStoreId: '1', slug: 'newsworthy', name: 'Newsworthy', fullName: 'Newsworthy: Calm News', subtitle: 'World news, rated' },
    { appStoreId: '2', slug: 'rhythm', name: 'Rhythm', fullName: 'Rhythm: Endless Beats', subtitle: 'An endless place to slow down' }
  ],
  excluded: [{ appStoreId: '9', name: 'Old placeholder', reason: 'never released' }]
};
const row = (appStoreId, name, subtitle, released = false) => ({ appStoreId, bundleId: 'b' + appStoreId, name, subtitle, latest: null, released });
const config = (dir, ascAppId, marketingUrl, worktree = false) => ({ dir, config: { storeData: 'store/store.json', ios: { ascAppId } }, listing: { marketingUrl }, worktree });

test('a matching team needs nothing', () => {
  const team = [row('1', 'Newsworthy: Calm News', 'World news, rated', true), row('2', 'Rhythm: Endless Beats', ''), row('9', 'Old placeholder', '')];
  const { actions, rows } = compare(team, catalog, { apps: { 1: {} } }, []);
  assert.deepEqual(actions, []);
  assert.deepEqual(rows.map(r => r.status), ['site: available', 'site: coming soon', 'excluded']);
});

test('new records, renames, unsynced releases and departed apps become actions', () => {
  const team = [row('1', 'Newsworthy: World News', 'World news, rated'), row('2', 'Rhythm: Endless Beats', 'Slow down', true), row('5', 'Data Center: AI Frontier', 'Build a mind.')];
  const { actions } = compare(team, catalog, { apps: {} }, []);
  assert.equal(actions.length, 4);
  assert.match(actions.join('\n'), /Add or exclude Data Center: AI Frontier/);
  assert.match(actions.join('\n'), /name is now "Newsworthy: World News"/);
  assert.match(actions.join('\n'), /subtitle is now "Slow down"/);
  assert.match(actions.join('\n'), /Rhythm is released but the site still says coming soon/);
  const departed = compare([row('2', 'Rhythm: Endless Beats', '')], catalog, { apps: {} }, []).actions;
  assert.match(departed.join('\n'), /Newsworthy \(1\) is in the catalog but not on the App Store Connect team/);
});

test('only an app without a marketing URL of its own is told to use its page here', () => {
  const configs = [config('/code/newsworthy', '1', 'https://newsworthy.example/'), config('/code/rhythm', 2, '')];
  const { followUps, rows } = compare([row('1', 'Newsworthy: Calm News', 'World news, rated')], catalog, { apps: {} }, configs);
  assert.equal(followUps.length, 1);
  assert.match(followUps[0], /Rhythm: set listing\.marketingUrl to https:\/\/astrojams-apps\.vercel\.app\/rhythm\/ in \/code\/rhythm\/store\/store\.json/);
  assert.equal(rows[0].repo, '/code/newsworthy');
});

test('a main checkout wins over its worktrees, so each app is reported once', () => {
  const configs = [config('/code/rhythm-feature', '2', '', true), config('/code/rhythm', '2', ''), config('/code/rhythm-other', '2', '', true)];
  assert.equal(primaryConfigs(configs).get('2').dir, '/code/rhythm');
  assert.equal(compare([], catalog, { apps: {} }, configs).followUps.length, 1);
  assert.equal(primaryConfigs([config('/code/only-worktree', '2', '', true)]).get('2').dir, '/code/only-worktree');
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
  assert.deepEqual(parseArgs(['--pull', '123', '--out', '/tmp/x', '--json']), { site: '/Volumes/ssd/code/astrojams-apps', code: '/Volumes/ssd/code', json: true, pull: '123', out: '/tmp/x' });
  assert.throws(() => parseArgs(['--nope']), /Unknown argument/);
});
