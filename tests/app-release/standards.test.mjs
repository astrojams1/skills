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
import { expectedApps, listFor, parseGenerated, renderSwift, renderTs } from '../../skills/app-release/scripts/lib/more-apps.mjs';

// The audit compares a generated More apps list with the app sites repository when this Mac has it; fixtures never do.
process.env.APP_SITES_ROOT = '/nonexistent/app-sites';

const skill = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'app-release');
const swiftReference = join(skill, 'assets', 'feedback', 'FeedbackButton.swift');
const tsReference = join(skill, 'assets', 'feedback', 'feedback.ts');
const swiftRating = join(skill, 'assets', 'rating', 'RatingPrompt.swift');
const tsRating = join(skill, 'assets', 'rating', 'rating.ts');
const swiftMoreApps = join(skill, 'assets', 'more-apps', 'MoreApps.swift');
const tsMoreApps = join(skill, 'assets', 'more-apps', 'moreApps.ts');
const swiftFirstLaunch = join(skill, 'assets', 'first-launch', 'FirstLaunch.swift');
const tsFirstLaunch = join(skill, 'assets', 'first-launch', 'firstLaunch.ts');
const today = new Date().toISOString().slice(0, 10);
const listed = [{ id: 'other', name: 'Other', subtitle: 'Another app', appStoreId: '111', bundleId: 'com.example.other', iconBase64: '' }];
const manifest = '<plist><dict><key>NSPrivacyCollectedDataTypes</key><array><dict><key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeProductInteraction</string>'
  + '<key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAnalytics</string></array></dict></array></dict></plist>\n';
const script = join(skill, 'scripts', 'standards.mjs');
// The fixture manifest's one data type, as the store data's App Privacy answers (privacy-label standard).
const appPrivacy = { collected: [{ type: 'Product Interaction', purposes: ['Analytics'], linked: false, tracking: false }] };
const address = 'astrojams1@gmail.com';
const settings = 'import SwiftUI\nstruct SettingsView: View { var body: some View { List { FeedbackButton(); MoreAppsSection(); Link("Privacy policy", destination: privacyURL); Link("Support", destination: supportURL) }.task { FirstLaunch.report(app: "example") } }\n'
  + '  func saved() { RatingPrompt.askIfDue() } }\n'
  + 'let privacyURL = URL(string: "https://example.test/privacy")!\nlet supportURL = URL(string: "https://example.test/support")!\n';

function repo(t, { config = {}, store = {}, files = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'standards-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: 'Example', slug: 'example', storeData: 'store.json', ledger: { gates: 'l.json', view: 'l.md' }, feedback: { email: address }, ...config }));
  writeFileSync(join(root, 'store.json'), JSON.stringify({ appPrivacy, ...store }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q'); git('config', 'user.email', 'qa@example.test'); git('config', 'user.name', 'QA'); git('add', '.'); git('commit', '-qm', 'fixture');
  return { root, git, config: () => normalizeConfig(JSON.parse(readFileSync(join(root, 'app-release.config.json'), 'utf8')), join(root, 'app-release.config.json')) };
}
const native = () => ({ 'App/FeedbackButton.swift': readFileSync(swiftReference, 'utf8'), 'App/RatingPrompt.swift': readFileSync(swiftRating, 'utf8'), 'App/SettingsView.swift': settings,
  'App/MoreApps.swift': readFileSync(swiftMoreApps, 'utf8'), 'App/MoreAppsCatalog.swift': renderSwift(listed, { generated: today, source: 'a test' }),
  'App/FirstLaunch.swift': readFileSync(swiftFirstLaunch, 'utf8'), 'App/PrivacyInfo.xcprivacy': manifest });
const status = (result, id) => result.standards.find(item => item.id === id);

test('the Swift reference, placed on a screen, passes every standard', t => {
  const result = auditApp(repo(t, { files: native() }).config());
  assert.equal(result.ok, true, JSON.stringify(result.standards.flatMap(item => item.problems)));
  assert.deepEqual(result.standards.map(item => item.status), ['pass', 'pass', 'pass', 'not-applicable', 'pass', 'pass', 'pass', 'pass']);
  assert.ok(status(result, 'rating').evidence.includes('App/RatingPrompt.swift'));
  assert.ok(status(result, 'feedback').evidence.includes('App/FeedbackButton.swift'));
});

test('the TypeScript reference passes once a screen labels and calls it', t => {
  const screen = 'import { sendFeedback } from "./feedback";\nimport { ratingGoodMoment } from "./rating";\n<Button title="Send Feedback" onPress={() => sendFeedback(info, platform)} />;\nconst privacyUrl = "/privacy"; const supportUrl = "/support";\n'
    + 'const onSaved = () => ratingGoodMoment(version, ratingPlatform);\nconst apps = moreAppsFor(Platform.OS, bundleId);\nuseEffect(() => { reportFirstLaunch("example", launch); }, []);\n';
  const result = auditApp(repo(t, { files: { 'src/feedback.ts': readFileSync(tsReference, 'utf8'), 'src/rating.ts': readFileSync(tsRating, 'utf8'), 'src/Settings.tsx': screen,
    'src/moreApps.ts': readFileSync(tsMoreApps, 'utf8'), 'src/moreAppsCatalog.ts': renderTs(listed, { generated: today, source: 'a test' }),
    'src/firstLaunch.ts': readFileSync(tsFirstLaunch, 'utf8'), 'app.json': JSON.stringify({ expo: { ios: { privacyManifests: { NSPrivacyCollectedDataTypes: [{ NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction', NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'] }] } } } }) } }).config());
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
  const out = auditApp(repo(t, { config: { standards: { optOut: { feedback: reason, 'privacy-link': reason, 'support-link': reason, rating: reason, 'more-apps': reason, 'first-launch': reason, 'privacy-label': reason, feedbak: reason } } } }).config());
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

// Plenty 1.0 (build 7), 2026-11-12: its sign-in web view showed claude.ai/login, whose page lists plans and prices, and
// App Review rejected it under 2.1(b) for "references to Subscription" with no In-App Purchase submitted.
const openSheet = 'import WebKit\nstruct Sheet { let view = WKWebView(); func go() { view.load(URLRequest(url: URL(string: "https://example.test/login")!)) } }\n';
const lockedSheet = 'import WebKit\n// app-standard: web-sheet\nfinal class Policy: NSObject, WKNavigationDelegate {\n'
  + '  func go(_ w: WKWebView) { w.load(URLRequest(url: URL(string: "https://example.test/login")!)) }\n'
  + '  func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {\n'
  + '    decisionHandler(a.request.url?.path.contains("pricing") == true ? .cancel : .allow)\n  }\n}\n';

test('an app with no web view is not asked about one', t => {
  const result = auditApp(repo(t, { files: native() }).config());
  assert.equal(status(result, 'web-sheet').status, 'not-applicable');
  assert.equal(result.ok, true);
});

test('an embedded web view with no limits is the Plenty 2.1(b) rejection, and refuses the release', t => {
  const fixture = repo(t, { files: { ...native(), 'App/Sheet.swift': openSheet } });
  const result = auditApp(fixture.config());
  const sheet = status(result, 'web-sheet');
  assert.equal(sheet.status, 'missing');
  assert.equal(sheet.gate, 'issue.standard.web-sheet');
  assert.deepEqual(sheet.appliesTo, ['App/Sheet.swift']);
  assert.match(sheet.problems.join('|'), /app-standard: web-sheet/);
  assert.match(sheet.fix, /prices or plans/);
  assert.equal(result.ok, false);
  assert.match(standardsRefusal(fixture.config()), /web-sheet/);
});

test('a marked web view must set a navigation policy and refuse purchase pages', t => {
  const markedOnly = '// app-standard: web-sheet\nimport WebKit\nlet view = WKWebView()\nfunc go() { view.load(URLRequest(url: URL(string: "https://example.test")!)) }\n';
  const problems = status(auditApp(repo(t, { files: { ...native(), 'App/Sheet.swift': markedOnly } }).config()), 'web-sheet').problems.join('|');
  assert.match(problems, /no navigation policy/);
  assert.match(problems, /pricing, subscription, upgrade or checkout/);
  const locked = auditApp(repo(t, { files: { ...native(), 'App/Sheet.swift': lockedSheet } }).config());
  assert.equal(status(locked, 'web-sheet').status, 'pass');
  assert.equal(locked.ok, true);
});

test('React Native and Flutter web views that load pages count too', t => {
  const rn = 'import { WebView } from "react-native-webview";\nexport const Sheet = () => <WebView source={{ uri: "https://example.test/login" }} />;\n';
  const result = auditApp(repo(t, { files: { ...native(), 'src/Sheet.tsx': rn } }).config());
  assert.equal(status(result, 'web-sheet').status, 'missing');
  const flutter = 'final c = WebViewController()..loadRequest(Uri.parse("https://example.test/login"));\n';
  assert.equal(status(auditApp(repo(t, { files: { ...native(), 'lib/sheet.dart': flutter } }).config()), 'web-sheet').status, 'missing');
});

test("a web view showing only the app's own bundled page is not covered", t => {
  const game = 'import WebView from "react-native-webview";\nexport const Game = () => <WebView source={{ html: GAME_HTML, baseUrl: ORIGIN }} />;\n';
  const swift = 'import WebKit\nlet view = WKWebView()\nfunc show() { view.loadFileURL(index, allowingReadAccessTo: folder) }\n';
  // An image from a URI (the More apps icons) is not a web view.
  const icon = 'import { Image } from "react-native";\nexport const Icon = () => <Image source={{ uri: moreAppsIconUri(app) }} />;\n';
  const result = auditApp(repo(t, { files: { ...native(), 'src/Game.tsx': game, 'App/Local.swift': swift, 'src/Icon.tsx': icon } }).config());
  assert.equal(status(result, 'web-sheet').status, 'not-applicable');
});

// Ask for a rating (owner, 2026-11-18): the store's own prompt, after a good moment, on one shared rule.
test('an app that never asks for a rating is told how, and a copied file nothing calls is not asking', t => {
  const none = status(auditApp(repo(t, { files: { 'App/FeedbackButton.swift': readFileSync(swiftReference, 'utf8'), 'App/SettingsView.swift': settings.replace('RatingPrompt.askIfDue()', '') } }).config()), 'rating');
  assert.equal(none.status, 'missing');
  assert.equal(none.gate, 'issue.standard.rating');
  assert.match(none.problems.join('|'), /app-standard: rating/);
  assert.match(none.fix, /RatingPrompt\.swift/);
  assert.match(none.verify, /system rating prompt once/);
  const unused = { ...native(), 'App/SettingsView.swift': settings.replace('RatingPrompt.askIfDue()', '') };
  assert.match(status(auditApp(repo(t, { files: unused }).config()), 'rating').problems.join(), /nothing calls it/);
  const homemade = { ...native(), 'App/RatingPrompt.swift': '// app-standard: rating\nstruct RatingPrompt { static func askIfDue() { showOurOwnDialog() } }\n' };
  assert.match(status(auditApp(repo(t, { files: homemade }).config()), 'rating').problems.join('|'), /store's own rating prompt.*\|.*shared rule/);
});

test('a Kids Category app asks for a rating only behind its parental gate', t => {
  const store = { ageRating: { kidsAgeBand: 'FIVE_AND_UNDER' } };
  assert.match(status(auditApp(repo(t, { store, files: native() }).config()), 'rating').problems.join(), /parental gate/);
  const gated = { ...native(), 'App/GrownUpsView.swift': settings.replace('SettingsView', 'GrownUpsView') };
  delete gated['App/SettingsView.swift'];
  assert.equal(status(auditApp(repo(t, { store, files: gated }).config()), 'rating').status, 'pass');
});

test('rating.ts copies unchanged into a repository that bans optional chaining and nullish coalescing', () => {
  // Space Worms' AGENTS.md bans both operators; its reviewer held the rating change over the shared file (2026-11-18).
  const source = readFileSync(tsRating, 'utf8');
  assert.doesNotMatch(source, /\?\?/);
  assert.doesNotMatch(source, /\?\.[A-Za-z_$\[(]/);
});

test('rating.ts asks once after three good moments on two days, then waits for a new version and 90 days', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'rating-ts-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const module = join(dir, 'rating.mjs');
  writeFileSync(module, stripTypeScriptTypes(readFileSync(tsRating, 'utf8')));
  const { ratingGoodMoment, parseRatingState, RATING_POLICY } = await import(module);
  assert.deepEqual(RATING_POLICY, { momentsNeeded: 3, daysNeeded: 2, daysBetweenAsks: 90 });
  let stored = null, asks = 0;
  const platform = { read: async () => stored, write: async text => { stored = text; }, requestReview: async () => { asks++; } };
  const at = (day, hour = 12) => new Date(2026, 10, day, hour);
  assert.equal(await ratingGoodMoment('1.0', platform, at(1)), false);
  assert.equal(await ratingGoodMoment('1.0', platform, at(1, 13)), false);
  assert.equal(await ratingGoodMoment('1.0', platform, at(1, 14)), false, 'three moments on one day are not enough');
  assert.equal(await ratingGoodMoment('1.0', platform, at(2)), true, 'the second day makes it due');
  assert.equal(asks, 1);
  assert.deepEqual(parseRatingState(stored), { moments: 0, days: [], lastAsk: at(2).getTime(), lastAskVersion: '1.0' }, 'the count starts again');
  for (const day of [3, 4, 5, 6]) assert.equal(await ratingGoodMoment('1.0', platform, at(day)), false, 'never twice for one version');
  assert.equal(await ratingGoodMoment('1.1', platform, at(20)), false, 'a new version still waits 90 days');
  assert.equal(await ratingGoodMoment('1.1', platform, new Date(2027, 1, 5)), true, 'a new version, 90 days on');
  assert.equal(asks, 2);
  // no store prompt (a browser build): moments are counted and nothing is asked
  stored = null;
  const web = { read: platform.read, write: platform.write };
  for (const day of [1, 2, 3, 4]) assert.equal(await ratingGoodMoment('1.0', web, at(day)), false);
  assert.equal(parseRatingState(stored).moments, 4);
  // storage that fails or holds something else never reaches the user
  assert.equal(await ratingGoodMoment('1.0', { read: async () => { throw new Error('locked'); }, write: platform.write, requestReview: platform.requestReview }, at(1)), false);
  assert.deepEqual(parseRatingState('not json'), { moments: 0, days: [], lastAsk: null, lastAskVersion: null });
});

test('RatingPrompt.swift compiles for iOS', { skip: !sdk }, () => {
  const result = spawnSync('xcrun', ['swiftc', '-typecheck', '-parse-as-library', '-sdk', sdk, '-target', 'arm64-apple-ios15.0-simulator', swiftRating], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /warning:/);
});

test('RatingPolicy asks once after three good moments on two days, then waits for a new version and 90 days', { skip: !sdk }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'rating-swift-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  copyFileSync(swiftRating, join(dir, 'RatingPrompt.swift'));
  writeFileSync(join(dir, 'main.swift'), `import Foundation
let defaults = UserDefaults(suiteName: "rating-probe-\\(UUID().uuidString)")!
var calendar = Calendar(identifier: .gregorian)
func at(_ day: Int, _ hour: Int = 12, month: Int = 11, year: Int = 2026) -> Date { calendar.date(from: DateComponents(year: year, month: month, day: day, hour: hour))! }
var out: [Bool] = []
out.append(RatingPrompt.goodMoment(defaults: defaults, version: "1.0", now: at(1)))
out.append(RatingPrompt.goodMoment(defaults: defaults, version: "1.0", now: at(1, 13)))
out.append(RatingPrompt.goodMoment(defaults: defaults, version: "1.0", now: at(1, 14)))
out.append(RatingPrompt.goodMoment(defaults: defaults, version: "1.0", now: at(2)))
let afterAsk = RatingPrompt.load(defaults)
for day in [3, 4, 5, 6] { out.append(RatingPrompt.goodMoment(defaults: defaults, version: "1.0", now: at(day))) }
out.append(RatingPrompt.goodMoment(defaults: defaults, version: "1.1", now: at(20)))
out.append(RatingPrompt.goodMoment(defaults: defaults, version: "1.1", now: at(5, month: 2, year: 2027)))
let report: [String: Any] = ["asks": out, "momentsAfterAsk": afterAsk.moments, "versionAfterAsk": afterAsk.lastAskVersion ?? ""]
print(String(decoding: try! JSONSerialization.data(withJSONObject: report), as: UTF8.self))
`);
  const built = spawnSync('xcrun', ['swiftc', join(dir, 'main.swift'), join(dir, 'RatingPrompt.swift'), '-o', join(dir, 'probe')], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  const out = JSON.parse(execFileSync(join(dir, 'probe'), { encoding: 'utf8' }));
  assert.deepEqual(out.asks.map(Boolean), [false, false, false, true, false, false, false, false, false, true]);
  assert.equal(out.momentsAfterAsk, 0);
  assert.equal(out.versionAfterAsk, '1.0');
});

// ---- more-apps ----

const profile = (id, extra = {}) => ({ id, site: 'astrojams', siteSlug: id, stage: 'live', weight: 1, ...extra });
const site = (entries, available) => ({ apps: { apps: entries.map(([slug, id]) => ({ slug, appStoreId: id, bundleId: 'com.example.' + slug, name: slug.toUpperCase(), subtitle: 'Line of ' + slug, icon: 'icon.png' })) },
  store: { apps: Object.fromEntries(available.map(id => [id, { status: 'available' }])) } });

test('the catalogue lists live App Store apps of both teams, never one taken out, a web product or one not on sale', () => {
  const profiles = [profile('alpha', { weight: 3 }), profile('beta'), profile('gone', { stage: 'not-marketed' }), profile('world-sim'), profile('web', { platform: 'web' }),
    profile('soon', { stage: 'prelaunch' }), profile('fam', { site: 'ouro' }), profile('unsold')];
  const sites = {
    astrojams: site([['alpha', '1'], ['beta', '2'], ['gone', '3'], ['world-sim', '4'], ['web', '5'], ['soon', '6'], ['unsold', '7']], ['1', '2', '3', '4', '5', '6']),
    ouro: site([['fam', '8']], ['8'])
  };
  const apps = expectedApps({ profiles, sites });
  assert.deepEqual(apps.map(app => app.id), ['alpha', 'beta', 'fam']);
  assert.deepEqual(listFor(apps, { bundleId: 'com.example.beta' }).map(app => app.id), ['alpha', 'fam']);
  assert.deepEqual(listFor(apps, { appStoreId: '1' }).map(app => app.id), ['beta', 'fam']);
});

test('a generated list carries its date and apps, and the audit reads them back', () => {
  const text = renderTs(listed, { generated: '2026-11-19', source: 'astrojams1/app-sites abc' });
  assert.deepEqual(parseGenerated(text), { generated: '2026-11-19', ids: ['other'] });
  assert.ok(!text.includes('app-standard: more-apps'), 'the generated list must not carry the shared file marker');
  assert.ok(!/\?\.|\?\?/.test(text + readFileSync(tsMoreApps, 'utf8') + readFileSync(tsFirstLaunch, 'utf8')), 'no optional chaining or nullish coalescing');
});

test('more-apps fails without the generated list, on an old or self-listing one, and on one the catalogue disagrees with', t => {
  const files = native();
  delete files['App/MoreAppsCatalog.swift'];
  assert.match(status(auditApp(repo(t, { files }).config()), 'more-apps').problems.join(), /write it with scripts\/more-apps\.mjs/);
  const old = auditApp(repo(t, { files: { ...native(), 'App/MoreAppsCatalog.swift': renderSwift(listed, { generated: '2026-01-01', source: 'a test' }) } }).config(), undefined, { now: Date.parse('2026-11-19') });
  assert.match(status(old, 'more-apps').problems.join(), /more than 60 days ago/);
  const self = auditApp(repo(t, { config: { ios: { bundleId: 'com.example.other' } }, files: native() }).config());
  assert.match(status(self, 'more-apps').problems.join(), /lists the app itself/);
  const catalogue = { profiles: [profile('other'), profile('newer')], sites: { astrojams: site([['other', '111'], ['newer', '222']], ['111', '222']) } };
  const stale = auditApp(repo(t, { files: native() }).config(), undefined, { catalogue });
  assert.match(status(stale, 'more-apps').problems.join(), /missing newer/);
  const unused = native();
  unused['App/SettingsView.swift'] = unused['App/SettingsView.swift'].replace('MoreAppsSection(); ', '');
  assert.match(status(auditApp(repo(t, { files: unused }).config()), 'more-apps').problems.join(), /no screen shows the row/);
});

test('moreApps.ts lists nothing outside iOS and never the app itself, and links the App Store page', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'more-apps-ts-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const catalog = renderTs([...listed, { ...listed[0], id: 'me', bundleId: 'com.example.me', appStoreId: '9' }], { generated: today, source: 'a test' });
  writeFileSync(join(dir, 'moreAppsCatalog.mjs'), stripTypeScriptTypes(catalog));
  writeFileSync(join(dir, 'moreApps.mjs'), stripTypeScriptTypes(readFileSync(tsMoreApps, 'utf8')).replace("from './moreAppsCatalog'", "from './moreAppsCatalog.mjs'"));
  const m = await import(join(dir, 'moreApps.mjs'));
  assert.deepEqual(m.moreAppsFor('android', 'x'), []);
  assert.deepEqual(m.moreAppsFor('web', 'x'), []);
  assert.deepEqual(m.moreAppsFor('ios', 'com.example.me').map(app => app.id), ['other']);
  const [first] = m.moreAppsFor('ios');
  assert.equal(m.moreAppsStoreUrl(first), 'https://apps.apple.com/app/id111');
  assert.match(m.moreAppsIconUri(first), /^data:image\/jpeg;base64,/);
});

// ---- first-launch ----

test('first-launch needs the endpoint, a caller, the privacy manifest, and no identifier in the event', t => {
  const noManifest = native();
  delete noManifest['App/PrivacyInfo.xcprivacy'];
  assert.match(status(auditApp(repo(t, { files: noManifest }).config()), 'first-launch').problems.join(), /privacy manifest/);
  const idfv = native();
  idfv['App/FirstLaunch.swift'] += '\nlet id = UIDevice.current.identifierForVendor\n';
  assert.match(status(auditApp(repo(t, { files: idfv }).config()), 'first-launch').problems.join(), /identifier/);
  const elsewhere = native();
  elsewhere['App/FirstLaunch.swift'] = elsewhere['App/FirstLaunch.swift'].replace('astrojams-apps.vercel.app/api/launch', 'example.test/launch');
  assert.match(status(auditApp(repo(t, { files: elsewhere }).config()), 'first-launch').problems.join(), /owner's endpoint/);
  const uncalled = native();
  uncalled['App/SettingsView.swift'] = uncalled['App/SettingsView.swift'].replace('.task { FirstLaunch.report(app: "example") }', '');
  assert.match(status(auditApp(repo(t, { files: uncalled }).config()), 'first-launch').problems.join(), /nothing calls it/);
});

test('firstLaunch.ts sends four fields once, only on iOS outside debug, and retries after a failure', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'first-launch-ts-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'firstLaunch.mjs'), stripTypeScriptTypes(readFileSync(tsFirstLaunch, 'utf8')));
  const m = await import(join(dir, 'firstLaunch.mjs'));
  const make = (statuses, extra = {}) => {
    const sent = []; let stored = null;
    return { sent, stored: () => stored, platform: { version: '1.2', platform: 'ios', channel: 'unknown', ...extra,
      read: async () => stored, write: async text => { stored = text; },
      post: async (url, body) => { sent.push({ url, body: JSON.parse(body) }); const s = statuses.shift(); if (s instanceof Error) throw s; return s; } } };
  };
  const flaky = make([new Error('offline'), 503, 204]);
  assert.equal(await m.reportFirstLaunch('example', flaky.platform), false);
  assert.equal(await m.reportFirstLaunch('example', flaky.platform), false);
  assert.equal(await m.reportFirstLaunch('example', flaky.platform), true);
  assert.equal(await m.reportFirstLaunch('example', flaky.platform), false);
  assert.equal(flaky.sent.length, 3);
  assert.equal(flaky.sent[0].url, 'https://astrojams-apps.vercel.app/api/launch');
  assert.deepEqual(flaky.sent[0].body, { app: 'example', version: '1.2', platform: 'ios', channel: 'unknown' });
  for (const extra of [{ platform: 'android' }, { platform: 'web' }, { channel: 'debug' }]) {
    const quiet = make([204], extra);
    assert.equal(await m.reportFirstLaunch('example', quiet.platform), false);
    assert.equal(quiet.sent.length, 0);
  }
  const forced = make([204], { channel: 'debug', force: true });
  assert.equal(await m.reportFirstLaunch('example', forced.platform), true);
  assert.equal(forced.sent[0].body.channel, 'debug');
  const forcedRelease = make([204], { channel: 'unknown', force: true });
  assert.equal(await m.reportFirstLaunch('example', forcedRelease.platform), true);
  assert.equal(forcedRelease.sent[0].body.channel, 'debug', 'a forced send from a store build on a device is still debug');
  const refused = make([400]);
  assert.equal(await m.reportFirstLaunch('example', refused.platform), true, 'a 400 is final: the event will never be taken');
  assert.equal(m.firstLaunchSettled(429), false);
});

test('the Swift references compile for iOS 15 and the Mac, and FirstLaunch sends four fields once', { skip: !sdk && 'needs Xcode' }, t => {
  const dir = mkdtempSync(join(tmpdir(), 'swift-standards-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'MoreAppsCatalog.swift'), renderSwift(listed, { generated: today, source: 'a test' }));
  const ios = spawnSync('xcrun', ['swiftc', '-typecheck', '-parse-as-library', '-swift-version', '6', '-sdk', sdk, '-target', 'arm64-apple-ios15.0-simulator', swiftMoreApps, swiftFirstLaunch, join(dir, 'MoreAppsCatalog.swift')], { encoding: 'utf8' });
  assert.equal(ios.status, 0, ios.stderr);
  writeFileSync(join(dir, 'main.swift'), `import Foundation
final class Stub: URLProtocol {
  nonisolated(unsafe) static var bodies: [Data] = []
  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func startLoading() {
    var data = request.httpBody ?? Data()
    if let stream = request.httpBodyStream { stream.open(); var buffer = [UInt8](repeating: 0, count: 4096); while stream.hasBytesAvailable { let n = stream.read(&buffer, maxLength: 4096); if n <= 0 { break }; data.append(buffer, count: n) } }
    Stub.bodies.append(data)
    client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: 204, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
    client?.urlProtocolDidFinishLoading(self)
  }
  override func stopLoading() {}
}
let config = URLSessionConfiguration.ephemeral
config.protocolClasses = [Stub.self]
let session = URLSession(configuration: config)
let defaults = UserDefaults(suiteName: "first-launch-probe-\\(UUID().uuidString)")!
let event = FirstLaunch.Event(app: "example", version: "1.0", platform: "macos", channel: "store")
let first = await FirstLaunch.send(event, session: session)
if first { defaults.set(true, forKey: FirstLaunch.storageKey) }
let body = try! JSONSerialization.jsonObject(with: Stub.bodies[0]) as! [String: String]
print(String(data: try! JSONSerialization.data(withJSONObject: ["sent": first, "due": FirstLaunch.isDue(defaults), "keys": body.keys.sorted(), "count": Stub.bodies.count] as [String: Any]), encoding: .utf8)!)
`);
  const built = spawnSync('xcrun', ['swiftc', '-swift-version', '5', join(dir, 'main.swift'), swiftFirstLaunch, '-o', join(dir, 'probe')], { encoding: 'utf8' });
  assert.equal(built.status, 0, built.stderr);
  const out = JSON.parse(execFileSync(join(dir, 'probe'), { encoding: 'utf8' }));
  assert.deepEqual(out, { sent: true, due: false, keys: ['app', 'channel', 'platform', 'version'], count: 1 });
});
