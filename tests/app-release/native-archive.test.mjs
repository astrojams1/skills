import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const script=process.env.APP_RELEASE_IOS_SCRIPT || fileURLToPath(new URL('../../skills/app-release/scripts/ios-release.mjs',import.meta.url));
const ios=await import(pathToFileURL(script));
const signing={style:'manual',certificate:'a'.repeat(40),profile:'QA & "Distribution"'};
const entitlements='<?xml version="1.0"?><plist version="1.0"><dict><key>com.apple.developer.applesignin</key><array><string>Default</string></array><key>get-task-allow</key><false/></dict></plist>';

test('manual export is valid plist and retains exact certificate/profile values',()=>{
 const xml=ios.exportOptionsPlist('TEAM123',signing,'com.example.qa');
 const parsed=JSON.parse(execFileSync('python3',['-c','import plistlib,json,sys; print(json.dumps(plistlib.loads(sys.stdin.buffer.read())))'],{input:xml,encoding:'utf8'}));
 assert.equal(parsed.signingStyle,'manual');assert.equal(parsed.signingCertificate,signing.certificate);
 assert.equal(parsed.provisioningProfiles['com.example.qa'],signing.profile);assert.equal(parsed.manageAppVersionAndBuildNumber,false);
 assert.throws(()=>ios.exportOptionsPlist('TEAM123',{style:'manual'},'com.example.qa'),/certificate/);
 assert.throws(()=>ios.exportOptionsPlist('TEAM123',{...signing,profile:''},'com.example.qa'),/profile/);
 assert.throws(()=>ios.exportOptionsPlist('TEAM123',{style:'surprise'},'com.example.qa'),/style/);
});

test('required array entitlements accept actual Apple sign-in values and reject missing capabilities',()=>{
 assert.deepEqual(ios.entitlementProblems(entitlements,{'com.apple.developer.applesignin':['Default']}),[]);
 assert.equal(ios.entitlementProblems(entitlements,{'com.apple.developer.applesignin':['Other']}).length,1);
 assert.equal(ios.entitlementProblems(entitlements,{'missing':['Default']}).length,1);
 assert.equal(ios.entitlementProblems(entitlements.replace('<array><string>Default</string></array>','<string>Default</string>'),{'com.apple.developer.applesignin':['Default']}).length,1,'An array requirement must not accept a scalar of the same text');
});

// These isolated command doubles exercise orchestration/provenance, never Xcode,
// a real signed app, vault credentials, Apple, mail, devices or an upload.
const STUB=String.raw`
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {basename,join} from 'node:path';
const cmd=basename(process.argv[1]),args=process.argv.slice(2);
appendFileSync(process.env.FIXTURE_TRACE,JSON.stringify({cmd,args})+'\n');
const at=flag=>args[args.indexOf(flag)+1];
if(cmd==='npx'){
 if(args[0]!=='expo'||args[1]!=='config')throw new Error('Native fixture must never regenerate the reviewed project');
 console.log('{}');
}else if(cmd==='pod'){
 if(!args.includes('--deployment'))throw new Error('Tracked dependencies must stay locked');
 if(process.env.FIXTURE_MUTATE_NATIVE)appendFileSync('Native.txt','changed');
}else if(cmd==='op'){
 throw new Error('Manual signing must not read or write an API key during archive');
}else if(cmd==='xcodebuild'){
 if(args.includes('-version'))console.log('Xcode fixture');
 else if(args.includes('archive')){
  if(!args.includes('CODE_SIGN_STYLE=Manual')||!args.includes('CURRENT_PROJECT_VERSION=7'))throw new Error('Wrong archive signing/build configuration');
  if(args.includes('-allowProvisioningUpdates'))throw new Error('Unexpected provisioning mutation');
  mkdirSync(at('-archivePath'),{recursive:true});
 }else if(args.includes('-exportArchive')){
  if(args.includes('-allowProvisioningUpdates'))throw new Error('Unexpected automatic export');
  mkdirSync(at('-exportPath'),{recursive:true});
  writeFileSync(join(at('-exportPath'),'App.ipa'),JSON.stringify({CFBundleVersion:'7',CFBundleShortVersionString:process.env.FIXTURE_WRONG_VERSION?'9.0':'1.1.0',CFBundleIdentifier:'com.example.qa',DTXcodeBuild:'fixture',DTSDKName:'iphoneos27.0',UIApplicationSceneManifest:{}}));
 }else throw new Error('Unexpected xcodebuild command');
}else if(cmd==='ditto'){
 const out=args.at(-1),app=join(out,'Payload','App.app');mkdirSync(app,{recursive:true});
 writeFileSync(join(app,'Info.plist'),readFileSync(args.at(-2)));writeFileSync(join(app,'App'),'fixture executable');
}else if(cmd==='plutil'){
 const value=JSON.parse(readFileSync(args.at(-1),'utf8'))[at('-extract')];
 if(value===undefined)throw new Error('Missing fixture plist value');
 console.log(typeof value==='object'?'<plist><dict/></plist>':String(value));
}else if(cmd==='codesign'){
 if(args.includes('--verify')){if(!args.includes('--strict')||!args.includes('--deep')||process.env.FIXTURE_BAD_SIGNATURE)throw new Error('Invalid fixture signature');}
 else if(args.includes('-dv'))console.error('TeamIdentifier=TEAM123');
 else console.log(process.env.FIXTURE_ENTITLEMENTS);
}else throw new Error('Unexpected command');
`;
function fixture(t,{placeholder='$(CURRENT_PROJECT_VERSION)',extraEnv={},configPatch={},ignoreNative=false,externalInfo=false,untrackedReference=false}={}){
 const root=mkdtempSync(join(tmpdir(),'native-archive-')),repo=join(root,'repo'),bin=join(root,'bin'),trace=join(root,'trace.jsonl');
 mkdirSync(bin);mkdirSync(join(repo,'ios','App'),{recursive:true});mkdirSync(join(repo,'ios','App.xcworkspace'));
 const stub=join(root,'command.mjs');writeFileSync(stub,'#!'+process.execPath+'\n'+STUB,{mode:0o755});
 for(const cmd of ['npx','pod','op','xcodebuild','plutil','ditto','codesign'])symlinkSync(stub,join(bin,cmd));
 writeFileSync(join(repo,'ios','App','Info.plist'),JSON.stringify({CFBundleVersion:placeholder}));
 if(externalInfo){
  const external=join(root,'unreviewed-info.json');writeFileSync(external,JSON.stringify({CFBundleVersion:placeholder}));
  rmSync(join(repo,'ios','App','Info.plist'));symlinkSync(external,join(repo,'ios','App','Info.plist'));
 }
 mkdirSync(join(repo,'ios','App.xcodeproj','xcshareddata','xcschemes'),{recursive:true});
 writeFileSync(join(repo,'ios','App.xcodeproj','project.pbxproj'),'reviewed project');
 writeFileSync(join(repo,'ios','App.xcodeproj','xcshareddata','xcschemes','App.xcscheme'),'reviewed shared scheme');
 writeFileSync(join(repo,'ios','App.xcworkspace','contents.xcworkspacedata'),'<Workspace><FileRef location="group:App.xcodeproj"/><FileRef location="group:Pods/Pods.xcodeproj"/>'+(untrackedReference?"<FileRef location='group:Untracked.xcodeproj'/>" :'')+'</Workspace>');
 for(const name of ['Podfile','Podfile.lock'])writeFileSync(join(repo,'ios',name),'reviewed locked dependencies');
 if(ignoreNative)writeFileSync(join(repo,'.gitignore'),'ios/\n');
 writeFileSync(join(repo,'ios','Native.txt'),'reviewed');
 const config={app:'QA',slug:'qa',projectDir:'.',storeData:'store.json',buildRoot:join(root,'builds'),ledger:{gates:'ledger.json',view:'ledger.md'},ios:{ascAppId:'123',bundleId:'com.example.qa',teamId:'TEAM123',scheme:'App',buildNumberEnv:'QA_BUILD_NUMBER',prebuild:false,infoPlist:'App/Info.plist',signing,...configPatch}};
 writeFileSync(join(repo,'app-release.config.json'),JSON.stringify(config));writeFileSync(join(repo,'store.json'),JSON.stringify({version:'1.1.0'}));
 const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init');git('config','user.email','qa@example.test');git('config','user.name','QA');git('add','.');git('commit','-m','Reviewed fixture');
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('ASC_')&&!k.startsWith('OP_')&&k!=='APP_RELEASE_CONFIG'));
 Object.assign(env,{PATH:bin+':'+env.PATH,FIXTURE_TRACE:trace,FIXTURE_ENTITLEMENTS:entitlements,...extraEnv});
 const run=(patch={})=>spawnSync(process.execPath,[script,'archive','--build-number','7'],{cwd:repo,env:{...env,...patch},encoding:'utf8'});
 const result=run();
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const commands=()=>{try{return readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse);}catch{return[];}};
 return{root,repo,git,result,run,commands,summary:join(root,'builds','xcode','qa','release','7','summary.json')};
}

test('tracked native archive uses a locked reviewed project/manual signing and writes verified clean provenance',t=>{
 const f=fixture(t);assert.equal(f.result.status,0,f.result.stdout+f.result.stderr);
 const summary=JSON.parse(readFileSync(f.summary,'utf8'));
 assert.equal(summary.commit,f.git('rev-parse','HEAD'));assert.equal(summary.dirty,false);assert.equal(summary.build,7);assert.equal(summary.version,'1.1.0');
 assert.equal(summary.sha256,createHash('sha256').update(readFileSync(summary.ipa)).digest('hex'));
 assert.equal(f.git('status','--porcelain'),'');
 assert.ok(f.commands().some(x=>x.cmd==='npx'&&x.args[1]==='config'));
 assert.ok(!f.commands().some(x=>x.cmd==='op'||x.args.includes('prebuild')||x.args.includes('--upload-package')));
 assert.ok(f.commands().some(x=>x.cmd==='codesign'&&x.args.includes('--verify')&&x.args.includes('--strict')));
});

test('ignored native projects cannot claim clean tracked provenance',t=>{
 const f=fixture(t,{ignoreNative:true});assert.notEqual(f.result.status,0);
 assert.match(f.result.stderr,/Tracked native input must exist in Git/);
 assert.ok(!f.commands().some(x=>['npx','pod','op','xcodebuild'].includes(x.cmd)));
});

for(const [name,option,pattern]of [['external symlink','externalInfo',/must not use symlinks/],['single-quoted untracked reference','untrackedReference',/Tracked native input must exist in Git/]]){
 test(`tracked-native provenance refuses ${name}`,t=>{
  const f=fixture(t,{[option]:true});assert.notEqual(f.result.status,0);
  assert.match(f.result.stderr,pattern);assert.ok(!f.commands().some(x=>['npx','pod','op','xcodebuild'].includes(x.cmd)));
 });
}

test('a failed rebuild invalidates the earlier verified summary',t=>{
 const f=fixture(t);assert.equal(f.result.status,0,f.result.stderr);
 assert.equal(JSON.parse(readFileSync(f.summary,'utf8')).build,7);
 const rerun=f.run({FIXTURE_WRONG_VERSION:'1'});assert.notEqual(rerun.status,0);
 assert.match(rerun.stderr,/app version is 9.0/);assert.throws(()=>readFileSync(f.summary));
});

test('upload checks the verified artifact against the current release target',()=>{
 const target={bundleId:'com.example.qa',version:'1.1.0',build:7};
 const summary={...target,dirty:false,commit:'c'.repeat(40),sha256:'digest'};
 assert.equal(ios.uploadProblem(summary,'digest',target),null);
 for(const name of Object.keys(target))assert.match(ios.uploadProblem({...summary,[name]:'different'},'digest',target),/does not match/);
});

test('native preparation changes stop before archive/export and preserve the actual changed source',t=>{
 const f=fixture(t,{extraEnv:{FIXTURE_MUTATE_NATIVE:'1'}});
 assert.notEqual(f.result.status,0);assert.match(f.result.stderr,/Native preparation changed tracked source/);
 assert.ok(!f.commands().some(x=>x.cmd==='xcodebuild'&&(x.args.includes('archive')||x.args.includes('-exportArchive'))));
 assert.equal(readFileSync(join(f.repo,'ios','Native.txt'),'utf8'),'reviewedchanged');
});

test('tracked native literal build numbers are refused before preparation/signing',t=>{
 const f=fixture(t,{placeholder:'18'});assert.notEqual(f.result.status,0);
 assert.match(f.result.stderr,/CFBundleVersion must be/);assert.ok(!f.commands().some(x=>['npx','pod','op','xcodebuild'].includes(x.cmd)));
});
for(const [name,extraEnv,pattern]of [['wrong version',{FIXTURE_WRONG_VERSION:'1'},/app version is 9.0, expected 1.1.0/],['bad signature',{FIXTURE_BAD_SIGNATURE:'1'},/codesign --verify/]]){
 test(`${name} cannot produce a verified archive summary`,t=>{
  const f=fixture(t,{extraEnv});assert.notEqual(f.result.status,0);assert.match(f.result.stderr,pattern);
  assert.throws(()=>readFileSync(f.summary));
 });
}
