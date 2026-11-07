/* โลโก้ปกกลาง: แสงและการเอียงตามเมาส์/นิ้ว เหมือนหน้าหลัก (เบามาก ไม่ทำงานถ้าผู้ใช้ปิดแอนิเมชัน) */
(function () {
  var m = document.querySelector(".pg-mark"); if (!m) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var raf = 0, ev = null;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function apply() {
    raf = 0; var r = m.getBoundingClientRect(); if (!r.width || !ev) return;
    var px = (ev.clientX - r.left) / r.width, py = (ev.clientY - r.top) / r.height;
    m.style.setProperty("--mx", clamp(px * 100, -20, 120).toFixed(1) + "%");
    m.style.setProperty("--my", clamp(py * 100, -20, 120).toFixed(1) + "%");
    m.style.setProperty("--tx", clamp((px - 0.5) * 8, -6, 6).toFixed(2) + "deg");
    m.style.setProperty("--ty", clamp((0.5 - py) * 6, -5, 5).toFixed(2) + "deg");
  }
  document.addEventListener("pointermove", function (e) { ev = e; if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
  document.addEventListener("pointerleave", function () { m.style.removeProperty("--tx"); m.style.removeProperty("--ty"); });
})();
