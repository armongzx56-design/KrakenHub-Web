/* หน้า /login: เลือกเข้าสู่ระบบด้วย Discord */
(() => {
"use strict";
const R = window.RVX; if (!R) return;
const { t, esc, ic } = R;
const q = new URLSearchParams(location.search).get("next");
const next = q && /^\/[a-z]*$/.test(q) ? q : "/me";
const CLIENT_ID = "1554520200848875611";
const REDIRECT_URI = "https://krakenhub-three.vercel.app/api/auth/callback";
const state = btoa(JSON.stringify({ next })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify&state=${state}`;

const go = document.getElementById("lg-go");
if (go) go.href = discordAuthUrl;
R.onSession(s => {
  if (s && s.authed) { location.replace(next); return; }   // ล็อกอินอยู่แล้ว ไม่ต้องอยู่หน้านี้
  const box = document.getElementById("lg-msg");
  if (s && s.loginReady === false) {
    box.innerHTML = `<div class="msgbox">${esc(t("buy.noLogin"))}</div>`;
    go.setAttribute("aria-disabled", "true"); go.classList.add("off"); go.removeAttribute("href");
  }
});
})();
