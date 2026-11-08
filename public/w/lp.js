/* หน้าหลัก: (1) ตรวจโทนธีมของเว็บเพื่อเลือกชุดสีปุ่ม/โลโก้ (2) แสงไล่ตามนิ้วหรือเมาส์บนโลโก้ */
(function () {
  "use strict";
  var root = document.getElementById("lp");
  var mark = document.getElementById("lp-mark");
  if (!root || !mark) return;

  /* ---------- โลโก้โหลดไม่ได้ -> แสดงข้อความแทน ---------- */
  var probe = new Image();
  probe.onerror = function () { mark.classList.add("noimg"); };
  probe.src = "/kraken-logo.png";

  /* ---------- โทนธีม ---------- */
  function parse(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return null;
    var p = m[1].split(/[ ,\/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function tone() {
    var c = parse(getComputedStyle(document.body).backgroundColor);
    if (!c || c.a < 0.5) c = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (!c || c.a < 0.5) return "dark";
    var l = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
    return l > 0.55 ? "light" : "dark";
  }
  function applyTone() { var t = tone(); if (root.getAttribute("data-tone") !== t) root.setAttribute("data-tone", t); }
  applyTone();
  try {
    var mo = new MutationObserver(applyTone);
    mo.observe(document.documentElement, { attributes: true });
    mo.observe(document.body, { attributes: true });
  } catch (e) {}
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("#theme")) { setTimeout(applyTone, 80); setTimeout(applyTone, 500); }
  });
  if (window.matchMedia) { try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { setTimeout(applyTone, 80); }); } catch (e) {} }
  window.addEventListener("load", applyTone);

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ปุ่มสลับภาษา: ใช้ปุ่มเดิมของเว็บ (#lang) จึงตรงกับระบบภาษาที่มีอยู่ ---------- */
  var langBtn = document.getElementById("lp-lang"), langTxt = document.getElementById("lp-lang-t");
  function syncLang() {
    var src = document.getElementById("lang-t");
    if (src && src.textContent.trim()) langTxt.textContent = src.textContent.trim();
  }
  window.addEventListener("load", function () {
    var src = document.getElementById("lang"), srcT = document.getElementById("lang-t");
    if (!langBtn || !src) return;
    langBtn.hidden = false; syncLang();
    langBtn.addEventListener("click", function () { src.click(); setTimeout(syncLang, 60); setTimeout(syncLang, 400); });
    if (srcT) { try { new MutationObserver(syncLang).observe(srcT, { childList: true, characterData: true, subtree: true }); } catch (e) {} }
  });

  /* ---------- ผู้ใช้ที่มีคีย์ใช้งานอยู่: ปุ่มหลักเปลี่ยนเป็น "คีย์ของฉัน" (ข้อมูลจริงจาก /api/shop/session) ---------- */
  var main = document.getElementById("lp-main");
  if (main && window.fetch) {
    fetch("/api/shop/session", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.authed || d.banned || !(d.activeKeys > 0)) return;
        var span = main.querySelector("span"), I = window.I18N;
        if (!span || !I || !I.th || !I.en) return;
        var cur = span.textContent.trim();
        var lang = cur === I.en["acct.free"] ? "en" : "th";
        main.setAttribute("href", "/me");
        span.setAttribute("data-i", "lp.mykeys");
        span.textContent = I[lang]["lp.mykeys"] || span.textContent;
      })
      .catch(function () {});
  }

  /* ---------- จางออกก่อนเปลี่ยนหน้า ---------- */
  if (!reduce) {
    root.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.lp-btn");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target) return;
      e.preventDefault();
      root.classList.add("leaving");
      var href = a.href, gone = false;
      function go() { if (!gone) { gone = true; location.href = href; } }
      setTimeout(go, 280);
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) root.classList.remove("leaving"); });
  }

  /* ---------- ปุ่มดึงเข้าหาเมาส์ (เฉพาะคอมพิวเตอร์) ---------- */
  if (!reduce && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var btns = Array.prototype.slice.call(root.querySelectorAll(".lp-btn"));
    var REACH = 56;
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      btns.forEach(function (b) {
        var r = b.getBoundingClientRect();
        var cx0 = r.left + r.width / 2, cy0 = r.top + r.height / 2;
        var inside = e.clientX > r.left - REACH && e.clientX < r.right + REACH && e.clientY > r.top - REACH && e.clientY < r.bottom + REACH;
        if (inside) {
          b.style.setProperty("--tx", Math.max(-10, Math.min(10, (e.clientX - cx0) * 0.22)).toFixed(1) + "px");
          b.style.setProperty("--ty", Math.max(-7, Math.min(7, (e.clientY - cy0) * 0.3)).toFixed(1) + "px");
        } else { b.style.removeProperty("--tx"); b.style.removeProperty("--ty"); }
      });
    }, { passive: true });
    document.addEventListener("pointerleave", function () { btns.forEach(function (b) { b.style.removeProperty("--tx"); b.style.removeProperty("--ty"); }); });
  }

  /* ---------- แสงบนโลโก้ ---------- */
  if (reduce) { mark.style.setProperty("--mx", "50%"); mark.style.setProperty("--my", "40%"); return; }

  var cx = -15, cy = 30, tx = 50, ty = 40;   // ตำแหน่งแสง (%)
  var rx = 0, ry = 0, trx = 0, try_ = 0;     // การเอียง (องศา)
  var lastInput = 0, t0 = performance.now(), raf = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function onMove(e) {
    var r = mark.getBoundingClientRect(); if (!r.width) return;
    var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    tx = clamp(px * 100, -20, 120); ty = clamp(py * 100, -20, 120);
    trx = clamp((px - 0.5) * 10, -7, 7); try_ = clamp((0.5 - py) * 8, -6, 6);
    lastInput = performance.now();
  }
  function onLeave() { trx = 0; try_ = 0; lastInput = performance.now() - 1200; }
  root.addEventListener("pointermove", onMove, { passive: true });
  root.addEventListener("pointerdown", onMove, { passive: true });
  root.addEventListener("pointerleave", onLeave);
  root.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") onLeave(); });

  function frame(now) {
    var idle = now - lastInput > 2200;
    if (idle) {
      var t = (now - t0) / 1000;
      tx = 50 + 40 * Math.sin(t * 0.4);
      ty = 42 + 24 * Math.sin(t * 0.3 + 1);
      trx *= 0.94; try_ *= 0.94;
    }
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    rx += (trx - rx) * 0.1; ry += (try_ - ry) * 0.1;
    mark.style.setProperty("--mx", cx.toFixed(2) + "%");
    mark.style.setProperty("--my", cy.toFixed(2) + "%");
    mark.style.setProperty("--rx", rx.toFixed(2) + "deg");
    mark.style.setProperty("--ry", ry.toFixed(2) + "deg");
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  start();
})();
