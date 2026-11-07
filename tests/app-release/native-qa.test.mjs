import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, parseCodesignIdentity, parseCodesignEntitlements, assessLauncher, preflight, runXcodebuild } from '../../skills/app-release/scripts/native-qa.mjs';

// Selected stock codesign output from the observed original and ad-hoc launchers.
// No runtime logs, personal paths, or unrelated entitlement values are retained.
const APPLE_IDENTITY = `Executable=/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild
Identifier=com.apple.dt.xcodebuild
CodeDirectory v=20400 size=987 flags=0x2000(library-validation) hashes=20+7 location=embedded
Authority=Software Signing
Authority=Apple Code Signing Certification Authority
Authority=Apple Root CA
TeamIdentifier=59GAB85EFG
designated => identifier "com.apple.dt.xcodebuild" and anchor apple
`;
const ADHOC_IDENTITY = `Executable=/Volumes/ssd/qa/xcodebuild-test
Identifier=com.apple.dt.xcodebuild
CodeDirectory v=20400 size=336 flags=0x2(adhoc) hashes=5+2 location=embedded
Signature=adhoc
TeamIdentifier=not set
# designated => cdhash H"222f35ce73777f997d742aab8a48635b0b0cca6a"
`;
const HUB = 'com.apple.private.DTServiceHubClient';
const TESTMANAGER = 'com.apple.dt.testmanagerd.control.client';
const plist = inner => '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">' +
  '<plist version="1.0"><dict>' + inner + '</dict></plist>';
const APPLE_ENTITLEMENTS = plist('<key>' + TESTMANAGER + '</key><true/><key>' + HUB + '</key><true/>' +
  '<key>com.apple.private.MobileContainerManager.lookup</key><dict><key>appData</key><true/></dict>');
const valid = overrides => ({
  strictStatus: 0, appleRequirementStatus: 0, identityStatus: 0,
  identityOutput: APPLE_IDENTITY, entitlementsStatus: 0, entitlementsOutput: APPLE_ENTITLEMENTS,
  ...overrides,
});

test('accepts the original Apple launcher and both required true entitlements', () => {
  const result = assessLauncher(valid());
  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.remedy, null);
  assert.equal(result.checks.appleDesignatedIdentity, true);
  assert.deepEqual(result.checks.entitlements, { [HUB]: true, [TESTMANAGER]: true });
});

test('a strict-valid ad-hoc launcher is rejected despite retaining the xcodebuild identifier', () => {
  const identity = parseCodesignIdentity(ADHOC_IDENTITY);
  assert.equal(identity.identifier, 'com.apple.dt.xcodebuild');
  assert.equal(identity.adHoc, true);
  const result = assessLauncher(valid({ identityOutput: ADHOC_IDENTITY, entitlementsOutput: '', appleRequirementStatus: 3 }));
  assert.equal(result.checks.strictSignature, true);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('apple-designated-identity-invalid'));
  assert.ok(result.issues.includes('apple-code-requirement-not-met'));
  assert.equal(result.checks.entitlements[HUB], false);
  assert.match(result.remedy, /original Apple-signed xcodebuild/);
  assert.match(result.remedy, /Do not re-sign Apple tools or transplant entitlements/);
});

test('a cryptographic code requirement failure overrides authentic-looking displayed metadata', () => {
  const result = assessLauncher(valid({ appleRequirementStatus: 3 }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ['apple-code-requirement-not-met']);
});

test('an invalid strict signature is rejected even if all display checks pass', () => {
  const result = assessLauncher(valid({ strictStatus: 1 }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ['strict-signature-invalid']);
});

test('each launcher entitlement must be present as a top-level boolean true', () => {
  for (const missing of [HUB, TESTMANAGER]) {
    const other = missing === HUB ? TESTMANAGER : HUB;
    for (const wrong of ['', '<false/>', '<string>true</string>', '<integer>1</integer>']) {
      const xml = plist('<key>' + other + '</key><true/>' + (wrong ? '<key>' + missing + '</key>' + wrong : ''));
      const result = assessLauncher(valid({ entitlementsOutput: xml }));
      assert.equal(result.ok, false);
      assert.deepEqual(result.issues, ['required-entitlement-missing:' + missing]);
    }
  }
  const nested = plist('<key>other</key><dict><key>' + HUB + '</key><true/><key>' + TESTMANAGER + '</key><true/></dict>');
  assert.equal(assessLauncher(valid({ entitlementsOutput: nested })).ok, false);
});

test('malformed, ambiguous, missing, or broadened designated identities fail closed', () => {
  const malformed = [
    '',
    APPLE_IDENTITY.replace('Identifier=com.apple.dt.xcodebuild', 'Identifier=com.apple.dt.other'),
    APPLE_IDENTITY + 'Identifier=com.apple.dt.other\n',
    APPLE_IDENTITY + 'designated => anchor apple\n',
    APPLE_IDENTITY.replace(' and anchor apple', ''),
    APPLE_IDENTITY.replace('anchor apple', 'anchor apple generic'),
    APPLE_IDENTITY.replace('anchor apple', 'anchor apple or true'),
    APPLE_IDENTITY.replace('identifier "com.apple.dt.xcodebuild"', 'identifier "com.apple.dt.xcodebuild'),
    APPLE_IDENTITY.replace('designated => ', '# designated => '),
    APPLE_IDENTITY + 'Signature=adhoc\n',
  ];
  for (const identityOutput of malformed) {
    const result = assessLauncher(valid({ identityOutput }));
    assert.equal(result.ok, false);
    assert.ok(result.issues.includes('apple-designated-identity-invalid'));
  }
});

test('missing, duplicate, and malformed entitlement plists fail closed', () => {
  const malformed = [
    '',
    'Executable=/Volumes/ssd/qa/xcodebuild-test\n',
    APPLE_ENTITLEMENTS.replace('</dict></plist>', '</plist>'),
    APPLE_ENTITLEMENTS + APPLE_ENTITLEMENTS,
    plist('<key>' + HUB + '</key><true/><key>' + HUB + '</key><true/>'),
    '<plist version="1.0"><array><true/></array></plist>',
  ];
  for (const xml of malformed) {
    assert.equal(parseCodesignEntitlements(xml), null);
    assert.equal(assessLauncher(valid({ entitlementsOutput: xml })).ok, false);
  }
});

test('tool execution failures cannot pass by returning successful-looking text', () => {
  assert.equal(assessLauncher(valid({ identityStatus: null })).ok, false);
  assert.equal(assessLauncher(valid({ entitlementsStatus: 1 })).ok, false);
  assert.equal(assessLauncher(valid({ strictStatus: null })).ok, false);
});

test('preflight selects through stock xcrun and only runs stock codesign against the candidate', () => {
  const calls = [];
  const launcher = '/Volumes/ssd/Xcode copy.app/Contents/Developer/usr/bin/xcodebuild';
  const result = preflight({ run(command, args) {
    calls.push({ command, args });
    if (command === '/usr/bin/xcrun') return { status: 0, stdout: launcher + '\n' };
    assert.equal(command, '/usr/bin/codesign');
    assert.equal(args.at(-1), launcher);
    if (args.includes('--requirements')) return { status: 0, stdout: '', stderr: APPLE_IDENTITY };
    if (args.includes('--entitlements')) return { status: 0, stdout: APPLE_ENTITLEMENTS, stderr: 'Executable=' + launcher };
    return { status: 0, stderr: 'irrelevant diagnostic content must not be printed' };
  } });
  assert.equal(result.ok, true);
  assert.equal(result.launcher, launcher);
  assert.equal(calls.length, 5);
  assert.deepEqual(calls[0], { command: '/usr/bin/xcrun', args: ['--find', 'xcodebuild'] });
  assert.deepEqual(calls[1].args, ['--verify', '--strict', launcher]);
  assert.deepEqual(calls[2].args, ['--verify', '--strict', '--test-requirement', '=identifier "com.apple.dt.xcodebuild" and anchor apple', launcher]);
  assert.doesNotMatch(JSON.stringify(result), /irrelevant diagnostic|Authority|MobileContainerManager/);
});

test('explicit launcher paths are inspected as arguments and never executed', () => {
  const commands = [];
  const result = preflight({ launcher: '/Volumes/ssd/qa/xcodebuild-test', run(command, args) {
    commands.push(command);
    return { status: 0, stderr: args.includes('--requirements') ? ADHOC_IDENTITY : '' };
  } });
  assert.deepEqual(commands, Array(4).fill('/usr/bin/codesign'));
  assert.equal(result.ok, false);
});

test('resolution failures stop before inspecting any guessed or fallback launcher', () => {
  for (const found of [{ status: 1 }, { status: null }, { status: 0, stdout: '' }, { status: 0, stdout: 'relative/xcodebuild' }, { status: 0, stdout: '/one\n/two' }]) {
    let calls = 0;
    const result = preflight({ run(command) { calls += 1; assert.equal(command, '/usr/bin/xcrun'); return found; } });
    assert.equal(result.ok, false);
    assert.deepEqual(result.issues, ['launcher-resolution-failed']);
    assert.equal(calls, 1);
  }
});

test('arguments are narrow and reject options that could silently skip preflight', () => {
  assert.deepEqual(parseArgs(['preflight']), { launcher: null });
  assert.deepEqual(parseArgs(['preflight', '--launcher', '/Volumes/ssd/qa/xcodebuild-test']), { launcher: '/Volumes/ssd/qa/xcodebuild-test' });
  for (const args of [[], ['run'], ['preflight', '--launcher'], ['preflight', '--launcher', ''], ['preflight', '--launchr', '/x'], ['preflight', '--launcher', '/x', '--launcher', '/y'], ['preflight', '--launcher', '--help']]) {
    assert.throws(() => parseArgs(args), /Usage/);
  }
});

const originalLauncher = '/Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild';
const deviceSet = '/Volumes/ssd/QA devices; $(touch never)/qa';
const exists = () => ({ isDirectory: () => true });
function stockTools(command, args) {
  if (command === '/usr/bin/xcrun') return { status: 0, stdout: originalLauncher + '\n' };
  assert.equal(command, '/usr/bin/codesign');
  if (args.includes('--requirements')) return { status: 0, stderr: APPLE_IDENTITY };
  if (args.includes('--entitlements')) return { status: 0, stdout: APPLE_ENTITLEMENTS };
  return { status: 0 };
}

test('xcodebuild parsing requires an existing-set argument and an explicit forwarding boundary', () => {
  assert.deepEqual(parseArgs(['xcodebuild', '--device-set', deviceSet, '--', '-showdestinations']), {
    command: 'xcodebuild', deviceSet, args: ['-showdestinations'],
  });
  for (const args of [
    ['xcodebuild'], ['xcodebuild', '--device-set', deviceSet],
    ['xcodebuild', '--device-set', deviceSet, '--'],
    ['xcodebuild', '--device-set', 'relative/qa', '--', '-showdestinations'],
    ['xcodebuild', '--device-set', '/qa\n/other', '--', '-showdestinations'],
    ['xcodebuild', '--device-set', deviceSet, '--device-set', '/other', '--', '-showdestinations'],
    ['xcodebuild', '--launcher', originalLauncher, '--', '-showdestinations'],
  ]) assert.throws(() => parseArgs(args), /Usage/);
});

test('routed execution preserves argv and uses exactly one equals-form preference after original-launcher preflight', () => {
  const calls = [];
  const forwarded = ['test-without-building', '-destination', 'platform=iOS Simulator,id=owned-uuid', '-parallel-testing-enabled', 'NO', '-resultBundlePath', '/Volumes/ssd/QA results/run.xcresult'];
  const result = runXcodebuild({ deviceSet, args: forwarded, stat: exists, run(command, args) {
    calls.push({ command, args });
    return stockTools(command, args);
  }, execute(command, args) {
    calls.push({ command, args });
    assert.equal(calls.length, 6);
    assert.equal(command, originalLauncher);
    assert.deepEqual(args, ['-DVTSimulatorSetLocation=' + deviceSet, ...forwarded]);
    return { status: 0 };
  } });
  assert.equal(result.ok, true);
  assert.equal(result.executed, true);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(calls.map(call => call.command), ['/usr/bin/xcrun', ...Array(4).fill('/usr/bin/codesign'), originalLauncher]);
});

test('denied launcher identity executes no xcodebuild command', () => {
  let executions = 0;
  const result = runXcodebuild({ deviceSet, args: ['-showdestinations'], stat: exists,
    run(command, args) {
      if (command === '/usr/bin/codesign' && args.includes('--test-requirement')) return { status: 3 };
      return stockTools(command, args);
    }, execute() { executions += 1; return { status: 0 }; },
  });
  assert.equal(executions, 0);
  assert.equal(result.executed, false);
  assert.equal(result.ok, false);
  assert.ok(result.issues.includes('apple-code-requirement-not-met'));
});

test('forwarded routing overrides and malformed invocation fail before any execution', () => {
  let calls = 0;
  for (const route of ['-DVTSimulatorSetLocation=/other', '-DVTSimulatorSetLocation', 'DVTSimulatorSetLocation=/other', '--DVTSimulatorSetLocation=/other']) {
    assert.throws(() => runXcodebuild({ deviceSet, args: ['-showdestinations', route], stat: exists,
      run() { calls += 1; }, execute() { calls += 1; },
    }), /routing only through --device-set/);
  }
  assert.throws(() => runXcodebuild({ deviceSet, args: ['bad\0argument'], stat: exists, run() { calls += 1; } }), /Usage/);
  assert.equal(calls, 0);
});

test('a missing or non-directory device set is never created and stops before preflight', () => {
  let calls = 0;
  for (const stat of [() => { throw new Error('ENOENT'); }, () => ({ isDirectory: () => false })]) {
    assert.throws(() => runXcodebuild({ deviceSet, args: ['-showdestinations'], stat,
      run() { calls += 1; }, execute() { calls += 1; },
    }), /must already exist as a directory/);
  }
  assert.equal(calls, 0);
});

test('routed execution reports xcodebuild failure, launch error and signal without retrying', () => {
  for (const child of [{ status: 65 }, { status: null, error: { code: 'ENOENT' } }, { status: null, signal: 'SIGTERM' }]) {
    let executions = 0;
    const result = runXcodebuild({ deviceSet, args: ['test'], stat: exists, run: stockTools,
      execute() { executions += 1; return child; },
    });
    assert.equal(executions, 1);
    assert.equal(result.executed, true);
    assert.equal(result.ok, false);
    assert.equal(result.exitCode, child.status === 65 ? 65 : 1);
    assert.equal(result.signal, child.signal || null);
  }
});
