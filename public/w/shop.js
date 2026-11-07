/* หน้า /buy (ร้านค้า) และ /me (โปรไฟล์) — ใช้เครื่องมือกลางจาก acct.js (window.RVX) */
(() => {
"use strict";
const R = window.RVX; if (!R) return;
const { t, esc, api, toast, modal, baht, fmt, dur, ic, avatar } = R;
const $ = (s, r = document) => r.querySelector(s);
const PAGE = document.body.dataset.page;

let S = null;          // session (เมนูบน)
let CFG = null;        // /api/shop/plans (หน้า buy)
let FREE = null;       // /api/key/info (การ์ดคีย์ฟรีในหน้า buy)
let M = null;          // /api/shop/me (หน้า me)
let busy = false, skew = 0, tab = "ledger";
const shown = new Set();
const cfg = () => (M && M.config) || CFG;
const credit = () => (M ? M.credit : S && S.credit) || 0;
const mask = k => k.slice(0, 8) + "••••••••" + k.slice(-4);

/* ---------- ซื้อ / ต่ออายุ ---------- */
async function buy(planId, keyId) {
  const c = cfg(), p = c && c.plans.find(x => x.id === planId);
  if (!p || busy) return;
  const have = credit(), short = p.price - have;
  if (short > 0) {
    const go = await modal({ title: t("buy.shortT"), body: `<p>${t("buy.shortB", { plan: `<b>${esc(p.name)}</b>`, price: esc(baht(p.price)), credit: esc(baht(have)), need: `<b>${esc(baht(short))}</b>` })}</p>`, ok: t("buy.goTopup") });
    if (go) location.href = "/topup";
    return;
  }
  const ok = await modal({
    title: t(keyId ? "buy.confExtend" : "buy.confNew"),
    body: `<p><b>${esc(p.name)}</b> (${esc(dur(p.hours))})<br>${t("buy.confLine", { price: esc(baht(p.price)), after: esc(baht(have - p.price)) })}</p><p>${t("buy.confNote")}</p>`,
    ok: t("buy.confOk"),
    onOk: async () => { await api("/api/shop/buy", "POST", { planId, keyId: keyId || undefined }); }
  });
  if (!ok) return;
  const info = { name: p.name, hours: p.hours, price: p.price, extend: !!keyId, at: Date.now() };
  if (PAGE === "buy" && !keyId) {
    // หน้า /buy เด้งไป /me ทันที จึงฝากข้อมูลไว้ให้หน้า /me ฉลองต่อ (ใช้ครั้งเดียว)
    try { sessionStorage.setItem("rvx:cele", JSON.stringify(info)); } catch { toast(t("buy.doneNew")); }
    location.href = "/me#keys"; return;
  }
  await reload();
  cele(info);
}

/* ---------- ฉลองตอนซื้อสำเร็จ: พลุกระดาษ + ข้อความความคุ้ม + ความคืบหน้าระดับ ---------- */
function cele(i) {
  if (!window.RVXFX) { toast(t(i.extend ? "buy.doneExtend" : "buy.doneNew")); return; }
  const F = window.RVXFX, lines = [t(i.extend ? "fx.subExt" : "fx.subNew")];
  lines.push(i.hours === 0 ? t("fx.life") : t("fx.perDay", { p: baht(Math.round(i.price / (i.hours / 24))) }));
  if (M) {
    const now = F.level(M.totalSpent), prev = F.level(M.totalSpent - i.price);
    lines.push(now.i > prev.i ? t("fx.lvUp", { l: now.name }) : now.next ? t("card.next", { a: baht(now.next.need), l: now.next.name }) : t("card.max"));
  }
  F.celebrate({ title: t(i.extend ? "fx.extT" : "fx.buyT"), lines });
}
function popPending() {
  let raw = null;
  try { raw = sessionStorage.getItem("rvx:cele"); sessionStorage.removeItem("rvx:cele"); } catch {}
  if (!raw) return;
  let i = null; try { i = JSON.parse(raw); } catch {}
  if (i && Date.now() - i.at < 120e3) cele(i);
}

/* ---------- หน้า /buy ---------- */
/* การ์ดแผน: Free (ลิงก์ไป /key) + แผนที่ขายจริงจาก /api/shop/plans — แผนที่ราคาต่อวันถูกที่สุดได้ป้าย "คุ้มค่าที่สุด" */
const perDayOf = p => (p.hours > 0 ? p.price / (p.hours / 24) : Infinity);
function bestPlanId() {
  const timed = CFG.plans.filter(p => p.hours > 0);
  if (timed.length < 2) return null;
  return timed.reduce((a, b) => (perDayOf(b) < perDayOf(a) ? b : a)).id;
}
function pcard({ hot, i, name, price, suffix, desc, action, ticks }) {
  return `<article class="tile plan pcard ${hot ? "hot" : ""} fx" style="--d:${(i * 0.06).toFixed(2)}s">
    ${hot ? `<span class="pbadge">${esc(t("pr.best"))}</span>` : ""}
    <h3 class="pname">${esc(name)}</h3>
    <div class="pprice"><span class="price">${esc(price)}</span><span class="psuf">${esc(suffix || "")}</span></div>
    <p class="pdesc">${esc(desc)}</p>
    ${action}
    <ul class="ticks">${ticks.map(x => `<li>${x}</li>`).join("")}</ul></article>`;
}
function freeCard(i) {
  const hrs = FREE && FREE.keyHours, n = FREE && FREE.taskCount;
  const ticks = [];
  if (hrs) ticks.push(`<b>${esc(t("pr.fLife", { d: dur(hrs) }))}</b>`);
  if (n) ticks.push(esc(t("pr.fTasks", { n })));
  ticks.push(`<b>${esc(t("plan.t4", { n: (FREE && FREE.maxDevices) || 1 }))}</b>`);
  ticks.push(esc(t("pr.fAgain")));
  return pcard({
    i, name: t("pr.free"), price: baht(0), suffix: hrs ? "/ " + dur(hrs) : "", desc: t("pr.freeD"),
    action: `<a class="btn-pill primary" href="/key"><span>${esc(t("acct.free"))}</span></a>`, ticks
  });
}
function planCard(p, i) {
  const life = p.hours === 0, per = !life && p.hours > 0 ? Math.round(p.price / (p.hours / 24)) : 0, c = CFG;
  const action = !S.authed
    ? `<a class="btn-pill primary" href="${esc(R.loginHref())}"><span>${esc(t("buy.loginToBuy"))}</span></a>`
    : `<button type="button" class="btn-pill primary" data-buy="${esc(p.id)}" ${!c.enabled || S.banned ? "disabled" : ""}><span>${esc(t("buy.withCredit"))}</span></button>`;
  const ticks = [esc(t("pr.noTasks")), esc(t("pr.instant")), `<b>${esc(t("plan.t4", { n: p.maxDevices || 1 }))}</b>`, esc(t("plan.t2", { n: c.resets.perMonth }))];
  if (c.transfer.enabled) ticks.push(esc(t("plan.t3")));
  if (!life) ticks.push(esc(t("pr.renew")));
  return pcard({
    hot: p.id === bestPlanId(), i, name: p.name, price: baht(p.price),
    suffix: life ? t("pr.once") : "/ " + dur(p.hours),
    desc: per ? t("plan.perDay", { p: baht(per) }) : life ? t("plan.once") : "",
    action, ticks
  });
}
function renderBuy() {
  if (!S) return;
  const cta = $("#buy-cta"), notes = $("#buy-notes"), plans = $("#plans");
  cta.innerHTML = !S.authed
    ? `<a class="btn-pill primary lg" href="${esc(R.loginHref())}">${ic("chat")}<span>${esc(t("buy.login"))}</span></a><a class="btn-pill ghost lg" href="/key">${ic("gift")}<span>${esc(t("acct.free"))}</span></a>`
    : `<span class="credit-chip"><small>${esc(t("acct.credit"))}</small><b class="num">${esc(baht(S.credit))}</b></span><a class="btn-pill primary lg" href="/topup">${ic("wallet")}<span>${esc(t("acct.topup"))}</span></a><a class="btn-pill ghost lg" href="/me#keys">${ic("key")}<span>${esc(t("acct.keys"))}</span></a>`;
  if (!CFG) { notes.innerHTML = `<div class="msgbox">${esc(t("err.generic"))}</div>`; plans.innerHTML = ""; return; }
  const n = [];
  if (!CFG.enabled) n.push(t("buy.closed"));
  if (!CFG.loginReady) n.push(t("buy.noLogin"));
  if (S.authed && S.banned) n.push(t("buy.banned"));
  notes.innerHTML = n.map(x => `<div class="msgbox">${esc(x)}</div>`).join("");
  plans.innerHTML = freeCard(0) + (CFG.plans.length ? CFG.plans.map((p, i) => planCard(p, i + 1)).join("") : `<div class="empty" style="grid-column:1/-1">${ic("bag")}<b>${esc(t("buy.none"))}</b></div>`);
}

async function loadFree() { try { FREE = await api("/api/key/info"); } catch { FREE = null; } }

/* ---------- หน้า /me ---------- */
const left = ms => {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? t("k.dh", { d, h }) : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const nowS = () => Date.now() - skew;
const STC = { active: "operational", expired: "soon", revoked: "maintenance" };

function keyCard(k) {
  const on = k.status === "active", vis = shown.has(k.id);
  const rs = k.nextResetAt > nowS() ? t("k.resetAt", { d: fmt(k.nextResetAt) }) : t("k.resetLeft", { n: k.resetsLeft });
  return `<article class="kcard ${on ? "" : "off"}" data-kid="${esc(k.id)}">
    <div class="kc-h"><b>${esc(k.plan || t("k.key"))}</b><span class="st ${STC[k.status] || "soon"}"><i></i>${esc(t("k.st." + k.status))}</span>${k.tier ? `<span class="tag">${esc(String(k.tier).toUpperCase())}</span>` : ""}</div>
    <div class="kc-key"><code>${esc(vis ? k.key : mask(k.key))}</code>
      <button type="button" class="btn-pill ghost sm" data-a="eye">${ic(vis ? "eye-off" : "eye")}<span>${esc(t(vis ? "k.hide" : "k.show"))}</span></button>
      <button type="button" class="btn-pill primary sm" data-a="copy">${ic("copy")}<span>${esc(t("k.copy"))}</span></button></div>
    <div class="kc-info">
      <div><small>${esc(t("k.expires"))}</small><b>${esc(k.lifetime ? t("u.life") : fmt(k.expiresAt))}</b>${k.lifetime || !on ? "" : `<em>${esc(t("k.left"))} <span data-exp="${k.expiresAt}">—</span></em>`}</div>
      <div><small>${esc(t("k.device"))}</small><b>${esc((k.bound ? t("k.bound", { d: k.device }) : t("k.unbound")) + (k.maxDevices > 1 ? " · " + t("k.devs", { n: k.devices, m: k.maxDevices }) : ""))}</b></div>
      <div><small>${esc(t("k.last"))}</small><b>${esc(k.lastSeen ? fmt(k.lastSeen) : t("k.never"))}</b><em>${esc(t("k.times", { n: k.uses }))}</em></div>
      <div><small>${esc(t("k.resets"))}</small><b>${esc(rs)}</b></div></div>
    ${k.maxDevices > 1 && k.bound && k.status !== "revoked" ? `<div class="kc-acts" style="margin-bottom:8px">${(k.deviceList || []).map(d => `<button type="button" class="btn-pill ghost sm" data-a="rmdev" data-d="${esc(d)}">${ic("x")}<span>${esc(t("k.rmDev", { d }))}</span></button>`).join("")}</div>` : ""}
    ${k.transferPending ? `<div class="msgbox">${esc(t("k.trPending", { d: fmt(k.transferPending.expiresAt) }))}</div>` : ""}
    <div class="kc-acts">
      ${k.status !== "revoked" && !k.lifetime ? `<button type="button" class="btn-pill ghost sm" data-a="extend">${ic("plus")}<span>${esc(t("k.extend"))}</span></button>` : ""}
      <button type="button" class="btn-pill ghost sm" data-a="reset" ${k.bound && k.status !== "revoked" ? "" : "disabled"}>${ic("refresh")}<span>${esc(t("k.reset"))}</span></button>
      <button type="button" class="btn-pill ghost sm" data-a="rotate" ${k.status !== "revoked" ? "" : "disabled"}>${ic("key")}<span>${esc(t("k.rotate"))}</span></button>
      ${k.transferPending
        ? `<button type="button" class="btn-pill ghost sm" data-a="untransfer">${ic("x")}<span>${esc(t("k.untransfer"))}</span></button>`
        : `<button type="button" class="btn-pill ghost sm" data-a="transfer" ${k.canTransfer && on ? "" : "disabled"} title="${esc(k.canTransfer ? "" : t("k.noTransfer"))}">${ic("send")}<span>${esc(t("k.transfer"))}</span></button>`}
    </div></article>`;
}
function keysHtml() {
  return M.keys.length ? `<div class="klist">${M.keys.map(keyCard).join("")}</div>`
    : `<div class="panel empty">${ic("key")}<b>${esc(t("k.none"))}</b><a class="btn-pill ghost sm" href="/buy" style="margin-top:10px"><span>${esc(t("k.pick"))}</span></a></div>`;
}
function histHtml() {
  const tabs = `<div class="chips" id="htabs"><button type="button" class="chip ${tab === "ledger" ? "on" : ""}" data-tab="ledger">${esc(t("h.ledger"))}</button><button type="button" class="chip ${tab === "topup" ? "on" : ""}" data-tab="topup">${esc(t("h.topup"))}</button></div>`;
  let body;
  if (tab === "topup") {
    body = M.topups.length ? `<div class="tbl"><table><tr><th>${esc(t("h.time"))}</th><th>${esc(t("h.status"))}</th><th class="r">${esc(t("h.amount"))}</th></tr>${M.topups.map(x =>
      `<tr><td>${esc(fmt(x.at))}</td><td>${esc(t("ts." + x.status))}${x.msg && x.status !== "success" ? `<small>${esc(x.msg)}</small>` : ""}</td><td class="r">${x.amount ? esc(baht(x.amount)) : "—"}</td></tr>`).join("")}</table></div>`
      : `<div class="empty">${esc(t("h.noTopup"))}</div>`;
  } else {
    body = M.ledger.length ? `<div class="tbl"><table><tr><th>${esc(t("h.time"))}</th><th>${esc(t("h.item"))}</th><th class="r">${esc(t("h.amount"))}</th><th class="r">${esc(t("h.balance"))}</th></tr>${M.ledger.map(l =>
      `<tr><td>${esc(fmt(l.at))}</td><td>${esc(t("led." + l.type))}${l.note ? `<small>${esc(l.note)}</small>` : ""}<small class="mono">#${esc(l.id)}</small></td><td class="r ${l.amount > 0 ? "pos" : "neg"}">${l.amount > 0 ? "+" : ""}${esc(baht(l.amount))}</td><td class="r">${esc(baht(l.balance))}</td></tr>`).join("")}</table></div>`
      : `<div class="empty">${esc(t("h.noLedger"))}</div>`;
  }
  return `<div class="me-sec-h"><h2>${esc(t("h.title"))}</h2>${tabs}</div><div class="panel">${body}</div>`;
}


/* ----- แดชบอร์ด /me: เมนูด้านข้าง + แท็บ (#overview #keys #history #profile) ----- */
const TABS = ["overview", "keys", "history", "profile"], ALIAS = { hist: "history", role: "profile", topups: "history" };
const curTab = () => { const h = location.hash.slice(1); const a = ALIAS[h] || h; return TABS.includes(a) ? a : "overview"; };
function applyTab() {
  const c = curTab();
  document.querySelectorAll("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== c; });
  document.querySelectorAll("#dnav [data-tab]").forEach(a => {
    const on = a.dataset.tab === c; a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (c === "overview") { const hw = $(".heat-wrap"); if (hw) hw.scrollLeft = hw.scrollWidth; }
}
const dateOnly = n => new Date(n).toLocaleDateString(R.lang() === "en" ? "en-GB" : "th-TH", { dateStyle: "medium" });
const tile = (v, label) => `<div class="dtile"><b class="num">${v}</b><span>${esc(label)}</span></div>`;

/* ตารางกิจกรรมรายวัน 53 สัปดาห์ จากประวัติเครดิต + การใช้คีย์ล่าสุด */
function heatHtml() {
  const day = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const today = day(Date.now()), end = new Date(today), start = new Date(today);
  start.setDate(end.getDate() - end.getDay() - 52 * 7);
  const cnt = new Map(); let total = 0;
  const add = ms => { if (!ms) return; const k = day(ms); if (k < start.getTime() || k > today) return; cnt.set(k, (cnt.get(k) || 0) + 1); total++; };
  M.ledger.forEach(l => add(l.at)); M.keys.forEach(k => add(k.lastSeen));
  const lv = c => (c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : c < 5 ? 3 : 4);
  const lc = R.lang() === "en" ? "en-GB" : "th-TH";
  let cells = "", months = "", prevM = -1;
  for (let w = 0; w < 53; w++) {
    const first = new Date(start); first.setDate(start.getDate() + w * 7);
    if (first.getMonth() !== prevM) { const skip = w === 0 && new Date(start.getTime() + 21 * 864e5).getMonth() !== first.getMonth(); prevM = first.getMonth(); if (!skip) months += `<span style="grid-column:${w + 1}/span 4">${esc(first.toLocaleDateString(lc, { month: "short" }))}</span>`; }
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
      if (dt.getTime() > today) { cells += "<i class=\"nil\"></i>"; continue; }
      const c = cnt.get(dt.getTime()) || 0;
      cells += `<i class="l${lv(c)}" title="${esc(dateOnly(dt.getTime()) + " · " + t("me.actN", { n: c }))}"></i>`;
    }
  }
  return `<section class="panel dpanel"><div class="dp-h"><div><h3>${esc(t("me.act"))}</h3><p class="muted">${esc(t("me.actD"))}</p></div><span class="muted num">${esc(t("me.actN", { n: total }))}</span></div>
    <div class="heat-wrap"><div class="heat-m">${months}</div><div class="heat">${cells}</div></div>
    <div class="heat-lg"><span>${esc(t("me.less"))}</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>${esc(t("me.more"))}</span></div></section>`;
}

function infoRow(label, val) { return `<div class="irow"><span>${esc(label)}</span><b>${val}</b></div>`; }

function renderMe() {
  const root = $("#me-root");
  if (!M) return;
  if (!M.authed) {
    root.innerHTML = `<div class="panel login-card fx"><h2 style="font-size:26px;letter-spacing:-.03em;margin-bottom:10px">${esc(t("me.loginT"))}</h2><p class="muted" style="margin-bottom:8px">${esc(t("me.loginD"))}</p>
      <a class="btn-pill primary lg" href="${esc(R.loginHref())}">${ic("chat")}<span>${esc(t("buy.login"))}</span></a></div>`;
    return;
  }
  const u = M.user;
  const head = `<header class="dash-h"><h1>${ic("grid")}<span>${esc(t("me.eyebrow"))}</span></h1><button type="button" class="btn-pill primary" id="me-out">${esc(t("acct.logout"))}</button></header>`;
  if (M.banned) { root.innerHTML = head + `<div class="msgbox">${esc(t("me.banned"))}</div>`; return; }

  const act = M.keys.filter(k => k.status === "active");
  const best = act.slice().sort((a, b) => (+!!b.lifetime - +!!a.lifetime) || (b.expiresAt - a.expiresAt))[0];
  const pkg = best ? (best.plan || String(best.tier || t("k.key")).toUpperCase()) : t("me.free");
  const timeLeft = !best ? "—" : best.lifetime ? esc(t("u.life")) : `<span data-exp="${best.expiresAt}">${esc(left(best.expiresAt - nowS()))}</span>`;
  const devs = act.reduce((n, k) => n + (k.devices || (k.bound ? 1 : 0)), 0);
  const sub = u.email || "Discord · " + u.id;
  const nav = [
    ["overview", "grid", t("me.tOverview")], ["profile", "user", t("me.tProfile")], ["keys", "key", t("k.title")], ["history", "clock", t("me.tCredit")]
  ].map(([id, i, l]) => `<a href="#${id}" data-tab="${id}">${ic(i)}<span>${esc(l)}</span>${id === "keys" && act.length ? `<em class="num">${act.length}</em>` : ""}</a>`).join("")
    + `<a href="/accounts">${ic("users")}<span>${esc(t("nav.roblox"))}</span></a><a href="/topup">${ic("wallet")}<span>${esc(t("acct.topup"))}</span></a>`;

  const overview = `<div class="d-id">${avatar(u, 96)}<div><h2>${esc(u.name)}</h2><p class="muted">${esc(sub)}</p>${window.RVXFX ? `<div class="d-lv">${RVXFX.badge(RVXFX.level(M.totalSpent))}</div>` : ""}</div></div>
    <div class="dtiles">${tile(esc(dateOnly(u.createdAt)), t("me.since"))}${tile(esc(pkg), t("me.pkg"))}${tile(timeLeft, t("me.timeLeft"))}${tile(esc(baht(M.credit)), t("acct.credit"))}${tile(String(devs), t("me.devs"))}</div>
    <div class="qa">
      <a class="qa-t" href="/topup"><i>${ic("wallet")}</i><b>${esc(t("me.qTopup"))}</b><small>${esc(t("me.qTopupD"))}</small></a>
      <a class="qa-t" href="/buy"><i>${ic("bag")}</i><b>${esc(t("me.qBuy"))}</b><small>${esc(t("me.qBuyD"))}</small></a>
      <button type="button" class="qa-t" id="qa-recv"><i>${ic("key")}</i><b>${esc(t("me.qRecv"))}</b><small>${esc(t("me.qRecvD"))}</small></button>
      <button type="button" class="qa-t" id="qa-gift"><i>${ic("gift")}</i><b>${esc(t("me.qGift"))}</b><small>${esc(t("me.qGiftD"))}</small></button>
      ${window.RVXFX ? `<a class="qa-t" href="#profile"><i>${ic("user")}</i><b>${esc(t("card.tile"))}</b><small>${esc(t("card.tileD"))}</small></a>` : ""}
      ${M.config.redeem && M.config.redeem.enabled ? `<button type="button" class="qa-t" id="qa-code"><i>${ic("plus")}</i><b>${esc(t("me.qCode"))}</b><small>${esc(t("me.qCodeD"))}</small></button>` : ""}</div>
    ${heatHtml()}`;

  const keys = `<div class="me-sec-h"><h2>${esc(t("k.title"))}</h2><div class="kc-acts"><button type="button" class="btn-pill ghost sm" id="qa-recv2">${ic("send")}<span>${esc(t("me.recvKey"))}</span></button><a class="btn-pill ghost sm" href="/buy">${ic("bag")}<span>${esc(t("k.buyNew"))}</span></a></div></div><div id="klist">${keysHtml()}</div>`;

  const history = `<div class="dtiles three">${tile(esc(baht(M.credit)), t("acct.credit"))}${tile(esc(baht(M.totalTopup)), t("me.sTopup"))}${tile(esc(baht(M.totalSpent)), t("me.sSpent"))}</div><section class="me-sec" id="hist">${histHtml()}</section>`;

  const profile = `<div class="sc-root" id="sc-root"></div><section class="panel dpanel"><h3 style="margin-bottom:6px">${esc(t("me.pInfo"))}</h3>
      ${infoRow(t("me.pName"), esc(u.name))}${infoRow(t("me.pId"), `<code>${esc(u.id)}</code>`)}${u.email ? infoRow(t("me.pEmail"), esc(u.email)) : ""}${infoRow(t("me.pVia"), esc(String(u.provider || "discord").replace(/^./, c => c.toUpperCase())))}${infoRow(t("me.since"), esc(dateOnly(u.createdAt)))}</section>`;

  root.innerHTML = `${head}<div class="dash-g">
    <aside class="dash-side"><div class="ds-user">${avatar(u, 40)}<div><b>${esc(u.name)}</b><small>${esc(sub)}</small></div></div><nav class="ds-nav" id="dnav" aria-label="${esc(t("me.eyebrow"))}">${nav}</nav></aside>
    <div class="dash-main"><div data-pane="overview">${overview}</div><div data-pane="keys" hidden>${keys}</div><div data-pane="history" hidden>${history}</div><div data-pane="profile" hidden>${profile}</div></div></div>`;
  applyTab();
  if (window.RVXFX) RVXFX.card.mount($("#sc-root"), { name: u.name, id: u.id, avatar: u.avatar, createdAt: u.createdAt, totalSpent: M.totalSpent });
}
function renderKeysOnly() { const k = $("#klist"); if (k) k.innerHTML = keysHtml(); }
function renderHistOnly() { const h = $("#hist"); if (h) h.innerHTML = histHtml(); }
function scrollToHash() { applyTab(); }
window.addEventListener("hashchange", () => { if (PAGE === "me") applyTab(); });


/* ---------- หน้า /topup (เลือกช่องทาง) ---------- */
const LOGO = {
  angpao: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="5" width="30" height="38" rx="7" fill="#ea580c"/><path d="M9 17c6 6 24 6 30 0" fill="none" stroke="#fed7aa" stroke-width="2.2"/><circle cx="24" cy="23" r="5.2" fill="#fbbf24"/><path d="M22 23h4M24 21v4" stroke="#9a3412" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  code: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="11" width="38" height="26" rx="7" fill="#7c3aed"/><circle cx="5" cy="24" r="4" fill="var(--bg,#09090b)"/><circle cx="43" cy="24" r="4" fill="var(--bg,#09090b)"/><path d="M16 20h16M16 28h10" stroke="#ede9fe" stroke-width="3" stroke-linecap="round"/></svg>`,
  bank: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="5" width="38" height="38" rx="10" fill="#2563eb"/><path d="M24 11 11 18h26z" fill="#dbeafe"/><path d="M14 21v10M21 21v10M27 21v10M34 21v10" stroke="#dbeafe" stroke-width="3" stroke-linecap="round"/><rect x="11" y="34" width="26" height="3" rx="1.5" fill="#dbeafe"/></svg>`
};
function channelCard(id, on) {
  return `<${on ? `button type="button" data-pick="${id}"` : `div aria-disabled="true"`} class="ch ${on ? "" : "off"}">
    <span class="ch-logo">${LOGO[id]}</span>
    <span class="ch-tx"><b>${esc(t("tu." + id))}</b><small>${esc(t("tu." + id + "D"))}</small></span>
    ${on ? `<span class="ch-go">${ic("arrow")}</span>` : `<span class="tag">${esc(t("tu.soon"))}</span>`}</${on ? "button" : "div"}>`;
}
function renderTopup() {
  const top = $("#tu-top"), root = $("#tu-root");
  if (!M) return;
  if (!M.authed) {
    root.innerHTML = `<div class="panel login-card fx"><h2 style="font-size:26px;letter-spacing:-.03em;margin-bottom:10px">${esc(t("me.loginT"))}</h2><p class="muted" style="margin-bottom:8px">${esc(t("me.loginD"))}</p>
      <a class="btn-pill primary lg" href="${esc(R.loginHref())}">${ic("chat")}<span>${esc(t("buy.login"))}</span></a></div>`;
    return;
  }
  if (M.banned) { root.innerHTML = `<div class="msgbox">${esc(t("me.banned"))}</div>`; return; }
  const auto = M.config.topupMode === "auto", step = location.hash === "#angpao";
  top.innerHTML = `<h1 class="h1 fx">${esc(t(step ? "tu.angpao" : "tu.title"))}</h1>
    <div class="tu-bar fx" style="--d:.05s"><a class="btn-pill ghost sm" href="${step ? "/topup" : "/me"}" ${step ? 'data-back="1"' : ""}>${ic("arrow", "flip")}<span>${esc(t(step ? "tu.back" : "tu.backMe"))}</span></a>
      <span class="credit-chip"><small>${esc(t("acct.credit"))}</small><b class="num">${esc(baht(M.credit))}</b></span></div>`;
  if (!step) {
    root.innerHTML = `<p class="muted fx" style="margin-bottom:16px">${esc(t("tu.pick"))}</p><div class="chs fx" style="--d:.08s">${channelCard("angpao", true)}${M.config.redeem && M.config.redeem.enabled ? channelCard("code", true) : ""}${channelCard("bank", false)}</div>`;
    return;
  }
  const keep = ($("#tl") || {}).value || "";
  root.innerHTML = `<section class="panel tu-form fx"><p class="muted" style="margin-bottom:14px">${esc(t(auto ? "tp.auto" : "tp.manual"))}</p>
    <ol class="how"><li>${t("tp.h1")}</li><li>${esc(t("tp.h2"))}</li><li>${esc(t("tp.h3"))}</li></ol>
    <div class="fld"><input id="tl" placeholder="https://gift.truemoney.com/campaign/?v=…" autocomplete="off" spellcheck="false" value="${esc(keep)}"><button type="button" class="btn-pill primary" id="tb"><span>${esc(t("tp.btn"))}</span></button></div>
    <p class="fine" style="margin-top:12px">${esc(t("tp.fine"))}</p></section>`;
}
window.addEventListener("hashchange", () => { if (PAGE === "topup") renderTopup(); });

/* ---------- โหลดข้อมูล ---------- */
async function reload() {
  if (PAGE === "me" || PAGE === "topup") {
    try { M = await api("/api/shop/me"); if (M.serverTime) skew = Date.now() - M.serverTime; }
    catch (e) { M = null; $(PAGE === "me" ? "#me-root" : "#tu-root").innerHTML = `<div class="msgbox">${esc(e.message)}</div>`; return; }
    if (PAGE === "me") { renderMe(); popPending(); } else renderTopup();
    R.refresh(true);
  } else {
    try { CFG = await api("/api/shop/plans"); } catch { CFG = null; }
    await loadFree();
    S = await R.refresh(true); renderBuy();
  }
}
setInterval(() => document.querySelectorAll("[data-exp]").forEach(e => { e.textContent = left(+e.dataset.exp - nowS()); }), 1000);

/* ---------- การกด ---------- */
const kOf = el => { const c = el.closest("[data-kid]"); return c && M && M.keys.find(k => k.id === c.dataset.kid); };
document.addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b || b.disabled || busy) return;
  if (b.dataset.buy) return buy(b.dataset.buy);
  if (b.dataset.tab) { tab = b.dataset.tab; return renderHistOnly(); }
  if (b.id === "tb") return topup(b);
  if (b.id === "qa-recv" || b.id === "qa-recv2") return recvDialog();
  if (b.id === "qa-gift") return giftDialog();
  if (b.dataset.pick === "code") return codeDialog();
  if (b.dataset.pick) { location.hash = "#" + b.dataset.pick; return renderTopup(); }
  if (b.id === "qa-code") return codeDialog();
  const a = b.dataset.a, k = a && kOf(b); if (!k) return;
  if (a === "eye") { shown.has(k.id) ? shown.delete(k.id) : shown.add(k.id); return renderKeysOnly(); }
  if (a === "copy") {
    if (await R.copy(k.key)) toast(t("k.copied")); else { shown.add(k.id); renderKeysOnly(); toast(t("k.copyManual")); }
    return;
  }
  if (a === "extend") {
    const pl = M.config.plans.filter(p => (p.maxDevices || 1) === (k.maxDevices || 1)); if (!pl.length) return toast(t("k.noPlans"), "er");
    const sel = await modal({ title: t("k.pickPlan"), ok: t("m.next"),
      body: pl.map((p, i) => `<label class="opt"><input type="radio" name="pp" value="${esc(p.id)}" ${i ? "" : "checked"}><span>${esc(p.name)}</span><b>${esc(baht(p.price))}</b></label>`).join("") + `<p>${esc(t("k.creditLeft", { c: baht(M.credit) }))}</p>`,
      onOk: o => o.querySelector("input:checked").value });
    if (sel) buy(sel, k.id);
    return;
  }
  if (a === "rmdev") {
    const d = b.dataset.d;
    const ok = await modal({ title: t("k.rmDevT"), body: `<p>${esc(t("k.rmDevB"))}</p><p>${esc(t("k.resetN", { n: k.resetsLeft }))}</p>`, ok: t("m.confirm"), onOk: () => api("/api/shop/keys/" + k.id + "/device/remove", "POST", { device: d }) });
    if (ok) { toast(t("k.rmDevDone")); reload(); }
    return;
  }
  if (a === "reset") {
    const ok = await modal({ title: t("k.resetT"), body: `<p>${esc(t("k.resetB"))}</p><p>${esc(t("k.resetN", { n: k.resetsLeft }))}</p>`, ok: t("m.confirm"), onOk: () => api("/api/shop/keys/" + k.id + "/reset", "POST", {}) });
    if (ok) { toast(t("k.resetDone")); reload(); }
    return;
  }
  if (a === "rotate") {
    const ok = await modal({ title: t("k.rotT"), body: `<p>${esc(t("k.rotB"))}</p><p>${esc(t("k.rotN"))}</p>`, ok: t("k.rotOk"), danger: true, onOk: () => api("/api/shop/keys/" + k.id + "/rotate", "POST", {}) });
    if (ok) { toast(t("k.rotDone")); shown.add(k.id); reload(); }
    return;
  }
  if (a === "transfer") {
    const c = M.config.transfer;
    const r = await modal({ title: t("k.trT"), body: `<p>${t("k.trB")}</p><p>${esc(t("k.trN", { max: c.maxPerKey, h: c.cooldownHours }))}</p>`, ok: t("k.trOk"), onOk: () => api("/api/shop/keys/" + k.id + "/transfer", "POST", {}) });
    if (r && r.code) { await modal({ title: t("k.trCodeT"), body: `<code class="codeline">${esc(r.code)}</code><p>${esc(t("k.trCodeN", { d: fmt(r.expiresAt) }))}</p>`, hideOk: true, cancel: t("m.close") }); reload(); }
    return;
  }
  if (a === "untransfer") {
    try { await api("/api/shop/keys/" + k.id + "/transfer", "DELETE", {}); toast(t("k.untrDone")); reload(); } catch (x) { toast(x.message, "er"); }
  }
});
async function topup(b) {
  const input = $("#tl"), link = input.value.trim(); if (!link) return toast(t("tp.empty"), "er");
  busy = true; b.disabled = true; b.querySelector("span").textContent = t("tp.checking");
  try {
    const d = await api("/api/shop/topup", "POST", { link });
    toast(d.status === "success" ? t("tp.ok", { a: baht(d.amount) }) : (d.message || t("tp.sent")));
    busy = false; input.value = ""; await reload(); if (d.status === "success") location.hash = "";
  } catch (x) {
    toast(x.message, "er"); busy = false; b.disabled = false; b.querySelector("span").textContent = t("tp.btn"); if (x.status === 401) reload();
  }
}
async function codeDialog() {
  const rd = M && M.config.redeem;
  if (!rd || !rd.enabled) return toast(t("cd.off"), "er");
  let got = null;
  const r = await modal({ title: t("cd.title"), ok: t("cd.btn"),
    body: `<p>${esc(t("cd.desc"))}</p><div class="fld"><input id="cdi" placeholder="${esc(t("cd.ph"))}" maxlength="64" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>`,
    onOk: async o => {
      const code = o.querySelector("#cdi").value.trim(); if (!code) throw new Error(t("cd.empty"));
      got = await api("/api/shop/redeem-code", "POST", { code });
    } });
  if (!r || !got) return;
  toast(t("cd.ok", { a: baht(got.amount) }));
  await reload();
}
async function recvDialog() {
  const r = await modal({ title: t("tr.title"), ok: t("tr.btn"),
    body: `<p>${esc(t("tr.desc"))}</p><div class="fld"><input id="rc" placeholder="TRF-XXXXXXXXXXXX" autocomplete="off" spellcheck="false"></div>`,
    onOk: async o => { const code = o.querySelector("#rc").value.trim(); if (!code) throw new Error(t("tr.empty")); await api("/api/shop/transfer/redeem", "POST", { code }); } });
  if (!r) return;
  toast(t("tr.ok")); await reload(); location.hash = "#keys"; scrollToHash();
}
async function giftDialog() {
  const g = M.config.gift;
  if (!g || !g.enabled) return toast(t("gf.off"), "er");
  const v = await modal({ title: t("gf.title"), ok: t("gf.btn"),
    body: `<p>${esc(t("gf.desc"))}</p>
      <div class="fld col"><input id="gid" inputmode="numeric" placeholder="${esc(t("gf.id"))}" autocomplete="off" spellcheck="false">
      <input id="gam" inputmode="decimal" placeholder="${esc(t("gf.amt"))}" autocomplete="off">
      <input id="gnt" maxlength="60" placeholder="${esc(t("gf.note"))}" autocomplete="off"></div>
      <p class="fine" style="margin-top:12px">${esc(t("gf.fine", { min: g.minBaht, max: g.maxBaht, n: g.perDay }))}</p>`,
    onOk: o => {
      const to = o.querySelector("#gid").value.trim().replace(/\s+/g, ""), amt = o.querySelector("#gam").value.trim().replace(",", "."), note = o.querySelector("#gnt").value.trim();
      if (!to || !amt) throw new Error(t("gf.empty"));
      return { to, amt, note };
    } });
  if (!v || v === true) return;
  await sendGift(v);
}
async function sendGift({ to, amt, note }) {
  busy = true;
  try {
    const who = await api("/api/shop/gift/lookup?id=" + encodeURIComponent(to));
    const a = Number(amt), after = M.credit - Math.round(a * 100);
    busy = false;
    const ok = await modal({
      title: t("gf.confT"),
      body: `<p>${t("gf.confB", { a: `<b>${esc(amt)}</b>`, who: `<b>${esc(who.known ? who.name : who.id)}</b>` })}</p>${who.known ? "" : `<p>${esc(t("gf.unknown", { id: who.id }))}</p>`}${Number.isFinite(after) && after >= 0 ? `<p>${esc(t("gf.after", { c: baht(after) }))}</p>` : ""}`,
      ok: t("m.confirm"),
      onOk: () => api("/api/shop/gift", "POST", { to, amountBaht: a, note })
    });
    if (!ok) return;
    toast(t("gf.ok", { who: who.known ? who.name : who.id }));
    await reload();
  } catch (x) { busy = false; toast(x.message, "er"); if (x.status === 401) reload(); }
}
/* ---------- เริ่มต้น ---------- */
R.onSession(s => {
  S = s;
  if (PAGE === "buy") renderBuy();
});
window.addEventListener("langchange", () => { if (PAGE === "buy") renderBuy(); else if (PAGE === "topup") { if (M) renderTopup(); } else if (M) renderMe(); });
(async () => {
  if (PAGE === "buy") { try { CFG = await api("/api/shop/plans"); } catch { CFG = null; } await loadFree(); S = S || await R.refresh(); renderBuy(); }
  else if (PAGE === "me") { if (location.hash === "#topup") { location.replace("/topup"); return; } await reload(); scrollToHash(); }
  else await reload();
})();
})();
