// The app standards audit: a catalog of what every app has, read from git-tracked source, with no network or store.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { normalizeConfig } from '../../skills/app-release/scripts/lib/config.mjs';
import { auditApp, gateFor, isSourcePath, loadCatalog, standardsRefusal } from '../../skills/app-release/scripts/lib/standards.mjs';
import { discoverApps, parseArgs, table } from '../../skills/app-release/scripts/standards.mjs';

const skill = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'app-release');
const swiftReference = join(skill, 'assets', 'feedback', 'FeedbackButton.swift');
const tsReference = join(skill, 'assets', 'feedback', 'feedback.ts');
const script = join(skill, 'scripts', 'standards.mjs');
const address = 'astrojams1@gmail.com';
const settings = 'import SwiftUI\nstruct SettingsView: View { var body: some View { List { FeedbackButton(); Link("Privacy policy", destination: privacyURL); Link("Support", destination: supportURL) } } }\n'
  + 'let privacyURL = URL(string: "https://example.test/privacy")!\nlet supportURL = URL(string: "https://example.test/support")!\n';

function repo(t, { config = {}, store = {}, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'standards-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: 'Example', slug: 'example', storeData: 'store.json', ledger: { gates: 'l.json', view: 'l.md' }, feedback: { email: address }, ...config }));
  writeFileSync(join(root, 'store.json'), JSON.stringify(store));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q'); git('config', 'user.email', 'qa@example.test'); git('config', 'user.name', 'QA'); git('add', '.'); git('commit', '-qm', 'fixture');
  return { root, git, config: () => normalizeConfig(JSON.parse(readFileSync(join(root, 'app-release.config.json'), 'utf8')), join(root, 'app-release.config.json')) };
}
const native = () => ({ 'App/FeedbackButton.swift': readFileSync(swiftReference, 'utf8'), 'App/SettingsView.swift': settings });
const status = (result, id) => result.standards.find(item => item.id === id);

test('the Swift reference, placed on a screen, passes every standard', t => {
  const result = auditApp(repo(t, { files: native() }).config());
  assert.equal(result.ok, true, JSON.stringify(result.standards.flatMap(item => item.problems)));
  assert.deepEqual(result.standards.map(item => item.status), ['pass', 'pass', 'pass']);
  assert.ok(status(result, 'feedback').evidence.includes('App/FeedbackButton.swift'));
});

test('the TypeScript reference passes once a screen labels and calls it', t => {
  const screen = 'import { sendFeedback } from "./feedback";\n<Button title="Send Feedback" onPress={() => sendFeedback(info, platform)} />;\nconst privacyUrl = "/privacy"; const supportUrl = "/support";\n';
  const result = auditApp(repo(t, { files: { 'src/feedback.ts': readFileSync(tsReference, 'utf8'), 'src/Settings.tsx': screen } }).config());
  assert.equal(result.ok, true, JSON.stringify(result.standards.flatMap(item => item.problems)));
});

test('an app with none of it is told exactly what is missing and the gate to record', t => {
  const result = auditApp(repo(t, { config: { feedback: undefined }, files: { 'App/Main.swift': 'struct Main {}\n' } }).config());
  assert.equal(result.ok, false);
  const feedback = status(result, 'feedback');
  assert.equal(feedback.status, 'missing');
  assert.equal(feedback.gate, 'issue.standard.feedback');
  assert.equal(gateFor('feedback'), feedback.gate);
  assert.match(feedback.problems.join('|'), /feedback\.email/);
  assert.match(feedback.problems.join('|'), /app-standard: feedback/);
  assert.match(feedback.problems.join('|'), /Send Feedback/);
  assert.match(feedback.fix, /FeedbackButton\.swift/);
  assert.match(feedback.verify, /tap Send Feedback/);
  assert.equal(status(result, 'privacy-link').status, 'missing');
  assert.equal(status(result, 'support-link').status, 'missing');
});

test('a wrong address, subject or composer fails, and an unused reference file is not a control', t => {
  const wrongAddress = auditApp(repo(t, { config: { feedback: { email: 'other@example.test' } }, files: native() }).config());
  assert.match(status(wrongAddress, 'feedback').problems.join(), /appears nowhere/);
  const invalid = auditApp(repo(t, { config: { feedback: { email: 'not an address' } }, files: native() }).config());
  assert.match(status(invalid, 'feedback').problems.join(), /no valid feedback\.email/);
  const handRolled = '// app-standard: feedback\nlet label = "Send Feedback"; let to = "' + address + '"\nlet subject = "Feedback on the app"\n';
  const problems = status(auditApp(repo(t, { files: { 'App/Help.swift': handRolled } }).config()), 'feedback').problems.join('|');
  assert.match(problems, /no mail composer/);
  assert.match(problems, /does not build the subject/);
  const dropped = auditApp(repo(t, { files: { 'App/FeedbackButton.swift': readFileSync(swiftReference, 'utf8') } }).config());
  assert.match(status(dropped, 'feedback').problems.join(), /no screen uses it/);
});

test('copies outside the app source never pass: vendored skills, discovery copies, dependencies, build output, tests', t => {
  const reference = readFileSync(swiftReference, 'utf8');
  const files = { 'App/Main.swift': 'struct Main {}\n' };
  for (const path of ['skills/skills/app-release/assets/feedback/FeedbackButton.swift', 'vendor/skills/x/FeedbackButton.swift', '.claude/skills/app-release/FeedbackButton.swift',
    '.agents/skills/app-release/FeedbackButton.swift', 'node_modules/x/FeedbackButton.swift', 'ios/build/FeedbackButton.swift', 'store/FeedbackButton.swift',
    'web/FeedbackButton.swift', 'AppTests/FeedbackButton.swift', 'tests/FeedbackButton.swift']) files[path] = reference;
  files['store/ledger.md'] = 'app-standard: feedback';
  assert.equal(status(auditApp(repo(t, { files }).config()), 'feedback').evidence.length, 0);
  const scan = loadCatalog().scan;
  assert.equal(isSourcePath('src/skills/combat.ts', scan), true, 'a game folder called skills is still app source');
  assert.equal(isSourcePath('src/Example.test.ts', scan), false);
  assert.equal(isSourcePath('README.md', scan), false);
});

test('an untracked implementation does not count, and a monorepo scans only its project directory', t => {
  const fixture = repo(t, { files: { 'App/Main.swift': 'struct Main {}\n' } });
  writeFileSync(join(fixture.root, 'App', 'FeedbackButton.swift'), readFileSync(swiftReference, 'utf8'));
  assert.equal(status(auditApp(fixture.config()), 'feedback').evidence.length, 0);
  const mono = repo(t, { config: { projectDir: 'apps/client' }, files: { ...native(), 'apps/client/Main.swift': 'struct Main {}\n' } });
  assert.equal(status(auditApp(mono.config()), 'feedback').status, 'missing', 'source beside the project is another product');
});

test('in-app links pass on the listing URL or a route, and a heading alone or a privacy manifest key does not', t => {
  const store = { listing: { privacyPolicyUrl: 'https://example.test/legal/p1', supportUrl: 'https://help.example.test/' } };
  const literal = auditApp(repo(t, { store, files: { 'App/About.swift': 'let a = "https://example.test/legal/p1"; let b = "https://help.example.test/"\n' } }).config());
  assert.deepEqual([status(literal, 'privacy-link').status, status(literal, 'support-link').status], ['pass', 'pass']);
  const route = auditApp(repo(t, { files: { 'src/about.tsx': 'export const privacyUrl = `${site}/privacy`; export const supportUrl = `${site}/support`;\n' } }).config());
  assert.deepEqual([status(route, 'privacy-link').status, status(route, 'support-link').status], ['pass', 'pass']);
  const pathOnly = auditApp(repo(t, { files: { 'src/ui.ts': '`<a href="./privacy.html">Privacy</a> <a href="./support.html">Help</a>`;\n' } }).config());
  assert.deepEqual([status(pathOnly, 'privacy-link').status, status(pathOnly, 'support-link').status], ['pass', 'pass']);
  const nothing = auditApp(repo(t, { files: { 'App/Tips.swift': 'TipSection(title: "Privacy") {}\nlet key = "NSPrivacyCollectedDataTypeLinked"\nlet dir = FileManager.SearchPathDirectory.applicationSupportDirectory\nlet s = "Support"\n' } }).config());
  assert.deepEqual([status(nothing, 'privacy-link').status, status(nothing, 'support-link').status], ['missing', 'missing']);
  const marked = auditApp(repo(t, { files: { 'App/Links.swift': '// app-standard: privacy-link\n// app-standard: support-link\n' } }).config());
  assert.deepEqual([status(marked, 'privacy-link').status, status(marked, 'support-link').status], ['pass', 'pass']);
});

test('a privacy policy URL that is only the marketing or support page does not count', t => {
  const files = { 'App/About.swift': 'let a = "https://example.test/app/"\n' };
  const same = auditApp(repo(t, { store: { listing: { privacyPolicyUrl: 'https://example.test/app/', marketingUrl: 'https://Example.test/app', supportUrl: 'https://example.test/app/' } }, files }).config());
  assert.equal(status(same, 'privacy-link').status, 'missing');
  assert.match(status(same, 'privacy-link').problems.join(' '), /same page as the marketing or support URL/);
  const own = auditApp(repo(t, { store: { listing: { privacyPolicyUrl: 'https://example.test/app/privacy', marketingUrl: 'https://example.test/app/', supportUrl: 'https://example.test/app/' } }, files: { 'App/About.swift': 'let a = "https://example.test/app/privacy"\n' } }).config());
  assert.equal(status(own, 'privacy-link').status, 'pass');
});

test('a Kids Category app needs the control behind its parental gate', t => {
  const store = { ageRating: { kidsAgeBand: 'FIVE_AND_UNDER' } };
  const exposed = auditApp(repo(t, { store, files: native() }).config());
  assert.match(status(exposed, 'feedback').problems.join(), /parental gate/);
  const gated = { ...native(), 'App/GrownUpsView.swift': settings.replace('SettingsView', 'GrownUpsView') };
  delete gated['App/SettingsView.swift'];
  assert.equal(status(auditApp(repo(t, { store, files: gated }).config()), 'feedback').status, 'pass');
});

test('an opt-out needs a recorded reason, stays visible, and an unknown id is flagged', t => {
  const reason = 'A watch-only app has no screen to hold the control.';
  const out = auditApp(repo(t, { config: { standards: { optOut: { feedback: reason, 'privacy-link': reason, 'support-link': reason, feedbak: reason } } } }).config());
  assert.equal(out.ok, true);
  assert.equal(status(out, 'feedback').status, 'opted-out');
  assert.equal(status(out, 'feedback').reason, reason);
  assert.match(out.warnings.join(), /feedbak/);
  for (const bad of ['', '   ', 'n/a', null, true]) {
    const refused = status(auditApp(repo(t, { config: { standards: { optOut: { feedback: bad } } } }).config()), 'feedback');
    assert.equal(refused.status, 'missing');
    assert.match(refused.problems[0], /does not record a reason/);
  }
});

test('a new catalog entry is a new standard, with no script change', t => {
  const catalog = loadCatalog();
  catalog.standards.push({ id: 'restore', title: 'Restore purchases', doc: 'x', fix: 'Add it', verify: 'Tap it',
    checks: [{ type: 'source', in: 'app', anyOf: ['Restore purchases'], problem: 'no Restore purchases control' }] });
  const fixture = repo(t, { files: native() });
  const result = auditApp(fixture.config(), catalog);
  assert.equal(status(result, 'restore').gate, 'issue.standard.restore');
  assert.match(standardsRefusal(fixture.config(), catalog), /restore \(no Restore purchases control\)/);
  assert.equal(standardsRefusal(fixture.config()), null);
});

test('the refusal names the app and each missing standard, and a non-checkout fails closed', t => {
  const fixture = repo(t, { files: { 'App/Main.swift': 'struct Main {}\n' } });
  assert.match(standardsRefusal(fixture.config()), /^Example is missing required app standards: feedback \(.*privacy-link \(.*support-link \(/);
  rmSync(join(fixture.root, '.git'), { recursive: true, force: true });
  assert.throws(() => auditApp(fixture.config()), /not a readable git checkout/);
});

test('the CLI audits the app it runs in, exits nonzero when something is missing, and prints JSON', t => {
  const run = (root, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, APP_RELEASE_CONFIG: '' } });
  const good = repo(t, { files: native() });
  const pass = run(good.root, 'audit');
  assert.equal(pass.status, 0, pass.stdout + pass.stderr);
  assert.match(pass.stdout, /pass {7}feedback: App\/FeedbackButton\.swift/);
  const bad = repo(t, { config: { feedback: undefined }, files: { 'App/Main.swift': 'struct Main {}\n' } });
  const missing = run(bad.root, 'audit');
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /MISSING {4}feedback/);
  assert.match(missing.stdout, /Ledger gate: issue\.standard\.feedback/);
  const json = run(bad.root, 'audit', '--json');
  assert.equal(json.status, 1);
  assert.equal(JSON.parse(json.stdout).standards[0].status, 'missing');
  assert.throws(() => parseArgs(['audit', '--al']), /Unknown option/);
  assert.throws(() => parseArgs(['check']), /Usage/);
});

test('--all sweeps each repository once, prefers its main checkout, changes nothing and tables the result', t => {
  const home = mkdtempSync(join(tmpdir(), 'standards-all-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const make = (name, files) => {
    const root = join(home, name);
    mkdirSync(root);
    writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: name, slug: name, ledger: { gates: 'l.json', view: 'l.md' }, feedback: { email: address } }));
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '-q'); git('config', 'user.email', 'qa@example.test'); git('config', 'user.name', 'QA'); git('add', '.'); git('commit', '-qm', 'fixture');
    return git;
  };
  const git = make('b-main', native());
  make('c-bare', { 'App/Main.swift': 'struct Main {}\n' });
  git('worktree', 'add', '-q', join(home, 'a-worktree'), '-b', 'work');
  mkdirSync(join(home, 'not-an-app'));
  assert.deepEqual(discoverApps(home), { apps: [join(home, 'b-main'), join(home, 'c-bare')], duplicates: [join(home, 'a-worktree')] });
  const index = join(home, 'b-main', '.git', 'index');
  const before = statSync(index).mtimeMs;
  const sweep = spawnSync(process.execPath, [script, 'audit', '--all', '--root', home], { encoding: 'utf8' });
  assert.equal(sweep.status, 1);
  assert.match(sweep.stdout, /^App +Checkout +Branch +feedback +privacy-link +support-link/);
  assert.match(sweep.stdout, /b-main +b-main +\S+ +pass +pass +pass/);
  assert.match(sweep.stdout, /c-bare +c-bare +\S+ +MISSING +MISSING +MISSING/);
  assert.match(sweep.stdout, /Skipped extra worktrees: a-worktree/);
  assert.equal(statSync(index).mtimeMs, before);
  const json = JSON.parse(spawnSync(process.execPath, [script, 'audit', '--all', '--json', '--root', home], { encoding: 'utf8' }).stdout);
  assert.equal(json.results.length, 2);
  assert.match(table([{ app: 'Broken', root: '/x/broken', error: 'bad', standards: [] }], loadCatalog()), /Broken +broken +\? +error +error +error/);
});

test('feedback.ts builds the exact subject, a footer of six facts, and falls back to the address', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'feedback-ts-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const module = join(dir, 'feedback.mjs');
  writeFileSync(module, stripTypeScriptTypes(readFileSync(tsReference, 'utf8')));
  const { feedbackBody, feedbackSubject, feedbackUrl, sendFeedback, FEEDBACK_ADDRESS } = await import(module);
  assert.equal(FEEDBACK_ADDRESS, address);
  const info = { appName: 'Füd & Co', version: '1.2.0', build: '34', osVersion: 'ios 26.1', deviceModel: 'iPhone17,3', locale: 'en-US', userId: 'secret' };
  assert.equal(feedbackSubject(info), '[Füd & Co feedback] 1.2.0 (34)');
  const body = feedbackBody(info);
  assert.match(body, /^\n\n/);
  assert.deepEqual(body.split('-- \n')[1].trim().split('\n').map(line => line.split(':')[0]), ['App', 'Version', 'Build', 'OS', 'Device', 'Locale']);
  assert.doesNotMatch(body, /secret/);
  const url = new URL(feedbackUrl(info));
  assert.equal(url.protocol + url.pathname, 'mailto:' + address);
  assert.equal(new URLSearchParams(url.search.replace(/\+/g, '%2B')).get('subject'), '[Füd & Co feedback] 1.2.0 (34)');
  assert.match(url.search, /%0D%0A/);
  const seen = [];
  const platform = result => ({ open: async () => { if (result instanceof Error) throw result; return result; }, showAddress: shown => seen.push(shown) });
  await sendFeedback(info, platform(undefined));
  await sendFeedback(info, platform(true));
  assert.deepEqual(seen, [], 'Linking.openURL resolves undefined when it opens');
  await sendFeedback(info, platform(false));
  await sendFeedback(info, platform(new Error('no mail app')));
  assert.deepEqual(seen, [address, address]);
});

const xcrun = process.platform === 'darwin' ? spawnSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], { encoding: 'utf8' }) : null;
const sdk = xcrun && xcrun.status === 0 ? xcrun.stdout.trim() : null;

test('FeedbackButton.swift compiles for iOS', { skip: !sdk }, () => {
  const result = spawnSync('xcrun', ['swiftc', '-typecheck', '-parse-as-library', '-sdk', sdk, '-target', 'arm64-apple-ios15.0-simulator', swiftReference], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /warning:/);
});

test('FeedbackMessage builds the exact subject, footer and mailto link', { skip: !sdk }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'feedback-swift-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  copyFileSync(swiftReference, join(dir, 'FeedbackButton.swift'));
  writeFileSync(join(dir, 'main.swift'), `import Foundation
let message = FeedbackMessage(appName: "Füd & Co", version: "1.2.0", build: "34", osVersion: "iOS 26.1", deviceModel: "iPhone17,3", locale: "en_US")
let out: [String: String] = ["subject": message.subject, "body": message.body, "url": message.mailtoURL?.absoluteString ?? ""]
print(String(decoding: try! JSONSerialization.data(withJSONObject: out), as: UTF8.self))
`);
  const built = spawnSync('xcrun', ['swiftc', join(dir, 'main.swift'), join(dir, 'FeedbackButton.swift'), '-o', join(dir, 'probe')], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  const out = JSON.parse(execFileSync(join(dir, 'probe'), { encoding: 'utf8' }));
  assert.equal(out.subject, '[Füd & Co feedback] 1.2.0 (34)');
  assert.match(out.body, /^\n\n/);
  assert.deepEqual(out.body.split('-- \n')[1].trim().split('\n').map(line => line.split(':')[0]), ['App', 'Version', 'Build', 'OS', 'Device', 'Locale']);
  const url = new URL(out.url);
  assert.equal(url.protocol + url.pathname, 'mailto:' + address);
  assert.equal(decodeURIComponent(url.search.match(/subject=([^&]*)/)[1]), out.subject);
  assert.equal(decodeURIComponent(url.search.match(/body=([^&]*)/)[1]), out.body.replace(/\n/g, '\r\n'));
});
