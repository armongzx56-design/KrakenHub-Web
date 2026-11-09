/* โปรไฟล์มุมขวาบน (ทุกหน้า) + เครื่องมือกลาง window.RVX ที่หน้า /buy /me /key ใช้ร่วมกัน
   อ่านข้อมูลจาก /api/shop/session (เบา ไม่มีรายการคีย์) และใช้ระบบสองภาษาเดียวกับ site.js */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lang = () => (document.documentElement.lang === "en" ? "en" : "th");
const t = (k, p) => {
  const D = window.I18N || {};
  let s = (D[lang()] && D[lang()][k]) ?? (D.th && D.th[k]) ?? k;
  if (p) for (const [a, b] of Object.entries(p)) s = s.split("{" + a + "}").join(b);
  return s;
};
const loc = () => (lang() === "en" ? "en-GB" : "th-TH");
const baht = s => (s < 0 ? "-" : "") + "฿" + (Math.abs(s) / 100).toLocaleString(loc(), { maximumFractionDigits: 2 });
const fmt = n => new Date(n).toLocaleString(loc(), { dateStyle: "medium", timeStyle: "short" });
const dur = h => (h === 0 ? t("u.life") : h % 24 === 0 ? t("u.days", { n: h / 24 }) : t("u.hours", { n: h }));
const ic = (n, c = "") => `<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const RETURN = ["/", "/buy", "/me", "/topup", "/key", "/maps", "/get", "/status", "/updates", "/privacy", "/live", "/accounts"];
const nextPath = () => { const p = location.pathname.replace(/\/+$/, "") || "/"; return RETURN.includes(p) ? p : "/me"; };
const loginHref = () => "/login?next=" + encodeURIComponent(nextPath());

async function api(url, method, body) {
  let token = null;
  try { token = localStorage.getItem("kraken_token"); } catch(e){}
  const headers = body ? { "Content-Type": "application/json" } : {};
  if (token) headers["Authorization"] = "Bearer " + token;
  const r = await fetch(url, { method: method || "GET", headers: headers, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin", cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || t("err.generic")); e.status = r.status; e.data = d; throw e; }
  return d;
}

function toast(msg, kind) {
  const box = $("#toasts"); if (!box) return;
  const el = document.createElement("div");
  el.className = "toast" + (kind === "er" ? " er" : "");
  el.innerHTML = ic(kind === "er" ? "alert" : "check") + `<span>${esc(msg)}</span>`;
  box.append(el);
  setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, kind === "er" ? 4600 : 2800);
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/* กล่องยืนยัน (ใช้ดีไซน์ .dlg เดียวกับหน้าแมพ) */
function modal({ title, body, ok, cancel, danger, onOk, hideOk }) {
  return new Promise(res => {
    const prev = document.activeElement;
    const o = document.createElement("div");
    o.className = "dlg"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
    o.innerHTML = `<div class="dlg-card mdl"><div class="dlg-body-in"><h2>${esc(title)}</h2><div class="mdl-body">${body || ""}</div>
      <div class="mdl-foot"><button type="button" class="btn-pill ghost sm" data-x="c">${esc(cancel || t("m.cancel"))}</button>${hideOk ? "" : `<button type="button" class="btn-pill sm ${danger ? "danger" : "primary"}" data-x="o">${esc(ok || t("m.ok"))}</button>`}</div></div></div>`;
    const close = v => {
      o.classList.remove("on"); document.removeEventListener("keydown", kd);
      document.body.style.overflow = "";
      setTimeout(() => o.remove(), 250);
      if (prev && prev.focus) prev.focus({ preventScroll: true });
      res(v);
    };
    const kd = e => { if (e.key === "Escape") close(null); };
    document.addEventListener("keydown", kd);
    o.addEventListener("mousedown", e => { if (e.target === o) close(null); });
    o.addEventListener("click", async e => {
      const b = e.target.closest("[data-x]"); if (!b) return;
      if (b.dataset.x === "c") return close(null);
      if (onOk) {
        b.disabled = true;
        try { const v = await onOk(o); close(v === undefined ? true : v); }
        catch (x) { b.disabled = false; toast(x.message, "er"); }
      } else close(true);
    });
    document.body.append(o); document.body.style.overflow = "hidden";
    requestAnimationFrame(() => o.classList.add("on"));
    const f = o.querySelector("input,.btn-pill.primary,.btn-pill.danger,.btn-pill");
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
  });
}

function avatar(u, px) {
  px = px || 32;
  const letter = esc(((u && u.name) || "?").trim().slice(0, 1).toUpperCase());
  const img = u && u.avatar && /^[a-z0-9_]{1,64}$/i.test(u.avatar) && /^\d{5,25}$/.test(String(u.id))
    ? `<img src="https://cdn.discordapp.com/avatars/${esc(u.id)}/${esc(u.avatar)}.png?size=${px > 48 ? 128 : 64}" alt="" width="${px}" height="${px}" referrerpolicy="no-referrer">` : "";
  return `<span class="av" style="--s:${px}px"><b>${letter}</b>${img}</span>`;
}

/* ---------- session + โปรไฟล์ในเมนูบน ---------- */
let S = null, inflight = null;
async function loadSession(force) {
  if (inflight && !force) return inflight;
  inflight = api("/api/shop/session").catch(() => ({ authed: false, offline: true }));
  S = await inflight;
  renderAcct();
  window.dispatchEvent(new CustomEvent("rvx:session", { detail: S }));
  return S;
}

const menu = () => $("#acct-menu"), btn = () => $("#acct-btn");
function setMenu(open) {
  const m = menu(), b = btn(); if (!m || !b) return;
  m.classList.toggle("open", open); b.setAttribute("aria-expanded", open);
}
function renderAcct() {
  if (!S || !$("#acct")) return;
  const pill = $("#acct-login"), guest = $("#acct-guest"), b = btn(), m = menu(), sheetAcc = $("#sheet-acc"), sheetUser = $("#sheet-user");
  if (!S.authed) {
    const href = loginHref();
    pill.href = href; guest.href = href; pill.hidden = !!S.offline; guest.hidden = !!S.offline; b.hidden = true; m.innerHTML = ""; setMenu(false);
    if (sheetAcc) sheetAcc.hidden = true;
    if (sheetUser) { sheetUser.hidden = !!S.offline; sheetUser.innerHTML = `<a class="btn-pill primary" href="${esc(href)}">${ic("user")}<span>${esc(t("acct.login"))}</span></a>`; }
    return;
  }
  pill.hidden = true; guest.hidden = true; b.hidden = false;
  const u = S.user;
  b.setAttribute("aria-label", t("acct.menu"));
  b.innerHTML = avatar(u, 32) + `<span class="acct-credit num">${esc(baht(S.credit))}</span>`;
  m.innerHTML = `<div class="am-head">${avatar(u, 44)}<div class="am-who"><b>${esc(u.name)}</b><small>Discord · ${esc(u.id)}</small></div></div>
    <div class="am-credit"><div><small>${esc(t("acct.credit"))}</small><b class="num">${esc(baht(S.credit))}</b></div><a class="btn-pill sm primary" href="/topup"><span>${esc(t("acct.topup"))}</span></a></div>
    <div class="am-links" role="none">
      <a role="menuitem" href="/me">${ic("grid")}<span>${esc(t("acct.profile"))}</span></a>
      <a role="menuitem" href="/me#keys">${ic("key")}<span>${esc(t("acct.keys"))}</span>${S.activeKeys ? `<em class="am-n num">${S.activeKeys}</em>` : ""}</a>
      <a role="menuitem" href="/accounts">${ic("users")}<span>${esc(t("acct.accts"))}</span></a>
      <a role="menuitem" href="/buy">${ic("bag")}<span>${esc(t("nav.shop"))}</span></a>
      <a role="menuitem" href="/key">${ic("gift")}<span>${esc(t("acct.free"))}</span></a>
    </div>
    <button type="button" class="am-out" id="acct-out">${ic("logout")}<span>${esc(t("acct.logout"))}</span></button>`;
  if (sheetAcc) sheetAcc.hidden = false;
  if (sheetUser) { sheetUser.hidden = false; sheetUser.innerHTML = `<a class="su-id" href="/me">${avatar(u, 42)}<div><b>${esc(u.name)}</b><small class="num">${esc(baht(S.credit))}</small></div></a><a class="btn-pill sm primary" href="/topup"><span>${esc(t("acct.topup"))}</span></a>`; }
}

document.addEventListener("click", async e => {
  const b = e.target.closest("#acct-btn");
  if (b) { setMenu(!menu().classList.contains("open")); return; }
  const out = e.target.closest("#acct-out,#me-out");
  if (out) {
    out.disabled = true;
    try { localStorage.removeItem("kraken_token"); localStorage.removeItem("kraken_user"); } catch(e){}
    try { await api("/api/shop/logout", "POST", {}); } catch {}
    location.href = location.pathname === "/me" ? "/buy" : location.pathname + location.search;
    return;
  }
  if (!e.target.closest("#acct")) setMenu(false);
  else if (e.target.closest(".am-links a,.am-credit a")) setMenu(false);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && menu() && menu().classList.contains("open")) { setMenu(false); const bb = btn(); if (bb) bb.focus(); } });
window.addEventListener("langchange", renderAcct);
window.addEventListener("pageshow", e => { if (e.persisted) loadSession(true); });

/* login แล้วเด้งกลับมาพร้อม ?error=… */
const err = new URLSearchParams(location.search).get("error");
if (err && /^(cancel|state|failed|config|banned|full)$/.test(err)) {
  setTimeout(() => toast(t("login.err." + err), "er"), 350);
  history.replaceState(null, "", location.pathname + location.hash);
}

window.RVX = { t, lang, esc, api, toast, modal, copy, baht, fmt, dur, ic, avatar, loginHref, session: () => S, refresh: loadSession,
  onSession: fn => { window.addEventListener("rvx:session", e => fn(e.detail)); if (S) fn(S); } };
loadSession();
})();
