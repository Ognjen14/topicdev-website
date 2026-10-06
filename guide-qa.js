(function () {
  var LEVELS = ["junior", "medior", "senior"];

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

  var escapeHtml = function (text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  var title = function (text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  var mount = function (root, items, opts) {
    opts = opts || {};
    var highlight = opts.highlight || escapeHtml;
    var codeClass = opts.codeClass || "";
    var proLevels = opts.proLevels || [];
    var filter = "all";
    var mastered = {};
    var uid = root.id || "gq";

    var top = el("div", "gq-top");
    var tabs = el("div", "gq-tabs");
    tabs.setAttribute("role", "group");
    tabs.setAttribute("aria-label", "Filter by level");
    var progress = el("div", "gq-progress");
    var progressText = el("span", "gq-progress-text");
    var progressBar = el("i", "gq-progress-bar", "<b></b>");
    progress.appendChild(progressText);
    progress.appendChild(progressBar);
    top.appendChild(tabs);
    top.appendChild(progress);

    var list = el("ul", "gq-list");
    var rows = [];

    ["all"].concat(LEVELS).forEach(function (level) {
      var count = level === "all" ? items.length : items.filter(function (it) { return it.level === level; }).length;
      if (level !== "all" && !count) {
        return;
      }
      var b = el("button", "gq-tab", escapeHtml(level === "all" ? "All" : title(level)) + " <span>" + count + "</span>");
      b.type = "button";
      b.setAttribute("data-level", level);
      b.setAttribute("aria-pressed", String(level === filter));
      b.addEventListener("click", function () {
        filter = level;
        paint();
      });
      tabs.appendChild(b);
    });

    items.forEach(function (item, i) {
      var li = el("li", "gq-item");
      var panelId = uid + "-a" + i;
      var q = el("button", "gq-q");
      q.type = "button";
      q.setAttribute("aria-expanded", "false");
      q.setAttribute("aria-controls", panelId);
      var badge = '<span class="gq-level is-' + item.level + '">' + escapeHtml(title(item.level)) + "</span>";
      var pro = proLevels.indexOf(item.level) >= 0 && opts.proLabel ? '<span class="gq-pro">' + escapeHtml(opts.proLabel) + "</span>" : "";
      q.innerHTML =
        '<span class="gq-meta">' + badge + pro + '<span class="gq-topic">' + escapeHtml(item.topic) + '</span><span class="gq-done"><span class="ico i-check" aria-hidden="true"></span>Mastered</span></span>' +
        '<span class="gq-text">' + escapeHtml(item.q) + "</span>" +
        '<span class="ico i-chevron-down gq-chev" aria-hidden="true"></span>';
      var panel = el("div", "gq-a");
      panel.id = panelId;
      panel.hidden = true;
      var answer = el("div", "gq-answer", String(item.a).replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>").replace(/(<br\s*\/?>\s*)+$/i, ""));
      panel.appendChild(answer);
      if (item.code) {
        var pre = el("pre", "gq-code " + codeClass);
        pre.innerHTML = "<code>" + highlight(item.code) + "</code>";
        panel.appendChild(pre);
      }
      var master = el("button", "gq-master");
      master.type = "button";
      master.setAttribute("aria-pressed", "false");
      master.addEventListener("click", function () {
        mastered[i] = !mastered[i];
        paint();
      });
      panel.appendChild(master);
      q.addEventListener("click", function () {
        var open = q.getAttribute("aria-expanded") !== "true";
        q.setAttribute("aria-expanded", String(open));
        panel.hidden = !open;
        li.classList.toggle("is-open", open);
      });
      li.appendChild(q);
      li.appendChild(panel);
      list.appendChild(li);
      rows.push({ li: li, item: item, master: master });
    });

    var paint = function () {
      tabs.querySelectorAll(".gq-tab").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-level") === filter));
      });
      var done = 0;
      rows.forEach(function (row, i) {
        var on = !!mastered[i];
        if (on) {
          done += 1;
        }
        row.li.hidden = filter !== "all" && row.item.level !== filter;
        row.li.classList.toggle("is-mastered", on);
        row.master.setAttribute("aria-pressed", String(on));
        row.master.innerHTML = '<span class="ico i-check" aria-hidden="true"></span>' + (on ? "Mastered" : "Mark as mastered");
      });
      progressText.innerHTML = (opts.masteredLabel || "mastered") + " <b>" + done + " / " + items.length + "</b>";
      progressBar.firstChild.style.width = Math.round(done / items.length * 100) + "%";
    };

    root.textContent = "";
    root.appendChild(top);
    root.appendChild(list);
    paint();
  };

  window.GuideQA = { mount: mount };
})();
