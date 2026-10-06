/* Luxury Home Tour promo (Sat Oct 10, 2026, 11 AM–3 PM MT).
   Loaded on every page by main.js, and directly by /luxury-home-tour/.
   Everything tour-related lives here + tour-promo.css so it can be removed
   in one go after the event. It switches itself off at 3 PM on tour day:
   - sitewide banner with countdown (not on the map page itself)
   - sticky "Map" pill on phones (not on the map page itself)
   - fills any [data-tour-cal] with Google / Apple+Outlook calendar links
   - hides the homepage #luxury-tour section once the tour is over
   Preview any moment with ?tour_now=2026-10-10T18:00:00Z */
(function () {
  "use strict";

  var START = Date.parse("2026-10-10T17:00:00Z"); /* 11 AM MDT */
  var END = Date.parse("2026-10-10T21:00:00Z");   /* 3 PM MDT */
  var MAP_URL = "/luxury-home-tour/";
  var BLOG_URL = "/blog/denver-luxury-home-tour-2026.html";
  var DISMISS_KEY = "redtTourBarDismissed";

  var override = new URLSearchParams(window.location.search).get("tour_now");
  var now = override && !isNaN(Date.parse(override)) ? Date.parse(override) : Date.now();
  var isMapPage = window.location.pathname.indexOf(MAP_URL) === 0;
  /* Banner goes to the blog post (details + FAQs); on the post itself it points to the map. */
  var isBlogPost = window.location.pathname.indexOf(BLOG_URL.replace(".html", "")) === 0;
  var barHref = isBlogPost ? MAP_URL : BLOG_URL;
  var barCta = isBlogPost ? "See the map" : "Tour details";

  function track(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  }

  function store(method, key, value) {
    try { return window.localStorage[method](key, value); } catch (e) { return null; }
  }

  if (now >= END) {
    var section = document.getElementById("luxury-tour");
    if (section) section.hidden = true;
    return;
  }

  if (!document.querySelector('link[href="/assets/css/tour-promo.css"]')) {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/assets/css/tour-promo.css";
    document.head.appendChild(css);
  }

  /* Countdown label, by Denver calendar day so "Tomorrow" flips at midnight MT. */
  function denverDayNumber(ms) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver", year: "numeric", month: "numeric", day: "numeric"
    }).formatToParts(new Date(ms));
    var get = function (t) { return Number(parts.filter(function (p) { return p.type === t; })[0].value); };
    return Date.UTC(get("year"), get("month") - 1, get("day")) / 864e5;
  }
  var daysAway = Math.round(denverDayNumber(START) - denverDayNumber(now));
  var isLive = now >= START;
  var pill = isLive ? "Happening now" : daysAway <= 0 ? "Today" : daysAway === 1 ? "Tomorrow" : daysAway + " days away";
  var when = isLive ? "Open until 3 PM today" : daysAway <= 0 ? "Today, 11 AM–3 PM" : "Sat Oct 10, 11 AM–3 PM";

  document.querySelectorAll("[data-tour-pill]").forEach(function (el) {
    el.textContent = pill;
    el.classList.toggle("is-live", isLive);
  });

  /* Calendar links */
  var STOPS = [
    "2442 S Saint Paul Street", "2370 S Columbine Street", "2339 S Saint Paul Street",
    "2070 S Saint Paul Street", "2175 S Monroe Street", "3640 E Warren Avenue",
    "2635 S Garfield Way", "2451 S Adams Street"
  ];
  var calTitle = "Luxury Home Tour (free)";
  var calDetails = "8 luxury homes open 11 AM–3 PM. Tour map with directions: https://www.redthomes.com/luxury-home-tour/\n\n" +
    STOPS.map(function (s) { return s + ", Denver, CO"; }).join("\n") +
    "\n\nSign in at 3 or more homes to enter the giveaway.";
  var googleCal = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(calTitle) +
    "&dates=20261010T170000Z/20261010T210000Z" +
    "&details=" + encodeURIComponent(calDetails) +
    "&location=" + encodeURIComponent("Denver, CO (see tour map)");

  document.querySelectorAll("[data-tour-cal]").forEach(function (box) {
    var where = box.getAttribute("data-tour-cal") || "page";
    box.innerHTML =
      '<details class="tour-cal">' +
        '<summary>Add to calendar</summary>' +
        '<div class="tour-cal-menu">' +
          '<a href="' + googleCal + '" target="_blank" rel="noopener" data-cal="google">Google Calendar</a>' +
          '<a href="/luxury-home-tour/luxury-home-tour.ics" download data-cal="ics">Apple / Outlook (.ics)</a>' +
        "</div>" +
      "</details>";
    box.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        track("tour_add_to_calendar", { calendar: a.getAttribute("data-cal"), placement: where });
      });
    });
  });

  document.addEventListener("click", function (e) {
    document.querySelectorAll(".tour-cal[open]").forEach(function (d) {
      if (!d.contains(e.target)) d.removeAttribute("open");
    });
  });

  /* The map page is the destination; it doesn't need the banner or pill. */
  if (isMapPage || store("getItem", DISMISS_KEY) === "1") return;

  /* Sitewide banner */
  var bar = document.createElement("div");
  bar.className = "tour-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Luxury Home Tour announcement");
  bar.innerHTML =
    '<a class="tour-bar-link" href="' + barHref + '">' +
      '<span class="tour-bar-title">Luxury Home Tour</span>' +
      '<span class="tour-bar-sep" aria-hidden="true">|</span>' +
      '<span class="tour-bar-details">Free &middot; ' + when + ' &middot; 8 homes</span>' +
      '<span class="tour-bar-short">' + (isLive ? "Open until 3 PM" : "Sat Oct 10 &middot; 11–3") + "</span>" +
      '<span class="tour-bar-pill' + (isLive ? " is-live" : "") + '">' + pill + "</span>" +
      '<span class="tour-bar-cta">' + barCta + ' &rarr;</span>' +
    "</a>" +
    '<button class="tour-bar-close" type="button" aria-label="Hide tour announcement">&times;</button>';
  document.body.insertBefore(bar, document.body.firstChild);
  document.body.classList.add("has-tour-bar");

  function syncBarHeight() {
    document.documentElement.style.setProperty("--tour-bar-h", bar.offsetHeight + "px");
  }
  syncBarHeight();
  window.addEventListener("resize", syncBarHeight);

  bar.querySelector(".tour-bar-link").addEventListener("click", function () {
    track("tour_banner_click", { countdown: pill });
  });

  /* Sticky pill on phones */
  var sticky = document.createElement("a");
  sticky.className = "tour-sticky";
  sticky.href = MAP_URL;
  sticky.innerHTML = (isLive ? "Tour open now" : "Home Tour " + (daysAway <= 0 ? "today" : "Sat") + " 11–3") +
    ' <span>Map &rarr;</span>';
  document.body.appendChild(sticky);
  sticky.addEventListener("click", function () { track("tour_sticky_click", { countdown: pill }); });

  var homeSection = document.getElementById("luxury-tour");
  var sectionInView = false;
  if (homeSection && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      sectionInView = entries[0].isIntersecting;
      updateSticky();
    }).observe(homeSection);
  }
  var mobileMenu = document.getElementById("mobile-menu");
  function updateSticky() {
    var menuOpen = mobileMenu && mobileMenu.classList.contains("open");
    sticky.classList.toggle("show", window.scrollY > 500 && !sectionInView && !menuOpen);
  }
  window.addEventListener("scroll", updateSticky, { passive: true });
  var navToggle = document.getElementById("nav-toggle");
  if (navToggle) navToggle.addEventListener("click", function () { setTimeout(updateSticky, 0); });
  updateSticky();

  bar.querySelector(".tour-bar-close").addEventListener("click", function () {
    store("setItem", DISMISS_KEY, "1");
    bar.remove();
    sticky.remove();
    document.body.classList.remove("has-tour-bar");
    track("tour_banner_dismiss", { countdown: pill });
  });
})();
