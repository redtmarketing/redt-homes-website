(function () {
  "use strict";

  /* Nav background/shadow on scroll */
  var nav = document.getElementById("nav");
  function toggleNavScrolled() {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  }
  toggleNavScrolled();
  window.addEventListener("scroll", toggleNavScrolled, { passive: true });

  /* Mobile menu toggle */
  var toggle = document.getElementById("nav-toggle");
  var menu = document.getElementById("mobile-menu");
  toggle.addEventListener("click", function () {
    var isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  /* Scroll-reveal animations */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
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

  /* Carousel arrow buttons (homepage listings, listing-page photo thumbs, etc.) */
  document.querySelectorAll("[data-carousel-track]").forEach(function (track) {
    var group = track.closest("[data-carousel-group]") || document;
    var prevBtn = group.querySelector("[data-carousel-prev]");
    var nextBtn = group.querySelector("[data-carousel-next]");
    if (!prevBtn || !nextBtn) return;

    function scrollByItem(dir) {
      var item = track.querySelector(".listing-card, .gallery-thumb");
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 24;
      var itemWidth = item ? item.getBoundingClientRect().width : 320;
      track.scrollBy({ left: dir * (itemWidth + gap), behavior: "smooth" });
    }
    prevBtn.addEventListener("click", function () { scrollByItem(-1); });
    nextBtn.addEventListener("click", function () { scrollByItem(1); });

    function updateCarouselButtons() {
      var maxScroll = track.scrollWidth - track.clientWidth - 1;
      prevBtn.disabled = track.scrollLeft <= 0;
      nextBtn.disabled = track.scrollLeft >= maxScroll;
    }
    track.addEventListener("scroll", updateCarouselButtons, { passive: true });
    window.addEventListener("resize", updateCarouselButtons);
    updateCarouselButtons();
  });

  /* Property gallery: clicking a thumbnail swaps the main photo */
  document.querySelectorAll(".gallery-thumb").forEach(function (thumb) {
    thumb.addEventListener("click", function () {
      var mainImg = document.getElementById(thumb.getAttribute("data-gallery-target"));
      if (!mainImg) return;
      mainImg.src = thumb.getAttribute("data-src");
      var wrap = thumb.closest("[data-carousel-track]");
      if (wrap) {
        wrap.querySelectorAll(".gallery-thumb").forEach(function (t) { t.classList.remove("active"); });
      }
      thumb.classList.add("active");
    });
  });

  /* Community map (homepage only) */
  var mapEl = document.getElementById("community-map");
  if (mapEl && window.L && Array.isArray(window.REDT_COMMUNITIES)) {
    var communities = window.REDT_COMMUNITIES;
    var map = L.map("community-map", { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    var bounds = [];
    communities.forEach(function (c) {
      var icon = L.divIcon({
        className: "map-pin",
        html: '<span></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 16],
        popupAnchor: [0, -16],
      });
      var marker = L.marker([c.lat, c.lng], { icon: icon }).addTo(map);
      var homesLabel = c.count === 1 ? "1 home" : c.count + " homes";
      marker.bindPopup(
        '<div class="map-popup">' +
          "<strong>" + c.name + "</strong>" +
          '<span class="map-popup-loc">' + c.city + "</span>" +
          '<span class="map-popup-price">' + c.priceLabel + " &middot; " + homesLabel + "</span>" +
          '<a href="' + c.link + '">View Homes &rarr;</a>' +
        "</div>"
      );
      bounds.push([c.lat, c.lng]);
    });
    map.fitBounds(bounds, { padding: [30, 30] });

    /* Safety net: if the container's real size wasn't settled yet when
       fitBounds ran above, Leaflet can lock in a bogus zoom/center.
       Recompute once layout has definitely settled. */
    setTimeout(function () {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [30, 30] });
    }, 300);
  }

  /* Safety net: force-reveal anything still hidden after 2s, in case the
     observer never fires for some element (e.g. it's already in the
     viewport at load in a browser/edge-case that doesn't report that). */
  setTimeout(function () {
    document.querySelectorAll(".reveal:not(.in)").forEach(function (el) {
      el.classList.add("in");
    });
  }, 2000);

  document.querySelectorAll(".mortgage-calc").forEach(function (calc) {
    var price = Number(calc.getAttribute("data-price"));
    var downInput = calc.querySelector(".mc-down");
    var rateInput = calc.querySelector(".mc-rate");
    var termSelect = calc.querySelector(".mc-term");
    var output = calc.querySelector(".mc-output");

    function formatCurrency(n) {
      return "$" + Math.round(n).toLocaleString("en-US");
    }

    function recalc() {
      var downPct = Math.min(100, Math.max(0, Number(downInput.value) || 0));
      var annualRate = Math.max(0, Number(rateInput.value) || 0);
      var years = Number(termSelect.value) || 30;
      var principal = price * (1 - downPct / 100);
      var monthlyRate = annualRate / 100 / 12;
      var numPayments = years * 12;
      var payment;
      if (monthlyRate === 0) {
        payment = principal / numPayments;
      } else {
        var factor = Math.pow(1 + monthlyRate, numPayments);
        payment = (principal * monthlyRate * factor) / (factor - 1);
      }
      output.textContent = formatCurrency(payment) + "/mo";
    }

    [downInput, rateInput, termSelect].forEach(function (el) {
      el.addEventListener("input", recalc);
      el.addEventListener("change", recalc);
    });
    recalc();
  });

  var listingsFilters = document.getElementById("listings-filters");
  var listingsTrack = document.querySelector(".listings-track");
  if (listingsFilters && listingsTrack) {
    var listingCards = Array.prototype.slice.call(listingsTrack.querySelectorAll(".listing-card"));
    var listingsNoResults = document.querySelector(".listings-no-results");
    var statusSelect = document.getElementById("filter-status");
    var bedsSelect = document.getElementById("filter-beds");
    var priceSelect = document.getElementById("filter-price");
    var communitySelect = document.getElementById("filter-community");

    function applyListingFilters() {
      var status = statusSelect.value;
      var minBeds = bedsSelect.value ? Number(bedsSelect.value) : null;
      var community = communitySelect.value;
      var priceRange = priceSelect.value ? priceSelect.value.split("-") : null;
      var priceMin = priceRange && priceRange[0] ? Number(priceRange[0]) : null;
      var priceMax = priceRange && priceRange[1] ? Number(priceRange[1]) : null;

      var visibleCount = 0;
      listingCards.forEach(function (card) {
        var price = Number(card.getAttribute("data-price"));
        var beds = Number(card.getAttribute("data-beds"));
        var matches =
          (!status || card.getAttribute("data-status") === status) &&
          (minBeds === null || beds >= minBeds) &&
          (!community || card.getAttribute("data-community") === community) &&
          (priceMin === null || price >= priceMin) &&
          (priceMax === null || price < priceMax);
        card.style.display = matches ? "" : "none";
        if (matches) visibleCount++;
      });

      if (listingsNoResults) listingsNoResults.hidden = visibleCount > 0;
      listingsTrack.scrollLeft = 0;
      window.dispatchEvent(new Event("resize"));
    }

    [statusSelect, bedsSelect, priceSelect, communitySelect].forEach(function (select) {
      select.addEventListener("change", applyListingFilters);
    });

    var urlCommunity = new URLSearchParams(window.location.search).get("community");
    if (urlCommunity) {
      var hasOption = Array.prototype.some.call(communitySelect.options, function (opt) {
        return opt.value === urlCommunity;
      });
      if (hasOption) {
        communitySelect.value = urlCommunity;
        applyListingFilters();
      }
    }
  }

  var blogSearchInput = document.getElementById("blog-search-input");
  var blogGrid = document.getElementById("blog-grid");
  if (blogSearchInput && blogGrid) {
    var blogCards = Array.prototype.slice.call(blogGrid.querySelectorAll(".blog-card"));
    var blogNoResults = document.querySelector(".blog-no-results");
    blogSearchInput.addEventListener("input", function () {
      var query = blogSearchInput.value.trim().toLowerCase();
      var visibleCount = 0;
      blogCards.forEach(function (card) {
        var matches = !query || card.textContent.toLowerCase().indexOf(query) !== -1;
        card.style.display = matches ? "" : "none";
        if (matches) visibleCount++;
      });
      if (blogNoResults) blogNoResults.hidden = visibleCount > 0;
    });
  }

  /* Request Info popup (site-wide, auto-opens once per session), personalized
     with the sales rep's photo so there's a face on the ask. Her photo is also
     dropped into the existing nav "Get In Touch" button (see below) rather than
     living in a second, separate nav CTA. */
  var POPUP_SESSION_KEY = "redtRequestInfoDismissed";
  var POPUP_DELAY_MS = 8000;
  var POPUP_PORTAL_ID = "43826586";
  var POPUP_FORM_ID = "842f4b38-365d-4e9d-92dd-4714c86b587b";
  var REP_PHOTO = "/assets/images/wp-import/2026/05/Sammantha-image-1024x683.jpg";
  var REP_NAME = "Sammantha Drake";
  var REP_ROLE = "Senior Sales Associate";

  var popupOverlay = document.createElement("div");
  popupOverlay.className = "popup-overlay";
  popupOverlay.setAttribute("hidden", "");
  popupOverlay.innerHTML =
    '<div class="popup-modal" role="dialog" aria-modal="true" aria-labelledby="popup-title">' +
      '<button class="popup-close" type="button" aria-label="Close">&times;</button>' +
      '<div class="popup-person">' +
        '<div class="popup-person-photo"><img src="' + REP_PHOTO + '" alt="' + REP_NAME + '"></div>' +
        '<div><div class="popup-person-name">' + REP_NAME + '</div><div class="popup-person-role">' + REP_ROLE + '</div></div>' +
      '</div>' +
      '<p class="eyebrow">Let’s Connect</p>' +
      '<h3 id="popup-title">Have Questions? Let’s Talk.</h3>' +
      '<p class="popup-copy">Tell us a bit about what you’re looking for and our team will follow up.</p>' +
      '<div class="hubspot-form"><div id="hubspotForm-popup"></div></div>' +
    "</div>";
  document.body.appendChild(popupOverlay);

  var popupCloseBtn = popupOverlay.querySelector(".popup-close");
  var popupFormLoaded = false;

  function dismissPopup() {
    popupOverlay.classList.remove("open");
    sessionStorage.setItem(POPUP_SESSION_KEY, "1");
    setTimeout(function () { popupOverlay.setAttribute("hidden", ""); }, 300);
  }

  function ensureHubspotForms(callback) {
    if (window.hbspt) { callback(); return; }
    window.__hbsptCallbacks = window.__hbsptCallbacks || [];
    window.__hbsptCallbacks.push(callback);
    if (window.__hbsptLoading) return;
    window.__hbsptLoading = true;
    var script = document.createElement("script");
    script.src = "https://js.hsforms.net/forms/embed/v2.js";
    script.onload = function () {
      window.__hbsptCallbacks.forEach(function (fn) { fn(); });
      window.__hbsptCallbacks = [];
    };
    document.head.appendChild(script);
  }

  function openPopup() {
    popupOverlay.removeAttribute("hidden");
    popupOverlay.offsetHeight; /* force reflow so the opacity transition runs */
    popupOverlay.classList.add("open");
    if (!popupFormLoaded) {
      popupFormLoaded = true;
      ensureHubspotForms(function () {
        window.hbspt.forms.create({
          portalId: POPUP_PORTAL_ID,
          formId: POPUP_FORM_ID,
          target: "#hubspotForm-popup"
        });
      });
    }
  }

  popupCloseBtn.addEventListener("click", dismissPopup);
  popupOverlay.addEventListener("click", function (e) {
    if (e.target === popupOverlay) dismissPopup();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && popupOverlay.classList.contains("open")) dismissPopup();
  });

  /* Auto-open once per session. */
  if (!sessionStorage.getItem(POPUP_SESSION_KEY)) {
    setTimeout(openPopup, POPUP_DELAY_MS);
  }

  /* Drop the rep's photo into the existing nav "Get In Touch" button on every
     page (same markup on every template, so this doesn't need to be
     hand-added to 190+ pages) instead of adding a second, separate nav CTA.
     This only decorates the button — its href/click behavior is untouched,
     since on listing pages it correctly points at that property's own
     inquiry form (#tour), not this generic popup. */
  document.querySelectorAll(".nav-right > .btn.btn-primary").forEach(function (btn) {
    var avatar = document.createElement("span");
    avatar.className = "btn-avatar";
    avatar.innerHTML = '<img src="' + REP_PHOTO + '" alt="">';
    btn.insertBefore(avatar, btn.firstChild);
    btn.setAttribute("aria-label", btn.textContent.trim() + " with " + REP_NAME);
  });

  /* Fire a GA4 generate_lead event on every successful HubSpot form
     submission, sitewide. HubSpot's embedded form iframe posts this message
     to the parent window no matter which form/page/portal embedded it, so
     one listener here covers the contact form, every listing inquiry form,
     careers, and the popup — instead of wiring an onFormSubmitted callback
     into each hbspt.forms.create() call across 190+ pages. */
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "hsFormCallback" || event.data.eventName !== "onFormSubmitted") return;
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "generate_lead", {
      form_id: event.data.id,
      page_location: window.location.href
    });
  });
})();
