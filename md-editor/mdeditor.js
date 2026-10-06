(function () {
  var app = document.querySelector(".md-app");
  if (!app) {
    return;
  }

  var source = app.querySelector("textarea");
  var preview = app.querySelector(".md-preview");
  var outline = app.querySelector(".md-outline");
  var status = {
    pos: app.querySelector("[data-pos]"),
    words: app.querySelector("[data-words]"),
    chars: app.querySelector("[data-chars]")
  };
  var modeButtons = app.querySelectorAll("[data-mode-set]");

  var escapeHtml = function (text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  var inline = function (text) {
    return text.split("`").map(function (part, index) {
      if (index % 2 === 1) {
        return "<code>" + escapeHtml(part) + "</code>";
      }
      return escapeHtml(part)
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<span class="md-a">$1</span>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/(^|[^\w])_([^_]+)_(?=$|[^\w])/g, "$1<em>$2</em>")
        .replace(/~~([^~]+)~~/g, "<del>$1</del>")
        .replace(/==([^=]+)==/g, "<mark>$1</mark>");
    }).join("");
  };

  var keywords = /^(def|return|if|elif|else|for|while|in|import|from|class|as|with|try|except|and|or|not|True|False|None|const|let|var|function|new|int|void|auto|struct|public|private|include|using|namespace)$/;

  var highlight = function (code) {
    var pattern = /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)\b(\s*\()?/gm;
    var out = "";
    var last = 0;
    code.replace(pattern, function (match, comment, string, number, word, call, offset) {
      out += escapeHtml(code.slice(last, offset));
      last = offset + match.length;
      if (comment) {
        out += '<span class="t-c">' + escapeHtml(comment) + "</span>";
      } else if (string) {
        out += '<span class="t-s">' + escapeHtml(string) + "</span>";
      } else if (number) {
        out += '<span class="t-n">' + number + "</span>";
      } else if (keywords.test(word)) {
        out += '<span class="t-k">' + word + "</span>" + escapeHtml(call || "");
      } else if (call) {
        out += '<span class="t-f">' + word + "</span>" + escapeHtml(call);
      } else {
        out += escapeHtml(word);
      }
      return match;
    });
    return out + escapeHtml(code.slice(last));
  };

  var slug = function (text, used) {
    var base = text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "section";
    var id = base;
    var n = 2;
    while (used[id]) {
      id = base + "-" + n;
      n += 1;
    }
    used[id] = true;
    return id;
  };

  var isBlockStart = function (line) {
    return /^(#{1,6}\s|```|>|\s*([-*+]|\d+\.)\s|\|)/.test(line) || /^(-{3,}|\*{3,})\s*$/.test(line);
  };

  var splitRow = function (line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (cell) {
      return cell.trim();
    });
  };

  var render = function (text) {
    var lines = text.replace(/\r/g, "").split("\n");
    var html = [];
    var heads = [];
    var used = {};
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];
      var m;

      if (/^```/.test(line)) {
        var code = [];
        i += 1;
        while (i < lines.length && !/^```/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        i += 1;
        html.push("<pre><code>" + highlight(code.join("\n")) + "</code></pre>");
        continue;
      }

      if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) {
        var level = m[1].length;
        var content = inline(m[2]);
        var id = "md-" + slug(m[2], used);
        heads.push({ level: level, text: m[2].replace(/[*_`=~]/g, ""), id: id });
        html.push("<h" + Math.min(level, 6) + ' id="' + id + '">' + content + "</h" + Math.min(level, 6) + ">");
        i += 1;
        continue;
      }

      if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
        html.push("<hr>");
        i += 1;
        continue;
      }

      if (/^\|/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
        var header = splitRow(line);
        var table = "<table><thead><tr>" + header.map(function (cell) {
          return "<th>" + inline(cell) + "</th>";
        }).join("") + "</tr></thead><tbody>";
        i += 2;
        while (i < lines.length && /^\|/.test(lines[i])) {
          table += "<tr>" + splitRow(lines[i]).map(function (cell) {
            return "<td>" + inline(cell) + "</td>";
          }).join("") + "</tr>";
          i += 1;
        }
        html.push(table + "</tbody></table>");
        continue;
      }

      if (/^>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^>\s?/, ""));
          i += 1;
        }
        html.push("<blockquote><p>" + inline(quote.join(" ")) + "</p></blockquote>");
        continue;
      }

      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        var ordered = /^\s*\d+\./.test(line);
        var items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          var item = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, "");
          var task = /^\[( |x|X)\]\s*(.*)$/.exec(item);
          if (task) {
            var done = task[1] !== " ";
            items.push('<li class="task' + (done ? " done" : "") + '"><span class="box' + (done ? " on" : "") + '"></span>' + inline(task[2]) + "</li>");
          } else {
            items.push("<li>" + inline(item) + "</li>");
          }
          i += 1;
        }
        var tag = ordered ? "ol" : "ul";
        html.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
        continue;
      }

      if (/^\s*$/.test(line)) {
        i += 1;
        continue;
      }

      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && (para.length === 0 || !isBlockStart(lines[i]))) {
        para.push(lines[i]);
        i += 1;
      }
      html.push("<p>" + inline(para.join(" ")) + "</p>");
    }

    return { html: html.join(""), heads: heads };
  };

  var outlineButtons = [];

  var markCurrent = function () {
    if (outlineButtons.length === 0) {
      return;
    }
    var top = preview.scrollTop + 24;
    var current = outlineButtons[0];
    outlineButtons.forEach(function (button) {
      var target = document.getElementById(button.getAttribute("data-target"));
      if (target && target.offsetTop <= top) {
        current = button;
      }
    });
    outlineButtons.forEach(function (button) {
      button.classList.toggle("is-current", button === current);
    });
  };

  var update = function () {
    var result = render(source.value);
    preview.innerHTML = result.html;

    outline.textContent = "";
    outlineButtons = result.heads.filter(function (head) {
      return head.level <= 3;
    }).map(function (head) {
      var li = document.createElement("li");
      var button = document.createElement("button");
      li.className = "l" + head.level;
      button.type = "button";
      button.textContent = head.text;
      button.setAttribute("data-target", head.id);
      button.addEventListener("click", function () {
        var target = document.getElementById(head.id);
        if (target) {
          preview.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
        }
      });
      li.appendChild(button);
      outline.appendChild(li);
      return button;
    });
    markCurrent();

    var words = source.value.trim() ? source.value.trim().split(/\s+/).length : 0;
    status.words.textContent = words + (words === 1 ? " word" : " words");
    status.chars.textContent = source.value.length + " chars";
  };

  var updatePos = function () {
    var before = source.value.slice(0, source.selectionStart).split("\n");
    status.pos.textContent = "Ln " + before.length + ", Col " + (before[before.length - 1].length + 1);
  };

  var setMode = function (mode) {
    app.setAttribute("data-mode", mode);
    modeButtons.forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-mode-set") === mode));
    });
    markCurrent();
  };

  modeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setMode(button.getAttribute("data-mode-set"));
    });
  });

  app.addEventListener("keydown", function (event) {
    if (!event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }
    var mode = app.getAttribute("data-mode");
    if (event.key === "e" || event.key === "E") {
      event.preventDefault();
      setMode(mode === "read" ? "source" : "read");
    } else if (event.key === "\\") {
      event.preventDefault();
      setMode(mode === "split" ? "read" : "split");
    }
  });

  source.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey) {
      return;
    }
    var start = source.selectionStart;
    if (start !== source.selectionEnd) {
      return;
    }
    var lineStart = source.value.lastIndexOf("\n", start - 1) + 1;
    var current = source.value.slice(lineStart, start);
    var m = /^(\s*)([-*+] \[[ xX]\] |[-*+] |(\d+)\. )(.*)$/.exec(current);
    if (!m) {
      return;
    }
    event.preventDefault();
    if (m[4].trim() === "") {
      source.setRangeText("", lineStart, start, "end");
    } else {
      var marker = m[3] ? (parseInt(m[3], 10) + 1) + ". " : m[2].replace(/\[[xX]\]/, "[ ]");
      source.setRangeText("\n" + m[1] + marker, start, start, "end");
    }
    update();
    updatePos();
  });

  source.addEventListener("input", function () {
    update();
    updatePos();
  });
  ["click", "keyup", "select"].forEach(function (name) {
    source.addEventListener(name, updatePos);
  });

  preview.addEventListener("scroll", markCurrent, { passive: true });

  var presets = {
    classic: {
      dark: ["#0d1117", "#e6edf3", "#e6edf3", "#4493f8", "#161b22", "#30363d", "#3f2e00", "#8b949e", "#ff7b72", "#a5d6ff", "#79c0ff", "#d2a8ff"],
      light: ["#ffffff", "#1f2328", "#1f2328", "#0969da", "#f6f8fa", "#d0d7de", "#fff8c5", "#6e7781", "#cf222e", "#0a3069", "#0550ae", "#8250df"]
    },
    mono: {
      dark: ["#111111", "#d4d4d4", "#ffffff", "#ffffff", "#1a1a1a", "#2e2e2e", "#3a3a3a", "#6b6b6b", "#ffffff", "#a8a8a8", "#c8c8c8", "#f0f0f0"],
      light: ["#ffffff", "#2b2b2b", "#000000", "#000000", "#f4f4f4", "#dddddd", "#e6e6e6", "#8a8a8a", "#000000", "#5e5e5e", "#444444", "#1a1a1a"]
    },
    sepia: {
      dark: ["#1f1b16", "#e3d7c1", "#f3e8d3", "#d9a35e", "#2a251e", "#3a3329", "#4a3d22", "#8a7d68", "#e08a6b", "#a9bb78", "#d9a35e", "#c4a3d6"],
      light: ["#f7f1e3", "#43392b", "#2e2519", "#9a5b1e", "#efe6d2", "#e0d4ba", "#f1dfa6", "#8a7a60", "#8c3b2b", "#5b6b2a", "#9a5b1e", "#6b4a8a"]
    },
    forest: {
      dark: ["#141a17", "#d5ded8", "#e8f1ea", "#6cc79a", "#1b231f", "#27322c", "#2c4a3a", "#6c7f73", "#7fd3a8", "#a6d189", "#e0a96d", "#8ac6d6"],
      light: ["#fafcf9", "#23302a", "#15211b", "#1f7a52", "#eef3ef", "#d6e0d9", "#d7efd9", "#7d8c83", "#1f7a52", "#4f7a1f", "#a5561e", "#1f6a7a"]
    },
    dusk: {
      dark: ["#18161f", "#dcd7e6", "#efeaf7", "#b39cf0", "#201d2a", "#2e2a3b", "#3d2f5c", "#736c86", "#f08fb5", "#9fd8b3", "#f5a97f", "#8cc4f5"],
      light: ["#fcfbfe", "#2a2535", "#1b1626", "#6a45c9", "#f2eff8", "#e1dceb", "#e8defa", "#8a8399", "#b0326a", "#2e7a4f", "#b4541c", "#2a5fae"]
    }
  };
  var keys = ["--r-bg", "--r-fg", "--r-heading", "--r-link", "--r-code-bg", "--r-border", "--r-mark", "--r-comment", "--r-keyword", "--r-string", "--r-number", "--r-fn"];
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var themeButtons = document.querySelectorAll("[data-theme-set]");
  var currentTheme = "classic";

  var applyTheme = function () {
    var scheme = darkQuery.matches ? "dark" : "light";
    var values = presets[currentTheme][scheme];
    keys.forEach(function (key, index) {
      preview.style.setProperty(key, values[index]);
    });
    themeButtons.forEach(function (button) {
      var name = button.getAttribute("data-theme-set");
      var swatch = button.querySelector(".md-swatch");
      var colours = presets[name][scheme];
      swatch.style.background = colours[0];
      swatch.style.setProperty("--sw-link", colours[3]);
      button.setAttribute("aria-pressed", String(name === currentTheme));
    });
  };

  themeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      currentTheme = button.getAttribute("data-theme-set");
      applyTheme();
    });
  });

  if (darkQuery.addEventListener) {
    darkQuery.addEventListener("change", applyTheme);
  }

  if (window.matchMedia("(max-width: 700px)").matches) {
    setMode("read");
  }

  applyTheme();
  update();
  updatePos();
})();

(function () {
  var arts = document.querySelectorAll(".md-anim, .md-sec .art");
  if (!arts.length || !("IntersectionObserver" in window)) {
    return;
  }
  document.querySelectorAll(".md-sec .art").forEach(function (art) {
    art.querySelectorAll(".line").forEach(function (line, i) {
      line.style.setProperty("--n", i);
    });
  });
  document.body.classList.add("md-ready");
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.target.classList.contains("md-anim")) {
        entry.target.classList.toggle("is-in", entry.isIntersecting);
      } else if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
      }
    });
  }, { threshold: 0.25 });
  arts.forEach(function (art) {
    observer.observe(art);
  });
})();
