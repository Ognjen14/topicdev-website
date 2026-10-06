(function () {
  var buttons = document.querySelectorAll(".filter");
  var cards = document.querySelectorAll(".app-card[data-category]");
  if (!buttons.length || !cards.length) {
    return;
  }

  function apply(category) {
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].setAttribute("aria-pressed", buttons[b].getAttribute("data-filter") === category ? "true" : "false");
    }
    for (var c = 0; c < cards.length; c++) {
      var categories = cards[c].getAttribute("data-category").split(" ");
      cards[c].hidden = category !== "all" && categories.indexOf(category) === -1;
    }
  }

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function () {
      apply(this.getAttribute("data-filter"));
    });
  }
})();
