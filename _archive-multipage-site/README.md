# redT Homes Website

Production-ready marketing site for redT Homes, a Denver-area homebuilder. Plain HTML/CSS/vanilla JS, with a small zero-dependency Node build script that stitches shared partials and data-driven pages together into a deployable `/dist` folder.

## Folder structure

```
website/
├── index.html                   Home page
├── why-redt.html                Certifications / "why redT" deep dive
├── about.html
├── testimonials.html
├── contact.html
├── robots.txt
├── netlify.toml                 Netlify build + redirect config
├── build.js                     The build script (see below)
│
├── partials/
│   ├── header.html              Site nav — edit once, applies everywhere
│   └── footer.html              Site footer + HubSpot tracking placeholder
│
├── templates/
│   ├── property-template.html       Generates one page per data/listings.json entry
│   ├── neighborhood-template.html   Generates one page per data/neighborhoods.json entry
│   └── blog-post-template.html      Starting point to copy when writing a new post (not auto-built)
│
├── homes/
│   └── index.html                Homes for Sale grid (filter/sort)
│   (generated: /homes/<slug>.html — one per listing)
│
├── neighborhoods/
│   └── index.html                Neighborhoods landing page
│   (generated: /neighborhoods/<slug>.html — one per neighborhood)
│
├── blog/
│   ├── index.html
│   └── posts/                    Hand-authored post files (see "Adding a blog post")
│
├── data/
│   ├── listings.json             One object per home for sale
│   └── neighborhoods.json        One object per neighborhood/submarket
│
├── assets/
│   ├── css/styles.css            Design system: colors, type scale, spacing, buttons
│   ├── js/main.js                Shared site JS (nav, lazy-load, footer year)
│   ├── js/homes-filter.js        Homes for Sale filter/sort logic
│   ├── images/{hero,listings,neighborhoods,blog}/   Drop photography in here
│   └── brand/                    Drop logo + certification badge SVGs/PNGs in here
│
└── dist/                         BUILD OUTPUT — this is what gets deployed. Don't hand-edit.
```

## How the build works

Run:

```
node build.js
```

This does four things, all with Node's built-in `fs`/`path` — no `npm install` needed:

1. **Injects partials.** Any hand-authored page with the markers `<!-- BUILD:INCLUDE partials/header.html -->` / `...footer.html...` gets those partials spliced in.
2. **Renders data-driven pages.** `templates/property-template.html` is rendered once per entry in `data/listings.json` (into `dist/homes/<slug>.html`), and `templates/neighborhood-template.html` once per entry in `data/neighborhoods.json` (into `dist/neighborhoods/<slug>.html`). The same tiny `{{token}}` / `{{#each}}` / `{{#if}}` template syntax also runs across every hand-authored page, so things like the home page's "Available Homes" and "From the Blog" sections stay in sync with the data files automatically.
3. **Regenerates `sitemap.xml`** from the full set of static + generated pages.
4. **Copies `assets/`, `data/`, and `robots.txt`** into `/dist`.

`dist/` is fully disposable — delete it and re-run `node build.js` any time.

### Running locally

Because pages link with root-relative paths (`/homes/`, `/assets/css/styles.css`, etc.), you need to **serve `/dist` over HTTP**, not open the files directly via `file://`. After running the build:

```
node build.js
npx serve dist
```

(or any other static file server pointed at `/dist`).

### Template syntax reference (used in `templates/*.html` and any hand-authored page)

- `{{field}}` — escaped text substitution
- `{{field_html}}` — raw HTML substitution (used for `description_html` fields)
- `{{#each list}} ... {{/each}}` — repeat a block for every item in an array; use `{{.}}` inside the block to reference a plain string item
- `{{#if field}} ... {{/if}}` / `{{#unless field}} ... {{/unless}}` — conditional block

## Adding a new home listing

1. Open `data/listings.json` and copy one existing object.
2. Fill in every field — `slug` becomes the URL (`/homes/<slug>.html`), so keep it lowercase, hyphenated, and unique. `neighborhoodSlug` must match a `slug` in `data/neighborhoods.json` so the home shows up on that neighborhood's page.
3. Drop photos into `assets/images/listings/` and point `heroImage` / `photos[].url` / `floorPlanImage` at them.
4. Run `node build.js`. The new listing page, its card on the homepage/Homes grid/its neighborhood page, and the sitemap all update automatically — no HTML to hand-edit.

## Adding a new neighborhood page

1. Open `data/neighborhoods.json` and copy one existing object.
2. Fill in `slug` (becomes `/neighborhoods/<slug>.html`), `summary`, `description_html`, and `amenities`.
3. Drop a hero photo into `assets/images/neighborhoods/`.
4. Run `node build.js`. To list homes on that neighborhood's page, set matching listings' `neighborhoodSlug` in `data/listings.json`.

## Adding a blog post

Blog posts are hand-authored HTML files (not data-driven), so Claude Code — or anyone — can find and edit one quickly.

1. Copy `templates/blog-post-template.html` into `blog/posts/your-post-slug.html`.
2. Fill in the `POST_META` comment block at the top of the file (title, date, category, excerpt, image, author) — the home page and blog index both read this block to build their post cards automatically.
3. Fill in the `<head>` meta tags and JSON-LD to match, and write the article body.
4. Update the "Related Posts" links at the bottom of the 2-3 most relevant existing posts to point back at the new one (this is manual — there's no related-posts algorithm).
5. Run `node build.js`.

## Where the HubSpot embed codes go

Search the codebase for `HUBSPOT` to find every placeholder:

- **Site-wide tracking script** → `partials/footer.html` (applies to every page)
- **Home page lead form** → `index.html`, in the final CTA section
- **Property tour request form** → `templates/property-template.html` (applies to every generated property page)
- **Contact page form** → `contact.html`
- **Newsletter signup** → `contact.html`, bottom section

Each placeholder is a plain HTML `<form>` with matching fields so the page works and looks right before HubSpot is wired up — swap in the actual HubSpot embed code when you have the portal/form IDs.

## Placeholder content to replace before launch

- **Brand colors, fonts, logo:** `assets/css/styles.css` (`:root` custom properties) and `assets/brand/` (logo + certification badge files — currently referenced but not present; `<img>` tags degrade gracefully via `onerror` until they're added)
- **Sample listings:** all 4 entries in `data/listings.json` (2 in Park Hill, 2 in Westwood) are placeholder addresses/prices/photos
- **Sample neighborhoods:** both entries in `data/neighborhoods.json` (Park Hill, Westwood) have placeholder copy — replace with the real neighborhood list once supplied
- **Sample blog posts:** the 3 posts in `blog/posts/` are real, publishable copy but written generically — review before publishing
- **Team bios/photos:** `about.html` has placeholder team cards
- **Testimonials:** `testimonials.html` and the homepage testimonials section use placeholder quotes — swap for real reviews
- **HubSpot portal/form IDs:** see above
- **Photography:** every image path in `data/*.json` and the hero sections points to a file that doesn't exist yet — drop matching files into `assets/images/*` and `assets/brand/`

## Deployment (Netlify)

`netlify.toml` is already configured with `publish = "dist"` and `command = "node build.js"`, so:

- **Git-connected deploy:** push this repo to a Git provider and connect it in Netlify — it will run the build automatically.
- **Manual deploy:** run `node build.js` locally, then drag-and-drop the resulting `dist/` folder onto Netlify's deploy UI.
