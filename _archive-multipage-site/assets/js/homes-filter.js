/**
 * redT Homes — Homes for Sale filter/sort
 * Operates on the server-rendered .home-card elements already in the DOM
 * (see homes/index.html) so the page works and is fully indexable without JS;
 * this just adds client-side filtering/sorting on top.
 */
(function () {
  "use strict";

  var form = document.getElementById("home-filters");
  var grid = document.getElementById("homes-grid");
  var noResults = document.getElementById("no-results");
  var resultsCount = document.getElementById("results-count");
  if (!form || !grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".home-card"));

  function applyFilters() {
    var neighborhood = form.neighborhood.value;
    var status = form.status.value;
    var minBeds = parseInt(form.beds.value, 10) || 0;
    var maxPrice = parseInt(form.maxPrice.value, 10) || 0;
    var sort = form.sort.value;

    var visible = cards.filter(function (card) {
      if (neighborhood && card.dataset.neighborhood !== neighborhood) return false;
      if (status && card.dataset.status !== status) return false;
      if (minBeds && parseInt(card.dataset.beds, 10) < minBeds) return false;
      if (maxPrice && parseInt(card.dataset.price, 10) > maxPrice) return false;
      return true;
    });

    visible.sort(function (a, b) {
      if (sort === "price-asc") return parseInt(a.dataset.price, 10) - parseInt(b.dataset.price, 10);
      if (sort === "price-desc") return parseInt(b.dataset.price, 10) - parseInt(a.dataset.price, 10);
      if (sort === "beds-desc") return parseInt(b.dataset.beds, 10) - parseInt(a.dataset.beds, 10);
      return 0;
    });

    cards.forEach(function (card) { card.style.display = "none"; });
    visible.forEach(function (card) {
      card.style.display = "";
      grid.appendChild(card);
    });

    noResults.style.display = visible.length === 0 ? "" : "none";
    resultsCount.textContent = visible.length === cards.length
      ? cards.length + " homes"
      : visible.length + " of " + cards.length + " homes match your filters";
  }

  form.addEventListener("change", applyFilters);
  applyFilters();
})();
