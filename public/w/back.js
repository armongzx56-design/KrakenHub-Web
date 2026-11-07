/* ปุ่มย้อนกลับกลาง
   - หน้าเว็บหลัก: ปุ่ม [data-back] ถูกใส่มาจากเซิร์ฟเวอร์ (layout.js) สคริปต์นี้แค่ผูกการทำงาน
   - หน้าแอดมิน/Live/หน้าอื่นที่ไม่มีปุ่ม: ใส่ปุ่มให้ที่แถบบนสุดของหน้านั้นเอง
   - กดแล้วกลับหน้าก่อนหน้าที่เปิดมาในแท็บนี้ ถ้าไม่มี (เปิดลิงก์ตรง) ไปหน้าแม่แทน ไม่เด้งออกนอกเว็บ */
(function () {
  if (window.__rvxBack) return; window.__rvxBack = 1;
  var KEY = "rvx-nav-stack", cur = location.pathname + location.search;
  function load() { try { var a = JSON.parse(sessionStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(a) { try { sessionStorage.setItem(KEY, JSON.stringify(a.slice(-40))); } catch (e) {} }

  var stack = load(), n = stack.length;
  if (n && stack[n - 1] === cur) { /* รีเฟรช */ }
  else if (n > 1 && stack[n - 2] === cur) stack.pop();
  else stack.push(cur);
  save(stack);

  function fallback(el) {
    var h = el && el.getAttribute("href");
    if (h && h !== "#") return h;
    var p = location.pathname;
    if (/^\/(admin|key-admin|shop-admin|market-admin)/.test(p)) return p === "/admin" ? "/" : "/admin";
    if (/^\/market\/./.test(p)) return "/market";
    return "/";
  }
  function go(el) { if (stack.length > 1) history.back(); else location.href = fallback(el); }

  var ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';

  function bind(el) {
    if (el.__rb) return; el.__rb = 1;
    el.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); go(el);
    });
  }

  function hide(el) { if (stack.length <= 1 && (location.pathname === "/" || location.pathname === "/admin")) el.hidden = true; }

  /* ใส่ปุ่มในแถบ header.top (เรียกซ้ำได้ เพราะ Vault วาดแถบใหม่ทุกครั้งที่เปลี่ยนหน้า) */
  function addTop() {
    var hs = document.querySelectorAll("header.top");
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i], host = h.querySelector(".top-in") || h;
      if (host.querySelector(".rvx-back-p")) continue;
      var el = document.createElement("a"); el.href = "#"; el.className = "rvx-back-p";
      el.innerHTML = ARROW + "<span>ย้อนกลับ</span>"; host.insertBefore(el, host.firstChild);
      /* ลิงก์ชื่อหน้าเดิมที่เป็นลูกศรย้อนกลับอยู่แล้ว ไม่ต้องซ้ำ */
      var old = host.querySelector("a.brand");
      if (old && /←|arrow-left/.test(old.innerHTML)) old.style.display = "none";
      bind(el); hide(el);
    }
  }
  var watching = 0;
  function watchTop() {
    if (watching || !window.MutationObserver) return; watching = 1;
    new MutationObserver(function () { addTop(); }).observe(document.body, { childList: true, subtree: true });
  }

  function mount() {
    var done = document.querySelectorAll("[data-back]");
    if (done.length) { for (var i = 0; i < done.length; i++) bind(done[i]); return; }

    var host, el;
    /* หลังบ้านแบบแถบบน (Admin hub / Market admin): ใส่ทุกแถบ เพราะแต่ละแท็บมีแถบของตัวเอง */
    var bars = document.querySelectorAll("header.bar");
    if (bars.length) {
      for (var k = 0; k < bars.length; k++) {
        var bb = document.createElement("button"); bb.type = "button"; bb.className = "btn ico rvx-back-i";
        bb.setAttribute("aria-label", "ย้อนกลับ"); bb.innerHTML = ARROW;
        bars[k].insertBefore(bb, bars[k].firstChild); bind(bb); hide(bb);
      }
      return;
    }
    /* หน้าที่มีแถบบนแบบ .top (Vault, ผู้ใช้, จัดการเว็บ, key เก่า) */
    if (document.querySelector("header.top")) { addTop(); watchTop(); return; }
    /* หน้า SPA (Vault) วาดแถบบนทีหลัง: รอแถบขึ้นก่อน ไม่ใช้ปุ่มลอย */
    if (document.getElementById("app")) { watchTop(); return; }
    /* Live: ปุ่มลูกศรเดิมที่มุมซ้ายบน */
    if ((host = document.querySelector('.topbar a.icon-btn[aria-label]'))) { host.setAttribute("data-back", ""); el = host; }
    /* หน้าหลัก (/) ไม่มีปุ่มย้อนกลับ */
    if (!el && location.pathname === "/") return;
    if (!el) {
      /* ไม่มีแถบบนเลย: วางเป็นแถวปกติบนสุดของหน้า (ไม่ลอย ไม่ทับโลโก้) */
      el = document.createElement("a"); el.href = "#"; el.className = "rvx-back-p rvx-back-row";
      el.innerHTML = ARROW + "<span>ย้อนกลับ</span>";
      /* วางใต้แถบบน (ถ้ามี) ไม่ให้อยู่สูงกว่าแถบ */
      var nav = document.querySelector("header.nav, header, nav");
      if (nav && nav.parentNode) nav.parentNode.insertBefore(el, nav.nextSibling);
      else document.body.insertBefore(el, document.body.firstChild);
    }
    bind(el); hide(el);
  }

  var css = document.createElement("style");
  css.textContent =
    ".rvx-back-p{display:inline-flex;align-items:center;gap:4px;height:34px;padding:0 10px 0 2px;margin-right:8px;border-radius:999px;border:0;background:none;color:inherit;font:500 13px/1 inherit;font-family:inherit;text-decoration:none;opacity:.65;cursor:pointer;flex:none;transition:opacity .2s,background .2s,transform .2s}" +
    ".rvx-back-p:hover{opacity:1}.rvx-back-p:active{transform:scale(.96)}" +
    ".rvx-back-p svg{flex:none;transition:transform .25s}.rvx-back-p:hover svg{transform:translateX(-2px)}" +
    ".rvx-back-row{display:flex;width:max-content;margin:8px 12px 0}" +
    ".rvx-back-i{flex:none;margin-right:4px;border:0!important;background:none!important;box-shadow:none!important;opacity:.7;display:inline-grid!important;place-items:center;width:34px;height:34px;padding:0!important}.rvx-back-i svg{display:block}" +
    "@media print{.rvx-back-p,.rvx-back-i,.pg-top{display:none!important}}";
  document.head.appendChild(css);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
