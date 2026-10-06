(function () {
  var icons = {
    prev: '<span class="ico i-arrow-left" aria-hidden="true"></span>',
    next: '<span class="ico i-arrow-right" aria-hidden="true"></span>',
    close: '<span class="ico i-close" aria-hidden="true"></span>',
    zoomIn: '<span class="ico i-zoom-in" aria-hidden="true"></span>',
    zoomOut: '<span class="ico i-zoom-out" aria-hidden="true"></span>',
    expand: '<span class="ico i-expand" aria-hidden="true"></span><span class="expand-label">View full size</span>'
  };

  var touchFirst = window.matchMedia ? window.matchMedia("(hover: none)").matches : false;
  var reduceMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  var autoDelay = 2000;

  function makeButton(kind, label, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className || "arrow " + kind;
    button.setAttribute("aria-label", label);
    button.innerHTML = icons[kind];
    return button;
  }

  function onSwipe(element, handler) {
    var startX = null;
    element.addEventListener("touchstart", function (event) {
      startX = event.touches[0].clientX;
    }, { passive: true });
    element.addEventListener("touchend", function (event) {
      if (startX === null) {
        return;
      }
      var dx = event.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) {
        handler(dx < 0 ? 1 : -1);
      }
    });
  }

  var lightbox = (function () {
    var root = document.createElement("div");
    root.className = "lightbox";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Screenshot");

    var close = makeButton("close", "Close", "lightbox-close");
    var tools = document.createElement("div");
    tools.className = "lightbox-tools";
    var zoomOutButton = makeButton("zoomOut", "Zoom out", "lightbox-tool");
    var zoomInButton = makeButton("zoomIn", "Zoom in", "lightbox-tool");
    var level = document.createElement("button");
    level.type = "button";
    level.className = "lightbox-level";
    level.setAttribute("aria-label", "Fit to screen");
    tools.appendChild(zoomOutButton);
    tools.appendChild(level);
    tools.appendChild(zoomInButton);
    var prev = makeButton("prev", "Previous screenshot");
    var next = makeButton("next", "Next screenshot");
    var stage = document.createElement("figure");
    stage.className = "lightbox-stage";
    var canvas = document.createElement("div");
    canvas.className = "lightbox-canvas";
    var image = document.createElement("img");
    image.draggable = false;
    var caption = document.createElement("figcaption");
    var title = document.createElement("span");
    var position = document.createElement("span");
    position.className = "lightbox-count";
    var hint = document.createElement("span");
    hint.className = "lightbox-hint";
    caption.appendChild(title);
    caption.appendChild(position);
    caption.appendChild(hint);
    canvas.appendChild(image);
    stage.appendChild(canvas);
    stage.appendChild(caption);
    root.appendChild(close);
    root.appendChild(tools);
    root.appendChild(prev);
    root.appendChild(stage);
    root.appendChild(next);
    document.body.appendChild(root);

    var current = null;
    var returnFocus = null;
    var maxScale = 5;
    var zoom = { scale: 1, x: 0, y: 0 };
    var pointers = new Map();
    var gesture = null;
    var moved = false;
    var lastTap = 0;

    function isZoomed() {
      return zoom.scale > 1.001;
    }

    function applyZoom(animate) {
      var zoomed = isZoomed();
      root.classList.toggle("is-instant", !animate);
      root.classList.toggle("is-zoomed", zoomed);
      image.style.transform = zoomed ? "translate(" + zoom.x + "px, " + zoom.y + "px) scale(" + zoom.scale + ")" : "";
      level.textContent = Math.round(zoom.scale * 100) + "%";
      zoomOutButton.disabled = !zoomed;
      zoomInButton.disabled = zoom.scale >= maxScale - 0.001;
      if (zoomed) {
        hint.textContent = touchFirst ? "Drag to look around, pinch to zoom" : "Drag to look around, scroll to zoom";
      } else {
        hint.textContent = touchFirst ? "Tap or pinch to zoom" : "Click or scroll to zoom";
      }
    }

    function clampZoom() {
      var maxX = Math.max(0, (image.offsetWidth * zoom.scale - canvas.clientWidth) / 2);
      var maxY = Math.max(0, (image.offsetHeight * zoom.scale - canvas.clientHeight) / 2);
      zoom.x = Math.max(-maxX, Math.min(maxX, zoom.x));
      zoom.y = Math.max(-maxY, Math.min(maxY, zoom.y));
    }

    function canvasCenter() {
      var rect = canvas.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }

    function resetZoom(animate) {
      zoom.scale = 1;
      zoom.x = 0;
      zoom.y = 0;
      applyZoom(animate);
    }

    function zoomTo(scale, clientX, clientY, animate) {
      if (!image.offsetWidth) {
        return;
      }
      scale = Math.max(1, Math.min(maxScale, scale));
      if (scale <= 1.001) {
        resetZoom(animate);
        return;
      }
      var center = canvasCenter();
      var qx = (clientX === undefined ? center.x : clientX) - center.x;
      var qy = (clientY === undefined ? center.y : clientY) - center.y;
      var px = (qx - zoom.x) / zoom.scale;
      var py = (qy - zoom.y) / zoom.scale;
      zoom.scale = scale;
      zoom.x = qx - scale * px;
      zoom.y = qy - scale * py;
      clampZoom();
      applyZoom(animate);
    }

    function pinchState() {
      var points = Array.from(pointers.values());
      return {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2
      };
    }

    function startPan(point) {
      gesture = { type: "pan", x: point.x, y: point.y, startX: zoom.x, startY: zoom.y };
      root.classList.add("is-dragging");
    }

    function endGestures() {
      pointers.clear();
      gesture = null;
      root.classList.remove("is-dragging");
    }

    function render() {
      var item = current.items[current.index];
      resetZoom(false);
      image.src = item.src;
      image.alt = item.alt;
      title.textContent = item.caption;
      position.textContent = (current.index + 1) + " / " + current.items.length;
      prev.disabled = current.index === 0;
      next.disabled = current.index === current.items.length - 1;
      root.classList.toggle("single", current.items.length === 1);
    }

    image.addEventListener("pointerdown", function (event) {
      if (pointers.size === 0) {
        moved = false;
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      try {
        image.setPointerCapture(event.pointerId);
      } catch (error) {
      }
      if (pointers.size === 2) {
        var pinch = pinchState();
        gesture = { type: "pinch", distance: pinch.distance, x: pinch.x, y: pinch.y, scale: zoom.scale, startX: zoom.x, startY: zoom.y };
        moved = true;
        root.classList.add("is-dragging");
      } else if (pointers.size === 1 && isZoomed()) {
        startPan({ x: event.clientX, y: event.clientY });
      }
      event.preventDefault();
    });

    image.addEventListener("pointermove", function (event) {
      if (!pointers.has(event.pointerId)) {
        return;
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!gesture) {
        return;
      }
      if (gesture.type === "pinch" && pointers.size >= 2) {
        var pinch = pinchState();
        var scale = Math.max(1, Math.min(maxScale, gesture.scale * pinch.distance / Math.max(1, gesture.distance)));
        var center = canvasCenter();
        var px = (gesture.x - center.x - gesture.startX) / gesture.scale;
        var py = (gesture.y - center.y - gesture.startY) / gesture.scale;
        zoom.scale = scale;
        zoom.x = pinch.x - center.x - scale * px;
        zoom.y = pinch.y - center.y - scale * py;
        if (!isZoomed()) {
          zoom.scale = 1;
          zoom.x = 0;
          zoom.y = 0;
        }
        clampZoom();
        applyZoom(false);
      } else if (gesture.type === "pan") {
        var dx = event.clientX - gesture.x;
        var dy = event.clientY - gesture.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) {
          moved = true;
        }
        zoom.x = gesture.startX + dx;
        zoom.y = gesture.startY + dy;
        clampZoom();
        applyZoom(false);
      }
    });

    function releasePointer(event) {
      pointers.delete(event.pointerId);
      if (pointers.size === 1 && isZoomed()) {
        startPan(pointers.values().next().value);
      } else if (pointers.size === 0) {
        gesture = null;
        root.classList.remove("is-dragging");
      }
    }

    image.addEventListener("pointerup", releasePointer);
    image.addEventListener("pointercancel", releasePointer);

    image.addEventListener("click", function (event) {
      event.stopPropagation();
      if (moved) {
        moved = false;
        return;
      }
      if (!isZoomed()) {
        lastTap = 0;
        zoomTo(2, event.clientX, event.clientY, true);
        return;
      }
      var now = Date.now();
      if (now - lastTap < 350) {
        lastTap = 0;
        resetZoom(true);
      } else {
        lastTap = now;
      }
    });

    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      var unit = event.deltaMode === 1 ? 33 : 1;
      if (isZoomed() && !event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        zoom.x -= event.deltaX * unit;
        clampZoom();
        applyZoom(false);
        return;
      }
      zoomTo(zoom.scale * Math.exp(-event.deltaY * unit * 0.002), event.clientX, event.clientY, false);
    }, { passive: false });

    zoomInButton.addEventListener("click", function () {
      zoomTo(zoom.scale * 1.5, undefined, undefined, true);
    });

    zoomOutButton.addEventListener("click", function () {
      zoomTo(zoom.scale / 1.5, undefined, undefined, true);
    });

    level.addEventListener("click", function () {
      resetZoom(true);
    });

    window.addEventListener("resize", function () {
      if (isZoomed()) {
        clampZoom();
        applyZoom(false);
      }
    });

    function go(step) {
      var target = current.index + step;
      if (target < 0 || target >= current.items.length) {
        return;
      }
      current.index = target;
      current.onChange(target);
      render();
    }

    function hide() {
      resetZoom(false);
      endGestures();
      root.hidden = true;
      document.documentElement.classList.remove("lightbox-open");
      image.removeAttribute("src");
      current = null;
      if (returnFocus) {
        returnFocus.focus();
      }
      window.dispatchEvent(new Event("lightboxclose"));
    }

    close.addEventListener("click", hide);
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    root.addEventListener("click", function (event) {
      if (event.target === root || event.target === stage || event.target === canvas) {
        hide();
      }
    });
    root.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (isZoomed()) {
          resetZoom(true);
        } else {
          hide();
        }
      } else if (event.key === "ArrowLeft") {
        go(-1);
      } else if (event.key === "ArrowRight") {
        go(1);
      } else if (event.key === "+" || event.key === "=") {
        zoomTo(zoom.scale * 1.5, undefined, undefined, true);
      } else if (event.key === "-") {
        zoomTo(zoom.scale / 1.5, undefined, undefined, true);
      } else if (event.key === "0") {
        resetZoom(true);
      } else {
        return;
      }
      event.preventDefault();
    });
    onSwipe(root, function (step) {
      if (!isZoomed() && !moved) {
        go(step);
      }
    });

    return {
      open: function (items, index, onChange) {
        returnFocus = document.activeElement;
        current = { items: items, index: index, onChange: onChange };
        render();
        root.hidden = false;
        document.documentElement.classList.add("lightbox-open");
        close.focus();
      }
    };
  })();

  function setUp(gallery) {
    var strip = gallery.querySelector(".strip");
    if (!strip) {
      return;
    }
    var slides = strip.querySelectorAll(".shot");
    var count = slides.length;
    if (count === 0) {
      return;
    }

    var carousel = document.createElement("div");
    carousel.className = "carousel";
    var viewport = document.createElement("div");
    viewport.className = "viewport";
    var prev = makeButton("prev", "Previous screenshot");
    var next = makeButton("next", "Next screenshot");
    var counter = document.createElement("p");
    counter.className = "counter";
    counter.setAttribute("aria-live", "polite");

    strip.parentNode.insertBefore(carousel, strip);
    viewport.appendChild(strip);
    var expand = makeButton("expand", "View full size", "expand");
    expand.addEventListener("click", function () {
      openAt(index);
    });
    viewport.appendChild(expand);
    carousel.appendChild(prev);
    carousel.appendChild(viewport);
    carousel.appendChild(next);
    gallery.appendChild(counter);
    gallery.classList.add("is-carousel");
    if (count === 1) {
      gallery.classList.add("single");
    }

    var index = 0;
    var lastSwipe = 0;
    var thumbStrip = null;
    var thumbButtons = [];

    function revealThumb(thumb) {
      var left = thumb.offsetLeft;
      var right = left + thumb.offsetWidth;
      if (left < thumbStrip.scrollLeft || right > thumbStrip.scrollLeft + thumbStrip.clientWidth) {
        thumbStrip.scrollLeft = left - (thumbStrip.clientWidth - thumb.offsetWidth) / 2;
      }
    }

    function show(target, auto) {
      index = Math.max(0, Math.min(count - 1, target));
      strip.style.transform = "translateX(" + (-100 * index) + "%)";
      for (var i = 0; i < count; i++) {
        slides[i].setAttribute("aria-hidden", i === index ? "false" : "true");
      }
      prev.disabled = index === 0;
      next.disabled = index === count - 1;
      counter.setAttribute("aria-live", auto ? "off" : "polite");
      counter.textContent = (index + 1) + " / " + count;
      if (!auto) {
        schedule();
      }
      for (var t = 0; t < thumbButtons.length; t++) {
        var current = thumbButtons[t].slide === index;
        thumbButtons[t].element.setAttribute("aria-current", current ? "true" : "false");
        if (current && thumbStrip.clientWidth > 0) {
          revealThumb(thumbButtons[t].element);
        }
      }
    }

    prev.addEventListener("click", function () { show(index - 1); });
    next.addEventListener("click", function () { show(index + 1); });

    gallery.tabIndex = 0;
    gallery.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        show(index - 1);
      } else if (event.key === "ArrowRight") {
        show(index + 1);
      } else if (event.key === "Enter" && event.target === gallery) {
        openAt(index);
      } else {
        return;
      }
      event.preventDefault();
    });

    onSwipe(viewport, function (step) {
      lastSwipe = Date.now();
      show(index + step);
    });

    var items = [];
    var positions = [];
    for (var i = 0; i < count; i++) {
      var img = slides[i].querySelector("img");
      if (!img) {
        continue;
      }
      var figcaption = slides[i].querySelector("figcaption");
      positions.push(i);
      items.push({
        src: img.getAttribute("src"),
        alt: img.getAttribute("alt") || "",
        caption: figcaption ? figcaption.textContent : ""
      });
      img.classList.add("zoomable");
      img.addEventListener("click", (function (slide) {
        return function () {
          if (Date.now() - lastSwipe < 400) {
            return;
          }
          openAt(slide);
        };
      })(i));
    }

    if (items.length > 1) {
      thumbStrip = document.createElement("div");
      thumbStrip.className = "thumbs";
      positions.forEach(function (slide, itemIndex) {
        var thumb = document.createElement("button");
        thumb.type = "button";
        thumb.className = "thumb";
        thumb.setAttribute("aria-label", items[itemIndex].caption || "Screenshot " + (itemIndex + 1));
        var picture = document.createElement("img");
        picture.src = items[itemIndex].src;
        picture.alt = "";
        picture.loading = "lazy";
        thumb.appendChild(picture);
        thumb.addEventListener("click", function () {
          show(slide);
        });
        thumbStrip.appendChild(thumb);
        thumbButtons.push({ element: thumb, slide: slide });
      });
      gallery.insertBefore(thumbStrip, counter);
      gallery.classList.add("has-thumbs");
    }

    function openAt(slide) {
      var at = positions.indexOf(slide);
      if (at === -1) {
        return;
      }
      lightbox.open(items, at, function (itemIndex) {
        show(positions[itemIndex]);
      });
    }

    var timer = null;
    var inView = false;

    function canAdvance() {
      return count > 1 && inView && !reduceMotion && !document.hidden &&
        !document.documentElement.classList.contains("lightbox-open");
    }

    function schedule() {
      clearTimeout(timer);
      timer = null;
      if (!canAdvance()) {
        return;
      }
      timer = setTimeout(function () {
        timer = null;
        if (!canAdvance()) {
          return;
        }
        show(index + 1 >= count ? 0 : index + 1, true);
        schedule();
      }, autoDelay);
    }

    window.addEventListener("scroll", function () {
      if (inView) {
        schedule();
      }
    }, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("lightboxclose", schedule);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[entries.length - 1].isIntersecting;
        schedule();
      }, { threshold: 0.6 }).observe(viewport);
    }

    show(0);
  }

  var galleries = document.querySelectorAll(".gallery");
  for (var i = 0; i < galleries.length; i++) {
    setUp(galleries[i]);
  }

  function setUpTabs(host, panels) {
    if (!host || panels.length < 2) {
      return;
    }
    var bar = document.createElement("div");
    bar.className = "device-tabs";
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", "Screenshots by device");
    var tabs = [];

    function select(index, moveFocus) {
      for (var t = 0; t < tabs.length; t++) {
        var active = t === index;
        tabs[t].setAttribute("aria-selected", active ? "true" : "false");
        tabs[t].tabIndex = active ? 0 : -1;
        panels[t].hidden = !active;
      }
      if (moveFocus) {
        tabs[index].focus();
      }
    }

    Array.prototype.forEach.call(panels, function (panel, index) {
      var heading = panel.querySelector("h3");
      var shots = panel.querySelectorAll(".shot img").length;
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "device-tab";
      tab.id = "device-tab-" + index;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", "device-panel-" + index);
      var label = document.createElement("span");
      label.textContent = heading ? heading.textContent : "Screenshots";
      tab.appendChild(label);
      if (shots > 0) {
        var badge = document.createElement("span");
        badge.className = "device-tab-count";
        badge.textContent = shots;
        tab.appendChild(badge);
      } else if (panel.hasAttribute("data-soon")) {
        var soon = document.createElement("span");
        soon.className = "device-tab-count is-soon";
        soon.textContent = "Soon";
        tab.appendChild(soon);
      }
      tab.addEventListener("click", function () {
        select(index, false);
      });
      tab.addEventListener("keydown", function (event) {
        var target = null;
        if (event.key === "ArrowRight") {
          target = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft") {
          target = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          target = 0;
        } else if (event.key === "End") {
          target = tabs.length - 1;
        }
        if (target !== null) {
          event.preventDefault();
          select(target, true);
        }
      });
      panel.id = "device-panel-" + index;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      tabs.push(tab);
      bar.appendChild(tab);
    });

    host.insertBefore(bar, panels[0]);
    host.classList.add("has-tabs");
    select(0, false);
  }

  setUpTabs(document.querySelector(".screenshots"), galleries);

  function revealLinkedSection() {
    var id = window.location.hash.slice(1);
    var target = id ? document.getElementById(id) : null;
    if (target) {
      target.scrollIntoView({ block: "start" });
    }
  }

  if (window.location.hash) {
    revealLinkedSection();
    window.addEventListener("load", revealLinkedSection);
  }
})();
