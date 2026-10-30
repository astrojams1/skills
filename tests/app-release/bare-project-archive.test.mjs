import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const script=process.env.APP_RELEASE_IOS_SCRIPT || fileURLToPath(new URL('../../skills/app-release/scripts/ios-release.mjs',import.meta.url));
const ios=await import(pathToFileURL(script));
const key={path:'/private/AuthKey.p8',keyId:'KEY',issuerId:'ISSUER'};
const base={scheme:'App',teamId:'TEAM123',workspace:'App.xcworkspace',prebuild:false};

test('a bare Xcode project archives with -project; workspaces keep -workspace',()=>{
 const bare=ios.archiveArgs({...base,project:'App.xcodeproj'},'/out/a.xcarchive','/out/dd',key,3);
 assert.deepEqual(bare.slice(0,2),['-project','App.xcodeproj']);assert.ok(!bare.includes('-workspace'));
 const workspace=ios.archiveArgs(base,'/out/a.xcarchive','/out/dd',key,3);
 assert.deepEqual(workspace.slice(0,2),['-workspace','App.xcworkspace']);
});

test('export-time signing leaves the archive unsigned and needs automatic signing',()=>{
 const args=ios.archiveArgs({...base,project:'App.xcodeproj',archiveSigning:'export'},'/out/a.xcarchive','/out/dd',key,3);
 assert.ok(args.includes('CODE_SIGNING_ALLOWED=NO')&&args.includes('CODE_SIGNING_REQUIRED=NO'));
 assert.ok(!args.includes('-allowProvisioningUpdates')&&!args.some(a=>a.startsWith('CODE_SIGN_STYLE=')));
 assert.equal(args.at(-1),'archive');
 assert.equal(ios.archiveSigningMode({}),'archive');
 assert.throws(()=>ios.archiveSigningMode({archiveSigning:'later'}),/archive" or "export/);
 assert.throws(()=>ios.archiveSigningMode({archiveSigning:'export',signing:{style:'manual',certificate:'a'.repeat(40),profile:'P'}}),/automatic/);
});

test('the native root is the project directory for a bare project and ios/ otherwise',()=>{
 assert.equal(ios.nativeRoot({projectDir:'/repo'},{project:'App.xcodeproj'}),'/repo');
 assert.equal(ios.nativeRoot({projectDir:'/repo'},{}),'/repo/ios');
});

// Command doubles exercise orchestration only: never Xcode, a real signed app, the vault, Apple or an upload.
const STUB=String.raw`
import {readFileSync,writeFileSync,mkdirSync,appendFileSync} from 'node:fs';
import {basename,join} from 'node:path';
const cmd=basename(process.argv[1]),args=process.argv.slice(2);
appendFileSync(process.env.FIXTURE_TRACE,JSON.stringify({cmd,args,cwd:process.cwd()})+'\n');
const at=flag=>args[args.indexOf(flag)+1];
if(cmd==='npx'||cmd==='pod'||cmd==='op'){
 throw new Error(cmd+' must not run for a bare Xcode project archive with environment credentials');
}else if(cmd==='xcodebuild'){
 if(args.includes('-version'))console.log('Xcode fixture');
 else if(args.includes('archive')){
  if(args[0]!=='-project'||!args.includes('CODE_SIGNING_ALLOWED=NO')||!args.includes('CURRENT_PROJECT_VERSION=4'))throw new Error('Wrong bare-project archive configuration');
  mkdirSync(at('-archivePath'),{recursive:true});
 }else if(args.includes('-exportArchive')){
  if(!args.includes('-allowProvisioningUpdates'))throw new Error('The export must sign through the API key');
  mkdirSync(at('-exportPath'),{recursive:true});
  writeFileSync(join(at('-exportPath'),'App.ipa'),JSON.stringify({CFBundleVersion:'4',CFBundleShortVersionString:'2.0.0',CFBundleIdentifier:'com.example.bare',DTXcodeBuild:'fixture',DTSDKName:'iphoneos27.0',UIApplicationSceneManifest:{}}));
 }else throw new Error('Unexpected xcodebuild command');
}else if(cmd==='ditto'){
 const out=args.at(-1),app=join(out,'Payload','App.app');mkdirSync(app,{recursive:true});
 writeFileSync(join(app,'Info.plist'),readFileSync(args.at(-2)));
}else if(cmd==='plutil'){
 const value=JSON.parse(readFileSync(args.at(-1),'utf8'))[at('-extract')];
 if(value===undefined)throw new Error('Missing fixture plist value');
 console.log(typeof value==='object'?'<plist><dict/></plist>':String(value));
}else if(cmd==='codesign'){
 if(args.includes('-dv'))console.error('TeamIdentifier=TEAM123');
 else if(!args.includes('--verify'))console.log('<plist><dict><key>get-task-allow</key><false/></dict></plist>');
}else throw new Error('Unexpected command '+cmd);
`;

function fixture(t,{trackScheme=true,configPatch={}}={}){
 const root=mkdtempSync(join(tmpdir(),'bare-archive-')),repo=join(root,'repo'),bin=join(root,'bin'),trace=join(root,'trace.jsonl');
 mkdirSync(bin);mkdirSync(join(repo,'Config'),{recursive:true});
 const stub=join(root,'command.mjs');writeFileSync(stub,'#!'+process.execPath+'\n'+STUB,{mode:0o755});
 for(const cmd of ['npx','pod','op','xcodebuild','plutil','ditto','codesign'])symlinkSync(stub,join(bin,cmd));
 writeFileSync(join(repo,'Config','Info.plist'),JSON.stringify({CFBundleVersion:'$(CURRENT_PROJECT_VERSION)'}));
 mkdirSync(join(repo,'App.xcodeproj','xcshareddata','xcschemes'),{recursive:true});
 writeFileSync(join(repo,'App.xcodeproj','project.pbxproj'),'reviewed project');
 if(trackScheme)writeFileSync(join(repo,'App.xcodeproj','xcshareddata','xcschemes','App.xcscheme'),'shared scheme');
 // No ascAppId: the record does not exist yet, which an archive with a chosen build number must tolerate.
 const config={app:'Bare',slug:'bare',projectDir:'.',storeData:'store.json',buildRoot:join(root,'builds'),ledger:{gates:'ledger.json',view:'ledger.md'},
  ios:{ascAppId:null,bundleId:'com.example.bare',teamId:'TEAM123',scheme:'App',buildNumberEnv:'BARE_BUILD',prebuild:false,project:'App.xcodeproj',
   infoPlist:'Config/Info.plist',archiveSigning:'export',...configPatch}};
 writeFileSync(join(repo,'app-release.config.json'),JSON.stringify(config));writeFileSync(join(repo,'store.json'),JSON.stringify({version:'2.0.0'}));
 const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null',...args],{cwd:repo,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init');git('config','user.email','qa@example.test');git('config','user.name','QA');git('add','.');git('commit','-m','Bare fixture');
 const keyFile=join(root,'AuthKey.p8');writeFileSync(keyFile,'-----BEGIN PRIVATE KEY-----\nfixture\n-----END PRIVATE KEY-----\n');
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('ASC_')&&!k.startsWith('OP_')&&k!=='APP_RELEASE_CONFIG'));
 Object.assign(env,{PATH:bin+':'+env.PATH,FIXTURE_TRACE:trace,ASC_KEY_ID:'KEY',ASC_ISSUER_ID:'ISSUER',ASC_PRIVATE_KEY_PATH:keyFile});
 const result=spawnSync(process.execPath,[script,'archive','--build-number','4'],{cwd:repo,env,encoding:'utf8'});
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const commands=()=>{try{return readFileSync(trace,'utf8').trim().split('\n').map(JSON.parse);}catch{return[];}};
 return{repo,result,commands,summary:join(root,'builds','xcode','bare','release','4','summary.json')};
}

test('a bare Xcode project archives before its app record exists, from the project directory, with no Expo or CocoaPods',t=>{
 const f=fixture(t);assert.equal(f.result.status,0,f.result.stdout+f.result.stderr);
 const summary=JSON.parse(readFileSync(f.summary,'utf8'));
 assert.equal(summary.build,4);assert.equal(summary.bundleId,'com.example.bare');assert.equal(summary.dirty,false);
 assert.ok(!f.commands().some(x=>['npx','pod','op'].includes(x.cmd)));
 const archive=f.commands().find(x=>x.cmd==='xcodebuild'&&x.args.includes('archive'));
 assert.equal(realpathSync(archive.cwd),realpathSync(f.repo));
});

test('a bare project still needs its shared scheme in Git',t=>{
 const f=fixture(t,{trackScheme:false});assert.notEqual(f.result.status,0);
 assert.match(f.result.stderr,/Tracked native input must exist in Git: App.xcodeproj\/xcshareddata/);
 assert.ok(!f.commands().some(x=>x.cmd==='xcodebuild'&&x.args.includes('archive')));
});

test('a bare project must opt out of Expo prebuild explicitly',t=>{
 const f=fixture(t,{configPatch:{prebuild:true}});assert.notEqual(f.result.status,0);
 assert.match(f.result.stderr,/set ios.prebuild to false/);
 assert.ok(!f.commands().some(x=>['npx','pod','xcodebuild'].includes(x.cmd)&&!x.args.includes('-version')));
});
