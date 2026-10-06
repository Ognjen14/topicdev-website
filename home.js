(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var arts = document.querySelectorAll(".home .art, .home .featured-art");

  var number = function (scope) {
    scope.querySelectorAll(".k-line, .k-bar").forEach(function (el, i) {
      if (!el.style.getPropertyValue("--n")) {
        el.style.setProperty("--n", i);
      }
    });
  };

  document.querySelectorAll(".studio-art a").forEach(number);
  arts.forEach(number);

  arts.forEach(function (svg) {
    if (reduced && svg.pauseAnimations) {
      svg.pauseAnimations();
    }
  });

  if (reduced || !("IntersectionObserver" in window)) {
    return;
  }

  document.body.classList.add("home-ready");
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var svg = entry.target;
      svg.classList.toggle("is-in", entry.isIntersecting);
      if (svg.pauseAnimations) {
        if (entry.isIntersecting) {
          svg.unpauseAnimations();
        } else {
          svg.pauseAnimations();
        }
      }
    });
  }, { threshold: 0.15 });
  arts.forEach(function (svg) {
    observer.observe(svg);
  });
})();
