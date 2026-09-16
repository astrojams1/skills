// No-network fixture for the actual helper. No real private key is read.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
const mode=process.argv[2], helper=new URL('../../skills/app-release/scripts/apple.mjs',import.meta.url);
const copy={locale:'en-US',description:'Description',promotionalText:'Promo',keywords:'news',supportUrl:'https://example.test/support',marketingUrl:'https://example.test',subtitle:'Subtitle',privacyPolicyUrl:'https://example.test/privacy'};
const ids={appId:'1234',versionId:'version',versionLocalizationId:'version-loc',infoLocalizationId:'info-loc',appInfoId:'app-info',ageRatingDeclarationId:'age-id'};
const read=fs.readFile;
fs.readFile=async(path,...args)=>{
 if(String(path).endsWith('apple.mjs'))return read(path,...args);
 if(String(path).endsWith('release.json'))return JSON.stringify({apple:ids});
 if(String(path).endsWith('listing.json'))return JSON.stringify(copy);
 if(String(path)==='MOCK_KEY')return Buffer.from('mock');
 if(String(path).endsWith('apple-age-rating.json'))return JSON.stringify({advertising:false});
 if(String(path).endsWith('manifest.json'))return JSON.stringify([{file:'ios.png',platform:'ios',displayType:'APP_IPHONE_67'},{file:'android.png',platform:'android',displayType:'APP_IPHONE_67'}]);
 if(String(path).endsWith('ios.png'))return Buffer.from('fixture');
 throw Error('Unexpected read: '+path);
};
crypto.sign=()=>Buffer.from('fake-signature');syncBuiltinESMExports();
let mutated=false;
global.fetch=async(url,options)=>{
 if(new URL(url).hostname!=='api.appstoreconnect.apple.com')throw Error('Unexpected host');
 const path=new URL(url).pathname;let data;
 if(mode==='screenshots') {
  if(options.method==='GET'&&path.endsWith('/appScreenshotSets'))data=[{id:'set',attributes:{screenshotDisplayType:'APP_IPHONE_67'}}];
  else if(options.method==='GET'&&path.endsWith('/appScreenshots'))data=[];
  else if(options.method==='POST'&&path==='/v1/appScreenshots'){
   const a=JSON.parse(options.body).data.attributes;console.log('RESERVED',a.fileName);data={id:a.fileName,attributes:{...a,uploadOperations:[]}};
  } else if(options.method==='PATCH')data={attributes:{assetDeliveryState:{state:'COMPLETE'}}};
  else throw Error('Unexpected request');
 } else if(mode==='age') {
  if(options.method!=='PATCH'||path!=='/v1/ageRatingDeclarations/age-id')throw Error('Wrong age-rating resource');
  data=JSON.parse(options.body).data;
  if(data.id!=='age-id')throw Error('Wrong payload ID');
 } else {
  const info=path.includes('appInfoLocalizations');
  const attrs=info?{subtitle:copy.subtitle,privacyPolicyUrl:copy.privacyPolicyUrl}:{description:copy.description,promotionalText:copy.promotionalText,keywords:copy.keywords,supportUrl:copy.supportUrl,marketingUrl:copy.marketingUrl};
  if(options.method==='PATCH'){mutated=true;console.log('PATCH',path);data=JSON.parse(options.body).data;}
  else {
   if(mutated&&mode==='bad-field')attrs.supportUrl='https://wrong.test';
   if(mutated&&info&&mode==='bad-subtitle')attrs.subtitle='Wrong';
   data={attributes:{...attrs,locale:mode==='bad-locale'?'fr-FR':'en-US'}};
  }
 }
 return {ok:true,status:200,json:async()=>({data})};
};
Object.assign(process.env,{ASC_KEY_ID:'mock',ASC_ISSUER_ID:'mock',ASC_PRIVATE_KEY_PATH:'MOCK_KEY'});
process.argv=['node','apple.mjs',mode==='screenshots'?'screenshots':mode==='age'?'age-rating':'metadata','/tmp/mock-store'];
await import(helper);
