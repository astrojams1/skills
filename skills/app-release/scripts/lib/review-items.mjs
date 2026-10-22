// First-subscription review targets are explicit store data, never inferred from arbitrary held items.
export const REVIEW_RELATIONSHIPS = [
  'appStoreVersion', 'appCustomProductPageVersion', 'appStoreVersionExperiment', 'appStoreVersionExperimentV2',
  'appEvent', 'appAssetLibraryImage', 'appAssetLibraryVideo', 'backgroundAssetVersion',
  'gameCenterAchievementVersion', 'gameCenterActivityVersion', 'gameCenterChallengeVersion',
  'gameCenterLeaderboardSetVersion', 'gameCenterLeaderboardVersion', 'inAppPurchaseVersion',
  'subscriptionVersion', 'subscriptionGroupVersion',
];

// Apple rejects including both experiment variants. All linkage fields still expose unsupported resources,
// while includes are restricted to the resource types this workflow actually needs to expand.
export function reviewItemsQuery() {
  return new URLSearchParams({
    include: 'appStoreVersion,gameCenterLeaderboardVersion,subscriptionVersion,subscriptionGroupVersion',
    'fields[reviewSubmissionItems]': ['state', ...REVIEW_RELATIONSHIPS].join(','),
    limit: '200',
  }).toString();
}

export const resourceKey = resource => `${resource.relation}:${resource.type}:${resource.id}`;

// Read all resource linkages, not just supported ones, so an unknown resource cannot hide behind a null version.
export function itemResource(item) {
  if (item.attributes?.state === 'REMOVED') return null;
  const resources = Object.entries(item.relationships || {})
    .filter(([name, link]) => name !== 'reviewSubmission' && link?.data !== null && link?.data !== undefined);
  if (resources.length !== 1) return null;
  const [relation, { data }] = resources[0];
  if (Array.isArray(data) || !data.type || !data.id) return null;
  return { relation, type: data.type, id: data.id };
}

// A duplicate, ambiguous, unknown or foreign resource is a conflict, even when the intended app version is present.
export function reviewItemPlan(items, versionId, targets = []) {
  const expected = new Set(targets.map(resourceKey));
  const seen = new Set();
  let hasVersion = false;
  for (const item of items) {
    const resource = itemResource(item);
    if (!resource) return { conflict: true };
    const key = resourceKey(resource);
    if (seen.has(key)) return { conflict: true };
    seen.add(key);
    if (resource.relation === 'appStoreVersion' && resource.type === 'appStoreVersions' && resource.id === versionId) hasVersion = true;
    else if (resource.relation === 'gameCenterLeaderboardVersion' && resource.type === 'gameCenterLeaderboardVersions') continue;
    else if (!expected.has(key)) return { conflict: true };
  }
  return { conflict: false, hasVersion, missing: targets.filter(target => !seen.has(resourceKey(target))) };
}

// Ownership is checked through each parent collection with the caller's paginated API reader before any mutation.
// No review-version fields means no subscription API calls and preserves an app's existing no-subscription flow.
export async function verifySubscriptionReview(subscription, appId, readAll) {
  if (!subscription?.subscriptionVersionId && !subscription?.subscriptionGroupVersionId) return [];
  for (const field of ['appStoreId', 'groupId', 'productId', 'subscriptionVersionId', 'subscriptionGroupVersionId']) {
    if (typeof subscription[field] !== 'string' || !subscription[field].trim()) throw new Error('store data subscription.' + field + ' is required for first-subscription review.');
  }
  const one = (items, id, label) => {
    const matches = items.filter(item => item.id === id);
    if (matches.length !== 1) throw new Error(label + ' ownership mismatch or ambiguous identity; nothing was attached or submitted.');
    return matches[0];
  };
  one(await readAll('/v1/apps/' + appId + '/subscriptionGroups?limit=200'), subscription.groupId, 'Subscription group/app');
  const product = one(await readAll('/v1/subscriptionGroups/' + subscription.groupId + '/subscriptions?limit=200'), subscription.appStoreId, 'Subscription/group');
  if (product.attributes?.productId !== subscription.productId) throw new Error('Subscription productId mismatch; nothing was attached or submitted.');
  one(await readAll('/v1/subscriptions/' + subscription.appStoreId + '/versions?limit=200'), subscription.subscriptionVersionId, 'Subscription version/product');
  one(await readAll('/v1/subscriptionGroups/' + subscription.groupId + '/versions?limit=200'), subscription.subscriptionGroupVersionId, 'Subscription group version/group');
  return [
    { relation: 'subscriptionVersion', type: 'subscriptionVersions', id: subscription.subscriptionVersionId },
    { relation: 'subscriptionGroupVersion', type: 'subscriptionGroupVersions', id: subscription.subscriptionGroupVersionId },
  ];
}
