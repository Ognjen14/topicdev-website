(function () {
  var escapeHtml = function (text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  var shuffle = function (list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = copy[i];
      copy[i] = copy[j];
      copy[j] = t;
    }
    return copy;
  };

  var sameList = function (a, b) {
    if (a.length !== b.length) {
      return false;
    }
    for (var i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  };

  var el = function (tag, className, html) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (html !== undefined) {
      node.innerHTML = html;
    }
    return node;
  };

  var kinds = {
    lesson: "Read",
    question: "Choose the answer",
    predict_output: "Predict the output",
    fill_blank: "Fill the blank",
    bug_fix: "Find the bug",
    code_order: "Put the lines in order",
    word_bank: "Fill in the words",
    trace_table: "Trace the values",
    compare_snippets: "Compare the snippets",
    match_pairs: "Match the pairs"
  };

  function mount(root, steps, opts) {
    var highlight = opts.highlight || escapeHtml;
    var codeClass = opts.codeClass || "";
    var index = 0;
    var attempts = 0;
    var firstTry = 0;
    var scored = steps.filter(function (s) { return s.type !== "lesson"; }).length;
    var current = null;
    var mode = "answer";

    root.innerHTML = "";
    var top = el("div", "gd-top");
    var bar = el("div", "gd-bar");
    var count = el("span", "gd-count");
    steps.forEach(function () {
      bar.appendChild(el("i"));
    });
    top.appendChild(bar);
    top.appendChild(count);
    var kind = el("p", "gd-kind");
    var title = el("h3", "gd-title");
    var body = el("div", "gd-body");
    var feedback = el("div", "gd-feedback");
    feedback.setAttribute("aria-live", "polite");
    var foot = el("div", "gd-foot");
    var status = el("span", "gd-status");
    var button = el("button", "gd-main");
    button.type = "button";
    foot.appendChild(status);
    foot.appendChild(button);
    [top, kind, title, body, feedback, foot].forEach(function (node) {
      root.appendChild(node);
    });

    var code = function (text) {
      return "<pre class=\"gd-code " + codeClass + "\"><code>" + highlight(text) + "</code></pre>";
    };

    var refresh = function () {
      if (mode === "answer") {
        button.disabled = current.ready ? !current.ready() : false;
      }
    };

    var builders = {
      lesson: function (step) {
        body.innerHTML = step.content + (step.code ? code(step.code) : "");
        return { lesson: true };
      },

      choice: function (step, cards) {
        var order = cards
          ? step.snippets.map(function (o, i) { return i; })
          : shuffle(step.options.map(function (o, i) { return i; }));
        var selected = null;
        var list = el("div", cards ? "gd-cards" : "gd-options");
        var buttons = [];
        order.forEach(function (originalIndex) {
          var opt = el("button", cards ? "gd-card" : "gd-opt");
          opt.type = "button";
          if (cards) {
            var snip = step.snippets[originalIndex];
            opt.innerHTML = "<span class=\"gd-card-label\">" + escapeHtml(snip.label) + "</span>" + code(snip.code);
          } else {
            opt.innerHTML = "<span>" + escapeHtml(step.options[originalIndex]) + "</span>";
          }
          opt.addEventListener("click", function () {
            if (mode !== "answer") {
              return;
            }
            selected = originalIndex;
            buttons.forEach(function (b) {
              b.node.classList.toggle("is-picked", b.index === originalIndex);
            });
            refresh();
          });
          buttons.push({ node: opt, index: originalIndex });
          list.appendChild(opt);
        });
        body.appendChild(list);
        return {
          ready: function () { return selected !== null; },
          check: function () { return selected === step.correctIndex; },
          mark: function (right) {
            buttons.forEach(function (b) {
              if (b.index === selected) {
                b.node.classList.add(right ? "is-right" : "is-wrong");
              }
            });
          },
          reveal: function () {
            buttons.forEach(function (b) {
              if (b.index === step.correctIndex) {
                b.node.classList.add("is-right");
              }
            });
          },
          reset: function () {
            selected = null;
            buttons.forEach(function (b) {
              b.node.className = cards ? "gd-card" : "gd-opt";
            });
          }
        };
      },

      question: function (step) {
        body.innerHTML = "<p class=\"gd-prompt\">" + step.question + "</p>" + (step.code ? code(step.code) : "");
        return builders.choice(step, false);
      },

      predict_output: function (step) {
        body.innerHTML = code(step.code);
        return builders.choice(step, false);
      },

      compare_snippets: function (step) {
        body.innerHTML = "<p class=\"gd-prompt\">" + escapeHtml(step.prompt) + "</p>";
        return builders.choice(step, true);
      },

      bug_fix: function (step) {
        var selected = null;
        var wrap = el("div", "gd-lines " + codeClass);
        var rows = step.lines.map(function (line, i) {
          var row = el("button", "gd-line");
          row.type = "button";
          row.innerHTML = "<span class=\"gd-ln\">" + (i + 1) + "</span><code>" + (highlight(line) || " ") + "</code>";
          row.addEventListener("click", function () {
            if (mode !== "answer") {
              return;
            }
            selected = i;
            rows.forEach(function (r, j) {
              r.classList.toggle("is-picked", j === i);
            });
            refresh();
          });
          wrap.appendChild(row);
          return row;
        });
        body.innerHTML = "<p class=\"gd-prompt\">One line is wrong. Tap it.</p>";
        body.appendChild(wrap);
        return {
          ready: function () { return selected !== null; },
          check: function () { return selected === step.errorLine; },
          mark: function (right) { rows[selected].classList.add(right ? "is-right" : "is-wrong"); },
          reveal: function () { rows[step.errorLine].classList.add("is-right"); },
          reset: function () {
            selected = null;
            rows.forEach(function (r) { r.className = "gd-line"; });
          }
        };
      },

      fill_blank: function (step) {
        var parts = step.template.split("___");
        var input = el("input", "gd-blank");
        input.type = "text";
        input.setAttribute("aria-label", "The missing part");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("spellcheck", "false");
        input.size = Math.max(3, step.answer.length + 1);
        var pre = el("pre", "gd-code " + codeClass);
        var codeNode = el("code");
        codeNode.innerHTML = highlight(parts[0]);
        codeNode.appendChild(input);
        codeNode.insertAdjacentHTML("beforeend", highlight(parts.slice(1).join("___")));
        pre.appendChild(codeNode);
        body.innerHTML = "<p class=\"gd-prompt\">Type what goes in the gap.</p>";
        body.appendChild(pre);
        if (step.hint) {
          body.appendChild(el("p", "gd-hint", "Hint: " + escapeHtml(step.hint)));
        }
        input.addEventListener("input", refresh);
        input.addEventListener("keydown", function (event) {
          if (event.key === "Enter" && !button.disabled) {
            button.click();
          }
        });
        return {
          ready: function () { return input.value.trim().length > 0; },
          check: function () { return input.value.replace(/\s+/g, "") === step.answer.replace(/\s+/g, ""); },
          mark: function (right) {
            input.classList.add(right ? "is-right" : "is-wrong");
            input.disabled = true;
          },
          reveal: function () {
            input.value = step.answer;
            input.className = "gd-blank is-right";
          },
          reset: function () {
            input.className = "gd-blank";
            input.disabled = false;
            input.value = "";
          }
        };
      },

      word_bank: function (step) {
        var parts = step.template.split("___");
        var slots = [];
        var pre = el("pre", "gd-code " + codeClass);
        var codeNode = el("code");
        parts.forEach(function (part, i) {
          codeNode.insertAdjacentHTML("beforeend", highlight(part));
          if (i < parts.length - 1) {
            var slot = el("button", "gd-slot", "&nbsp;");
            slot.type = "button";
            slot.setAttribute("aria-label", "Gap " + (i + 1));
            slots.push({ node: slot, value: null, chip: null });
            codeNode.appendChild(slot);
          }
        });
        pre.appendChild(codeNode);
        var bank = el("div", "gd-chips");
        var chips = shuffle(step.options).map(function (word) {
          var chip = el("button", "gd-chip", escapeHtml(word));
          chip.type = "button";
          chip.addEventListener("click", function () {
            if (mode !== "answer" || chip.disabled) {
              return;
            }
            var free = slots.filter(function (s) { return s.value === null; })[0];
            if (!free) {
              return;
            }
            free.value = word;
            free.chip = chip;
            free.node.textContent = word;
            free.node.classList.add("is-filled");
            chip.disabled = true;
            refresh();
          });
          bank.appendChild(chip);
          return chip;
        });
        slots.forEach(function (slot) {
          slot.node.addEventListener("click", function () {
            if (mode !== "answer" || slot.value === null) {
              return;
            }
            slot.chip.disabled = false;
            slot.value = null;
            slot.chip = null;
            slot.node.innerHTML = "&nbsp;";
            slot.node.classList.remove("is-filled");
            refresh();
          });
        });
        body.innerHTML = "<p class=\"gd-prompt\">Tap the words to fill the gaps. Tap a gap to empty it.</p>";
        body.appendChild(pre);
        body.appendChild(bank);
        return {
          ready: function () { return slots.every(function (s) { return s.value !== null; }); },
          check: function () { return sameList(slots.map(function (s) { return s.value; }), step.correctTokens); },
          mark: function (right) {
            slots.forEach(function (s) {
              s.node.classList.add(right ? "is-right" : "is-wrong");
            });
          },
          reveal: function () {
            slots.forEach(function (s, i) {
              s.value = step.correctTokens[i];
              s.node.textContent = s.value;
              s.node.className = "gd-slot is-filled is-right";
            });
          },
          reset: function () {
            slots.forEach(function (s) {
              s.value = null;
              s.chip = null;
              s.node.innerHTML = "&nbsp;";
              s.node.className = "gd-slot";
            });
            chips.forEach(function (c) { c.disabled = false; });
          }
        };
      },

      code_order: function (step) {
        var chosen = [];
        var answer = el("ol", "gd-order " + codeClass);
        var pool = el("div", "gd-pool " + codeClass);
        var poolButtons = step.fragments.map(function (fragment, i) {
          var b = el("button", "gd-frag");
          b.type = "button";
          b.innerHTML = "<code>" + highlight(fragment.replace(/^\s+/, "")) + "</code>";
          b.addEventListener("click", function () {
            if (mode !== "answer" || b.disabled) {
              return;
            }
            chosen.push(i);
            draw();
          });
          pool.appendChild(b);
          return b;
        });
        var draw = function (markClass) {
          answer.innerHTML = "";
          chosen.forEach(function (fragIndex, pos) {
            var li = el("li", "gd-placed");
            var b = el("button", "gd-frag is-placed");
            b.type = "button";
            b.innerHTML = "<code>" + highlight(step.fragments[fragIndex]) + "</code>";
            if (markClass) {
              b.classList.add(markClass);
            }
            b.addEventListener("click", function () {
              if (mode !== "answer") {
                return;
              }
              chosen.splice(pos, 1);
              draw();
            });
            li.appendChild(b);
            answer.appendChild(li);
          });
          for (var k = chosen.length; k < step.fragments.length; k += 1) {
            answer.appendChild(el("li", "gd-placed is-empty", "<span>&nbsp;</span>"));
          }
          poolButtons.forEach(function (b, i) {
            b.disabled = chosen.indexOf(i) !== -1;
          });
          refresh();
        };
        body.innerHTML = "<p class=\"gd-prompt\">Tap the lines in the order they should run. Tap a placed line to take it back.</p>";
        body.appendChild(answer);
        body.appendChild(pool);
        draw();
        return {
          ready: function () { return chosen.length === step.fragments.length; },
          check: function () { return sameList(chosen, step.correctOrder); },
          mark: function (right) { draw(right ? "is-right" : "is-wrong"); },
          reveal: function () {
            chosen = step.correctOrder.slice();
            draw("is-right");
          },
          reset: function () {
            chosen = [];
            draw();
          }
        };
      },

      trace_table: function (step) {
        var inputs = [];
        var table = el("table", "gd-trace");
        var head = "<thead><tr><th>Step</th>" + step.variables.map(function (v) {
          return "<th><code>" + escapeHtml(v) + "</code></th>";
        }).join("") + "</tr></thead>";
        table.innerHTML = head;
        var tbody = el("tbody");
        step.rows.forEach(function (row, ri) {
          var tr = el("tr");
          tr.appendChild(el("th", "", escapeHtml(row.label)));
          step.variables.forEach(function (v, vi) {
            var td = el("td");
            var input = el("input", "gd-cell");
            input.type = "text";
            input.setAttribute("aria-label", v + ", " + row.label);
            input.setAttribute("autocomplete", "off");
            input.addEventListener("input", refresh);
            inputs.push({ node: input, expected: row.values[vi] });
            td.appendChild(input);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        body.innerHTML = code(step.code) + "<p class=\"gd-prompt\">Fill in each value after every step.</p>";
        body.appendChild(table);
        return {
          ready: function () { return inputs.every(function (c) { return c.node.value.trim().length > 0; }); },
          check: function () { return inputs.every(function (c) { return c.node.value.trim() === c.expected; }); },
          mark: function (right) {
            inputs.forEach(function (c) {
              c.node.classList.add(right ? "is-right" : "is-wrong");
              c.node.disabled = true;
            });
          },
          reveal: function () {
            inputs.forEach(function (c) {
              c.node.value = c.expected;
              c.node.className = "gd-cell is-right";
            });
          },
          reset: function () {
            inputs.forEach(function (c) {
              c.node.value = "";
              c.node.className = "gd-cell";
              c.node.disabled = false;
            });
          }
        };
      },

      match_pairs: function (step) {
        var assigned = step.pairs.map(function () { return null; });
        var activeLeft = null;
        var grid = el("div", "gd-match");
        var leftCol = el("div", "gd-col");
        var rightCol = el("div", "gd-col");
        var rightOrder = shuffle(step.pairs.map(function (p, i) { return i; }));
        var leftClass = step.leftMono ? "gd-pair gd-mono" : "gd-pair";
        var lefts = step.pairs.map(function (pair, i) {
          var b = el("button", leftClass, escapeHtml(pair.left));
          b.type = "button";
          b.addEventListener("click", function () {
            if (mode !== "answer") {
              return;
            }
            activeLeft = i;
            paint();
          });
          leftCol.appendChild(b);
          return b;
        });
        var rights = {};
        rightOrder.forEach(function (ri) {
          var b = el("button", "gd-pair gd-mono", escapeHtml(step.pairs[ri].right));
          b.type = "button";
          b.addEventListener("click", function () {
            if (mode !== "answer" || activeLeft === null) {
              return;
            }
            assigned = assigned.map(function (a) { return a === ri ? null : a; });
            assigned[activeLeft] = ri;
            var next = assigned.indexOf(null);
            activeLeft = next === -1 ? null : next;
            paint();
          });
          rights[ri] = b;
          rightCol.appendChild(b);
        });
        var paint = function (markClass) {
          lefts.forEach(function (b, i) {
            b.className = leftClass;
            if (assigned[i] !== null) {
              b.classList.add("gd-p" + i);
            }
            if (i === activeLeft) {
              b.classList.add("is-active");
            }
            if (markClass && assigned[i] !== null) {
              b.classList.add(markClass);
            }
          });
          Object.keys(rights).forEach(function (key) {
            var ri = Number(key);
            var owner = assigned.indexOf(ri);
            var b = rights[ri];
            b.className = "gd-pair gd-mono";
            if (owner !== -1) {
              b.classList.add("gd-p" + owner);
            }
          });
          refresh();
        };
        grid.appendChild(leftCol);
        grid.appendChild(rightCol);
        body.innerHTML = "<p class=\"gd-prompt\">Tap an item on the left, then its match on the right.</p>";
        body.appendChild(grid);
        activeLeft = 0;
        paint();
        return {
          ready: function () { return assigned.indexOf(null) === -1; },
          check: function () { return assigned.every(function (a, i) { return a === i; }); },
          mark: function (right) {
            activeLeft = null;
            paint(right ? "is-right" : "is-wrong");
          },
          reveal: function () {
            assigned = step.pairs.map(function (p, i) { return i; });
            activeLeft = null;
            paint("is-right");
          },
          reset: function () {
            assigned = step.pairs.map(function () { return null; });
            activeLeft = 0;
            paint();
          }
        };
      }
    };

    var showStatus = function () {
      status.textContent = "first try: " + firstTry + " / " + scored;
    };

    var paintBar = function () {
      Array.prototype.forEach.call(bar.children, function (seg, i) {
        seg.className = i < index ? "done" : i === index ? "now" : "";
      });
      count.textContent = (index + 1) + " / " + steps.length;
    };

    var load = function () {
      var step = steps[index];
      attempts = 0;
      mode = "answer";
      feedback.className = "gd-feedback";
      feedback.innerHTML = "";
      kind.textContent = (opts.kindPrefix || "") + step.type + (opts.kindSuffix || "") + "  ·  " + kinds[step.type];
      title.textContent = step.title;
      body.innerHTML = "";
      current = builders[step.type](step);
      button.textContent = current.lesson ? "CONTINUE" : "CHECK";
      button.disabled = false;
      refresh();
      paintBar();
      showStatus();
    };

    var finish = function () {
      mode = "done";
      Array.prototype.forEach.call(bar.children, function (seg) {
        seg.className = "done";
      });
      count.textContent = steps.length + " / " + steps.length;
      kind.textContent = opts.doneLabel || "lesson complete";
      title.textContent = "You finished the lesson";
      body.innerHTML = "<p class=\"gd-score\"><strong>" + firstTry + " / " + scored + "</strong> right on the first try</p>" +
        "<p class=\"gd-prompt\">That's every kind of question in the app, one of each. The app has whole sections of them, from your first program to the advanced topics.</p>" +
        (opts.endHtml || "");
      feedback.className = "gd-feedback";
      feedback.innerHTML = "";
      button.textContent = "START AGAIN";
      button.disabled = false;
      showStatus();
    };

    button.addEventListener("click", function () {
      var step = steps[index];
      if (mode === "done") {
        index = 0;
        firstTry = 0;
        load();
        return;
      }
      if (current.lesson || mode === "next") {
        index += 1;
        if (index >= steps.length) {
          finish();
        } else {
          load();
        }
        root.scrollIntoView({ block: "nearest", behavior: "smooth" });
        return;
      }
      if (mode === "retry") {
        current.reset();
        mode = "answer";
        feedback.className = "gd-feedback";
        feedback.innerHTML = "";
        button.textContent = "CHECK";
        refresh();
        return;
      }
      var right = current.check();
      current.mark(right);
      if (right) {
        if (attempts === 0) {
          firstTry += 1;
        }
        mode = "next";
        feedback.className = "gd-feedback is-right";
        feedback.innerHTML = "<strong>Correct!</strong> " + escapeHtml(step.explanation || "");
        button.textContent = "NEXT";
      } else {
        attempts += 1;
        if (attempts === 1) {
          mode = "retry";
          feedback.className = "gd-feedback is-wrong";
          feedback.innerHTML = "<strong>Not quite.</strong> Have another go.";
          button.textContent = "RETRY";
        } else {
          mode = "next";
          current.reveal();
          feedback.className = "gd-feedback is-wrong";
          feedback.innerHTML = "<strong>Here's the answer.</strong> " + escapeHtml(step.explanation || "");
          button.textContent = "NEXT";
        }
      }
      button.disabled = false;
      showStatus();
    });

    load();
  }

  window.GuideDemo = { mount: mount };
})();
