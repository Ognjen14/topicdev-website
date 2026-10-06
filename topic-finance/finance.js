(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var arts = document.querySelectorAll(".tf-art, .tf-hello");

  if ("IntersectionObserver" in window) {
    document.body.classList.add("tf-ready");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-in", entry.isIntersecting);
      });
    }, { threshold: 0.2 });
    arts.forEach(function (art) {
      observer.observe(art);
    });
  }

  var hello = document.querySelector("[data-hello]");
  if (hello && !reduced) {
    var words = ["Hello", "Hola", "Bonjour", "Hallo", "Ciao", "Olá", "Привет", "你好", "こんにちは", "안녕하세요", "مرحبا", "नमस्ते", "Merhaba", "Cześć", "Zdravo", "Hej"];
    var index = 0;
    var bubble = hello.parentElement;
    window.setInterval(function () {
      if (document.body.classList.contains("tf-ready") && !bubble.classList.contains("is-in")) {
        return;
      }
      hello.classList.add("is-out");
      window.setTimeout(function () {
        index = (index + 1) % words.length;
        hello.textContent = words[index];
        hello.classList.remove("is-out");
      }, 250);
    }, 1600);
  }
})();
