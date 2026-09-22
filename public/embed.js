/*!
 * Reviews Widget embed
 * Usage:
 *   <div data-reviews-widget="WIDGET_ID"></div>
 *   <script src="https://YOUR-DOMAIN/embed.js" async></script>
 *
 * Renders inside a Shadow DOM so the host page's CSS can never touch it and
 * vice-versa. No dependencies.
 */
(function () {
  "use strict";

  // ---- Resolve the API origin from this script's own <src> --------------
  var thisScript =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      for (var i = s.length - 1; i >= 0; i--) {
        if (/embed\.js(\?|$)/.test(s[i].src)) return s[i];
      }
      return null;
    })();
  var ORIGIN = thisScript
    ? new URL(thisScript.src, location.href).origin
    : location.origin;

  // ---- Small helpers ----------------------------------------------------
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---- Inline SVGs ------------------------------------------------------
  var SVG = {
    star:
      '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>',
    google:
      '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.4 6-4.8z"/></svg>',
    facebook:
      '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7v-3.5h3.1V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="10" fill="#34A853"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function starsHTML(rating) {
    var full = Math.round(rating || 0);
    var out = '<span class="rw-stars">';
    for (var i = 1; i <= 5; i++) {
      out += '<span class="rw-star' + (i <= full ? " on" : "") + '">' + SVG.star + "</span>";
    }
    return out + "</span>";
  }

  function sourceBadge(source) {
    return (
      '<span class="rw-badge">' +
      (source === "facebook" ? SVG.facebook : SVG.google) +
      "</span>"
    );
  }

  // ---- Styles (scoped inside shadow root) -------------------------------
  function styles(accent) {
    return (
      "" +
      ":host{all:initial}" +
      "*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
      ".rw{color:#1a2b28;width:100%}" +
      ".rw-head{margin-bottom:22px}" +
      ".rw-eyebrow{color:" + accent + ";font-weight:600;font-size:14px;letter-spacing:.02em}" +
      ".rw-title{font-size:clamp(26px,4vw,42px);font-weight:800;line-height:1.1;margin:8px 0 10px;color:#12201d}" +
      ".rw-sub{color:#5a6b67;font-size:16px;max-width:640px;line-height:1.5}" +
      ".rw-tabs{display:flex;gap:22px;justify-content:center;align-items:center;border-bottom:1px solid #e7ece9;margin:8px 0 26px;flex-wrap:wrap}" +
      ".rw-tab{display:flex;align-items:center;gap:7px;background:none;border:none;cursor:pointer;padding:12px 2px;color:#5a6b67;font-size:14px;border-bottom:2px solid transparent;margin-bottom:-1px}" +
      ".rw-tab .n{font-weight:700;color:#12201d}" +
      ".rw-tab.active{color:#12201d;border-bottom-color:#12201d}" +
      ".rw-carousel{position:relative}" +
      ".rw-viewport{overflow:hidden}" +
      ".rw-track{display:flex;gap:20px;transition:transform .45s cubic-bezier(.4,0,.2,1);will-change:transform}" +
      ".rw-card{flex:0 0 auto;background:#f7f9f8;border:1px solid #eef2f0;border-radius:14px;padding:22px 20px;display:flex;flex-direction:column}" +
      ".rw-card .rw-stars{display:inline-flex;gap:2px;margin-bottom:12px;justify-content:center}" +
      ".rw-star svg{fill:#dfe4e2;display:block}" +
      ".rw-star.on svg{fill:#f5a623}" +
      ".rw-text{color:#3a4a46;font-size:15px;line-height:1.55;text-align:center;flex:1}" +
      ".rw-text.clamp{display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}" +
      ".rw-more{display:block;margin:8px auto 0;background:none;border:none;color:" + accent + ";font-weight:600;font-size:14px;cursor:pointer}" +
      ".rw-author{display:flex;flex-direction:column;align-items:center;gap:6px;margin-top:18px}" +
      ".rw-ava{position:relative;width:44px;height:44px;border-radius:50%;background:#d9e0dd center/cover no-repeat;overflow:visible;display:flex;align-items:center;justify-content:center;color:#5a6b67;font-weight:700;font-size:16px}" +
      ".rw-ava img{width:100%;height:100%;border-radius:50%;object-fit:cover}" +
      ".rw-badge{position:absolute;right:-3px;bottom:-3px;width:20px;height:20px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.15)}" +
      ".rw-name{display:flex;align-items:center;gap:5px;font-weight:700;font-size:14px;color:#12201d}" +
      ".rw-when{color:#8a9994;font-size:12px}" +
      ".rw-nav{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;border:none;background:" + accent + ";color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.18);z-index:2;opacity:.92}" +
      ".rw-nav:hover{opacity:1}" +
      ".rw-nav[disabled]{opacity:.35;cursor:default}" +
      ".rw-prev{left:-14px}.rw-prev svg{transform:rotate(180deg)}" +
      ".rw-next{right:-14px}" +
      ".rw-dots{display:flex;gap:7px;justify-content:center;margin-top:22px}" +
      ".rw-dot{width:7px;height:7px;border-radius:50%;background:#cfd8d4;border:none;padding:0;cursor:pointer}" +
      ".rw-dot.active{background:#12201d}" +
      ".rw-empty{color:#8a9994;text-align:center;padding:40px}" +
      "@media(max-width:520px){.rw-nav{display:none}}"
    );
  }

  // ---- Render one widget ------------------------------------------------
  function render(mount, data) {
    var theme = (data && data.theme) || {};
    var accent = theme.accent || "#1f6f5c";

    var host = el("div");
    var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    mount.appendChild(host);

    var style = el("style", null, styles(accent));
    shadow.appendChild(style);

    var root = el("div", { class: "rw" });
    shadow.appendChild(root);

    var reviews = (data && data.reviews) || [];
    var summary = (data && data.summary) || { overall: 0, total: 0, google: {}, facebook: {} };

    // Header
    if (theme.showHeader !== false && (theme.title || theme.eyebrow)) {
      root.appendChild(
        el(
          "div",
          { class: "rw-head" },
          (theme.eyebrow ? '<div class="rw-eyebrow">- ' + esc(theme.eyebrow) + "</div>" : "") +
            (theme.title ? '<div class="rw-title">' + esc(theme.title) + "</div>" : "") +
            (theme.subtitle ? '<div class="rw-sub">' + esc(theme.subtitle) + "</div>" : "")
        )
      );
    }

    // Tabs
    var hasG = (summary.google && summary.google.total) || reviews.some(function (r) { return r.source === "google"; });
    var hasF = (summary.facebook && summary.facebook.total) || reviews.some(function (r) { return r.source === "facebook"; });
    var tabs = el("div", { class: "rw-tabs" });
    var current = "all";

    function tabBtn(key, label, logo, num) {
      var b = el("button", { class: "rw-tab" + (key === current ? " active" : "") });
      b.innerHTML = (logo || "") + esc(label) + (num ? ' <span class="n">' + num + "</span>" : "");
      b.onclick = function () {
        current = key;
        Array.prototype.forEach.call(tabs.children, function (c) { c.classList.remove("active"); });
        b.classList.add("active");
        build();
      };
      return b;
    }
    tabs.appendChild(tabBtn("all", "All Reviews", "", summary.overall ? summary.overall.toFixed(1) : ""));
    if (hasG) tabs.appendChild(tabBtn("google", "Google", SVG.google, summary.google && summary.google.rating ? summary.google.rating.toFixed(1) : ""));
    if (hasF) tabs.appendChild(tabBtn("facebook", "Facebook", SVG.facebook, summary.facebook && summary.facebook.rating ? summary.facebook.rating.toFixed(1) : ""));
    root.appendChild(tabs);

    // Carousel scaffold
    var carousel = el("div", { class: "rw-carousel" });
    var viewport = el("div", { class: "rw-viewport" });
    var track = el("div", { class: "rw-track" });
    viewport.appendChild(track);
    var prev = el("button", { class: "rw-nav rw-prev", "aria-label": "Previous" }, SVG.arrow);
    var next = el("button", { class: "rw-nav rw-next", "aria-label": "Next" }, SVG.arrow);
    carousel.appendChild(prev);
    carousel.appendChild(viewport);
    carousel.appendChild(next);
    root.appendChild(carousel);
    var dots = el("div", { class: "rw-dots" });
    root.appendChild(dots);

    var page = 0;

    function cardHTML(r) {
      var initials = (r.author || "?").trim().charAt(0).toUpperCase();
      var ava =
        '<div class="rw-ava">' +
        (r.avatar ? '<img src="' + esc(r.avatar) + '" alt="" loading="lazy" onerror="this.remove()">' : esc(initials)) +
        sourceBadge(r.source) +
        "</div>";
      var longText = (r.text || "").length > 200;
      var card = el("div", { class: "rw-card" });
      card.innerHTML =
        starsHTML(r.rating) +
        '<div class="rw-text' + (longText ? " clamp" : "") + '">' + esc(r.text) + "</div>" +
        (longText ? '<button class="rw-more">Read more</button>' : "") +
        '<div class="rw-author">' +
        ava +
        '<div class="rw-name">' + esc(r.author) + SVG.check + "</div>" +
        '<div class="rw-when">' + esc(r.relativeTime || "") + "</div>" +
        "</div>";
      var moreBtn = card.querySelector(".rw-more");
      if (moreBtn) {
        moreBtn.onclick = function () {
          var t = card.querySelector(".rw-text");
          var open = t.classList.toggle("clamp") === false;
          moreBtn.textContent = open ? "Show less" : "Read more";
        };
      }
      return card;
    }

    function filtered() {
      if (current === "all") return reviews;
      return reviews.filter(function (r) { return r.source === current; });
    }

    var GAP = 20;
    function perView(w) {
      if (w < 520) return 1;
      if (w < 800) return 2;
      if (w < 1080) return 3;
      return 4;
    }

    function build() {
      page = 0;
      track.innerHTML = "";
      var list = filtered();
      if (!list.length) {
        track.innerHTML = '<div class="rw-empty">No reviews yet.</div>';
        prev.style.display = next.style.display = "none";
        dots.innerHTML = "";
        return;
      }
      list.forEach(function (r) { track.appendChild(cardHTML(r)); });
      layout();
    }

    var n = 4,
      cardW = 0,
      pages = 1;

    function layout() {
      var w = viewport.clientWidth || mount.clientWidth || 1000;
      n = perView(w);
      var list = filtered();
      cardW = (w - (n - 1) * GAP) / n;
      Array.prototype.forEach.call(track.children, function (c) {
        c.style.width = cardW + "px";
      });
      pages = Math.max(1, Math.ceil(list.length / n));
      if (page > pages - 1) page = pages - 1;
      renderDots();
      update();
      var multi = list.length > n;
      prev.style.display = next.style.display = multi ? "flex" : "none";
    }

    function update() {
      var shift = page * n * (cardW + GAP);
      track.style.transform = "translateX(-" + shift + "px)";
      prev.disabled = page <= 0;
      next.disabled = page >= pages - 1;
      Array.prototype.forEach.call(dots.children, function (d, i) {
        d.classList.toggle("active", i === page);
      });
    }

    function renderDots() {
      dots.innerHTML = "";
      if (pages <= 1) return;
      for (var i = 0; i < pages; i++) {
        var d = el("button", { class: "rw-dot" + (i === page ? " active" : ""), "aria-label": "Page " + (i + 1) });
        (function (idx) {
          d.onclick = function () { page = idx; update(); };
        })(i);
        dots.appendChild(d);
      }
    }

    prev.onclick = function () { if (page > 0) { page--; update(); } };
    next.onclick = function () { if (page < pages - 1) { page++; update(); } };

    if (window.ResizeObserver) {
      new ResizeObserver(function () { layout(); }).observe(viewport);
    } else {
      window.addEventListener("resize", layout);
    }

    build();
  }

  // ---- Boot: find every mount point and load its data -------------------
  function init() {
    var mounts = document.querySelectorAll("[data-reviews-widget]:not([data-rw-done])");
    Array.prototype.forEach.call(mounts, function (mount) {
      var id = mount.getAttribute("data-reviews-widget");
      if (!id) return;
      mount.setAttribute("data-rw-done", "1");
      fetch(ORIGIN + "/api/reviews/" + encodeURIComponent(id))
        .then(function (r) { return r.json(); })
        .then(function (data) { render(mount, data); })
        .catch(function (e) {
          mount.innerHTML =
            '<div style="color:#8a9994;font:14px system-ui;padding:20px">Reviews unavailable.</div>';
          if (window.console) console.error("[reviews-widget]", e);
        });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
