#!/usr/bin/env node
/**
 * redT Homes — sitemap / robots / llms.txt generator (zero dependencies)
 *
 * Reads data/listings.json and data/blog.json and writes:
 *   1. sitemap.xml   — every static page + listing page + blog post
 *   2. robots.txt     — allow all, points crawlers at sitemap.xml
 *   3. llms.txt       — short site summary + key links, for AI crawlers/assistants
 *
 * Run with: node build-sitemap.js (after build-listings.js / build-blog.js,
 * since it just reads the same data files, not their generated HTML).
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE_URL = "https://www.redthomes.com";

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const listings = readJSON(path.join(ROOT, "data", "listings.json"));
  const posts = readJSON(path.join(ROOT, "data", "blog.json"));
  const today = todayISO();

  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    { loc: `${SITE_URL}/blog/index.html`, priority: "0.8" },
    { loc: `${SITE_URL}/team/index.html`, priority: "0.5" },
    { loc: `${SITE_URL}/developers/index.html`, priority: "0.6" },
    { loc: `${SITE_URL}/for-rent/index.html`, priority: "0.6" },
    { loc: `${SITE_URL}/careers/index.html`, priority: "0.4" },
    { loc: `${SITE_URL}/privacy/index.html`, priority: "0.3" },
  ];

  const listingUrls = listings.map((l) => ({
    loc: `${SITE_URL}/listings/${l.slug}.html`,
    priority: "0.9",
  }));

  const postUrls = posts.map((p) => ({
    loc: `${SITE_URL}/blog/${p.slug}.html`,
    lastmod: (p.date || "").slice(0, 10) || today,
    priority: "0.6",
  }));

  const allUrls = [...staticUrls, ...listingUrls, ...postUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);

  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, "robots.txt"), robots);

  const llms = `# redT Homes

> Colorado homebuilder based in the Denver metro area. Builds and sells new-construction
> and move-in-ready townhomes and single-family homes, and partners with land developers
> across the Front Range.

## Key pages

- [Home](${SITE_URL}/): overview, current available homes, communities map, contact.
- [All listings](${SITE_URL}/#listings): every active home for sale, with price, beds/baths,
  status, and community.
- [Blog](${SITE_URL}/blog/index.html): articles on homebuying, Denver neighborhoods, and
  Colorado living (${posts.length} posts).
- [Developers](${SITE_URL}/developers/index.html): information for land development partners.
- [For Rent](${SITE_URL}/for-rent/index.html): rental listings.
- [Our Team](${SITE_URL}/team/index.html): leadership and staff.
- [Careers](${SITE_URL}/careers/index.html): working at redT Homes.

## Notes for AI assistants

- Current home prices, statuses, and specs live on each listing's own page
  (${SITE_URL}/listings/<slug>.html) and change over time — link to the live page rather
  than quoting a price from a cached summary.
- ${listings.length} active listings as of ${today}.
`;
  fs.writeFileSync(path.join(ROOT, "llms.txt"), llms);

  console.log(`Wrote sitemap.xml (${allUrls.length} URLs), robots.txt, and llms.txt.`);
}

main();
