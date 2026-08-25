#!/usr/bin/env node
/**
 * redT Homes — team generator (zero dependencies, Node's fs/path only)
 *
 * Reads data/team.json and:
 *   1. Writes the full roster to /team/index.html, grouped by department
 *   2. Regenerates the homepage "Who We Are" leadership teaser between the
 *      <!-- TEAM:START --> / <!-- TEAM:END --> markers in index.html
 *
 * Run with: node build-team.js
 *
 * To add/update a team member: edit data/team.json, then re-run this script.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE_URL = "https://www.redthomes.com";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeFile(outPath, contents) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents);
}

function firstSentence(bio) {
  if (!bio) return "";
  const m = bio.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : bio;
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

function pageShell({ title, metaDesc, canonical, bodyHtml }) {
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
<meta property="og:type" content="website">
<meta property="og:site_name" content="redT Homes">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE_URL}/assets/images/hero-st-paul.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(metaDesc)}">
<meta name="twitter:image" content="${SITE_URL}/assets/images/hero-st-paul.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css">
<noscript><style>.reveal { opacity: 1 !important; transform: none !important; }</style></noscript>
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
// Team member card
// ---------------------------------------------------------------------------

function teamCard(person, full) {
  const photo = person.photo
    ? `<img src="${escapeHtml(person.photo)}" alt="${escapeHtml(person.name)}" loading="lazy">`
    : "";
  const bioText = full ? person.bio : firstSentence(person.bio);
  const bioHtml = bioText ? `<p>${escapeHtml(bioText)}</p>` : "";
  const emailHtml = person.email
    ? `<a class="team-email" href="mailto:${escapeHtml(person.email)}">${escapeHtml(person.email)}</a>`
    : "";
  return `    <div class="team-card">
      <div class="team-avatar">${photo}</div>
      <h3>${escapeHtml(person.name)}</h3>
      <div class="team-role">${escapeHtml(person.role)}</div>
      ${emailHtml}
      ${bioHtml}
    </div>`;
}

// ---------------------------------------------------------------------------
// Homepage leadership teaser
// ---------------------------------------------------------------------------

function updateHomepageTeamTeaser(people) {
  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const leadership = people.filter((p) => p.department === "Leadership");
  const cards = leadership.map((p) => teamCard(p, false)).join("\n");
  const block = `<!-- TEAM:START (auto-generated by build-team.js from data/team.json — do not hand-edit) -->\n${cards}\n    <!-- TEAM:END -->`;
  const re = /<!-- TEAM:START[\s\S]*?<!-- TEAM:END -->/;
  if (!re.test(html)) {
    throw new Error("Could not find TEAM:START / TEAM:END markers in index.html");
  }
  html = html.replace(re, block);
  fs.writeFileSync(indexPath, html);
}

// ---------------------------------------------------------------------------
// Full team page
// ---------------------------------------------------------------------------

function teamPage(people) {
  const departments = [];
  people.forEach((p) => {
    if (!departments.includes(p.department)) departments.push(p.department);
  });

  const sections = departments
    .map((dept) => {
      const members = people.filter((p) => p.department === dept);
      const cards = members.map((p) => teamCard(p, true)).join("\n");
      return `  <div class="team-dept-head reveal"><h2>${escapeHtml(dept)}</h2></div>
  <div class="team-grid reveal" style="margin-bottom: 64px;">
${cards}
  </div>`;
    })
    .join("\n\n");

  const body = `<header class="page-header">
  <div class="breadcrumbs"><a href="/">Home</a> / Our Team</div>
  <p class="eyebrow">Who We Are</p>
  <h1>The people building redT Homes.</h1>
</header>

<section class="section">
${sections}
</section>`;

  return pageShell({
    title: "Our Team | redT Homes",
    metaDesc: "Meet the redT Homes team: leadership, sales, construction, finance, property management, and purchasing.",
    canonical: `${SITE_URL}/team/index.html`,
    bodyHtml: body,
  });
}

function main() {
  const people = readJSON(path.join(ROOT, "data", "team.json"));

  writeFile(path.join(ROOT, "team", "index.html"), teamPage(people));
  updateHomepageTeamTeaser(people);

  console.log(`Built team/index.html with ${people.length} team member(s).`);
  console.log("Updated homepage leadership teaser in index.html.");
}

main();
