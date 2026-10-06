(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var keywords = /^(def|return|if|elif|else|for|while|in|import|from|class|as|with|try|except|finally|and|or|not|is|lambda|yield|pass|break|continue|True|False|None)$/;
  var builtins = /^(print|len|range|sorted|sum|min|max|list|dict|set|str|int|enumerate|zip|map|filter)$/;

  var escapeHtml = function (text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  var highlight = function (code) {
    var pattern = /(#.*$)|([fr]?"(?:[^"\\\n]|\\.)*"|[fr]?'(?:[^'\\\n]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b(\s*\()?/gm;
    var out = "";
    var last = 0;
    code.replace(pattern, function (match, comment, string, number, word, call, offset) {
      out += escapeHtml(code.slice(last, offset));
      last = offset + match.length;
      if (comment) {
        out += '<span class="co">' + escapeHtml(comment) + "</span>";
      } else if (string) {
        out += '<span class="st">' + escapeHtml(string) + "</span>";
      } else if (number) {
        out += '<span class="nu">' + number + "</span>";
      } else if (keywords.test(word)) {
        out += '<span class="kw">' + word + "</span>" + escapeHtml(call || "");
      } else if (call || builtins.test(word)) {
        out += '<span class="fn">' + word + "</span>" + escapeHtml(call || "");
      } else {
        out += escapeHtml(word);
      }
      return match;
    });
    return out + escapeHtml(code.slice(last));
  };

  document.querySelectorAll("[data-py]").forEach(function (block) {
    block.innerHTML = highlight(block.textContent);
  });

  var notebook = document.querySelector(".py-notebook");
  if (notebook && !reduced) {
    var cells = notebook.querySelectorAll(".py-cell");
    notebook.classList.add("is-armed");
    cells.forEach(function (cell, i) {
      window.setTimeout(function () {
        cell.classList.add("is-in");
      }, 250 + i * 450);
    });
  }

  var demo = document.getElementById("py-demo");
  var demoSteps = document.getElementById("py-demo-steps");
  if (demo && demoSteps && window.GuideDemo) {
    window.GuideDemo.mount(demo, JSON.parse(demoSteps.textContent), {
      highlight: highlight,
      codeClass: "py-code",
      kindPrefix: "# ",
      doneLabel: "# lesson complete",
      endHtml: document.getElementById("py-demo-end").innerHTML
    });
  }

  var qa = document.getElementById("py-qa");
  var qaItems = document.getElementById("py-qa-items");
  if (qa && qaItems && window.GuideQA) {
    window.GuideQA.mount(qa, JSON.parse(qaItems.textContent), {
      highlight: highlight,
      codeClass: "py-code",
      proLevels: ["medior", "senior"],
      proLabel: "Pro",
      masteredLabel: "# mastered"
    });
  }

  var anims = document.querySelectorAll(".py-anim");
  anims.forEach(function (svg) {
    if (reduced && svg.pauseAnimations) {
      svg.pauseAnimations();
    }
  });
  if (!reduced && anims.length && "IntersectionObserver" in window) {
    document.body.classList.add("py-ready");
    var watcher = new IntersectionObserver(function (entries) {
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
    anims.forEach(function (svg) {
      watcher.observe(svg);
    });
  }

  var tabs = document.querySelectorAll(".py-tab");
  var shot = document.querySelector(".py-phone img");
  if (tabs.length && shot) {
    var select = function (tab, focus) {
      tabs.forEach(function (other) {
        var on = other === tab;
        other.setAttribute("aria-selected", String(on));
        other.tabIndex = on ? 0 : -1;
      });
      if (focus) {
        tab.focus();
      }
      var src = tab.getAttribute("data-shot");
      if (shot.getAttribute("src") === src) {
        return;
      }
      if (reduced) {
        shot.src = src;
        shot.alt = tab.getAttribute("data-alt");
        return;
      }
      shot.classList.add("is-swapping");
      window.setTimeout(function () {
        shot.src = src;
        shot.alt = tab.getAttribute("data-alt");
        shot.classList.remove("is-swapping");
      }, 180);
    };

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        select(tab, false);
      });
      tab.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          next = tabs[(i + 1) % tabs.length];
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          next = tabs[(i - 1 + tabs.length) % tabs.length];
        }
        if (next) {
          event.preventDefault();
          select(next, true);
        }
      });
    });

    tabs.forEach(function (tab) {
      var img = new Image();
      img.src = tab.getAttribute("data-shot");
    });
  }
})();
