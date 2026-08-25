#!/usr/bin/env node
/**
 * redT Homes — static site build script
 * Zero dependencies beyond Node's built-in `fs`/`path`.
 *
 * What it does:
 *   1. Injects partials/header.html + partials/footer.html into every
 *      hand-authored page at the "<!-- BUILD:INCLUDE partials/header.html -->"
 *      / "...footer.html..." markers.
 *   2. Generates property detail pages from data/listings.json using
 *      templates/property-template.html.
 *   3. Generates neighborhood pages from data/neighborhoods.json using
 *      templates/neighborhood-template.html.
 *   4. Regenerates sitemap.xml from the full set of pages.
 *   5. Copies assets/, data/, robots.txt into /dist.
 *
 * Run with: node build.js
 * Output goes to /dist — that folder is what gets deployed to Netlify.
 *
 * Template syntax (used in templates/*.html):
 *   {{field}}          escaped text substitution
 *   {{field_html}}     raw HTML substitution (no escaping)
 *   {{#each list}}...{{/each}}   repeat block for each item in an array
 *   {{#if field}}...{{/if}}      render block only if field is truthy/non-empty
 *   {{#unless field}}...{{/unless}}  render block only if field is falsy/empty
 *   {{.}}              inside an #each block, refers to the item itself
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const SITE_URL = "https://www.redthomes.com";

// --------------------------------------------------------------------------
// Tiny template engine
// --------------------------------------------------------------------------

function tokenize(str) {
  const re = /\{\{(#each|#if|#unless|\/each|\/if|\/unless)?\s*([^}]*?)\s*\}\}/g;
  const tokens = [];
  let lastIndex = 0;
  let m;
  while ((m = re.exec(str))) {
    if (m.index > lastIndex) tokens.push({ type: "text", value: str.slice(lastIndex, m.index) });
    const tag = m[1];
    const arg = m[2].trim();
    if (tag === "#each") tokens.push({ type: "each-open", name: arg });
    else if (tag === "#if") tokens.push({ type: "if-open", name: arg });
    else if (tag === "#unless") tokens.push({ type: "unless-open", name: arg });
    else if (tag === "/each") tokens.push({ type: "each-close" });
    else if (tag === "/if") tokens.push({ type: "if-close" });
    else if (tag === "/unless") tokens.push({ type: "unless-close" });
    else tokens.push({ type: "var", name: arg });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < str.length) tokens.push({ type: "text", value: str.slice(lastIndex) });
  return tokens;
}

function buildAst(tokens) {
  let pos = 0;
  function parseNodes(stopType) {
    const nodes = [];
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (stopType && tok.type === stopType) {
        pos++;
        return nodes;
      }
      if (tok.type === "text") {
        nodes.push({ type: "text", value: tok.value });
        pos++;
      } else if (tok.type === "var") {
        nodes.push({ type: "var", name: tok.name });
        pos++;
      } else if (tok.type === "each-open") {
        pos++;
        nodes.push({ type: "each", name: tok.name, children: parseNodes("each-close") });
      } else if (tok.type === "if-open") {
        pos++;
        nodes.push({ type: "if", name: tok.name, children: parseNodes("if-close") });
      } else if (tok.type === "unless-open") {
        pos++;
        nodes.push({ type: "if", name: tok.name, negate: true, children: parseNodes("unless-close") });
      } else {
        pos++;
      }
    }
    return nodes;
  }
  return parseNodes(null);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getFromStack(stack, dotPath) {
  if (dotPath === ".") return stack[stack.length - 1];
  const parts = dotPath.split(".");
  for (let i = stack.length - 1; i >= 0; i--) {
    const ctx = stack[i];
    if (ctx && typeof ctx === "object" && Object.prototype.hasOwnProperty.call(ctx, parts[0])) {
      let val = ctx[parts[0]];
      for (let j = 1; j < parts.length && val != null; j++) val = val[parts[j]];
      return val;
    }
  }
  return undefined;
}

function renderNodes(nodes, stack) {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text") {
      out += node.value;
    } else if (node.type === "var") {
      const raw = node.name.endsWith("_html");
      let val = getFromStack(stack, node.name);
      if (val === undefined || val === null) val = "";
      out += raw ? String(val) : escapeHtml(val);
    } else if (node.type === "each") {
      const arr = getFromStack(stack, node.name);
      if (Array.isArray(arr)) {
        for (const item of arr) out += renderNodes(node.children, stack.concat([item]));
      }
    } else if (node.type === "if") {
      let val = getFromStack(stack, node.name);
      let truthy = Array.isArray(val) ? val.length > 0 : !!val;
      if (node.negate) truthy = !truthy;
      if (truthy) out += renderNodes(node.children, stack);
    }
  }
  return out;
}

function renderTemplate(str, data) {
  return renderNodes(buildAst(tokenize(str)), [data]);
}

// --------------------------------------------------------------------------
// File helpers
// --------------------------------------------------------------------------

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readPartial(name) {
  return fs.readFileSync(path.join(ROOT, "partials", name), "utf8");
}

function injectPartials(html) {
  const header = readPartial("header.html");
  const footer = readPartial("footer.html");
  return html
    .replace(/<!--\s*BUILD:INCLUDE partials\/header\.html\s*-->/, () => header)
    .replace(/<!--\s*BUILD:INCLUDE partials\/footer\.html\s*-->/, () => footer);
}

function writeFile(outPath, contents) {
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, contents);
}

function listBlogPostFiles() {
  const dir = path.join(ROOT, "blog", "posts");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join("blog", "posts", f));
}

/**
 * Blog posts carry a metadata comment block at the top of the file, e.g.:
 *   <!-- POST_META
 *   title: Winter Energy Bills, Explained
 *   date: 2026-01-15
 *   category: Sustainability
 *   excerpt: ...
 *   image: /assets/images/blog/winter-energy-bills.jpg
 *   imageAlt: ...
 *   author: redT Homes Team
 *   -->
 * This parses that block so the home page / blog index can list posts
 * without hand-editing a separate data file.
 */
function parseBlogPostMeta(relPath) {
  const html = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  const match = html.match(/<!--\s*POST_META([\s\S]*?)-->/);
  if (!match) return null;
  const meta = { url: "/" + relPath.split(path.sep).join("/") };
  for (const line of match[1].split("\n")) {
    const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.+?)\s*$/);
    if (m) meta[m[1]] = m[2];
  }
  return meta;
}

function loadSiteData() {
  const listingsPath = path.join(ROOT, "data", "listings.json");
  const neighborhoodsPath = path.join(ROOT, "data", "neighborhoods.json");
  const listings = fs.existsSync(listingsPath) ? readJSON(listingsPath) : [];
  const neighborhoods = fs.existsSync(neighborhoodsPath) ? readJSON(neighborhoodsPath) : [];
  const posts = listBlogPostFiles()
    .map(parseBlogPostMeta)
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    siteUrl: SITE_URL,
    listings,
    featuredListings: listings.slice(0, 3),
    neighborhoods,
    posts,
    latestPosts: posts.slice(0, 3),
  };
}

// --------------------------------------------------------------------------
// Build steps
// --------------------------------------------------------------------------

const STATIC_PAGES = [
  "index.html",
  "why-redt.html",
  "about.html",
  "testimonials.html",
  "contact.html",
  path.join("homes", "index.html"),
  path.join("neighborhoods", "index.html"),
  path.join("blog", "index.html"),
  ...listBlogPostFiles(),
];

function copyStaticAssets() {
  fs.cpSync(path.join(ROOT, "assets"), path.join(DIST, "assets"), { recursive: true });
  fs.cpSync(path.join(ROOT, "data"), path.join(DIST, "data"), { recursive: true });
  fs.copyFileSync(path.join(ROOT, "robots.txt"), path.join(DIST, "robots.txt"));
}

function buildStaticPages(siteData) {
  for (const rel of STATIC_PAGES) {
    const src = path.join(ROOT, rel);
    if (!fs.existsSync(src)) {
      console.warn("  [skip] missing source page:", rel);
      continue;
    }
    const raw = fs.readFileSync(src, "utf8");
    const html = injectPartials(renderTemplate(raw, siteData));
    writeFile(path.join(DIST, rel), html);
  }
  console.log(`  built ${STATIC_PAGES.length} static page(s)`);
}

function buildListingPages(siteData) {
  const listings = siteData.listings;
  if (!listings.length) return [];
  const templatePath = path.join(ROOT, "templates", "property-template.html");
  if (!fs.existsSync(templatePath)) {
    console.warn("  [skip] templates/property-template.html not found");
    return [];
  }
  const template = fs.readFileSync(templatePath, "utf8");
  const urls = [];

  for (const listing of listings) {
    const similarHomes = listings
      .filter((l) => l.slug !== listing.slug && l.neighborhoodSlug === listing.neighborhoodSlug)
      .slice(0, 3);
    const data = Object.assign({}, siteData, { similarHomes }, listing);
    const html = injectPartials(renderTemplate(template, data));
    writeFile(path.join(DIST, "homes", `${listing.slug}.html`), html);
    urls.push(`/homes/${listing.slug}.html`);
  }
  console.log(`  built ${listings.length} property page(s)`);
  return urls;
}

function buildNeighborhoodPages(siteData) {
  const neighborhoods = siteData.neighborhoods;
  if (!neighborhoods.length) return [];
  const templatePath = path.join(ROOT, "templates", "neighborhood-template.html");
  if (!fs.existsSync(templatePath)) {
    console.warn("  [skip] templates/neighborhood-template.html not found");
    return [];
  }
  const template = fs.readFileSync(templatePath, "utf8");
  const urls = [];

  for (const n of neighborhoods) {
    const homes = siteData.listings.filter((l) => l.neighborhoodSlug === n.slug);
    const data = Object.assign({}, siteData, { homes }, n);
    const html = injectPartials(renderTemplate(template, data));
    writeFile(path.join(DIST, "neighborhoods", `${n.slug}.html`), html);
    urls.push(`/neighborhoods/${n.slug}.html`);
  }
  console.log(`  built ${neighborhoods.length} neighborhood page(s)`);
  return urls;
}

function staticPageToUrl(rel) {
  const unix = rel.split(path.sep).join("/");
  if (unix === "index.html") return "/";
  if (unix.endsWith("/index.html")) return "/" + unix.replace(/index\.html$/, "");
  return "/" + unix;
}

function buildSitemap(listingUrls, neighborhoodUrls) {
  const staticUrls = STATIC_PAGES.map(staticPageToUrl);
  const allUrls = [...staticUrls, ...listingUrls, ...neighborhoodUrls];
  const today = new Date().toISOString().slice(0, 10);
  const body = allUrls
    .map(
      (u) => `  <url>\n    <loc>${SITE_URL}${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  writeFile(path.join(DIST, "sitemap.xml"), xml);
  console.log(`  wrote sitemap.xml with ${allUrls.length} url(s)`);
}

function main() {
  console.log("redT Homes build: starting...");
  fs.rmSync(DIST, { recursive: true, force: true });
  ensureDir(DIST);

  const siteData = loadSiteData();

  console.log("Copying static assets...");
  copyStaticAssets();

  console.log("Building static pages...");
  buildStaticPages(siteData);

  console.log("Building property detail pages...");
  const listingUrls = buildListingPages(siteData);

  console.log("Building neighborhood pages...");
  const neighborhoodUrls = buildNeighborhoodPages(siteData);

  console.log("Writing sitemap.xml...");
  buildSitemap(listingUrls, neighborhoodUrls);

  console.log(`Build complete -> ${path.relative(ROOT, DIST) || "dist"}/`);
}

main();
