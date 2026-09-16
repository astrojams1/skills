import { readFile } from 'node:fs/promises';
import { createHash, sign } from 'node:crypto';
import { resolve, basename } from 'node:path';

const command = process.argv[2];
if (!['status', 'metadata', 'screenshots', 'build', 'age-rating', 'review-notes'].includes(command) || !process.argv[3]) {
  console.log('Usage: node apple.mjs status|metadata|screenshots|build|age-rating|review-notes /absolute/path/to/store');
  process.exit(!command || command === '--help' ? 0 : 1);
}
const root = resolve(process.argv[3]);
const ids = JSON.parse(await readFile(resolve(root, 'release.json'))).apple;
const copy = JSON.parse(await readFile(resolve(root, 'listing.json')));
if (!ids?.appId || !/^\d+$/.test(ids.appId)) throw new Error('Set apple.appId in release.json to the existing app record.');
for (const key of ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY_PATH']) {
  if (!process.env[key]) throw new Error(`Set ${key}; never commit credentials.`);
}
const privateKey = await readFile(process.env.ASC_PRIVATE_KEY_PATH);
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const payload = `${enc({alg:'ES256',kid:process.env.ASC_KEY_ID,typ:'JWT'})}.${enc({iss:process.env.ASC_ISSUER_ID,iat:now,exp:now+300,aud:'appstoreconnect-v1'})}`;
  return `${payload}.${sign('sha256', Buffer.from(payload), {key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}
async function api(path, method = 'GET', data) {
  if (!path.startsWith('/v1/')) throw new Error('Only App Store Connect v1 paths are supported');
  const response = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method, headers:{Authorization:`Bearer ${token()}`,'Content-Type':'application/json'},
    ...(data ? {body:JSON.stringify({data})} : {}),
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${(body.errors || []).map(e => e.code).join(', ')}`);
  return body;
}
const relation = (type,id) => ({data:{type,id}});
if (command === 'review-notes') {
  const version = (await api(`/v1/appStoreVersions/${ids.versionId}?include=appStoreReviewDetail`)).data;
  const existingId = version.relationships.appStoreReviewDetail?.data?.id;
  if (typeof copy.demoAccountRequired !== 'boolean') throw new Error('Set demoAccountRequired explicitly from this app’s actual login behavior.');
  const attributes = {notes:copy.reviewNotes,demoAccountRequired:copy.demoAccountRequired};
  for (const [field,env] of Object.entries({contactFirstName:'ASC_REVIEW_FIRST_NAME',contactLastName:'ASC_REVIEW_LAST_NAME',contactEmail:'ASC_REVIEW_EMAIL'})) {
    if (process.env[env]) attributes[field] = process.env[env];
    else if (!existingId) throw new Error(`Set ${env} locally for the authorized review contact.`);
  }
  if (attributes.demoAccountRequired) throw new Error('This helper does not manage demo credentials; configure and verify authenticated app access through the provider UI.');
  if (process.env.ASC_REVIEW_PHONE) attributes.contactPhone = process.env.ASC_REVIEW_PHONE;
  if (!existingId && !attributes.contactPhone) throw new Error('Apple requires a review contact phone before creating this section. Obtain owner authorization and set ASC_REVIEW_PHONE locally.');
  const saved = existingId
    ? await api(`/v1/appStoreReviewDetails/${existingId}`, 'PATCH', {type:'appStoreReviewDetails',id:existingId,attributes})
    : await api('/v1/appStoreReviewDetails', 'POST', {type:'appStoreReviewDetails',attributes,relationships:{appStoreVersion:relation('appStoreVersions',ids.versionId)}});
  for (const [key,value] of Object.entries(attributes)) {
    if (saved.data.attributes[key] !== value) throw new Error(`Review details readback mismatch: ${key}`);
  }
  console.log('Saved and verified review contact, notes, and no-login requirement.');
}
if (command === 'age-rating') {
  if (!ids.ageRatingDeclarationId) throw new Error('Set the verified apple.ageRatingDeclarationId in release.json.');
  const attributes = JSON.parse(await readFile(resolve(root,'apple-age-rating.json')));
  const saved = (await api(`/v1/ageRatingDeclarations/${ids.ageRatingDeclarationId}`, 'PATCH', {
    type:'ageRatingDeclarations',id:ids.ageRatingDeclarationId,attributes,
  })).data;
  for (const [key,value] of Object.entries(attributes)) {
    if (saved.attributes[key] !== value) throw new Error(`Age-rating readback mismatch: ${key}`);
  }
  console.log('Saved and verified Apple age-rating declaration.');
}
if (command === 'build') {
  const build = (await api(`/v1/builds/${ids.appleBuildId}`)).data;
  if (build.attributes.processingState !== 'VALID') throw new Error('Apple build is not valid');
  await api(`/v1/appStoreVersions/${ids.versionId}`, 'PATCH', {
    type:'appStoreVersions',id:ids.versionId,relationships:{build:relation('builds',ids.appleBuildId)},
  });
  const saved = await api(`/v1/appStoreVersions/${ids.versionId}/build`);
  if (saved.data.id !== ids.appleBuildId) throw new Error('Build readback mismatch');
  console.log(`Selected and verified Apple build ${build.attributes.version}.`);
}
async function sets() {
  return (await api(`/v1/appStoreVersionLocalizations/${ids.versionLocalizationId}/appScreenshotSets?limit=200`)).data;
}
if (command === 'status') {
  const version = (await api(`/v1/appStoreVersions/${ids.versionId}`)).data;
  console.log('Version:', version.attributes.versionString, version.attributes.appStoreState);
  const builds = (await api(`/v1/builds?filter[app]=${ids.appId}`)).data;
  console.log('Apple builds:', builds.map(b => ({id:b.id,version:b.attributes.version,processing:b.attributes.processingState})));
  for (const set of await sets()) {
    const screenshots = (await api(`/v1/appScreenshotSets/${set.id}/appScreenshots?limit=200`)).data;
    console.log(set.attributes.screenshotDisplayType, screenshots.map(s => ({name:s.attributes.fileName,state:s.attributes.assetDeliveryState?.state})));
  }
}
if (command === 'metadata') {
  if (!copy.locale) throw new Error('Set the intended locale in listing.json.');
  const plans = [
    {type:'appStoreVersionLocalizations',id:ids.versionLocalizationId,
      attributes:Object.fromEntries(['description','keywords','promotionalText','supportUrl','marketingUrl'].map(k=>[k,copy[k]]))},
    {type:'appInfoLocalizations',id:ids.infoLocalizationId,
      attributes:{subtitle:copy.subtitle,privacyPolicyUrl:copy.privacyPolicyUrl}},
  ];
  for (const plan of plans) {
    for (const [key,value] of Object.entries(plan.attributes)) {
      if (typeof value !== 'string') throw new Error(`Set ${key} explicitly in listing.json.`);
    }
    const existing = (await api(`/v1/${plan.type}/${plan.id}`)).data.attributes;
    if (existing.locale !== copy.locale) throw new Error(`Locale mismatch for ${plan.type}; no metadata has been written.`);
  }
  for (const plan of plans) {
    await api(`/v1/${plan.type}/${plan.id}`, 'PATCH', plan);
    const saved = (await api(`/v1/${plan.type}/${plan.id}`)).data.attributes;
    if (saved.locale !== copy.locale) throw new Error(`Locale readback mismatch for ${plan.type}`);
    for (const [key,value] of Object.entries(plan.attributes)) {
      if (saved[key] !== value) throw new Error(`Metadata readback mismatch: ${key}`);
    }
  }
  console.log(`Saved and verified ${copy.locale} description, promotional text, keywords, URLs, and subtitle.`);
}
if (command === 'screenshots') {
  const manifest = JSON.parse(await readFile(resolve(root,'assets/manifest.json')));
  const existingSets = await sets();
  for (const displayType of [...new Set(manifest.filter(x=>x.platform==='ios').map(x=>x.displayType))]) {
    let set = existingSets.find(s=>s.attributes.screenshotDisplayType===displayType);
    if (!set) set = (await api('/v1/appScreenshotSets','POST',{
      type:'appScreenshotSets',attributes:{screenshotDisplayType:displayType},
      relationships:{appStoreVersionLocalization:relation('appStoreVersionLocalizations',ids.versionLocalizationId)},
    })).data;
    const existing = (await api(`/v1/appScreenshotSets/${set.id}/appScreenshots?limit=200`)).data;
    for (const asset of manifest.filter(x=>x.platform==='ios' && x.displayType===displayType)) {
      const bytes = await readFile(resolve(root,asset.file));
      const checksum = createHash('md5').update(bytes).digest('hex');
      const name = basename(asset.file);
      let screenshot = existing.find(s=>s.attributes.fileName===name);
      if (screenshot && screenshot.attributes.sourceFileChecksum !== checksum) throw new Error(`Remote ${name} differs. Review it before replacing; this script never deletes assets.`);
      if (!screenshot) {
        screenshot = (await api('/v1/appScreenshots','POST',{
          type:'appScreenshots',attributes:{fileName:name,fileSize:bytes.length},
          relationships:{appScreenshotSet:relation('appScreenshotSets',set.id)},
        })).data;
        for (const op of screenshot.attributes.uploadOperations) {
          const url = new URL(op.url);
          if (url.protocol !== 'https:') throw new Error('Refusing non-HTTPS upload');
          // Presigned upload instructions come directly from Apple's API.
          // Never forward our JWT to the asset host or print its signed URL.
          const response = await fetch(url,{method:op.method,headers:Object.fromEntries(op.requestHeaders.map(h=>[h.name,h.value])),body:bytes.subarray(op.offset,op.offset+op.length),redirect:'error'});
          if (!response.ok) throw new Error(`Asset upload failed: ${response.status}`);
        }
        screenshot = (await api(`/v1/appScreenshots/${screenshot.id}`,'PATCH',{
          type:'appScreenshots',id:screenshot.id,attributes:{uploaded:true,sourceFileChecksum:checksum},
        })).data;
      }
      console.log(displayType, name, screenshot.attributes.assetDeliveryState?.state);
    }
  }
  console.log('Run status to verify Apple has processed every image to COMPLETE.');
}
