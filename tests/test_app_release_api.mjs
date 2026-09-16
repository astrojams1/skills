import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const fixture=fileURLToPath(new URL('./fixtures/app-release-api.mjs',import.meta.url));
const run=mode=>spawnSync(process.execPath,[fixture,mode],{encoding:'utf8'});
test('metadata requires the intended locale before any write',()=>{
 const r=run('bad-locale');assert.notEqual(r.status,0);assert.match(r.stderr,/Locale mismatch/);assert.doesNotMatch(r.stdout,/PATCH/);
});
test('metadata verifies URLs and the separate app-info localization',()=>{
 for(const mode of ['bad-field','bad-subtitle']) {const r=run(mode);assert.notEqual(r.status,0);assert.match(r.stderr,/Metadata readback mismatch/);}
 const ok=run('metadata');assert.equal(ok.status,0,ok.stderr);assert.match(ok.stdout,/verified en-US/);
});
test('mixed manifest never sends Android assets to Apple',()=>{
 const r=run('screenshots');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/RESERVED ios.png/);assert.doesNotMatch(r.stdout,/android.png/);
});
test('age declaration uses its discovered resource ID, not appInfo ID',()=>{
 const r=run('age');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/verified Apple age-rating/);
});
