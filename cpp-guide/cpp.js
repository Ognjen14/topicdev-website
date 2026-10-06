(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var keywords = /^(auto|bool|break|case|char|class|const|constexpr|continue|default|delete|do|double|else|enum|false|float|for|if|int|long|namespace|new|nullptr|override|private|protected|public|return|short|static|struct|switch|template|this|true|typename|unsigned|using|virtual|void|while)$/;
  var types = /^(std|size_t|string|vector|cout|cin|endl|unique_ptr|make_unique|sort|find|begin|end)$/;

  var escapeHtml = function (text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  var highlight = function (code) {
    var pattern = /(\/\/.*$)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|(#\s*\w+(?:\s*<[^>\n]*>?)?)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b(\s*\()?/gm;
    var out = "";
    var last = 0;
    code.replace(pattern, function (match, comment, string, pre, number, word, call, offset) {
      out += escapeHtml(code.slice(last, offset));
      last = offset + match.length;
      if (comment) {
        out += '<span class="co">' + escapeHtml(comment) + "</span>";
      } else if (string) {
        out += '<span class="st">' + escapeHtml(string) + "</span>";
      } else if (pre) {
        out += '<span class="pp">' + escapeHtml(pre) + "</span>";
      } else if (number) {
        out += '<span class="nu">' + number + "</span>";
      } else if (keywords.test(word)) {
        out += '<span class="kw">' + word + "</span>" + escapeHtml(call || "");
      } else if (types.test(word) || /^[A-Z]/.test(word)) {
        out += '<span class="ty">' + word + "</span>" + escapeHtml(call || "");
      } else if (call) {
        out += '<span class="fn">' + word + "</span>" + escapeHtml(call);
      } else {
        out += escapeHtml(word);
      }
      return match;
    });
    return out + escapeHtml(code.slice(last));
  };

  document.querySelectorAll("[data-cpp]").forEach(function (block) {
    var marks = block.querySelectorAll("[data-squiggle]");
    if (marks.length) {
      return;
    }
    block.innerHTML = highlight(block.textContent);
  });

  var editor = document.querySelector("[data-type]");
  var term = document.querySelector(".cp-term");
  var runButton = document.querySelector(".cp-run");

  if (editor && term) {
    var source = editor.textContent.replace(/^\n/, "");
    var output = ["Learned pointers", "Learned classes", "Learned templates"];
    var timers = [];

    var clearTimers = function () {
      timers.forEach(function (t) {
        window.clearTimeout(t);
      });
      timers = [];
    };

    var later = function (fn, ms) {
      timers.push(window.setTimeout(fn, ms));
    };

    var run = function () {
      clearTimers();
      term.innerHTML = "";
      var lines = [
        '<span class="ps">$</span> g++ -std=c++20 main.cpp -o learn',
        '<span class="ps">$</span> ./learn'
      ].concat(output.map(function (line) {
        return '<span class="out">' + line + "</span>";
      }));
      if (reduced) {
        term.innerHTML = lines.join("\n");
        return;
      }
      lines.forEach(function (line, i) {
        later(function () {
          term.innerHTML += (i ? "\n" : "") + line;
        }, i === 0 ? 0 : 300 + i * 260);
      });
    };

    var type = function () {
      if (reduced) {
        editor.innerHTML = highlight(source);
        run();
        return;
      }
      var shown = 0;
      var tick = function () {
        shown = Math.min(source.length, shown + 3);
        editor.innerHTML = highlight(source.slice(0, shown)) + '<span class="cp-caret"></span>';
        if (shown < source.length) {
          later(tick, 18);
        } else {
          later(run, 350);
        }
      };
      tick();
    };

    editor.innerHTML = "";
    type();

    if (runButton) {
      runButton.addEventListener("click", function () {
        clearTimers();
        editor.innerHTML = highlight(source);
        run();
      });
    }
  }

  var demo = document.getElementById("cp-demo");
  var demoSteps = document.getElementById("cp-demo-steps");
  if (demo && demoSteps && window.GuideDemo) {
    window.GuideDemo.mount(demo, JSON.parse(demoSteps.textContent), {
      highlight: highlight,
      codeClass: "cp-code",
      kindSuffix: "()",
      doneLabel: "return 0;",
      endHtml: document.getElementById("cp-demo-end").innerHTML
    });
  }

  var qa = document.getElementById("cp-qa");
  var qaItems = document.getElementById("cp-qa-items");
  if (qa && qaItems && window.GuideQA) {
    window.GuideQA.mount(qa, JSON.parse(qaItems.textContent), {
      highlight: highlight,
      codeClass: "cp-code",
      proLevels: ["medior", "senior"],
      proLabel: "Pro",
      masteredLabel: "// mastered"
    });
  }

  var anims = document.querySelectorAll(".cp-anim");
  anims.forEach(function (svg) {
    if (reduced && svg.pauseAnimations) {
      svg.pauseAnimations();
    }
  });
  if (!reduced && anims.length && "IntersectionObserver" in window) {
    document.body.classList.add("cp-ready");
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

  var log = document.querySelector(".cp-buildlog");
  if (log && !reduced && "IntersectionObserver" in window) {
    log.querySelectorAll("li").forEach(function (li, i) {
      li.style.setProperty("--i", i);
    });
    log.classList.add("is-armed");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          log.classList.add("is-in");
          observer.disconnect();
        }
      });
    }, { threshold: 0.25 });
    observer.observe(log);
  }
})();
