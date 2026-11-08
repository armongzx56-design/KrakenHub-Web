(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PAGE = document.body.dataset.page;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ic = (n, c = "") => `<svg class="i ${c}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};

/* ---------- language ---------- */
let lang = store.get("sv-lang") || ((navigator.language || "th").toLowerCase().startsWith("th") ? "th" : "en");
if (!window.I18N[lang]) lang = "th";
const t = (k, p) => {
  let s = (window.I18N[lang] && window.I18N[lang][k]) ?? window.I18N.th[k] ?? k;
  if (p) for (const [a, b] of Object.entries(p)) s = s.replace("{" + a + "}", b);
  return s;
};
const TITLES = {
  home: ["RVX Hub | สคริปต์เดียว หลายแมพ", "RVX Hub | One script. Many maps."], maps: ["แมพที่รองรับ | RVX Hub", "Supported maps | RVX Hub"],
  get: ["รับสคริปต์ | RVX Hub", "Get the script | RVX Hub"], status: ["สถานะระบบ | RVX Hub", "System status | RVX Hub"],
  updates: ["อัปเดตล่าสุด | RVX Hub", "What's new | RVX Hub"], privacy: ["ความเป็นส่วนตัว | RVX Hub", "Privacy | RVX Hub"],
  buy: ["ร้านค้า | RVX Hub", "Shop | RVX Hub"], me: ["โปรไฟล์ | RVX Hub", "Profile | RVX Hub"], key: ["รับคีย์ฟรี | RVX Hub", "Free key | RVX Hub"], accounts: ["บัญชีของฉัน | RVX Hub", "My accounts | RVX Hub"], 404: ["ไม่พบหน้านี้ | RVX Hub", "Page not found | RVX Hub"]
};
function applyLang() {
  document.documentElement.lang = lang;
  $$("[data-i]").forEach(el => { el.textContent = t(el.dataset.i); });
  $$("[data-i-ph]").forEach(el => { el.placeholder = t(el.dataset.iPh); });
  const tt = TITLES[PAGE]; if (tt) document.title = tt[lang === "th" ? 0 : 1];
  const lt = $("#lang-t"); if (lt) lt.textContent = lang.toUpperCase();
  window.dispatchEvent(new Event("langchange"));
}
const rtf = () => new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
function ago(ts) {
  const d = (ts - Date.now()) / 1000, a = Math.abs(d), f = rtf();
  if (a < 45) return t("ago.now");
  if (a < 3600) return f.format(Math.round(d / 60), "minute");
  if (a < 86400) return f.format(Math.round(d / 3600), "hour");
  if (a < 2592000) return f.format(Math.round(d / 86400), "day");
  if (a < 31536000) return f.format(Math.round(d / 2592000), "month");
  return f.format(Math.round(d / 31536000), "year");
}

/* ---------- theme ---------- */
function themeIcon() { const b = $("#theme"); if (b) b.innerHTML = ic(document.documentElement.dataset.theme === "dark" ? "sun" : "moon"); }
$("#theme").addEventListener("click", e => {
  const root = document.documentElement, n = root.dataset.theme === "dark" ? "light" : "dark";
  const apply = () => { root.dataset.theme = n; store.set("sv-theme", n); themeIcon(); };
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
  const r = e.currentTarget.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add("theme-vt");
  const vt = document.startViewTransition(apply);
  vt.ready.then(() => root.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
    { duration: 750, easing: "cubic-bezier(.65,0,.25,1)", pseudoElement: "::view-transition-new(root)" }
  )).catch(() => {});
  vt.finished.finally(() => root.classList.remove("theme-vt"));
});
$("#lang").addEventListener("click", () => { lang = lang === "th" ? "en" : "th"; store.set("sv-lang", lang); applyLang(); });

/* ---------- helpers ---------- */
function toast(msg) {
  const el = document.createElement("div"); el.className = "toast"; el.innerHTML = ic("check") + `<span>${esc(msg)}</span>`;
  $("#toasts").append(el); setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, 2200);
}
async function copyText(text, fallbackEl) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      if (fallbackEl) { const r = document.createRange(); r.selectNodeContents(fallbackEl); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      return document.execCommand("copy");
    } catch { return false; }
  }
}
const nums = new Set();
function setNum(el, v) {
  if (!el) return; v = Number(v) || 0;
  if (el._to === v) return;
  if (reduce) { el._to = v; el._v = v; el.textContent = v.toLocaleString(); return; }
  el._from = el._v ?? 0; el._to = v; el._t0 = performance.now(); nums.add(el);
}
(function tick(now) {
  for (const el of nums) {
    const p = Math.min(1, (now - el._t0) / 900), v = el._from + (el._to - el._from) * (1 - Math.pow(1 - p, 3));
    el._v = v; el.textContent = Math.round(v).toLocaleString(); if (p >= 1) nums.delete(el);
  }
  requestAnimationFrame(tick);
})(performance.now());
async function getJSON(url) { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(r.status); return r.json(); }

/* ---------- nav, progress, reveal, pointer effects ---------- */
const nav = $("#nav");
function navState() {
  nav.classList.toggle("stuck", scrollY > 12);
  const max = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty("--p", max > 0 ? Math.min(1, scrollY / max) : 0);
}
addEventListener("scroll", navState, { passive: true }); navState();

const links = $("#links"), ind = $("#ind");
function moveInd(a) {
  if (!a) { ind.style.opacity = 0; return; }
  ind.style.opacity = 1; ind.style.left = a.offsetLeft + "px"; ind.style.width = a.offsetWidth + "px";
}
const activeLink = $(`#links a[data-nav="${PAGE}"]`);
if (activeLink) activeLink.classList.add("on");
$$("#links a").forEach(a => { a.addEventListener("pointerenter", () => moveInd(a)); a.addEventListener("focus", () => moveInd(a)); });
links.addEventListener("pointerleave", () => moveInd(activeLink));
addEventListener("resize", () => moveInd(activeLink));
document.fonts && document.fonts.ready.then(() => moveInd(activeLink));
moveInd(activeLink);

const menu = $("#menu"), sheet = $("#sheet");
function setSheet(open) {
  sheet.classList.toggle("open", open); sheet.setAttribute("aria-hidden", !open); menu.setAttribute("aria-expanded", open);
  menu.innerHTML = ic(open ? "x" : "menu"); document.body.style.overflow = open ? "hidden" : "";
}
menu.addEventListener("click", () => setSheet(!sheet.classList.contains("open")));
sheet.addEventListener("click", e => { if (e.target.closest("a") || e.target === sheet || e.target.classList.contains("sheet-in")) setSheet(false); });
const sheetActive = $(`#sheet a[data-nav="${PAGE}"]`); if (sheetActive) sheetActive.classList.add("on");
addEventListener("keydown", e => { if (e.key === "Escape") setSheet(false); });

let io = null;
function reveal(root = document) {
  const els = $$(".rv:not(.in)", root);
  if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  if (!io) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: .08 });
  els.forEach(e => io.observe(e));
}

document.addEventListener("pointermove", e => {
  const c = e.target.closest && e.target.closest(".tile,.mcard");
  if (!c) return;
  const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  c.style.setProperty("--x", x + "px"); c.style.setProperty("--y", y + "px");
  if (c.classList.contains("mcard") && !reduce && e.pointerType === "mouse") {
    c.style.setProperty("--ry", ((x / r.width - .5) * 7).toFixed(2) + "deg"); c.style.setProperty("--rx", ((.5 - y / r.height) * 7).toFixed(2) + "deg");
  }
});
document.addEventListener("pointerout", e => {
  const c = e.target.closest && e.target.closest(".mcard");
  if (c && !c.contains(e.relatedTarget)) { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); }
});
(function glow() {
  const host = $(".hero, .page-hero"), g = host && $(".glow", host);
  if (!g || reduce) return;
  let tx = innerWidth / 2, ty = 240, cx = tx, cy = ty;
  host.addEventListener("pointermove", e => { const r = host.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; });
  (function loop() { cx += (tx - cx) * .08; cy += (ty - cy) * .08; g.style.left = cx + "px"; g.style.top = cy + "px"; requestAnimationFrame(loop); })();
})();
$$(".magnetic").forEach(b => {
  if (reduce) return;
  b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 10}px,${((e.clientY - r.top) / r.height - .5) * 8}px)`; });
  b.addEventListener("pointerleave", () => { b.style.transform = ""; });
});
$("#yr").textContent = new Date().getFullYear();

/* ---------- shared data ---------- */
let SITE = null;
async function loadSite() { SITE = await getJSON("/api/public/site"); return SITE; }
function applySite() {
  if (!SITE) return;
  const dc = SITE.settings.discord;
  $$(".dc-link").forEach(a => { if (dc) { a.href = dc; a.hidden = false; } else a.hidden = true; });
  const an = $("#announce");
  if (SITE.settings.announce) { an.hidden = false; an.className = "announce " + (SITE.settings.announce.level === "warn" ? "warn" : ""); an.innerHTML = ic(SITE.settings.announce.level === "warn" ? "alert" : "bell") + `<span>${esc(SITE.settings.announce.text)}</span>`; }
  else an.hidden = true;
}

/* ---------- map cards ---------- */
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function initials(n) {
  const w = String(n).replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/).filter(Boolean);
  return ((w[0] || "?")[0] + (w[1] ? w[1][0] : (w[0] || "")[1] || "")).toUpperCase();
}
const stBadge = s => `<span class="st ${s}"><i></i>${esc(t("st." + s))}</span>`;
function thumbHtml(m) {
  const h = hash(m.name), art = `<div class="art" style="--aa:${h % 180}deg;--ax:${20 + h % 60}%;--ay:${10 + (h >> 3) % 50}%"><b>${esc(initials(m.name))}</b></div>`;
  return `<div class="thumb">${art}${m.thumb ? `<img src="${esc(m.thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}${stBadge(m.status)}</div>`;
}
function bindThumb(root) { $$(".thumb img", root).forEach(img => img.addEventListener("error", () => img.remove(), { once: true })); }
function mapCard(m, delay) {
  const el = document.createElement("button"); el.type = "button"; el.className = "mcard rv" + (m.featured ? " featured-card" : ""); el.dataset.key = m.key; if (delay) el.style.setProperty("--d", delay + "s");
  const feats = (m.features || []).slice(0, 4).map(f => `<span class="feat">${esc(f)}</span>`).join("");
  const left = m.status === "soon" ? `<span>${ic("clock")}${esc(t("st.soon"))}</span>` : `<span>${ic("users")}${esc(t("maps.online", { n: (m.online || 0).toLocaleString() }))}</span>`;
  const right = m.updated ? `<span>${esc(t("maps.updated", { t: ago(m.updated) }))}</span>` : "";
  const featBadge = m.featured ? `<span class="feat-badge"><i class="badge-fire">🔥</i> HOT</span>` : "";
  el.innerHTML = thumbHtml(m) + featBadge + `<div class="mbody"><div class="mname">${esc(m.name)}</div><div class="mdesc">${esc(m.desc || (m.status === "soon" ? "" : t("maps.noDesc")))}</div>${feats ? `<div class="feats">${feats}</div>` : ""}<div class="mfoot">${left}${right}</div></div>`;
  bindThumb(el);
  return el;
}

/* ---------- live poller ---------- */
function pollLive(cb, ms = 8000) {
  const go = async () => { try { cb(await getJSON("/api/public/live")); } catch {} };
  go(); setInterval(() => { if (!document.hidden) go(); }, ms);
}

/* ================= pages ================= */
const pages = {
  async home() {
    const globe = window.RVXGlobe && $("#globe") ? RVXGlobe.mount($("#globe")) : { setPoints() {} };
    pollLive(d => {
      setNum($("#h-online"), d.online); setNum($("#h-ctry"), d.countries); setNum($("#h-srv"), d.servers);
      globe.setPoints(d.points);
      const max = Math.max(1, ...d.top.map(c => c.count));
      $("#t-bars").innerHTML = d.top.length ? d.top.map(c => `<div class="bar-r"><span>${esc(c.cc)}</span><i style="--w:${(c.count / max).toFixed(3)}"></i><b>${c.count}</b></div>`).join("")
        : [1, 2, 3].map(() => `<div class="bar-r"><span class="skel" style="width:24px"></span><i style="--w:.1"></i><b></b></div>`).join("");
    });
    const draw = () => {
      if (!SITE) return;
      const maps = SITE.maps;
      setNum($("#h-maps"), maps.filter(m => m.status !== "soon").length);
      const names = maps.filter(m => m.status !== "soon").map(m => m.name);
      const mq = $("#marquee");
      if (names.length) {
        const track = `<div class="mq-track">${[...names, ...names, ...names].map(n => `<span class="mq-chip"><i></i>${esc(n)}</span>`).join("")}</div>`;
        mq.innerHTML = track + track; $(".marquee-sec").hidden = false;
      } else $(".marquee-sec").hidden = true;
      $("#t-status").innerHTML = maps.slice(0, 3).map(m => `<li><span>${esc(m.name)}</span>${stBadge(m.status)}</li>`).join("") || `<li class="muted"><span>${esc(t("maps.noMaps"))}</span></li>`;
      const hm = $("#home-maps"); hm.innerHTML = "";
      maps.slice(0, 6).forEach((m, i) => hm.append(mapCard(m, i * .06)));
      reveal(hm);
    };
    window.addEventListener("langchange", draw); draw();
  },

  maps() {
    let filter = "all", q = "";
    const grid = $("#grid"), empty = $("#empty"), count = $("#count"), dlg = $("#dlg");
    const draw = () => {
      if (!SITE) return;
      const list = SITE.maps.filter(m => (filter === "all" || m.status === filter) && (!q || (m.name + " " + m.desc + " " + m.features.join(" ")).toLowerCase().includes(q)));
      grid.innerHTML = ""; list.forEach((m, i) => grid.append(mapCard(m, Math.min(i, 8) * .04)));
      empty.hidden = list.length > 0; count.textContent = t("maps.count", { n: list.length }); reveal(grid);
    };
    $("#chips").addEventListener("click", e => {
      const b = e.target.closest(".chip"); if (!b) return;
      filter = b.dataset.f; $$("#chips .chip").forEach(c => c.classList.toggle("on", c === b)); draw();
    });
    $("#q").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); draw(); });
    addEventListener("keydown", e => { if (e.key === "/" && document.activeElement.tagName !== "INPUT") { e.preventDefault(); $("#q").focus(); } });
    let openKey = null, prevFocus = null;
    const body = $("#dlg-body");
    const showDlg = key => {
      const m = SITE.maps.find(x => x.key === key); if (!m) return;
      openKey = key; prevFocus = document.activeElement;
      const feats = m.features.length ? `<div><h4>${esc(t("maps.features"))}</h4><div class="feats" style="margin-top:10px">${m.features.map(f => `<span class="feat">${esc(f)}</span>`).join("")}</div></div>` : "";
      const msg = m.status === "maintenance" && m.msg ? `<div class="msgbox"><b>${esc(t("maps.msg"))}:</b> ${esc(m.msg)}</div>` : "";
      body.innerHTML = thumbHtml(m) + `<div class="dlg-body-in"><h2 id="dlg-t">${esc(m.name)}</h2>
        <div class="dlg-row">${m.status !== "soon" ? `<span>${ic("users")}${esc(t("maps.online", { n: m.online.toLocaleString() }))}</span><span>${ic("box")}${esc(t("maps.servers", { n: m.servers }))}</span>` : ""}${m.updated ? `<span>${ic("refresh")}${esc(t("maps.updated", { t: ago(m.updated) }))}</span>` : ""}</div>
        ${msg}<p class="muted">${esc(m.desc || t("maps.noDesc"))}</p>${feats}
        ${m.link ? `<div><a class="btn-pill primary" href="${esc(m.link)}" target="_blank" rel="noopener noreferrer"><span>${esc(t("maps.open"))}</span>${ic("up-right")}</a></div>` : ""}</div>`;
      bindThumb(body);
      dlg.hidden = false; requestAnimationFrame(() => dlg.classList.add("on")); document.body.style.overflow = "hidden"; $("#dlg-x").focus();
    };
    const hideDlg = () => {
      openKey = null; dlg.classList.remove("on"); document.body.style.overflow = "";
      setTimeout(() => { if (!openKey) dlg.hidden = true; }, 300); if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
    };
    grid.addEventListener("click", e => { const c = e.target.closest(".mcard"); if (c) showDlg(c.dataset.key); });
    $("#dlg-x").addEventListener("click", hideDlg);
    dlg.addEventListener("mousedown", e => { if (e.target === dlg) hideDlg(); });
    addEventListener("keydown", e => { if (e.key === "Escape" && openKey) hideDlg(); });
    window.addEventListener("langchange", () => { draw(); if (openKey) showDlg(openKey); }); draw();
    setInterval(async () => { if (document.hidden || openKey) return; try { await loadSite(); draw(); } catch {} }, 20000);
  },

  get() {
    const code = $("#code code"), btn = $("#copy");
    const draw = () => {
      if (!SITE) return;
      const ls = SITE.settings.loadstring;
      code.innerHTML = ls ? esc(ls).replace(/loadstring|HttpGet/g, m => `<span class="k">${m}</span>`) : esc(t("get.none"));
      btn.disabled = !ls;
    };
    btn.addEventListener("click", async () => {
      const ok = await copyText(SITE.settings.loadstring, code);
      if (!ok) return toast(t("toast.fail"));
      btn.classList.add("done"); $("#copy-t").textContent = t("get.copied"); toast(t("toast.copied"));
      clearTimeout(btn._t); btn._t = setTimeout(() => { btn.classList.remove("done"); $("#copy-t").textContent = t("get.copy"); }, 2200);
    });
    $("#code").addEventListener("click", () => { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
    pollLive(d => setNum($("#g-online"), d.online));
    const faq = $("#faq-list");
    const drawFaq = () => {
      const open = new Set($$(".fq.open", faq).map(x => x.dataset.n));
      faq.innerHTML = [1, 2, 3, 4, 5, 6].map(n => `<div class="fq ${open.has(String(n)) ? "open" : ""} rv" data-n="${n}"><button aria-expanded="${open.has(String(n))}">${esc(t("fq" + n + ".q"))}${ic("chev")}</button><div class="a"><div><p>${esc(t("fq" + n + ".a"))}</p></div></div></div>`).join("");
      reveal(faq);
    };
    faq.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const f = b.parentElement; f.classList.toggle("open"); b.setAttribute("aria-expanded", f.classList.contains("open")); });
    window.addEventListener("langchange", () => { draw(); drawFaq(); }); draw(); drawFaq();
  },

  status() {
    const draw = () => {
      if (!SITE) return;
      const s = SITE.status, ban = $("#banner");
      ban.className = "banner-s rv in " + (s.overall === "ok" ? "" : s.overall === "partial" ? "partial" : "down");
      $("#bs-ic").innerHTML = s.overall === "ok" ? ic("check") : ic("alert");
      $("#bs-t").textContent = t("status." + s.overall);
      $("#bs-s").textContent = (s.overall === "partial" ? t("status.mcount", { n: s.maintenance }) + "  |  " : "") + t("status.checked", { t: ago(SITE.t) });
      $("#svc").innerHTML = s.services.map(v => `<li><div class="nm"><b>${esc(t("sv." + v.id))}</b></div><span class="st ${v.ok ? "operational" : "maintenance"}"><i></i>${esc(t(v.ok ? "sv.up" : "sv.down"))}</span></li>`).join("");
      $("#srows").innerHTML = SITE.maps.map(m => `<li><div class="nm"><b>${esc(m.name)}</b>${m.status === "maintenance" && m.msg ? `<small>${esc(m.msg)}</small>` : (m.updated ? `<small>${esc(t("maps.updated", { t: ago(m.updated) }))}</small>` : "")}${m.uptime != null ? `<small>${esc(t("status.up30", { p: m.uptime }))}</small>` : ""}</div>${stBadge(m.status)}</li>`).join("") || `<li class="muted">${esc(t("maps.noMaps"))}</li>`;
      const strip = $("#strip"), hist = $("#hist");
      if (strip && s.strip) strip.innerHTML = `<div class="strip-h"><span>${esc(t("status.30d"))}</span><span>${esc(t("status.up30", { p: s.uptime }))}</span></div><div class="strip">${[...s.strip].map((v, i) => `<i class="d${v}" title="${esc(t("status.d." + v))}"></i>`).join("")}</div>`;
      if (hist) {
        const fmt = new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
        const dur = ms => { const m = Math.max(1, Math.round(ms / 6e4)); return m < 60 ? t("dur.m", { n: m }) : m < 1440 ? t("dur.h", { n: Math.floor(m / 60), m: m % 60 }) : t("dur.d", { n: Math.floor(m / 1440), h: Math.floor(m % 1440 / 60) }); };
        const inc = s.incidents || [];
        hist.innerHTML = inc.map(r => `<li class="inc ${r.kind}"><div class="nm"><b>${esc(r.name || t("status.loaderName"))}</b><small>${esc(t("status.k." + r.kind))}${r.msg ? " | " + esc(r.msg) : ""}</small><small>${esc(r.end ? fmt.format(new Date(r.start)) + " | " + t("status.dur", { d: dur(r.end - r.start) }) : t("status.since", { t: fmt.format(new Date(r.start)) }))}</small></div><span class="st ${r.end ? "operational" : "maintenance"}"><i></i>${esc(t(r.end ? "status.resolved" : "status.ongoing"))}</span></li>`).join("") || `<li class="muted">${esc(t("status.noInc"))}</li>`;
      }
    };
    window.addEventListener("langchange", draw); draw();
    setInterval(async () => { if (document.hidden) return; try { await loadSite(); applySite(); draw(); } catch {} }, 15000);
  },

  updates() {
    let f = "all";
    const tl = $("#tl"), empty = $("#uempty");
    const draw = () => {
      if (!SITE) return;
      const list = SITE.updates.filter(u => f === "all" || u.tag === f);
      const fmt = new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en-GB", { year: "numeric", month: "long", day: "numeric" });
      tl.innerHTML = list.map((u, i) => `<article class="ue rv" style="--d:${Math.min(i, 6) * .05}s"><div class="ue-h"><span class="tag ${u.tag}">${esc(t("tag." + u.tag))}</span><time>${esc(fmt.format(new Date(u.date + "T00:00:00")))}</time></div><h3>${esc(u.title)}</h3>${u.items.length ? `<ul>${u.items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</article>`).join("");
      empty.hidden = list.length > 0; reveal(tl);
    };
    $("#uchips").addEventListener("click", e => { const b = e.target.closest(".chip"); if (!b) return; f = b.dataset.f; $$("#uchips .chip").forEach(c => c.classList.toggle("on", c === b)); draw(); });
    window.addEventListener("langchange", draw); draw();
  }
};

/* ---------- boot ---------- */
(async function boot() {
  themeIcon(); applyLang(); reveal();
  const needsSite = ["home", "maps", "get", "status", "updates", "privacy", "buy", "me", "key", "404"].includes(PAGE);
  try { if (needsSite) { await loadSite(); applySite(); } } catch (e) { console.warn("site data unavailable", e); }
  if (pages[PAGE]) pages[PAGE]();
  applyLang(); reveal();
})();
})();
