#!/usr/bin/env node
/**
 * redT Homes — blog generator (zero dependencies, Node's fs/path only)
 *
 * Reads data/blog.json and:
 *   1. Writes one page per post to /blog/<slug>.html
 *   2. Writes /blog/index.html listing every post
 *   3. Regenerates the homepage "From the Blog" teaser between the
 *      <!-- BLOG:START --> / <!-- BLOG:END --> markers in index.html
 *
 * Run with: node build-blog.js
 *
 * To add/update a post: edit data/blog.json, then re-run this script.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE_URL = "https://www.redthomes.com";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatDate(iso) {
  const d = new Date(iso.replace(" ", "T"));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeFile(outPath, contents) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents);
}

const NAV = `<nav class="nav" id="nav">
  <a href="/" class="nav-logo" aria-label="redT Homes">
    <img src="/assets/brand/redt-logo-white.png" alt="redT Homes" class="logo-light">
    <img src="/assets/brand/redt-logo-black.png" alt="redT Homes" class="logo-dark">
  </a>
  <ul class="nav-segments">
    <li><a href="/#listings">Homebuyers</a></li>
    <li><a href="/developers/index.html">Developers</a></li>
  </ul>
  <div class="nav-right">
    <ul class="nav-secondary">
      <li><a href="/blog/index.html">Blog</a></li>
      <li><a href="/team/index.html">Our Team</a></li>
      <li><a href="/for-rent/index.html">For Rent</a></li>
      <li><a href="/#testimonials">Testimonials</a></li>
      <li><a href="/#contact">Contact</a></li>
    </ul>
    <a href="/#contact" class="btn btn-primary" style="padding: 12px 22px;">Get In Touch</a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M0 1H20" stroke="currentColor" stroke-width="2"/><path d="M0 7H20" stroke="currentColor" stroke-width="2"/><path d="M0 13H20" stroke="currentColor" stroke-width="2"/></svg>
    </button>
  </div>
</nav>

<div class="mobile-menu" id="mobile-menu">
  <ul>
    <li><a href="/#listings">Homebuyers</a></li>
    <li><a href="/developers/index.html">Developers</a></li>
  </ul>
  <ul class="mobile-secondary">
    <li><a href="/blog/index.html">Blog</a></li>
    <li><a href="/team/index.html">Our Team</a></li>
    <li><a href="/for-rent/index.html">For Rent</a></li>
    <li><a href="/#testimonials">Testimonials</a></li>
    <li><a href="/#contact">Contact</a></li>
  </ul>
</div>`;

const FOOT_SOCIAL = `<ul class="foot-social">
    <li><a href="https://www.facebook.com/redTDenver" target="_blank" rel="noopener" aria-label="redT Homes on Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg></a></li>
    <li><a href="https://www.instagram.com/redthomes/" target="_blank" rel="noopener" aria-label="redT Homes on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a></li>
    <li><a href="https://www.linkedin.com/company/redt-homes/" target="_blank" rel="noopener" aria-label="redT Homes on LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5V9h3zM6.5 7.7A1.7 1.7 0 1 1 6.5 4.3a1.7 1.7 0 0 1 0 3.4zM19 19h-3v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V19H9V9h2.9v1.4h0a3.1 3.1 0 0 1 2.8-1.6c3 0 3.5 2 3.5 4.5z"/></svg></a></li>
    <li><a href="https://www.tiktok.com/@redt_homes" target="_blank" rel="noopener" aria-label="redT Homes on TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2h-3v13.5a2.5 2.5 0 1 1-2.5-2.5c.2 0 .5 0 .7.1v-3a5.5 5.5 0 1 0 4.8 5.4V8.6a7.3 7.3 0 0 0 4.5 1.5v-3a4.3 4.3 0 0 1-4.5-4.2z"/></svg></a></li>
    <li><a href="https://x.com/redTHomes" target="_blank" rel="noopener" aria-label="redT Homes on X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.2 8.3L23 22h-6.6l-5.2-6.8L5.2 22H2l7.7-8.8L1 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 4H5.5l12.2 16z"/></svg></a></li>
    <li><a href="https://www.youtube.com/@redt_homes" target="_blank" rel="noopener" aria-label="redT Homes on YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.6-.5-5.3c-.3-1-1-1.8-2-2C18.9 4.2 12 4.2 12 4.2s-6.9 0-8.5.5c-1 .3-1.8 1-2 2C1 8.4 1 12 1 12s0 3.6.5 5.3c.3 1 1 1.7 2 2 1.6.5 8.5.5 8.5.5s6.9 0 8.5-.5c1-.3 1.7-1 2-2 .5-1.7.5-5.3.5-5.3zM9.8 15.5V8.5l6.4 3.5-6.4 3.5z"/></svg></a></li>
  </ul>`;

const FOOTER = `<footer>
  <div class="foot-logo"><img src="/assets/brand/redt-logo-black.png" alt="redT Homes"></div>
  ${FOOT_SOCIAL}
  <ul class="foot-links">
    <li>&copy; 2026 redT Homes</li>
    <li><a href="/privacy/index.html">Privacy</a></li>
    <li><a href="/careers/index.html">Careers</a></li>
    <li><a href="/#contact">Contact</a></li>
  </ul>
</footer>`;

function pageShell({ title, metaDesc, canonical, bodyHtml, jsonLd, ogImage, ogType }) {
  const image = ogImage || `${SITE_URL}/assets/images/hero-st-paul.jpg`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RC3LB22WHK"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag("js", new Date());

  gtag("config", "G-RC3LB22WHK");
</script>
<!-- Start of HubSpot Embed Code -->
<script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/43826586.js"></script>
<!-- End of HubSpot Embed Code -->
<title>${escapeHtml(title)}</title>
<link rel="icon" type="image/png" href="/assets/brand/redt-logo-icon.png">
<meta name="description" content="${escapeHtml(metaDesc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType || "website"}">
<meta property="og:site_name" content="redT Homes">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(metaDesc)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css">
<noscript><style>.reveal { opacity: 1 !important; transform: none !important; }</style></noscript>
${jsonLd || ""}
</head>
<body>

${NAV}

${bodyHtml}

${FOOTER}

<script src="/assets/js/main.js"></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Homepage teaser card
// ---------------------------------------------------------------------------

function firstImage(html) {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function blogCard(post, linkPrefix) {
  const dateLine = post.category ? `${escapeHtml(post.category)} &middot; ${formatDate(post.date)}` : formatDate(post.date);
  const img = firstImage(post.content);
  const photo = img
    ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(post.title)}" loading="lazy">`
    : `<img class="blog-photo-fallback" src="${linkPrefix}assets/brand/redt-logo-icon.png" alt="redT Homes" loading="lazy">`;
  return `    <a class="blog-card" href="${linkPrefix}blog/${post.slug}.html">
      <div class="blog-photo">${photo}</div>
      <div class="blog-card-body">
        <div class="blog-date">${dateLine}</div>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
        <span class="blog-read-more">Read More <span class="arrow">&rarr;</span></span>
      </div>
    </a>`;
}

function postJsonLd(post, url, img) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date.slice(0, 10),
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "redT Homes", logo: { "@type": "ImageObject", url: `${SITE_URL}/assets/brand/redt-logo-icon.png` } },
    mainEntityOfPage: url,
    url,
    image: img ? [img] : undefined,
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog/index.html` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>\n<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
}

function updateHomepageBlogTeaser(posts) {
  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const latest = posts.slice(0, 3);
  const cards = latest.map((p) => blogCard(p, "/")).join("\n");
  const block = `<!-- BLOG:START (auto-generated by build-blog.js from data/blog.json — do not hand-edit) -->\n${cards}\n    <!-- BLOG:END -->`;
  const re = /<!-- BLOG:START[\s\S]*?<!-- BLOG:END -->/;
  if (!re.test(html)) {
    throw new Error("Could not find BLOG:START / BLOG:END markers in index.html");
  }
  html = html.replace(re, block);
  fs.writeFileSync(indexPath, html);
}

// ---------------------------------------------------------------------------
// Blog index page
// ---------------------------------------------------------------------------

function blogIndexPage(posts) {
  const cards = posts.map((p) => blogCard(p, "/")).join("\n");
  const body = `<header class="page-header">
  <div class="breadcrumbs"><a href="/">Home</a> / Blog</div>
  <p class="eyebrow">From The Field</p>
  <h1>Insights on buying, building, and Colorado living.</h1>
</header>

<section class="section">
  <div class="blog-head">
    <h2>All Posts</h2>
    <div class="blog-search">
      <input type="search" id="blog-search-input" placeholder="Search posts&hellip;" aria-label="Search blog posts">
    </div>
  </div>
  <p class="blog-no-results" hidden>No posts match your search.</p>
  <div class="blog-grid" id="blog-grid">
${cards}
  </div>
</section>`;

  return pageShell({
    title: "Blog | redT Homes",
    metaDesc: "Insights on buying, building, and Colorado living from redT Homes.",
    canonical: `${SITE_URL}/blog/index.html`,
    bodyHtml: body,
  });
}

// ---------------------------------------------------------------------------
// Individual post page
// ---------------------------------------------------------------------------

function lazyLoadImages(html) {
  return html.replace(/<img((?:(?!loading=)[^>])*)>/gi, (match, attrs) => `<img${attrs.replace(/\s*\/\s*$/, "")} loading="lazy">`);
}

function postPage(post) {
  const url = `${SITE_URL}/blog/${post.slug}.html`;
  const metaLine = post.category
    ? `By ${escapeHtml(post.author)} &middot; ${formatDate(post.date)} &middot; ${escapeHtml(post.category)}`
    : `By ${escapeHtml(post.author)} &middot; ${formatDate(post.date)}`;
  const img = firstImage(post.content);
  const headerStyle = img
    ? ` style="background-image: linear-gradient(180deg, rgba(10,10,10,.55) 0%, rgba(10,10,10,.72) 100%), url('${img}'); background-size: cover; background-position: center;"`
    : "";
  const headerLogo = img ? "" : `<img class="page-header-logo" src="/assets/brand/redt-logo-white.png" alt="">`;
  const body = `<header class="page-header"${headerStyle}>
  ${headerLogo}
  <div class="breadcrumbs"><a href="/">Home</a> / <a href="/blog/index.html">Blog</a> / ${escapeHtml(post.title)}</div>
  <p class="eyebrow">${formatDate(post.date)}</p>
  <h1>${escapeHtml(post.title)}</h1>
</header>

<section class="section">
  <a href="/blog/index.html" class="blog-back-link">&larr; Back to Blog</a>
  <div class="post-body">
    <p class="post-meta">${metaLine}</p>
${lazyLoadImages(post.content)}
  </div>
</section>`;

  return pageShell({
    title: `${post.title} | redT Homes Blog`,
    metaDesc: post.excerpt,
    canonical: url,
    bodyHtml: body,
    jsonLd: postJsonLd(post, url, img),
    ogImage: img,
    ogType: "article",
  });
}

function main() {
  const posts = readJSON(path.join(ROOT, "data", "blog.json"))
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  for (const post of posts) {
    writeFile(path.join(ROOT, "blog", `${post.slug}.html`), postPage(post));
  }
  writeFile(path.join(ROOT, "blog", "index.html"), blogIndexPage(posts));
  updateHomepageBlogTeaser(posts);

  console.log(`Built ${posts.length} blog post page(s) + blog/index.html.`);
  console.log("Updated homepage blog teaser in index.html.");
}

main();
