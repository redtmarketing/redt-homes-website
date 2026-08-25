/**
 * redT Homes — shared site JS (vanilla, no dependencies)
 * Loaded on every page via partials/footer.html.
 */
(function () {
  "use strict";

  /* Mobile nav toggle */
  var toggle = document.getElementById("mobile-nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  /* Transparent-over-hero header: only on pages where the hero is the first
     thing in <main>, so interior pages without a hero stay solid. */
  var mainEl = document.getElementById("main");
  var header = document.querySelector(".site-header");
  if (mainEl && header && mainEl.firstElementChild && mainEl.firstElementChild.classList.contains("hero")) {
    header.classList.add("has-hero");
    var toggleScrolled = function () {
      header.classList.toggle("scrolled", window.scrollY > 40);
    };
    toggleScrolled();
    window.addEventListener("scroll", toggleScrolled, { passive: true });
  }

  /* Highlight the current page in the header/mobile nav */
  var currentPath = window.location.pathname.replace(/index\.html$/, "").replace(/(.)\/$/, "$1") || "/";
  document.querySelectorAll(".main-nav a, .mobile-nav a").forEach(function (link) {
    var linkPath = link.getAttribute("href");
    if (!linkPath || linkPath.indexOf("#") !== -1) return;
    linkPath = linkPath.replace(/(.)\/$/, "$1") || "/";
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });

  /* Footer copyright year */
  var yearEl = document.getElementById("copyright-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Native lazy-loading fallback: ensure every content image has loading="lazy"
     unless explicitly marked eager (e.g. LCP hero images). */
  document.querySelectorAll("img:not([loading])").forEach(function (img) {
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
  });

  /* Fade-up reveal for elements marked .reveal as they scroll into view */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
})();
