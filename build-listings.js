#!/usr/bin/env node
/**
 * redT Homes — listings generator (zero dependencies, Node's fs/path only)
 *
 * Reads data/listings.json and:
 *   1. Writes one page per listing to /listings/<slug>.html
 *   2. Regenerates the homepage carousel between the
 *      <!-- LISTINGS:START --> / <!-- LISTINGS:END --> markers in index.html
 *
 * Run with: node build-listings.js
 *
 * To add/update a listing: edit data/listings.json, then re-run this script.
 * Each listing needs a hubspotFormId once you have it (see
 * HUBSPOT-MLS-INTEGRATION.md) — leave it "" until then; the generated page
 * will keep the placeholder comment instead of a live embed.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SITE_URL = "https://www.redthomes.com";
const HUBSPOT_PORTAL_ID = "43826586";
const PLACEHOLDER_HERO = "";

const DEFAULT_MORTGAGE_RATE = 6.5;
function loadMortgageRate() {
  const p = path.join(ROOT, "data", "mortgage-rate.json");
  if (!fs.existsSync(p)) return DEFAULT_MORTGAGE_RATE;
  try {
    const rate = Number(JSON.parse(fs.readFileSync(p, "utf8")).rate);
    return Number.isFinite(rate) ? rate : DEFAULT_MORTGAGE_RATE;
  } catch {
    return DEFAULT_MORTGAGE_RATE;
  }
}
const MORTGAGE_RATE = loadMortgageRate();

const FOOT_SOCIAL = `<ul class="foot-social">
    <li><a href="https://www.facebook.com/redTDenver" target="_blank" rel="noopener" aria-label="redT Homes on Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.5 9.9v-7H7.9V12h2.6V9.8c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6V12h2.9l-.5 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg></a></li>
    <li><a href="https://www.instagram.com/redthomes/" target="_blank" rel="noopener" aria-label="redT Homes on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a></li>
    <li><a href="https://www.linkedin.com/company/redt-homes/" target="_blank" rel="noopener" aria-label="redT Homes on LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5V9h3zM6.5 7.7A1.7 1.7 0 1 1 6.5 4.3a1.7 1.7 0 0 1 0 3.4zM19 19h-3v-5.3c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V19H9V9h2.9v1.4h0a3.1 3.1 0 0 1 2.8-1.6c3 0 3.5 2 3.5 4.5z"/></svg></a></li>
    <li><a href="https://www.tiktok.com/@redt_homes" target="_blank" rel="noopener" aria-label="redT Homes on TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2h-3v13.5a2.5 2.5 0 1 1-2.5-2.5c.2 0 .5 0 .7.1v-3a5.5 5.5 0 1 0 4.8 5.4V8.6a7.3 7.3 0 0 0 4.5 1.5v-3a4.3 4.3 0 0 1-4.5-4.2z"/></svg></a></li>
    <li><a href="https://x.com/redTHomes" target="_blank" rel="noopener" aria-label="redT Homes on X"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.2 8.3L23 22h-6.6l-5.2-6.8L5.2 22H2l7.7-8.8L1 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 4H5.5l12.2 16z"/></svg></a></li>
    <li><a href="https://www.youtube.com/@redt_homes" target="_blank" rel="noopener" aria-label="redT Homes on YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.6-.5-5.3c-.3-1-1-1.8-2-2C18.9 4.2 12 4.2 12 4.2s-6.9 0-8.5.5c-1 .3-1.8 1-2 2C1 8.4 1 12 1 12s0 3.6.5 5.3c.3 1 1 1.7 2 2 1.6.5 8.5.5 8.5.5s6.9 0 8.5-.5c1-.3 1.7-1 2-2 .5-1.7.5-5.3.5-5.3zM9.8 15.5V8.5l6.4 3.5-6.4 3.5z"/></svg></a></li>
  </ul>`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatPrice(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

function locLine(listing) {
  return listing.community ? `${listing.community}, ${listing.city}, CO` : `${listing.city}, CO`;
}

function availabilitySchema(status) {
  return status === "Move-in Ready" ? "https://schema.org/InStock" : "https://schema.org/PreOrder";
}

function listingJsonLd(listing, url, metaDesc) {
  const images = listing.heroImage ? [listing.heroImage, ...(listing.galleryImages || [])] : [];
  const data = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    url,
    name: `${listing.address}, ${listing.city}, CO`,
    description: metaDesc,
    image: images.map((src) => `${SITE_URL}${src}`),
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: "CO",
      addressCountry: "US",
    },
    numberOfBedrooms: Number(listing.beds) || undefined,
    numberOfBathroomsTotal: Number(listing.baths) || undefined,
    floorSize: listing.sqft
      ? { "@type": "QuantitativeValue", value: Number(String(listing.sqft).replace(/,/g, "")), unitCode: "FTK" }
      : undefined,
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "USD",
      availability: availabilitySchema(listing.status),
      url,
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Listings", item: `${SITE_URL}/#listings` },
      { "@type": "ListItem", position: 3, name: listing.address, item: url },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>\n<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeFile(outPath, contents) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents);
}

function descriptionHtml(listing) {
  const escaped = escapeHtml(listing.description);
  if (listing.matrixUrl && escaped.includes("Supplements")) {
    return escaped.replace("Supplements", `<a href="${escapeHtml(listing.matrixUrl)}" target="_blank" rel="noopener">Supplements</a>`);
  }
  return escaped;
}

function aboutLabel(propertyType) {
  if (propertyType === "Townhome") return "Townhome";
  if (propertyType === "Land") return "Property";
  return "Home";
}

function specsBlock(listing) {
  const specs = [
    [listing.beds, "Bedrooms"],
    [listing.baths, "Bathrooms"],
    [listing.sqft, "Sq Ft"],
    [listing.garages, "Garage"],
    [listing.yearBuilt, "Year Built"],
  ].filter(([value]) => value);
  if (!specs.length) return "";
  const items = specs.map(([value, label]) => `        <div><div class="spec-num">${escapeHtml(value)}</div><div class="spec-label">${label}</div></div>`).join("\n");
  return `      <div class="property-specs">\n${items}\n      </div>`;
}

function mortgageWidget(listing) {
  return `      <div class="mortgage-calc" data-price="${listing.price}">
        <h3 class="form-heading">Estimate Your Payment</h3>
        <div class="form-row">
          <label for="mc-down-${listing.slug}">Down Payment</label>
          <div class="mortgage-input-group">
            <input type="number" id="mc-down-${listing.slug}" class="mc-down" value="20" min="0" max="100" step="1"><span>%</span>
          </div>
        </div>
        <div class="form-row">
          <label for="mc-rate-${listing.slug}">Interest Rate</label>
          <div class="mortgage-input-group">
            <input type="number" id="mc-rate-${listing.slug}" class="mc-rate" value="${MORTGAGE_RATE}" min="0" max="20" step="0.125"><span>%</span>
          </div>
        </div>
        <div class="form-row">
          <label for="mc-term-${listing.slug}">Loan Term</label>
          <select id="mc-term-${listing.slug}" class="mc-term">
            <option value="30">30 years</option>
            <option value="15">15 years</option>
          </select>
        </div>
        <div class="mortgage-result">
          <div class="mortgage-result-label">Estimated Monthly Payment</div>
          <div class="mortgage-result-value mc-output">&mdash;</div>
          <p class="mortgage-result-sub">Principal &amp; interest only &mdash; excludes taxes, insurance, HOA dues, and PMI. This is an estimate for planning purposes, not a loan offer or rate quote.</p>
        </div>
      </div>`;
}

// ---------------------------------------------------------------------------
// Homepage carousel card
// ---------------------------------------------------------------------------

function carouselCard(listing) {
  const price = formatPrice(listing.price);
  const loc = locLine(listing);
  return `    <a class="listing-card" href="/listings/${listing.slug}.html" data-price="${listing.price}" data-beds="${Number(listing.beds) || 0}" data-status="${escapeHtml(listing.status)}" data-community="${escapeHtml(listing.community || "")}">
      <div class="listing-photo">${listing.heroImage ? `<img src="${listing.heroImage}" alt="${escapeHtml(listing.address)}" width="640" height="420" loading="lazy" decoding="async">` : ""}<span class="listing-tag">${escapeHtml(listing.status)}</span></div>
      <div class="listing-body">
        <div class="price">${price}</div>
        <div class="loc">${escapeHtml(loc)}</div>
        <div class="listing-meta"><span>${escapeHtml(listing.beds)} bd</span><span>${escapeHtml(listing.baths)} ba</span><span>${escapeHtml(listing.sqft)} sqft</span></div>
      </div>
    </a>`;
}

const STATUS_ORDER = { "Move-in Ready": 0, "Under Construction": 1 };

function sortForDisplay(listings) {
  return [...listings].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return a.price - b.price;
  });
}

function updateHomepageCarousel(listings) {
  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const cards = sortForDisplay(listings).map(carouselCard).join("\n");
  const block = `<!-- LISTINGS:START (auto-generated by build-listings.js from data/listings.json — do not hand-edit) -->\n${cards}\n    <!-- LISTINGS:END -->`;
  const re = /<!-- LISTINGS:START[\s\S]*?<!-- LISTINGS:END -->/;
  if (!re.test(html)) {
    throw new Error("Could not find LISTINGS:START / LISTINGS:END markers in index.html");
  }
  html = html.replace(re, block);

  const communities = [...new Set(listings.map((l) => l.community).filter(Boolean))].sort();
  const options = communities.map((c) => `      <option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("\n");
  const communityBlock = `<!-- LISTINGS-COMMUNITIES:START (auto-generated by build-listings.js — do not hand-edit) -->\n${options}\n      <!-- LISTINGS-COMMUNITIES:END -->`;
  const communityRe = /<!-- LISTINGS-COMMUNITIES:START[\s\S]*?<!-- LISTINGS-COMMUNITIES:END -->/;
  if (!communityRe.test(html)) {
    throw new Error("Could not find LISTINGS-COMMUNITIES:START / END markers in index.html");
  }
  html = html.replace(communityRe, communityBlock);

  fs.writeFileSync(indexPath, html);
}

// ---------------------------------------------------------------------------
// Individual listing page
// ---------------------------------------------------------------------------

function hubspotFormBlock(listing) {
  const price = formatPrice(listing.price);
  const loc = locLine(listing);
  const url = `${SITE_URL}/listings/${listing.slug}.html`;

  if (listing.hubspotFormId && /^https?:\/\//i.test(listing.hubspotFormId)) {
    return `      <h3 class="form-heading">Get In Touch</h3>
      <a class="btn btn-dark" style="width: 100%; justify-content: center;" href="${escapeHtml(listing.hubspotFormId)}" target="_blank" rel="noopener">Inquire About This Property</a>
      <!-- This listing's spreadsheet "HubSpot Form ID" is a hosted-form share link, not a
           form UUID, so it can't be embedded via hbspt.forms.create(). Linking out to it
           instead. Swap in a real form UUID here once one exists. -->`;
  }

  if (listing.hubspotFormId) {
    return `      <h3 class="form-heading">Get In Touch</h3>
      <div class="hubspot-form">
      <div id="hubspotForm-${listing.slug}"></div>
      </div>
      <script src="https://js.hsforms.net/forms/embed/v2.js"></script>
      <script>
        hbspt.forms.create({
          portalId: "${HUBSPOT_PORTAL_ID}",
          formId: "${listing.hubspotFormId}",
          target: "#hubspotForm-${listing.slug}",
          onFormReady: function ($form) {
            var formEl = ($form && $form.get) ? $form.get(0) : ($form && $form[0]) || $form;
            function setHiddenValue(name, value) {
              var el = formEl.querySelector('input[name="' + name + '"]');
              if (el) el.value = value;
            }
            setHiddenValue("listing_id", "${listing.slug}");
            setHiddenValue("listing_mls_id", "${listing.mlsId}");
            setHiddenValue("listing_address", "${listing.address}, ${loc}");
            setHiddenValue("listing_price", "${price}");
            setHiddenValue("listing_status", "${listing.status}");
            setHiddenValue("listing_url", "${url}");
          }
        });
      </script>
      <!-- See HUBSPOT-MLS-INTEGRATION.md for the one-time hidden-field setup this depends on. -->`;
  }

  return `      <h3 class="form-heading">Get In Touch</h3>
      <form onsubmit="return false;">
        <div class="form-row">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required>
        </div>
        <div class="form-row">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-row">
          <label for="phone">Phone</label>
          <input type="tel" id="phone" name="phone">
        </div>
        <div class="form-row">
          <label for="message">Message</label>
          <textarea id="message" name="message" placeholder="Tell us what you're looking for..."></textarea>
        </div>

        <!--
          HUBSPOT FORM PLACEHOLDER — still need this property's HubSpot form
          UUID. Once data/listings.json has it, re-run build-listings.js and
          this page will switch to the live embed automatically.
        -->
        <input type="hidden" name="listing_id" value="${listing.slug}">
        <input type="hidden" name="listing_mls_id" value="${escapeHtml(listing.mlsId)}">
        <input type="hidden" name="listing_address" value="${escapeHtml(listing.address)}, ${escapeHtml(loc)}">
        <input type="hidden" name="listing_price" value="${price}">
        <input type="hidden" name="listing_status" value="${escapeHtml(listing.status)}">
        <input type="hidden" name="listing_url" value="${url}">

        <button type="submit" class="btn btn-dark" style="width: 100%; justify-content: center;">Get In Touch</button>
      </form>`;
}

function listingPage(listing) {
  const price = formatPrice(listing.price);
  const loc = locLine(listing);
  const url = `${SITE_URL}/listings/${listing.slug}.html`;
  const title = `${listing.address}, ${listing.city} | redT Homes`;
  const bedsBath = listing.beds && listing.baths ? `${listing.beds} bed, ${listing.baths} bath ` : "";
  const statusWord = listing.status.toLowerCase();
  const typeWord = listing.propertyType.toLowerCase();
  const statusType = statusWord === typeWord ? typeWord : `${statusWord} ${typeWord}`;
  const metaDesc = `${bedsBath}${statusType} at ${listing.address}, ${loc}. ${price}. Schedule a tour with redT Homes.`;
  const allPhotos = listing.heroImage ? [listing.heroImage, ...(listing.galleryImages || [])] : [];
  const gallery = allPhotos.length
    ? `<div class="gallery-main"><img id="gallery-main-${listing.slug}" src="${allPhotos[0]}" alt="${escapeHtml(listing.address)}"></div>
      <div class="gallery-thumbs-wrap" data-carousel-group>
        <button type="button" class="carousel-btn" data-carousel-prev aria-label="Previous photo">
          <svg viewBox="0 0 24 24" fill="none"><path d="M15 5L8 12L15 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="gallery-thumbs" data-carousel-track>
          ${allPhotos
            .map(
              (src, i) =>
                `<button type="button" class="gallery-thumb${i === 0 ? " active" : ""}" data-gallery-target="gallery-main-${listing.slug}" data-src="${src}"><img src="${src}" alt="${escapeHtml(listing.address)}" loading="lazy"></button>`
            )
            .join("\n          ")}
        </div>
        <button type="button" class="carousel-btn" data-carousel-next aria-label="Next photo">
          <svg viewBox="0 0 24 24" fill="none"><path d="M9 5L16 12L9 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`
    : `<div class="gallery-main"></div>`;

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
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="redT Homes">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(metaDesc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${listing.heroImage ? SITE_URL + listing.heroImage : SITE_URL + "/assets/images/hero-st-paul.jpg"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(metaDesc)}">
<meta name="twitter:image" content="${listing.heroImage ? SITE_URL + listing.heroImage : SITE_URL + "/assets/images/hero-st-paul.jpg"}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/styles.css">
<noscript><style>.reveal { opacity: 1 !important; transform: none !important; }</style></noscript>
${listingJsonLd(listing, url, metaDesc)}
</head>
<body>

<nav class="nav" id="nav">
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
    <a href="#tour" class="btn btn-primary" style="padding: 12px 22px;">Get In Touch</a>
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
</div>

<header class="page-header"${listing.heroImage ? ` style="background-image: linear-gradient(180deg, rgba(10,10,10,.55) 0%, rgba(10,10,10,.72) 100%), url('${listing.heroImage}'); background-size: cover; background-position: center;"` : ""}>
  <div class="breadcrumbs"><a href="/">Home</a> / <a href="/#listings">Listings</a> / ${escapeHtml(listing.address)}</div>
  <p class="eyebrow">${escapeHtml(listing.status)}</p>
  <h1>${escapeHtml(listing.address)}</h1>
  <p class="loc">${escapeHtml(loc)}</p>
</header>

<section class="section">
  <div class="property-grid">
    <div>
      <div class="property-gallery">
        ${gallery}
      </div>

${specsBlock(listing)}

      <div class="property-body">
        <h2 style="font-size: 24px; margin-bottom: 16px;">About This ${aboutLabel(listing.propertyType)}</h2>
        <p>${descriptionHtml(listing)}</p>
        <p style="font-size: 13px; color: var(--grey);">MLS ID: ${escapeHtml(listing.mlsId)} &middot; ${escapeHtml(listing.propertyType)}</p>
      </div>

${mortgageWidget(listing)}
    </div>

    <aside class="property-sidebar" id="tour">
      <div class="price">${price}</div>
      <div class="loc">${escapeHtml(loc)}</div>

${hubspotFormBlock(listing)}
    </aside>
  </div>
</section>

<footer>
  <div class="foot-logo"><img src="/assets/brand/redt-logo-black.png" alt="redT Homes"></div>
  ${FOOT_SOCIAL}
  <ul class="foot-links">
    <li>&copy; 2026 redT Homes</li>
    <li><a href="/privacy/index.html">Privacy</a></li>
    <li><a href="/careers/index.html">Careers</a></li>
    <li><a href="/#contact">Contact</a></li>
  </ul>
</footer>

<script src="/assets/js/main.js"></script>
</body>
</html>
`;
}

function main() {
  const listings = readJSON(path.join(ROOT, "data", "listings.json"));
  const missingForms = [];

  for (const listing of listings) {
    writeFile(path.join(ROOT, "listings", `${listing.slug}.html`), listingPage(listing));
    if (!listing.hubspotFormId) missingForms.push(listing.slug);
  }

  updateHomepageCarousel(listings);

  console.log(`Built ${listings.length} listing page(s).`);
  console.log("Updated homepage carousel in index.html.");
  if (missingForms.length) {
    console.log(`\n${missingForms.length} listing(s) still need a HubSpot Form ID (placeholder left in place):`);
    missingForms.forEach((slug) => console.log("  - " + slug));
  }
}

main();
