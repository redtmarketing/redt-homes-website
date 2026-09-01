# redT Homes — Marketing Site

A one-page marketing homepage plus individual listing pages, sharing a common
stylesheet and script. Listing pages are generated from real data; everything
else is hand-authored HTML. No framework required.

## Running it

Serve the folder over HTTP (root-relative asset paths mean `file://` won't
resolve correctly): `npx serve .`

## Structure

```
index.html                        Homepage (hero, listings carousel, audience
                                   sections, team, blog teaser, testimonials,
                                   stats, contact)
data/
  listings.json                   Source of truth for every listing —
                                   edit this, then re-run build-listings.js
  blog.json                       Source of truth for every blog post —
                                   edit this, then re-run build-blog.js
  team.json                       Source of truth for every team member —
                                   edit this, then re-run build-team.js
build-listings.js                 Generator: reads data/listings.json, writes
                                   listings/<slug>.html for each one, and
                                   regenerates the homepage carousel between
                                   the <!-- LISTINGS:START/END --> markers
build-blog.js                     Generator: reads data/blog.json, writes
                                   blog/<slug>.html + blog/index.html, and
                                   regenerates the homepage teaser between
                                   the <!-- BLOG:START/END --> markers
build-team.js                     Generator: reads data/team.json, writes
                                   team/index.html grouped by department, and
                                   regenerates the homepage leadership teaser
                                   between the <!-- TEAM:START/END --> markers
build-sitemap.js                  Generator: reads data/listings.json +
                                   data/blog.json, writes sitemap.xml,
                                   robots.txt, and llms.txt — re-run any time
                                   listings or blog posts are added/removed
listings/
  <slug>.html                     Generated — don't hand-edit, edit the JSON
                                   and re-run build-listings.js instead
  property_listings.xlsx          Original spreadsheet export the JSON was
                                   built from (kept for reference)
blog/
  <slug>.html, index.html         Generated — don't hand-edit, edit blog.json
                                   and re-run build-blog.js instead
team/
  index.html                      Generated — don't hand-edit, edit team.json
                                   and re-run build-team.js instead
developers/
  index.html                      Hand-authored (no JSON source — it's a
                                   single static page, not a repeating list
                                   like listings/blog/team). Edit directly.
for-rent/
  index.html                      Hand-authored (same reasoning as
                                   developers/). Links out to redT's real
                                   AppFolio rental portal — no listings data
                                   lives in this repo. Edit directly.
assets/
  css/styles.css                  Shared design system (colors, type, components)
  js/main.js                      Shared behavior: nav scroll-shadow, mobile
                                   menu, IntersectionObserver reveal-on-scroll
  brand/                          redT logo files (white/black wordmark, icon)
  images/                         Photography (hero photo, etc.)
HUBSPOT-MLS-INTEGRATION.md         How listing-page form submissions tie to a
                                    specific property in HubSpot's CRM
```

## Adding or updating a listing

1. Edit `data/listings.json` — add a new object (or change an existing one).
   Required fields: `slug`, `mlsId`, `propertyType`, `address`, `city`,
   `community`, `price` (number), `status`, `beds`, `baths`, `sqft`, `garages`,
   `yearBuilt`, `description`, `hubspotFormId`. Optional: `heroImage` (path to
   a photo; omitted listings get a gradient placeholder tile).
2. Run `node build-listings.js`. This regenerates that listing's page and the
   homepage carousel.
3. Fill in `hubspotFormId` as soon as you have it for that property — until
   then the generated page keeps a plain, non-submitting placeholder form
   instead of a live HubSpot embed. See `HUBSPOT-MLS-INTEGRATION.md` for what
   these hidden `listing_*` fields are for and the one-time HubSpot setup
   they depend on.

## Adding or updating a blog post

1. Edit `data/blog.json` — add a new object (or change an existing one).
   Required fields: `slug`, `title`, `excerpt`, `date` (`YYYY-MM-DD` or
   `YYYY-MM-DD HH:MM:SS`), `author`, `content` (a raw HTML string — rendered
   unescaped into `.post-body`, so it can contain `<p>`, `<h2>`/`<h3>`,
   `<img>`, `<a>`, lists, etc.). Optional: `category` (shown next to the date
   on cards and in the post byline).
2. Run `node build-blog.js`. This regenerates that post's page, `blog/index.html`,
   and the homepage "From The Field" teaser (which shows the 3 most recent
   posts by date).
3. If you rename or remove a post's `slug`, delete the old
   `blog/<old-slug>.html` file by hand — the generator writes pages but
   doesn't clean up ones that are no longer in `blog.json`.

## Current blog content

145 real posts imported from an actual WordPress export of redthomes.com
(`_archive-wordpress-export/redthomes.WordPress.2026-07-21.xml`, kept for
reference — not served by the site). 3 posts from that export had no body
content (page-builder posts whose content lived outside `content:encoded`)
and were skipped: "Measuring Energy Efficiency Using the RESNET HERS Index",
"This is a Piece of Wood", "Denver Housing Inventory Shortage".

At Jennifer's explicit direction, this content was imported **as-is** — it
was not scrubbed of LEED/sustainability/green-building language the way the
listing descriptions were. This is real historical company content, not new
copy, so the "no LEED language" brand rule that applies elsewhere on the site
does not apply to `data/blog.json`.

A handful of posts exist twice under different slugs (e.g.
`downsizing-in-denver-tips-for-a-smooth-transition` from 2019 and
`downsizing-in-denver-tips-for-a-smooth-transition-2` from 2026) — this
mirrors the original WordPress site, where the post was republished with a
bumped date rather than edited in place. Both versions were kept rather than
guessing which one to drop.

Post images are hot-linked to their original URLs on `redthomes.com/wp-content/uploads/...`
— they were not downloaded/re-hosted. If that site's media library ever goes
away, those images will break across all imported posts.

All 145 posts were verified with a real HTTP check (every page fetched for a
200 status + real content, every image in every post body HEAD-requested
against `redthomes.com`) — no broken pages, but 24 images across 8 posts
were already 404ing on redT's own WordPress media library (files deleted or
moved there, not a fault of this site). Those broken `<img>` tags were
removed directly from `data/blog.json` (wording/text untouched — only the
dead image references were stripped, plus a couple of now-empty `<h2>`/`<h3>`
wrappers that would've left a visible blank gap). Two of those 8 posts
(`spice-up-your-flex-room-with-these-fun-ideas`,
`redt-homes-staged-by-perch-staging`) had no other images, so they now fall
back to the gradient placeholder tile like any other imageless post. If
`redthomes.com` ever reorganizes its media library again, re-run a similar
check (`fetch` each post's images with `HEAD`) rather than assuming
hot-linked images stay valid forever.

**Every internal link inside all 145 posts' content** (not just the images)
was also scanned against `redthomes.com` and cross-referenced against real
post slugs — this matters for the eventual domain cutover from the old
WordPress site, since a link like `redthomes.com/some-old-page/` only
"works" post-migration if this site has a matching redirect. Findings and
fixes, all in `netlify.toml`:

- 3 blog posts are linked from *within other posts* without the `/blog/`
  prefix (`8-reasons-to-buy-new-construction-homes`,
  `get-the-scoop-sloans-lake`,
  `why-we-love-denvers-regional-transportation-district-rtd`) — each gets
  its own explicit redirect straight to the real post, since the generic
  `/blog/:slug/` rule can't match a bare slug.
- ~20 old WordPress pages and past property/community pages referenced from
  post content (`/contact-us/`, `/for-sale/`, `/litehomes/`,
  `/fenton-litehomes-litetowns/`, `/kalamath/`, `/stpaul/`, `/xenon/`,
  `/mississippi/`, etc.) have no equivalent on the new site. Per Jennifer's
  call, all of these redirect to the homepage rather than guessing which
  new section (if any) each one should map to. `/developers/` was
  deliberately excluded from this list — that's a real page on the new site
  already, no redirect needed.
- One PDF hot-linked from a post
  (`/wp-content/uploads/2020/08/KALAMATH16NEWPROPERTYHIGHLIGHT.pdf`) lives
  on the old WordPress media library and will 404 once the domain points
  here instead — redirected to the homepage rather than left dead.
- One post (`sustainable-building-materials-healthy-homes`) had a link
  whose `href` was corrupted into a citation title
  (`http://EPA – Volatile Organic Compounds' Impact on Indoor Air
  Quality`) instead of a real URL — a pre-existing content bug, not caused
  by the migration. Fixed directly in `data/blog.json` by pointing the
  "Low-VOC" link text to the real, verified EPA page on the same topic
  (`epa.gov/indoor-air-quality-iaq/volatile-organic-compounds-impact-indoor-air-quality`).
- External links (news sites, government pages, local businesses, etc.)
  and `mailto:` links are all unaffected by the domain migration and were
  left as-is.

These redirects can't be tested against the local `npx serve` preview
(same caveat as the earlier `/our-team/`/`/testimonials/` redirects — only
a real Netlify deploy processes `netlify.toml`).

**A real, separate bug (not a redirect/migration issue) was also found and
fixed**: 4 posts had emoji-prefixed titles (🌿, ✅, 🧳, 🔥), and the
WordPress-exported slug for each was the literal percent-encoded text of
that emoji (e.g. `%f0%9f%8c%bf-how-to-keep-your-house-cool-without-ac`).
`build-blog.js` had been using that string as-is for the actual filename on
disk. The problem: any `%XX` sequence in an `href` is real URL-encoding
syntax to a browser, not literal text — so linking to
`/blog/%f0%9f%8c%bf-....html` makes the browser request the *decoded* path
(the actual 🌿 emoji character), which doesn't match the literal
percent-sign filename on disk. 404, every time, in any browser or host —
this wasn't specific to the local dev server. Fixed by giving these 4 posts
clean ASCII slugs in `data/blog.json` (dropping the emoji from the slug,
keeping it in the title/content) and deleting the old broken-named files
from `blog/` before regenerating:

- `%f0%9f%8c%bf-how-to-keep-your-house-cool-without-ac` → `how-to-keep-your-house-cool-without-ac`
- `%e2%9c%85-right-sizing-find-the-space-that-fits-your-life` → `right-sizing-find-the-space-that-fits-your-life`
- `%f0%9f%a7%b3-the-ultimate-moving-checklist-10-steps-to-a-smooth-move` → `the-ultimate-moving-checklist-10-steps-to-a-smooth-move`
- `%f0%9f%94%a5-the-5-hottest-neighborhoods-in-denver-right-now` → `the-5-hottest-neighborhoods-in-denver-right-now`

`netlify.toml` has explicit redirects from the old emoji URLs to the new
slugs, since the live WordPress site really did use these emoji URLs (and
one of them — the-5-hottest-neighborhoods — is linked from inside another
post's content). If a future WordPress import ever produces another
emoji-prefixed slug, strip it to ASCII the same way rather than using it
as a filename verbatim.

Card thumbnails and post-page header photos aren't a separate field — `build-blog.js`
automatically pulls the first `<img>` it finds in each post's `content` HTML
(`firstImage()`) and reuses it as both the card image and the page-header
background. Posts with no image in their body fall back to the gradient
placeholder tile. Because it's the same image already in the body, it does
appear twice on a post page (header + inline) — a minor, acceptable bit of
repetition rather than something to fix.

## Adding or updating a team member

1. Edit `data/team.json` — add a new object (or change an existing one).
   Required fields: `name`, `role`, `department` (any string — the full team
   page groups people by whatever departments appear in the data, in the
   order they're first seen), `photo` (a URL, or `""` for the gradient
   placeholder avatar), `bio` (full text, or `""` if none — the homepage
   leadership teaser shows only the first sentence via `firstSentence()`,
   the full team page shows the whole thing).
2. Run `node build-team.js`. This regenerates `team/index.html` and the
   homepage's "Who We Are" teaser (which shows everyone in the "Leadership"
   department — rename that department in the data and the teaser follows).

## Current team

15 real people imported from `redthomes.com/our-team/`, grouped into the same
6 departments as that page (Leadership, Sales/Marketing/Acquisitions,
Construction, Finance & Development, Property Management, Purchasing). Bios
are the real text from that page; 5 people had no bio published there (Derik
Wever, Joel Richmond, Elijah Jennings, Dotti Bright, Frank Hagaman) and their
cards just show name/role/photo. Joel Richmond also has no photo on the
source page, so his card uses the gradient placeholder avatar.

Photos are hot-linked to `redthomes.com/wp-content/uploads/...`, same
approach as the blog images — not downloaded/re-hosted.

One real bug worth knowing about if team/blog photos ever silently stop
appearing again: both `build-team.js` and `build-blog.js` originally added
`loading="lazy"` to these images, and in this project's dev-preview tooling
that attribute caused avatars to just never load (stuck indefinitely,
`img.complete` staying `false`) even though the underlying image URLs were
valid and fetchable. It was removed from both generators as the fix — if you
ever add `loading="lazy"` back for performance reasons, retest that images
actually appear without needing a scroll/interaction to trigger it.

## Developers page

`/developers/index.html` is based on the real `redthomes.com/developers/`
page (services offered, phone number, address are all real), but the actual
wording was rewritten. The source page is built almost entirely around
LEED-certification/"healthier future" messaging, which conflicts with this
site's brand rule of no LEED/sustainability language — Jennifer confirmed to
rewrite rather than import that language as-is (unlike the blog, which she
had imported verbatim as preserved historical content). The 5 services
(Acquisitions, Infill & Land Development, Architecture, Sales & Marketing
Support, Developer Incubator Program) are the real ones from that page, just
described without the LEED framing.

The primary nav's "Developers" link now points here instead of scrolling to
the homepage's audience card (the same transition Blog and Our Team already
went through) — the homepage audience card itself still links straight to
`#contact`, unchanged.

## Current testimonials

The 3 testimonials in the `#testimonials` section (hand-authored in
`index.html`, not data-driven) are real 5-star Google reviews for redT
Homes, pulled verbatim from the public review list mirrored at
`endorsal.io/reviews/redt-homes` (redT's own Endorsal review page) — Lucas
Geier (homebuyer), PJ O'Neil (development partner), and Madison Morris
(realtor/buyer), chosen as the most substantive of the reviews checked and
matching the site's audience segments. redT Homes' Google listing has 64
reviews total with mixed sentiment (a number of legitimate neighbor
complaints about construction practices alongside positive buyer/agent
reviews); only clearly positive, verifiably real ones were considered —
same as how any testimonials section works, not a misrepresentation of the
overall review picture. Three more real reviews (Nathan Dick, Craig
Ricketts, Ramon Duran) were tried first and then trimmed back down to these
3 at Jennifer's request — worth knowing if the count comes up again.

An Endorsal widget embed (`<div class='ndrsl-widget'>` + the public
`cdn.endorsal.io` loader script) was tried first, since Jennifer has a real
Endorsal account for this business. It couldn't be verified end-to-end — the
preview sandbox used during development blocks the third-party script's
network request, so whether it actually renders live reviews once deployed
is unconfirmed. If you'd rather use that instead of the static reviews
above, the snippet is straightforward to re-add; grab the exact embed code
from your Endorsal dashboard (Widgets → your widget → Copy to clipboard) to
be sure it includes everything needed, rather than the generic loader script
used in the first attempt.

## For Rent page

`/for-rent/index.html` is based on the real `redthomes.com/for-rent/` page,
which turned out to be a near-empty template (just a "For Rent" headline and
an empty comparison-tool widget — no actual listings, prices, or property
details). Rather than import that emptiness, this page instead links out to
redT's real, live AppFolio rental portal
(`redthomes.appfolio.com/listings/listings`, confirmed via the
`redthomes.appfolio.com` subdomain and real Denver-metro rental listings
found there) via a "View Current Rentals" button. Contact info (720-402-9922,
pm@redthomes.com) is RedT Property Management's real, separate line from the
main office number, sourced via web search.

No rental listings live in this repo — if that ever changes (e.g. redT wants
rentals displayed directly on this site instead of just linking out), it
would follow the same data/listings.json + generator-script pattern as the
for-sale listings.

## Homepage contact form

The `#contact` section's form used to be a dead, non-submitting placeholder
(`<form onsubmit="return false;">`). It's now a live HubSpot embed using the
same `hbspt.forms.create` JS API pattern as the listing pages (see
`HUBSPOT-MLS-INTEGRATION.md`), portal `43826586` (same HubSpot account),
form ID `842f4b38-365d-4e9d-92dd-4714c86b587b`. Jennifer provided this as a
HubSpot share link (`share-na2.hsforms.com/...`); the portal/form ID were
extracted from that page's rendered DOM (`data-form-id`/`data-portal-id` on
the form element) since share links don't expose those IDs directly in the
URL. Unlike the listing forms, this one has no hidden fields to prefill —
it's a general inquiry form (First Name, Last Name, Email, Phone, "How Did
You Hear About Us?", Comments), not tied to a specific property.

## Community map (homepage)

A real, interactive map sits right below the listings carousel ("Where
We're Building"), built with Leaflet + OpenStreetMap tiles (free, no API
key — loaded from `cdnjs.cloudflare.com`, the only external map dependency
on the site). One pin per community, not per individual listing.

- `data/communities.json` — one entry per community: `name`, `city`,
  `lat`/`lng`, and a representative listing `link` for the popup's "View
  Homes" button. Coordinates were geocoded once via OpenStreetMap's free
  Nominatim service. A couple of new-construction streets (Birch Leaf's
  Clay Court, Berkeley Duplexes' Columbine Lane, Harvest Ridge in Berthoud)
  don't resolve to an exact address yet — those fall back to
  neighborhood- or town-level coordinates instead, with `Berkeley Duplexes`
  manually offset slightly from `Birch Leaf Duplexes` so the two pins
  (both in the Berkeley neighborhood) don't sit exactly on top of each
  other. Re-geocode with an exact address if/when one becomes available.
- `build-map.js` — reads `communities.json` + `listings.json`, computes
  each community's live price range and home count, and regenerates the
  map section between `<!-- MAP:START -->` / `<!-- MAP:END -->` in
  `index.html`. Run this after any edit to either JSON file, same pattern
  as the other generators.
- Marker data is passed to the browser via a small inline
  `window.REDT_COMMUNITIES = [...]` script (no client-side fetch — this is
  a static site). The actual Leaflet map init lives in `assets/js/main.js`,
  guarded by `if (document.getElementById("community-map"))` so it only
  runs on the homepage.
- To add a new community: add an entry to `communities.json` with real
  geocoded coordinates, make sure at least one listing in `listings.json`
  has a matching `community` value, then re-run `node build-map.js`.

## Mortgage estimate widget (listing pages)

Every listing page has a live "Estimate Your Payment" calculator below the
description (`mortgageWidget()` in `build-listings.js`, calculation logic in
`assets/js/main.js`). Down payment %, interest rate %, and loan term (15/30
year) are all editable; the standard amortization formula recalculates on
every keystroke, client-side, against that listing's real price
(`data-price` on `.mortgage-calc`). It's principal & interest only —
explicitly excludes taxes/insurance/HOA/PMI and is labeled an estimate, not a
loan offer, since redT isn't a lender and this shouldn't be read as a rate
quote. Verified the math against a hand-computed amortization formula
(matched exactly) and confirmed it recalculates correctly on input change.

## Listing page gallery aspect ratio

`.gallery-main` (in `assets/css/styles.css`) is a fixed `aspect-ratio: 3/2`
box — every listing's main photo renders at exactly the same size regardless
of that photo's native dimensions (verified directly: measured 5 different
listings' `.gallery-main` boxes at identical viewport widths, all pixel-
identical). It was originally `16/9` but changed to `3/2` because most of
the actual MLS photos are closer to a 3:2 or 4:3 native ratio — only Kendall
Street's photos happen to already be genuinely 16:9 — so the wider box was
cropping more off the top/bottom of most listings' photos than necessary.
3:2 is a better match for the majority and crops more evenly across
listings. If a future listing's photos are almost all portrait or an
unusual ratio, reconsider this value again rather than assuming 3:2 is
universally correct.

**The sidebar (price + contact form) uses `position: sticky; top: 100px`**
and works correctly — confirmed by scrolling programmatically and checking
its rendered position — so the form is always reachable a short scroll
after the gallery, on every listing, regardless of how tall that listing's
photo/description content is. If a future "can people see the form" concern
comes up, verify sticky first before touching the gallery size again.

## Social preview image fallback

Pages without a natural photo (team, developers, for-rent, privacy) were
originally falling back to `redt-logo-icon.png` for `og:image`/`twitter:image`
— that file is 256x256, far below the ~1200x630 platforms expect for a
"summary_large_image" card, so it would've rendered tiny/blurry when shared.
Switched the fallback everywhere to `hero-st-paul.jpg` (2000x1333, already
used as the homepage's own OG image) instead. The actual brand logo is left
alone everywhere it's semantically a logo, not a preview photo — favicons and
the `Organization.logo` / `BlogPosting.publisher.logo` JSON-LD fields still
correctly point at `redt-logo-icon.png`.

## Google Search Console-verified 404 redirects

Rather than guess at every possible old URL, got the real, authoritative list
directly from Search Console's "Page indexing → Not found (404)" export on
the live site (12 specific URLs, exported and shared by the site owner). Of
those 12: 3 were already covered by the existing `/our-team/*` wildcard, 1 by
the existing `/new-homes/*` wildcard, 3 were WordPress/Cloudflare internal
artifacts that were never real content (`/wp-json/elementskit/v1/`,
`/cdn-cgi/l/email-protection`, and a `/sign-in/` plugin page) needing no
redirect, and 1 was a WordPress auto-generated attachment-page URL for an
image embedded in a real post — redirected to that real post instead of the
homepage. Added new redirects for the remaining 3 real gaps: `/about-us/`,
`/property/1574-n-gilpin-st-denver/` (no matching current listing — likely
sold/off-market), and the attachment-page URL mentioned above.

Also surfaced 5 URLs referencing blog posts never migrated into
`data/blog.json`: `the-real-estate-entitlement-process-a-complete-checklist`,
`what-are-entitlements-understanding-the-development-process`,
`denver-housing-inventory-shortage`, `this-is-a-piece-of-wood`, and
`how-to-measure-energy-efficiency`. Checked each directly in a browser before
assuming there was real content to recover — there wasn't: the first two are
already gone from the live WordPress site itself (redirect to its blog
listing there, not an actual post), and the other three are just embedded
Prezi slide-deck presentations with no surrounding article text (page body
under 500 characters on each, just nav/footer + a Prezi iframe). Nothing
recoverable, so added `netlify.toml` redirects sending all 5 to
`/blog/index.html` instead of fabricating placeholder posts or re-embedding
a fragile third-party Prezi dependency.

The other Critical-issues categories in that same Search Console export
(375 "Crawled – currently not indexed", 27 "Discovered – currently not
indexed", 107 "Excluded by noindex tag") don't need individual redirects —
Google already isn't ranking those pages, so there's no SEO value to
preserve by chasing down redirects for all of them.

## Internal link audit (post-launch site, not the old-WordPress redirect audit)

Crawled every internal `href`/`src` across all generated + static pages (180
files, excluding `_archive-multipage-site/`, which is dead backup content not
served by the live site) against the local preview, using a one-off script in
the scratchpad. Found and fixed 2 real broken links in blog post content:
`6-benefits-of-buying-a-condo-in-denver` linked to `/buy-vs-rent` (should've
been `/blog/buy-vs-rent.html` — that post already exists, just had the wrong
URL) and `8-reasons-to-buy-new-construction-homes` linked to a dead
`/contact-us` (now `/#contact`). Also found 3 posts linking to old WordPress-
hosted neighborhood-guide PDFs that no longer exist
(`get-the-scoop-sloans-lake`, `the-best-of-glendale-home-of-forest-park-12`,
`what-is-going-on-in-the-dtc`) — added `netlify.toml` redirects to the
homepage for those, matching the existing `KALAMATH16NEWPROPERTYHIGHLIGHT.pdf`
precedent, since we don't have the actual PDF files to serve. Like all other
`netlify.toml` redirects, these only resolve on an actual Netlify deploy, not
the local `npx serve` preview.

## Google Analytics (GA4)

The gtag.js snippet (measurement ID `G-RC3LB22WHK`) is hand-inserted right
after the viewport meta tag on every page — homepage, every generated listing
and blog post, team, developers, for-rent, privacy, and 404. This is a
separate/staging GA4 property used while testing the new site pre-launch, not
the property tracking the current live WordPress site — swap in the
long-term production property's ID before the real domain cutover so
historical traffic data stays in one property instead of fragmenting. Since
`index.html`, `developers/index.html`, `for-rent/index.html`,
`privacy/index.html`, and `404.html` aren't generated, the snippet is
hand-duplicated in each; `build-blog.js`, `build-team.js`, and
`build-listings.js` have it in their shared head-generation code so it's
already in every generated page automatically.

## Open Graph / Twitter Card tags, Privacy page, 404 page, lazy-loading

- Every page now has `og:*` and `twitter:*` meta tags so links shared on
  Facebook/X/LinkedIn/etc. show a real title, description, and image instead
  of a bare link. Listing pages use that listing's `heroImage`; blog posts use
  their first body image; pages without a natural photo (homepage, team,
  developers, for-rent, privacy) fall back to the redT logo icon. Generated
  pages get this from `pageShell()` (blog/team) or inline in `listingPage()`
  (listings) — nothing to maintain by hand there. `index.html`,
  `developers/index.html`, and `for-rent/index.html` have it hand-added since
  they aren't generated.
- `/privacy/index.html` is a real page now (previously the footer link was a
  dead `#`). It's a plain-language draft covering what this site actually
  collects (HubSpot form submissions) and what third-party services it uses —
  explicitly labeled as a draft that needs attorney review before being
  treated as a final legal document. Every footer's "Privacy" link across the
  whole site now points here; "Careers" links to `/#contact` for now since
  there's no real careers page/content yet.
- `/404.html` is a branded not-found page (logo, nav, a link back home and to
  listings). Netlify serves this automatically for any unmatched URL by its
  standard convention of using a root-level `404.html` — no `netlify.toml`
  config needed.
- Images that aren't the immediate above-the-fold content now use
  `loading="lazy"`: blog card photos, blog post body images (via
  `lazyLoadImages()` in `build-blog.js`, which is careful to skip images that
  already declare a `loading` attribute and to strip the old self-closing
  `/>` syntax WordPress exports use, since leaving it in would've produced
  broken `<img ... / loading="lazy">` markup), homepage listing-card photos,
  listing gallery thumbnails, and team headshots. The main/hero image on each
  listing gallery and the homepage hero stay eager since they're the
  above-the-fold content.

## Social links (footer)

The footer on every page (homepage, listings, blog, team, developers, for-rent)
links to redT's real social profiles: Facebook, Instagram, LinkedIn, TikTok,
X, and YouTube. The markup (`FOOT_SOCIAL` in `build-blog.js`/`build-team.js`/
`build-listings.js`, and hand-duplicated directly in `index.html`,
`developers/index.html`, and `for-rent/index.html` since those aren't
generated by a script) is intentionally duplicated rather than shared, matching
this codebase's existing pattern of separate hand-authored/generated footers
per file. If a social URL ever changes, it needs updating in all 6 places —
search for `foot-social` across the repo to find them all.

## SEO: sitemap, robots.txt, llms.txt, and structured data

- `sitemap.xml` and `robots.txt` are generated by `build-sitemap.js` (not
  hand-edited) — it lists every static page, every listing, and every blog
  post from the current JSON data. Re-run `node build-sitemap.js` any time a
  listing or blog post is added or removed so new pages get discovered by
  crawlers. Note the local `npx serve` preview serves these fine, but real
  crawlers only see them once the site is actually deployed (same caveat as
  the `netlify.toml` redirects).
- `llms.txt` (also generated by `build-sitemap.js`) is a plain-language site
  summary aimed at AI crawlers/assistants — an emerging, not-yet-universal
  convention, cheap to keep since it's just a short static file.
- **Structured data (JSON-LD)**: every listing page has `RealEstateListing` +
  `BreadcrumbList` schema (added in `listingJsonLd()` in `build-listings.js`);
  every blog post has `BlogPosting` + `BreadcrumbList` (added in
  `postJsonLd()` in `build-blog.js`); the homepage has `HomeAndConstructionBusiness`
  + `WebSite` schema (hand-added directly in `index.html`'s `<head>`, since
  the homepage isn't generated by a script). This is what lets Google rich
  results and AI answer engines correctly pull price/beds/baths/address
  instead of guessing from prose. All of it is regenerated automatically by
  the normal `build-listings.js` / `build-blog.js` runs — nothing extra to
  run. Verified by parsing every generated `<script type="application/ld+json">`
  block as JSON across all 23 listings + 145 posts with zero errors.
- The homepage was also missing a `<link rel="canonical">` tag before this —
  added directly since `index.html` is hand-authored, not generated.
- The `HomeAndConstructionBusiness` schema's `address`/`telephone` were
  initially generic (just "CO, US", no street address or phone). Updated
  with the real registered business info: redT Homes, LLC, 4260 E. Evans
  Ave., Denver, CO 80222, main line 303-997-4001.

## Known HubSpot-side inconsistency: Dahlia Street form styling

`data/listings.json`'s `1101-s-dahlia-street-denver` entry uses HubSpot form
ID `4ce8eb64-0240-4046-8d87-b3695d3c1833`. Unlike every other listing's form,
this one renders inside an `<iframe>` (confirmed via DOM inspection —
`.hubspot-form iframe` exists only on this listing), while all other listing
forms render as plain inline HTML directly in the page. Iframes are fully
isolated documents, so **this site's CSS cannot style its contents at all**
— that's why it shows HubSpot's own default form theme (light-blue inputs,
orange submit button) instead of matching the rest of the site.

This is a setting on that specific form inside the HubSpot portal (forms can
be configured to embed as an iframe vs. inline — likely under that form's
"advanced"/embed options), not something fixable from this codebase. To fix
it, Jennifer needs to find whatever setting differs between this form and
one of the correctly-styled ones in HubSpot itself and align them.

## Current listings

18 real listings sourced from `listings/property_listings.xlsx` (Thirty Eight
West, Birch Leaf Duplexes, Berkeley Duplexes, Lafayette Townhomes,
Observatory Park, Sherman Townhomes, and Harvest at Berthoud — The Row at
Kendall's three units and Fenton Homes' single unit (3784 Fenton Street)
sold/were pulled and were removed from the site). All 18 now have a real
**HubSpot Form ID** wired in and
render a live embed (see `HUBSPOT-MLS-INTEGRATION.md`). A few of these were
ambiguous — either a street-number mismatch (Dahlia Street) or duplicate
similarly-named forms in the portal (Lafayette Street, Sherman Townhomes) —
and were resolved by asking Jennifer directly rather than guessed.

Descriptions were refreshed from the spreadsheet's "Short description" column
(the real MLS-style copy Jennifer maintains there), condensed to this site's
shorter format and with LEED/sustainability/Energy-Star/HERS-Index language
stripped throughout to match the site's brand positioning — this spreadsheet
column still contains that language in places (e.g. Columbine Lane, Dahlia
Street, Lafayette Townhomes, both William Way listings); don't copy it in
verbatim next time without scrubbing it first. The three Lafayette Townhomes
units and the two Harvest (William Way) listings previously shared one
generic description each; they now have distinct copy per unit since the
spreadsheet's real text differs unit-to-unit (e.g. unit 1642-#1 being a real
end unit with extra windows).

All 20 listings now have real photos (`heroImage` + optional `galleryImages`
in the JSON), pulled from each property's public REcolorado shared MLS link
(also tracked in the spreadsheet's "recolorado link" column). For finished,
staged listings these are real photography; for listings still under
construction with no finished photos yet, an exterior rendering was used
instead (e.g. Thirty Eight West, Sherman Townhomes); for a couple of listings
with no exterior shot in the MLS media set at all, a strong interior photo
was used as the hero instead (927 & 953 William Way).

Each listing's gallery was later expanded from 1-3 photos to 6-9 (however
many the MLS media set actually had, capped in practice around 8-9), and the
gallery itself was redesigned from a static photo grid into one large main
photo with a click-through thumbnail carousel below it (arrows + horizontal
scroll, same interaction pattern as the homepage listings carousel). The
`property-gallery` markup in `build-listings.js` (`listingPage()`'s `gallery`
construction) renders however many photos exist in `heroImage` +
`galleryImages` combined, so adding more `galleryImages` to any listing just
works — no hardcoded tile count. Clicking a thumbnail swaps the main photo
(handled in `assets/js/main.js`, delegated via `.gallery-thumb` click
listeners) and highlights the active thumbnail.

The homepage listings carousel and each listing page's photo carousel share
the same JS (`main.js` loops over every `[data-carousel-track]` on the page
and finds its paired prev/next buttons via the nearest ancestor with
`[data-carousel-group]`), so a page can have more than one independent
carousel without them interfering.

**MLS media-set gotcha worth knowing:** REcolorado's photo sets sometimes
contain genuine duplicate uploads (the same photo appearing at two different
`Number=` indices in the same listing's media set) — confirmed via byte-for-
byte MD5 comparison while pulling these, not a scripting error. Always
diff new downloads against existing ones for the same listing before adding
them to `galleryImages`; swap in a different `Number=` index if a duplicate
turns up. Pre-construction community listings (Thirty Eight West, The Row at
Kendall) also legitimately reuse the *same* rendering photos **across**
different unit numbers, since there's no unit-specific photography yet —
that cross-listing repetition is expected, not a bug.

## Placeholder content still to replace

- **Homepage stats bar** was removed entirely (previously placeholder
  numbers: 2,400+ homes built, 38 communities, 19 years, 98% satisfaction).
  A web search found a founding year (2014) and a community count (7, per
  a third-party listing aggregator, not redT itself) that don't match what
  was there and aren't confirmed by redT directly, so rather than swap in
  another guessed number, the section was dropped. If Jennifer provides
  real figures (homes built, communities developed, years in business,
  satisfaction rate/source), re-add a `<section class="stats">` block —
  the `.stats`/`.stats-grid`/`.stat`/`.num`/`.label` CSS in
  `assets/css/styles.css` is untouched and ready to receive it again.
- **Forms** — all 19 listing pages now embed a live HubSpot form. The hidden
  `listing_*` fields only populate once each HubSpot form has matching hidden
  fields configured (see `HUBSPOT-MLS-INTEGRATION.md`, Option A step 1) —
  until then the form still works, it just won't tag submissions with the
  property automatically.
- **Footer links** (Privacy, Careers) — point to `#`, no destination pages exist.

## Earlier multi-page version

A previous, more elaborate build of this site — a multi-page, data-driven,
SEO-focused static site (homes/property/neighborhood/blog templates, a Node
build script, sitemap, schema.org markup) with a sustainability/LEED/
all-electric brand angle — is preserved in `_archive-multipage-site/` for
reference. It was replaced by the current homepage concept per a later brief
change that drops the sustainability angle and reintroduces a multi-audience
(originally homebuyer/developer/investor, later trimmed to homebuyer/
developer) structure with placeholder stats.

Four early placeholder listings (Sterling Ranch, Bradbury Ranch, Cherry Creek
Overlook, Prospect Valley) are preserved in `_archive-placeholder-listings/`
— they were replaced by the real spreadsheet data above.
