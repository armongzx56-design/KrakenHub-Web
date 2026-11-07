/* หน้า /login: เลือกเข้าสู่ระบบด้วย Discord (ไม่เด้งไป Discord ทันทีอีกแล้ว) */
(() => {
"use strict";
const R = window.RVX; if (!R) return;
const { t, esc, ic } = R;
const q = new URLSearchParams(location.search).get("next");
const next = q && /^\/[a-z]*$/.test(q) ? q : "/me";
const go = document.getElementById("lg-go");
if (go) go.href = "/auth/customer?next=" + encodeURIComponent(next);
R.onSession(s => {
  if (s && s.authed) { location.replace(next); return; }   // ล็อกอินอยู่แล้ว ไม่ต้องอยู่หน้านี้
  const box = document.getElementById("lg-msg");
  if (s && s.loginReady === false) {
    box.innerHTML = `<div class="msgbox">${esc(t("buy.noLogin"))}</div>`;
    go.setAttribute("aria-disabled", "true"); go.classList.add("off"); go.removeAttribute("href");
  }
});
})();
