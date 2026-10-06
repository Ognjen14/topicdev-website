(function () {
  var app = document.querySelector(".rr-app");
  if (!app) {
    return;
  }

  var shots = Array.prototype.slice.call(app.querySelectorAll(".rr-screen img"));
  var roll = app.querySelector(".rr-roll");
  var toast = app.querySelector(".rr-toast");
  var backdrop = document.querySelector(".rr-backdrop img");
  var current = 0;
  var toastTimer = null;
  var fadeTimer = null;

  var say = function (text) {
    window.clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add("is-on");
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-on");
    }, 2200);
  };

  var next = function () {
    shots[current].classList.remove("is-on");
    current = (current + 1) % shots.length;
    shots[current].classList.add("is-on");
    roll.classList.remove("is-spinning");
    void roll.offsetWidth;
    roll.classList.add("is-spinning");
    if (backdrop) {
      window.clearTimeout(fadeTimer);
      backdrop.classList.add("is-fading");
      fadeTimer = window.setTimeout(function () {
        backdrop.src = shots[current].getAttribute("src");
        backdrop.classList.remove("is-fading");
      }, 250);
    }
  };

  roll.addEventListener("click", function () {
    next();
    toast.classList.remove("is-on");
  });

  var arts = document.querySelectorAll(".rr-art");
  if (arts.length && "IntersectionObserver" in window) {
    document.body.classList.add("rr-ready");
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-in", entry.isIntersecting);
      });
    }, { threshold: 0.2 });
    arts.forEach(function (art) {
      watcher.observe(art);
    });
  }

  app.querySelectorAll("[data-say]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.hasAttribute("data-next")) {
        next();
      }
      say(button.getAttribute("data-say"));
    });
  });
})();
