# Businesses in ChatGPT (Business Hub)

OpenAI opened this in beta on 2026-11-10. A business claims its profile in ChatGPT, keeps its details current, can
connect a product feed, sees how often ChatGPT mentions it, and, if eligible, publishes a Business Agent that answers
customers' questions. James, 2026-11-10: every one of our businesses uses it, and this file is kept up to date.

This file covers all of them, not only the apps: Ouro, astrojams, Vegas Microworks and Clean Streets. Their own
instructions link here.

**Last checked against OpenAI's pages: 2026-11-10.** The feature is in beta and its rules will move. Re-read the
sources below on the first run of each month, and whenever a claim, verification or agent step behaves differently
from this file; then correct this file in the same run and change the date.

## Sources

- Overview: https://openai.com/business/businesses-in-chatgpt
- Setup steps (the one to re-read): https://help.openai.com/en/articles/20001635-setting-up-your-business-on-chatgpt
- Profile rules: https://openai.com/policies/businesses-in-chatgpt/
- Business Agent rules: https://openai.com/policies/business-agents-policy/
- Product feed format: https://developers.openai.com/commerce/specs/file-upload/products
- Product rules: https://openai.com/policies/commerce-policies/
- Business Hub itself: https://chatgpt.com/business-hub (needs the owner's ChatGPT sign-in)

openai.com and help.openai.com refuse plain fetches (403). Read them in a browser.

## How it works

1. **Claim.** Signed in to ChatGPT, open Business Hub, search for the business, pick the listing, and verify by one of
   the methods offered: a code to the business phone, a code to the business email, a DNS TXT record on the website's
   domain, or a Shopify store. An eligible online business that has no listing may be offered "add it". A local store
   or restaurant can only claim a listing that already exists, in the US. Claiming needs a website. OpenAI reviews the
   claim and emails its decision.
2. **Identity check with Persona.** Needed before anything can be published: profile changes, a product feed,
   insights, an agent. It may ask for a government ID, business registration details and proof of authority; the
   name, address and any registration or tax number must match official records. The blue check appears only after
   this is approved. If Persona is used to create a new profile, approval publishes it at once.
3. **Profile.** Website, description, product or service category, logo, cover photo, delivery policy, return policy.
   OpenAI reviews each change, and it can take time to show. A published profile cannot be deleted or hidden.
4. **Product feed (sellers of products).** A CSV in OpenAI's product feed format, uploaded or at a hosted URL, or a
   Shopify feed.
5. **Insights.** Totals for the past 28 days: mentions, website clicks and discovery topics. For an online business a
   mention counts only when ChatGPT cites its website; the brand name alone does not. A blank number does not mean
   zero. No prompts or conversations are shown.
6. **Business Agent (optional).** Only for eligible ecommerce and online service businesses in the US with a website,
   in an allowed industry. It answers from the product and policy information the business gives it and links to the
   website; it cannot take orders or bookings. It is published separately, after a preview.

**Adding the DNS record.** ChatGPT asks for a TXT record named `openai-business-claim.<website host>`, valid for 24
hours. `cleanstreets.io`'s DNS is at Squarespace Domains (the former Google Domains account), which has no API and
whose connector has no DNS tools, so the owner adds it in the website. Squarespace's Name field takes only the part
before the domain: enter `openai-business-claim.www`, not the full name, or the domain is added twice. Check it with
`dig +short TXT openai-business-claim.www.cleanstreets.io` before pressing Verify, and if ChatGPT looked first, wait
five minutes: it remembers the earlier "no such record" answer for that long.

Each brand is its own profile; there is no shared management across brands. The person who claimed it can add
teammates, each with their own ChatGPT account. Claiming does not raise how often ChatGPT recommends the business.
There is no API: everything is done in Business Hub.

## Who does what

**Only the owner:** signing in to ChatGPT, starting a claim, receiving and entering a verification code, the Persona
identity check, accepting OpenAI's terms, and publishing a Business Agent. A run never does these, never enters a
code or an ID, and never creates an account. An unattended run logs a needed owner step as `blocked_by: owner` with
the exact step, once, and does not repeat it every day.

**Agents, every time it applies:**

- Keep the facts a profile shows true at their source, so the profile and the website never disagree: business name,
  description, category, website, logo, contact, prices, policies. The sources are in the table below.
- When one of those facts changes (an app is released, renamed or removed, a price or policy changes, a site moves to
  a new address), update the website the same day and record in the table that the profile needs the same change.
  With the owner present and signed in, make the change in Business Hub; it publishes as the owner, so confirm the
  wording first.
- Keep each website easy for ChatGPT to cite, since mentions are counted from website citations: `robots.txt` allows
  all crawlers, a sitemap is listed in it, pages carry schema.org data that matches the profile, and the app sites
  keep `/llms.txt` current.
- Once a profile is verified, read its Insights on the first run of each month with the owner signed in, and record
  mentions, website clicks and discovery topics in that business's metrics. Turn a discovery topic nobody has written
  for into a guide or tool, under the usual content rules.
- Keep this file's table and date current.

## Our businesses

Status on 2026-11-10: Clean Streets' claim is started and its domain is verified; OpenAI's decision and the Persona
identity check are still to come. The other three are not claimed yet. Every claim waits on the owner.

| Business | Website | Kind | How it can verify | Feed or agent | Facts come from |
|---|---|---|---|---|---|
| Ouro LLC (Ouro apps) | https://ouro-apps.vercel.app | Online business: iPhone and iPad apps | Business email or phone. A DNS record is not possible on a `vercel.app` address; it needs a domain of its own | No product feed (apps are sold in the App Store). An agent may be possible as an online service; check eligibility at claim time | `sites/ouro` in `astrojams1/app-sites`, kept by `ouro-website` |
| astrojams (James Thompson's personal apps) | https://astrojams-apps.vercel.app | Online business under the owner's own name | Business email or phone; same `vercel.app` limit. Persona may ask for business registration, which a personal developer account may not have | Same as Ouro | `sites/astrojams` in `astrojams1/app-sites`, kept by `astrojams-website` |
| Vegas Microworks | https://vegas-microworks.vercel.app | Online service business in Las Vegas, no storefront; "Vegas Microworks" is a working name | Business email or phone; same `vercel.app` limit. Settle the name before a profile is published, since a published profile cannot be removed | No feed. An agent only once there is an offer and policies to describe; never invent them | `public/` in `astrojams1/vegas-microworks` and its `AGENTS.md` |
| Clean Streets | https://www.cleanstreets.io | Nonprofit (the site marks itself as an NGO), with a merch shop at merch.cleanstreets.io | DNS TXT record on `cleanstreets.io`, business email or phone | A product feed for the merch shop if OpenAI accepts it as a retailer; whether nonprofits are eligible is not stated, so find out at claim time | `astrojams1/cleanstreets` and its `AGENTS.md` |

An app with a website and business of its own (Füd, for one, which has a co-owner) gets its own row when its owner
decides to claim it.

Website check on 2026-11-10: all four sites allow every crawler and list a sitemap. Both app sites serve `/llms.txt`
and `Organization` data. Vegas Microworks carries `ProfessionalService` data and has no `/llms.txt`. Clean Streets
carries `NGO` data and has no `/llms.txt`.

## Log of changes to profiles

Add a row for each claim, verification result, published change, feed or agent. Newest last.

| Date | Business | What happened |
|---|---|---|
| 2026-11-10 | all | Feature announced. Nothing claimed. Owner given the steps to claim each business |
| 2026-11-10 | Clean Streets | Owner started the claim for `www.cleanstreets.io` and verified the domain with a TXT record at `openai-business-claim.www.cleanstreets.io`. Next: OpenAI's decision by email, then the Persona identity check |
