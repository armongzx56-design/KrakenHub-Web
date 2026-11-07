/* /accounts — บัญชีที่กำลังใช้งานสคริปต์ (เห็นเฉพาะของตัวเอง)
   รองรับหลายร้อยบัญชี: สรุปภาพรวม, มุมมองการ์ด/ตาราง, ค้นหา/กรอง/เรียง, กลุ่ม, ค้นไอเท็มข้ามบัญชี,
   กราฟรายได้รายวัน, ส่งออก CSV, ล้างหลายรายการ, โหลดทีละส่วน และการแจ้งเตือน
   ข้อความทั้งหมดผ่าน t() (ไทย/อังกฤษ) ใช้ window.RVX จาก acct.js */
(() => {
"use strict";
const R = window.RVX; if (!R) return;
const { t, esc, api, modal, toast, fmt, ic, loginHref } = R;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = $("#ac-root");
const POLL = 10, PAGE = 60, PAGE_MAX = 500;
const loc = () => (document.documentElement.lang === "en" ? "en" : "th");
const num = n => { n = Number(n) || 0; return Math.abs(n) >= 1e6 ? n.toLocaleString(loc(), { notation: "compact", maximumFractionDigits: 2 }) : n.toLocaleString(loc(), { maximumFractionDigits: 2 }); };
const full = n => (Number(n) || 0).toLocaleString(loc(), { maximumFractionDigits: 2 });
const signed = n => (n > 0 ? "+" : "") + num(n);
const dur = ms => {
  const m = Math.floor(Math.max(0, ms) / 6e4), h = Math.floor(m / 60), d = Math.floor(h / 24);
  const th = loc() === "th";
  if (d >= 1) return th ? `${d} วัน ${h % 24} ชม.` : `${d}d ${h % 24}h`;
  if (h) return th ? `${h} ชม. ${m % 60} น.` : `${h}h ${m % 60}m`;
  return th ? `${m} น.` : `${m}m`;
};
const ago = ms => {
  if (!ms) return "—";
  const s = Math.round((Date.now() - ms) / 1e3), f = new Intl.RelativeTimeFormat(loc() === "th" ? "th-TH" : "en-GB", { numeric: "auto" });
  if (s < 60) return t("ago.now");
  if (s < 3600) return f.format(-Math.round(s / 60), "minute");
  if (s < 86400) return f.format(-Math.round(s / 3600), "hour");
  return f.format(-Math.round(s / 86400), "day");
};
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const errText = e => { const c = e && e.data && e.data.code; if (c) { const m = t("ac.err." + c); if (m !== "ac.err." + c) return m; } return (e && e.message) || t("err.generic"); };
const debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

/* ---------------- สถานะ ---------------- */
const narrow = () => !!(window.matchMedia && matchMedia("(max-width:720px)").matches);
const F = { q: "", state: "all", game: "", tag: "", key: "", sort: "state", rev: false };
let tab = "accounts", view = store.get("rvx-ac-view") === "table" ? "table" : "cards";
let data = null, accts = [], sel = new Set(), open = null, detail = null, q2 = "";
let selForce = false, timer = null, busy = false, mode = "init", lastMsg = null, optSig = "", days = 14;

const stateLabel = a => t(a.state === "offline" ? (a.dropped ? "ac.dropped" : "ac.offline") : a.state === "stalled" ? "ac.stalled" : "ac.online");
const tagCls = a => (a.state === "online" ? " new" : a.state === "stalled" || a.dropped ? " warn" : "");
const who = a => a.label || a.name;
const rcls = r => { const c = String(r || "").toLowerCase().replace(/[^a-z]/g, ""); return c ? " r-" + c : ""; };
/* รูปโปรไฟล์ / ไอคอนแมพ: ถ้ายังไม่มีรูปหรือโหลดไม่ได้ จะแสดงตัวอักษรแทน (จัดการใน onImgErr) */
const pic = (url, letter, cls) => `<span class="ac-pic ${cls}">${url ? `<img src="${esc(url)}" data-l="${esc(String(letter || "?").trim().charAt(0).toUpperCase())}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<b>${esc(String(letter || "?").trim().charAt(0).toUpperCase())}</b>`}</span>`;
const minis = a => (a.top && a.top.length ? `<span class="ac-top">${a.top.slice(0, 3).map(i => `<span class="ac-mini${rcls(i.r)}" title="${esc(i.n)} ×${esc(num(i.c))}">${i.img ? `<img src="${esc(i.img)}" data-l="${esc(i.n.charAt(0).toUpperCase())}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<b>${esc(i.n.charAt(0).toUpperCase())}</b>`}</span>`).join("")}</span>` : "");
function onImgErr(e) { const im = e.target; if (!im || im.tagName !== "IMG" || !im.dataset.l) return; const b = document.createElement("b"); b.textContent = im.dataset.l; im.replaceWith(b); }
document.addEventListener("error", onImgErr, true);
const sub = a => (a.label ? a.name + " · " : "") + (a.display && a.display !== a.name ? "@" + a.display : "ID " + a.userId);

/* ---------------- กราฟเส้นย่อ ---------------- */
function sparkline(h) {
  if (!h || h.length < 2) return "";
  const xs = h.map(p => p[0]), ys = h.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 600, H = 90, P = 6;
  const pts = h.map(p => `${(P + (W - 2 * P) * (p[0] - x0) / ((x1 - x0) || 1)).toFixed(1)},${(H - P - (H - 2 * P) * (p[1] - y0) / ((y1 - y0) || 1)).toFixed(1)}`).join(" ");
  return `<svg class="ac-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}

/* ---------------- โครงหน้า ---------------- */
function msg(title, body, btn) { mode = "msg"; lastMsg = () => msg(title, body, btn); root.innerHTML = `<div class="panel ac-msg"><h2>${esc(title)}</h2><p class="ac-mut">${body}</p>${btn || ""}</div>`; }

function opt(v, label, cur) { return `<option value="${esc(v)}"${String(v) === String(cur) ? " selected" : ""}>${esc(label)}</option>`; }
function sortOpts() { return ["state", "name", "game", "cur", "rate", "session", "last"].map(k => opt(k, t("ac.sortBy") + ": " + t("ac.s." + k), F.sort)).join(""); }

function shell() {
  mode = "main"; optSig = "";
  root.innerHTML = `
    <div class="ac-sum" id="ac-sum"></div>
    <div class="ac-nav">
      <div class="ac-tabs" role="tablist">
        ${["accounts", "items", "income"].map(k => `<button type="button" role="tab" class="ac-tab${tab === k ? " on" : ""}" data-tab="${k}" aria-selected="${tab === k}">${esc(t("ac.tab." + k))}</button>`).join("")}
      </div>
      <div class="ac-nav-r">
        <button type="button" class="ac-ib" id="ac-alerts" title="${esc(t("ac.set"))}" aria-label="${esc(t("ac.set"))}">${ic("bell")}</button>
        <button type="button" class="ac-ib" id="ac-export" title="${esc(t("ac.exp"))}" aria-label="${esc(t("ac.exp"))}">${ic("download")}</button>
      </div>
    </div>
    <div id="p-accounts" ${tab === "accounts" ? "" : "hidden"}>
      <div class="ac-tools">
        <label class="ac-search">${ic("search")}<input id="ac-q" type="search" placeholder="${esc(t("ac.search"))}" value="${esc(F.q)}" aria-label="${esc(t("ac.search"))}" autocomplete="off"></label>
        <div class="ac-filters" id="ac-filters">
          <select id="ac-fs" aria-label="${esc(t("ac.f.all"))}">${[["all", "ac.f.all"], ["online", "ac.f.online"], ["problem", "ac.f.problem"], ["offline", "ac.f.offline"]].map(([v, k]) => opt(v, t(k), F.state)).join("")}</select>
          <select id="ac-ft"></select><select id="ac-fk" hidden></select>
          <select id="ac-so" aria-label="${esc(t("ac.sortBy"))}">${sortOpts()}</select>
        </div>
        <button type="button" class="ac-fbtn" id="ac-ftoggle" aria-expanded="false" aria-controls="ac-filters">${ic("sliders")}<span>${esc(t("ac.filters"))}</span><em id="ac-fn" hidden></em></button>
        <div class="seg" role="group"><button type="button" data-v="cards" class="${view === "cards" ? "on" : ""}" title="${esc(t("ac.view.cards"))}" aria-label="${esc(t("ac.view.cards"))}">${ic("grid")}</button><button type="button" data-v="table" class="${view === "table" ? "on" : ""}" title="${esc(t("ac.view.table"))}" aria-label="${esc(t("ac.view.table"))}">${ic("list")}</button></div>
      </div>
      <div class="ac-maps" id="ac-maps" role="group" aria-label="${esc(t("ac.f.game"))}"></div>
      <div class="ac-bar"><span class="ac-mut" id="ac-count"></span><span class="ac-bar-r"><button type="button" class="ac-link" id="ac-clear" hidden>${esc(t("ac.clearF"))}</button><button type="button" class="ac-link" id="ac-selmode">${esc(t("ac.select"))}</button><button type="button" class="ac-link" id="ac-clean">${esc(t("ac.cleanup"))}</button><span class="ac-live">${esc(t("ac.live", { s: POLL }))}</span></span></div>
      <div id="ac-sel" class="ac-selbar" hidden></div>
      <div id="ac-list"></div>
      <div class="ac-more"><button type="button" class="btn-pill ghost" id="ac-more" hidden>${esc(t("ac.more"))}</button></div>
      <div class="ac-detail panel" id="ac-detail" hidden></div>
    </div>
    <div id="p-items" class="panel ac-panel" ${tab === "items" ? "" : "hidden"}>
      <h3>${esc(t("ac.is.title"))}</h3>
      <input id="ac-iq" type="search" placeholder="${esc(t("ac.is.ph"))}" value="${esc(q2)}" aria-label="${esc(t("ac.is.title"))}" autocomplete="off">
      <div id="ac-ir" class="ac-ir"><p class="ac-mut">${esc(t("ac.is.hint"))}</p></div>
    </div>
    <div id="p-income" class="panel ac-panel" ${tab === "income" ? "" : "hidden"}>
      <div class="ac-ch-h"><div><h3>${esc(t("ac.ch.title"))}</h3><p class="ac-mut">${esc(t("ac.ch.sub"))}</p></div>
        <div class="chips">${[7, 14, 30].map(n => `<button type="button" class="chip${days === n ? " on" : ""}" data-days="${n}">${esc(t("ac.ch.days", { n }))}</button>`).join("")}</div></div>
      <div id="ac-ch"></div>
    </div>`;
  bind();
  if (q2) runItems();
  if (tab === "income") loadChart();
}

/* ---------------- ภาพรวม ---------------- */
function renderSummary() {
  const s = data.summary, box = $("#ac-sum"); if (!box) return;
  const tile = (key, label, value, subtxt, on) => `<button type="button" class="mstat ac-tile-s${on ? " on" : ""}" data-go="${key}"><span>${esc(label)}</span><b class="num">${value}</b><small>${esc(subtxt)}</small></button>`;
  const prob = s.stalled + s.dropped;
  let h = tile("online", t("ac.sumOnline"), `${esc(num(s.online + s.stalled))}<i> / ${esc(num(s.total))}</i>`, t("ac.sumOf", { n: num(s.total) }), F.state === "online")
    + tile("problem", t("ac.sumProblem"), esc(num(prob)), t("ac.sumProblemD", { s: num(s.stalled), d: num(s.dropped) }), F.state === "problem")
    + tile("offline", t("ac.sumOffline"), esc(num(s.offline)), data.maxPerKey ? t("ac.cap", { n: data.maxPerKey }) : "", F.state === "offline");
  for (const c of s.currencies.slice(0, 3)) {
    h += `<div class="mstat"><span>${esc(t("ac.sumBal", { n: c.n }))}</span><b class="num" title="${esc(full(c.v))}">${esc(num(c.v))}</b><small>${esc(c.perHour ? t("ac.sumRate", { v: num(c.perHour) }) : t("ac.sumAcc", { n: num(c.accounts) }))}</small></div>`;
  }
  box.innerHTML = h;
}

function renderMaps() {
  const box = $("#ac-maps"); if (!box) return;
  const g = data.summary.games;
  box.hidden = g.length < 2 && !F.game;
  box.innerHTML = `<button type="button" class="ac-mapb${F.game ? "" : " on"}" data-game="">${esc(t("ac.f.game"))}</button>` +
    g.map(x => `<button type="button" class="ac-mapb${F.game === x.n ? " on" : ""}" data-game="${esc(x.n)}">${pic(x.cover, x.n, "cv")}<span>${esc(x.n)}</span><em class="num">${esc(num(x.c))}</em></button>`).join("");
}
function renderOptions() {
  const s = data.summary;
  const sig = JSON.stringify([s.games, s.tags, s.keys, loc()]);
  if (sig === optSig) return; optSig = sig;
  $("#ac-ft").innerHTML = opt("", t("ac.f.tag"), F.tag) + s.tags.map(g => opt(g.n, `${g.n} (${g.c})`, F.tag)).join("") + opt("-", t("ac.f.noTag"), F.tag);
  const fk = $("#ac-fk"); fk.hidden = s.keys.length < 2;
  fk.innerHTML = opt("", t("ac.f.key"), F.key) + s.keys.map(k => opt(k.n, `${t("ac.f.keyN", { k: k.n })} (${k.c})`, F.key)).join("");
}

/* ---------------- รายการ (การ์ด / ตาราง) ---------------- */
function card(a) {
  const cur = a.cur.slice(0, 3).map(c => `<div class="ac-cur"><span>${esc(c.n)}</span><b class="num">${esc(num(c.v))}</b>${a.online || c.gain ? `<small class="${c.gain > 0 ? "up" : ""}">${esc(signed(c.gain))}${c.perHour != null && c.gain ? ` · ${esc(t("ac.ph", { v: num(c.perHour) }))}` : ""}</small>` : ""}</div>`).join("");
  const warn = a.state === "stalled" ? `<div class="ac-warn">${esc(t("ac.stalledFor", { d: dur(a.stallMs) }))}</div>` : "";
  return `<div class="ac-card ${a.state}${a.dropped ? " dropped" : ""}${open === a.id ? " sel" : ""}" data-id="${esc(a.id)}" role="button" tabindex="0">
    <div class="ac-head"><label class="ac-ck" title="${esc(t("ac.select"))}"><input type="checkbox" data-sel="${esc(a.id)}"${sel.has(a.id) ? " checked" : ""} aria-label="${esc(t("ac.select"))}"></label>${pic(a.avatar, a.name, "av")}<div class="ac-who"><b>${esc(who(a))}</b><small>${esc(sub(a))}</small></div>
      <span class="tag${tagCls(a)}">${esc(stateLabel(a))}</span></div>
    <div class="ac-map">${pic(a.cover, a.game, "cv")}<span>${esc(a.game)}</span>${a.tag ? ` <span class="ac-grp">${esc(a.tag)}</span>` : ""}</div>
    ${warn}
    ${a.top && a.top.length ? `<div class="ac-toprow">${a.top.map(i => `<span class="ac-mini${rcls(i.r)}" title="${esc(i.n)} ×${esc(num(i.c))}">${i.img ? `<img src="${esc(i.img)}" data-l="${esc(i.n.charAt(0).toUpperCase())}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<b>${esc(i.n.charAt(0).toUpperCase())}</b>`}</span>`).join("")}</div>` : ""}
    <div class="ac-curs">${cur || `<span class="ac-mut">—</span>`}</div>
    <div class="ac-foot"><span>${esc(t("ac.session"))} <b class="num">${esc(dur(a.sessionMs))}</b></span><span>${esc(t("ac.itemsN", { n: num(a.itemTotal) }))}</span></div>
  </div>`;
}

const COLS = [["name", "ac.c.account"], ["state", "ac.c.status"], ["game", "ac.c.map"], [null, "ac.c.items"], ["cur", "ac.c.bal", 1], ["rate", "ac.c.rate", 1], ["session", "ac.c.session", 1], ["last", "ac.c.last", 1]];
function row(a) {
  const c = a.cur[0];
  return `<tr class="${a.state}${open === a.id ? " sel" : ""}" data-id="${esc(a.id)}" tabindex="0">
    <td class="ck"><input type="checkbox" data-sel="${esc(a.id)}"${sel.has(a.id) ? " checked" : ""} aria-label="${esc(t("ac.select"))}"></td>
    <td><div class="ac-cellw">${pic(a.avatar, a.name, "av")}<div><b>${esc(who(a))}</b><small>${esc(sub(a))}${a.tag ? " · " + esc(a.tag) : ""}</small></div></div></td>
    <td><span class="tag${tagCls(a)}">${esc(stateLabel(a))}</span>${a.state === "stalled" ? `<small>${esc(dur(a.stallMs))}</small>` : ""}</td>
    <td><div class="ac-cellw">${pic(a.cover, a.game, "cv")}<span>${esc(a.game)}</span></div></td>
    <td>${minis(a) || "—"}</td>
    <td class="r">${c ? `<b class="num">${esc(num(c.v))}</b><small>${esc(c.n)}</small>` : "—"}</td>
    <td class="r">${c && c.perHour != null && a.online ? esc(num(c.perHour)) : "—"}</td>
    <td class="r">${esc(dur(a.sessionMs))}</td>
    <td class="r">${esc(ago(a.last))}</td></tr>`;
}
function table() {
  const head = COLS.map(([k, lab, r]) => !k ? `<th scope="col">${esc(t(lab))}</th>` : `<th class="${r ? "r " : ""}sortable${F.sort === k ? " on" : ""}" data-sort="${k}" scope="col" aria-sort="${F.sort === k ? (F.rev ? "ascending" : "descending") : "none"}">${esc(t(lab))}${F.sort === k ? `<i>${F.rev ? "▲" : "▼"}</i>` : ""}</th>`).join("");
  return `<div class="tbl ac-tbl"><table><thead><tr><th class="ck"></th>${head}</tr></thead><tbody>${accts.map(row).join("")}</tbody></table></div>`;
}

function renderList() {
  const box = $("#ac-list"); if (!box) return;
  if (!accts.length) box.innerHTML = `<div class="panel ac-msg"><p class="ac-mut">${esc(t("ac.noMatch"))}</p></div>`;
  else box.innerHTML = view === "table" && !narrow() ? table() : `<div class="ac-grid">${accts.map(card).join("")}</div>`;
  const filtering = F.q || F.state !== "all" || F.game || F.tag || F.key;
  $("#ac-clear").hidden = !filtering;
  $("#ac-count").textContent = t("ac.shown", { a: num(accts.length), b: num(data.filtered) });
  $("#ac-more").hidden = accts.length >= data.filtered;
  const nf = (F.state !== "all") + !!F.tag + !!F.key, fn = $("#ac-fn"); if (fn) { fn.hidden = !nf; fn.textContent = nf; }
  renderSel();
}
function renderSel() {
  const b = $("#ac-sel"); if (!b) return;
  const lst = $("#ac-list"); if (lst) lst.classList.toggle("selmode", sel.size > 0 || selForce); const sm = $("#ac-selmode"); if (sm) sm.classList.toggle("on", selForce);
  if (!sel.size) { b.hidden = true; b.innerHTML = ""; return; }
  b.hidden = false;
  b.innerHTML = `<b>${esc(t("ac.selN", { n: sel.size }))}</b><span class="ac-grow"></span>
    <button type="button" class="btn-pill ghost sm" data-b="all">${esc(t("ac.selAll"))}</button>
    <button type="button" class="btn-pill ghost sm" data-b="group">${esc(t("ac.setGroup"))}</button>
    <button type="button" class="btn-pill ghost sm" data-b="del">${esc(t("ac.delSel"))}</button>
    <button type="button" class="btn-pill ghost sm" data-b="none">${esc(t("ac.selNone"))}</button>`;
}

/* ---------------- รายละเอียดรายบัญชี ---------------- */
function renderDetail() {
  const box = $("#ac-detail"); if (!box) return;
  if (!open || !detail) { box.hidden = true; box.innerHTML = ""; box.dataset.id = ""; return; }
  const d = detail;
  if (box.dataset.id !== d.id) {        // สร้างโครงใหม่เฉพาะตอนเปลี่ยนบัญชี (ไม่ทำให้ช่องกรอกเด้ง)
    box.dataset.id = d.id; box.hidden = false;
    box.innerHTML = `<div class="ac-dh"><div><h2 id="acd-name"></h2><p class="ac-mut" id="acd-sub"></p></div>
        <div class="ac-acts"><button type="button" class="ac-ib" id="acd-del" title="${esc(t("ac.remove"))}" aria-label="${esc(t("ac.remove"))}">${ic("trash")}</button><button type="button" class="ac-ib" id="acd-close" title="${esc(t("m.close"))}" aria-label="${esc(t("m.close"))}">${ic("x")}</button></div></div>
      <div class="ac-meta"><label><span>${esc(t("ac.nick"))}</span><input id="acd-nick" maxlength="40" placeholder="${esc(t("ac.nickPh"))}" value="${esc(d.label)}"></label>
        <label><span>${esc(t("ac.group"))}</span><input id="acd-tag" maxlength="24" list="ac-tags" placeholder="${esc(t("ac.groupPh"))}" value="${esc(d.tag)}"></label>
        <button type="button" class="btn-pill primary sm" id="acd-save">${esc(t("ac.save"))}</button></div>
      <datalist id="ac-tags">${data.summary.tags.map(g => `<option value="${esc(g.n)}">`).join("")}</datalist>
      <div class="mstats" id="acd-cur"></div><div id="acd-spark" class="ac-sparkbox"></div>
      <div id="acd-stats" class="ac-stats"></div>
      <div class="ac-ih"><h3>${esc(t("ac.items"))}</h3><input id="acd-q" type="search" placeholder="${esc(t("ac.searchItem"))}" value="${esc(q2d)}"></div>
      <div class="ac-tiles" id="acd-items"></div>`;
    $("#acd-items").addEventListener("error", e => {   // รูปโหลดไม่ได้ -> แสดงตัวอักษรแทน
      if (e.target.tagName !== "IMG") return;
      const sp = document.createElement("span"); sp.textContent = e.target.dataset.l || "?"; e.target.replaceWith(sp);
    }, true);
    $("#acd-close").onclick = closeDetail;
    $("#acd-del").onclick = removeOne;
    $("#acd-save").onclick = saveMeta;
    $("#acd-q").oninput = e => { q2d = e.target.value; fillItems(); };
  }
  $("#acd-name").textContent = who(d);
  $("#acd-sub").textContent = `${d.name} · ${t("ac.uid")} ${d.userId} · ${d.game} · ${t("ac.last")} ${fmt(d.last)} · ${t("ac.total")} ${dur(d.totalMs)} · ${t("ac.key")} …${d.keyTail}`;
  $("#acd-cur").innerHTML = d.cur.map(c => `<div class="mstat"><span>${esc(c.n)}</span><b class="num">${esc(full(c.v))}</b><span class="${c.gain > 0 ? "ac-up" : ""}">${esc(signed(c.gain))} ${esc(t("ac.thisSession"))}${c.perHour != null && c.gain ? ` · ${esc(t("ac.ph", { v: num(c.perHour) }))}` : ""}</span></div>`).join("");
  $("#acd-spark").innerHTML = d.hist && d.hist.length > 1 ? `<small class="ac-mut">${esc(t("ac.hist"))}${d.cur[0] ? " — " + esc(d.cur[0].n) : ""}</small>${sparkline(d.hist)}` : "";
  const st = Object.entries(d.stats || {});
  $("#acd-stats").innerHTML = st.length ? st.map(([k, v]) => `<div class="mstat"><span>${esc(k)}</span><b class="num">${esc(typeof v === "number" ? full(v) : v)}</b></div>`).join("") : "";
  fillItems();
}
let q2d = "";
function tile(i) {
  const l = esc((i.n || "?").trim().charAt(0).toUpperCase()), rc = String(i.r || "").toLowerCase().replace(/[^a-z]/g, "");
  return `<div class="ac-tile${rc ? " r-" + esc(rc) : ""}" title="${esc(i.n)}${i.r ? " · " + esc(i.r) : ""}">
    <div class="ac-img">${i.img ? `<img src="${esc(i.img)}" data-l="${l}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span>${l}</span>`}<em class="num">${esc(num(i.c))}</em>${i.gain > 0 ? `<small class="num">+${esc(num(i.gain))}</small>` : ""}</div>
    <b>${esc(i.n)}</b></div>`;
}
function fillItems() {
  const tb = $("#acd-items"); if (!tb || !detail) return;
  const s = q2d.trim().toLowerCase();
  const rows = detail.items.filter(i => !s || i.n.toLowerCase().includes(s)).sort((a, b) => b.c - a.c);
  tb.innerHTML = rows.length ? rows.map(tile).join("") : `<p class="ac-mut">${esc(t("ac.noItems"))}</p>`;
}
function closeDetail() { open = null; detail = null; renderList(); renderDetail(); }
async function openDetail(id) {
  open = open === id ? null : id; detail = null; q2d = "";
  renderList(); renderDetail();
  if (open) { await loadDetail(); const b = $("#ac-detail"); if (b && !b.hidden) b.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
}
async function loadDetail() {
  if (!open) return;
  try { const d = await api("/api/acct/" + encodeURIComponent(open)); if (open === d.id) { detail = d; renderDetail(); } }
  catch (e) { if (e.status === 404) { open = null; detail = null; renderDetail(); } }
}

/* ---------------- การทำงานต่าง ๆ ---------------- */
async function saveMeta() {
  if (!detail) return;
  const b = $("#acd-save"); b.disabled = true;
  try {
    await api("/api/acct/meta", "POST", { ids: [detail.id], label: $("#acd-nick").value, tag: $("#acd-tag").value });
    toast(t("ac.saved")); await load(); await loadDetail();
  } catch (e) { toast(errText(e), "er"); }
  b.disabled = false;
}
async function removeOne() {
  if (!detail) return;
  const id = detail.id;
  const ok = await modal({ title: t("ac.removeT"), body: `<p>${esc(t("ac.removeB"))}</p>`, ok: t("ac.remove"), danger: true, onOk: async () => { await api("/api/acct/" + encodeURIComponent(id), "DELETE"); } });
  if (!ok) return;
  toast(t("ac.removed")); sel.delete(id); open = null; detail = null; await load(); renderDetail();
}
async function bulkDelete() {
  const ids = [...sel];
  const ok = await modal({ title: t("ac.bulkT", { n: ids.length }), body: `<p>${esc(t("ac.bulkB"))}</p>`, ok: t("ac.delSel"), danger: true,
    onOk: async () => { const r = await api("/api/acct/bulk-delete", "POST", { ids }); toast(t("ac.deleted", { n: r.count })); } });
  if (!ok) return;
  sel.clear(); if (open && ids.includes(open)) { open = null; detail = null; }
  await load(); renderDetail();
}
async function bulkGroup() {
  const ids = [...sel];
  const ok = await modal({ title: t("ac.setGroupT", { n: ids.length }),
    body: `<p class="ac-mut">${esc(t("ac.setGroupHint"))}</p><input id="bg-tag" class="ac-mi" maxlength="24" list="ac-tags2" placeholder="${esc(t("ac.groupPh"))}"><datalist id="ac-tags2">${data.summary.tags.map(g => `<option value="${esc(g.n)}">`).join("")}</datalist>`,
    ok: t("ac.save"), onOk: async o => { await api("/api/acct/meta", "POST", { ids, tag: $("#bg-tag", o).value }); } });
  if (!ok) return;
  toast(t("ac.saved")); await load();
}
async function cleanup() {
  let pick = 7;
  const count = async d => { try { return (await api("/api/acct/bulk-delete", "POST", { offlineDays: d, preview: true })).count; } catch { return 0; } };
  const n0 = await count(pick);
  const on = e => { if (e.target.id !== "cl-days") return; pick = +e.target.value; count(pick).then(n => { const c = $("#cl-count"); if (c) c.textContent = n ? t("ac.cleanMatch", { n }) : t("ac.cleanNone"); }); };
  document.addEventListener("change", on);
  const ok = await modal({ title: t("ac.cleanT"),
    body: `<p class="ac-mut">${esc(t("ac.cleanB"))}</p><select id="cl-days" class="ac-mi">${[1, 3, 7, 14, 30].map(d => `<option value="${d}"${d === pick ? " selected" : ""}>${esc(t("ac.cleanDays", { n: d }))}</option>`).join("")}</select><p id="cl-count" class="ac-mut" style="margin-top:12px">${esc(n0 ? t("ac.cleanMatch", { n: n0 }) : t("ac.cleanNone"))}</p>`,
    ok: t("ac.cleanGo"), danger: true, onOk: async () => { const r = await api("/api/acct/bulk-delete", "POST", { offlineDays: pick }); toast(t("ac.deleted", { n: r.count })); } });
  document.removeEventListener("change", on);
  if (ok) { sel.clear(); await load(); }
}

let expPick = "";
document.addEventListener("click", e => { const b = e.target.closest("[data-exp]"); if (b) expPick = b.dataset.exp; }, true);
async function exportCsv() {
  await modal({ title: t("ac.exp"), body: `<div class="ac-expb"><button type="button" class="btn-pill ghost" data-exp="accounts" data-x="o">${esc(t("ac.exp.acc"))}</button><button type="button" class="btn-pill ghost" data-exp="items" data-x="o">${esc(t("ac.exp.items"))}</button></div>`, hideOk: true,
    onOk: async () => { const a = document.createElement("a"); a.href = "/api/acct/export?type=" + (expPick === "items" ? "items" : "accounts"); a.download = ""; document.body.append(a); a.click(); a.remove(); toast(t("ac.exp.done")); } });
}

async function alerts() {
  let p; try { p = await api("/api/acct/prefs"); } catch (e) { return toast(errText(e), "er"); }
  const lang = () => (document.documentElement.lang === "en" ? "en" : "th");
  const test = async () => {
    const h = $("#as-hook"); const b = $("#as-test"); b.disabled = true;
    try {
      if (h.value.trim()) { await api("/api/acct/prefs", "POST", { hook: h.value.trim(), lang: lang() }); h.value = ""; p.hookSet = true; const hs = $("#as-hs"); if (hs) hs.textContent = t("ac.set.hookSet"); }
      await api("/api/acct/prefs/test", "POST", {}); toast(t("ac.set.testOk"));
    } catch (e) { toast(errText(e), "er"); }
    b.disabled = false;
  };
  const clear = async () => { try { await api("/api/acct/prefs", "POST", { hook: "" }); p.hookSet = false; toast(t("ac.set.saved")); const hs = $("#as-hs"); if (hs) hs.textContent = t("ac.set.hookHint"); } catch (e) { toast(errText(e), "er"); } };
  const click = e => { if (e.target.closest("#as-test")) test(); else if (e.target.closest("#as-clear")) clear(); };
  document.addEventListener("click", click);
  const ok = await modal({ title: t("ac.set.title"),
    body: `<div class="ac-form"><label><span>${esc(t("ac.set.stall"))}</span><input id="as-stall" class="ac-mi" type="number" min="0" max="240" step="1" value="${esc(p.stallMin)}"></label><p class="ac-mut">${esc(t("ac.set.stallHint"))}</p>
      <label><span>${esc(t("ac.set.hook"))}</span><input id="as-hook" class="ac-mi" type="url" inputmode="url" autocomplete="off" placeholder="https://discord.com/api/webhooks/…"></label>
      <p class="ac-mut" id="as-hs">${esc(p.hookSet ? t("ac.set.hookSet") : t("ac.set.hookHint"))}</p>
      <div class="ac-expb"><button type="button" class="btn-pill ghost sm" id="as-test">${esc(t("ac.set.test"))}</button><button type="button" class="btn-pill ghost sm" id="as-clear">${esc(t("ac.set.hookClear"))}</button></div>
      <p class="ac-mut">${esc(t("ac.set.tip"))}</p></div>`,
    ok: t("ac.save"),
    onOk: async o => {
      const body = { stallMin: Number($("#as-stall", o).value), lang: lang() }, h = $("#as-hook", o).value.trim();
      if (h) body.hook = h;
      await api("/api/acct/prefs", "POST", body);
    } });
  document.removeEventListener("click", click);
  if (ok) { toast(t("ac.set.saved")); await load(); }
}

/* ---------------- ค้นหาไอเท็มข้ามบัญชี ---------------- */
let itemSeq = 0;
async function runItems() {
  const box = $("#ac-ir"); if (!box) return;
  const qq = q2.trim(); if (!qq) { box.innerHTML = `<p class="ac-mut">${esc(t("ac.is.hint"))}</p>`; return; }
  const my = ++itemSeq;
  try {
    const r = await api("/api/acct/items?q=" + encodeURIComponent(qq));
    if (my !== itemSeq) return;
    if (!r.items.length) { box.innerHTML = `<p class="ac-mut">${esc(t("ac.is.none"))}</p>`; return; }
    box.innerHTML = `<p class="ac-mut">${esc(t("ac.is.kinds", { n: num(r.kinds) }))}</p>` + r.items.map(i => {
      const l = esc((i.n || "?").trim().charAt(0).toUpperCase()), rest = i.accounts - i.holders.length;
      return `<div class="ac-irow"><div class="ac-img sm">${i.img ? `<img src="${esc(i.img)}" data-l="${l}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span>${l}</span>`}</div>
        <div class="ac-ib"><div class="ac-ih2"><b>${esc(i.n)}</b>${i.r ? `<span class="tag">${esc(i.r)}</span>` : ""}<span class="ac-mut">${esc(t("ac.is.total", { n: num(i.total), a: num(i.accounts) }))}</span></div>
        <div class="ac-hold">${i.holders.map(h => `<button type="button" class="ac-chipb${h.online ? " on" : ""}" data-open="${esc(h.id)}">${esc(h.name)} <b class="num">×${esc(num(h.c))}</b></button>`).join("")}${rest > 0 ? `<span class="ac-mut">${esc(t("ac.is.more", { n: num(rest) }))}</span>` : ""}</div></div></div>`;
    }).join("");
    $$("img", box).forEach(im => im.addEventListener("error", () => { const sp = document.createElement("span"); sp.textContent = im.dataset.l || "?"; im.replaceWith(sp); }, { once: true }));
  } catch (e) { if (my === itemSeq) box.innerHTML = `<p class="ac-mut">${esc(errText(e))}</p>`; }
}

/* ---------------- กราฟรายได้รายวัน ---------------- */
function bars(s, ds) {
  const W = 600, H = 150, PT = 10, PB = 22, PL = 6, n = ds.length, max = Math.max(...s.values, 1), bw = (W - PL * 2) / n;
  const md = d => { const [, m, dd] = d.split("-"); return `${+dd}/${+m}`; };
  const rects = s.values.map((v, i) => {
    const h = Math.max(v > 0 ? 2 : 0, (H - PT - PB) * v / max), x = PL + i * bw + bw * .14;
    return `<rect x="${x.toFixed(1)}" y="${(H - PB - h).toFixed(1)}" width="${(bw * .72).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="currentColor" opacity="${v > 0 ? .85 : .15}"><title>${esc(md(ds[i]))} — ${esc(full(v))} ${esc(s.n)}</title></rect>`;
  }).join("");
  const lab = [0, Math.floor((n - 1) / 2), n - 1].map(i => `<text x="${(PL + i * bw + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}" class="ac-ax">${esc(md(ds[i]))}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="ac-bars" role="img" aria-label="${esc(s.n)}"><line x1="${PL}" x2="${W - PL}" y1="${H - PB}" y2="${H - PB}" stroke="currentColor" opacity=".2"/>${rects}${lab}<text x="${W - PL}" y="${PT + 2}" text-anchor="end" class="ac-ax">${esc(num(max))}</text></svg>`;
}
async function loadChart() {
  const box = $("#ac-ch"); if (!box) return;
  try {
    const r = await api("/api/acct/daily?days=" + days);
    box.innerHTML = r.series.length ? `<div class="ac-chs">${r.series.map(s => `<div class="ac-chc"><div class="ac-chh"><b>${esc(s.n)}</b><span class="ac-mut">${esc(t("ac.ch.total"))} <b class="num">${esc(num(s.total))}</b></span></div>${bars(s, r.days)}</div>`).join("")}</div>` : `<p class="ac-mut">${esc(t("ac.ch.empty"))}</p>`;
  } catch (e) { box.innerHTML = `<p class="ac-mut">${esc(errText(e))}</p>`; }
}

/* ---------------- เหตุการณ์ ---------------- */
function bind() {
  const reload = () => { accts = []; load(); };
  const dq = debounce(() => { F.q = $("#ac-q").value.trim(); reload(); }, 280);
  $("#ac-q").oninput = dq;
  $("#ac-fs").onchange = e => { F.state = e.target.value; reload(); };
  $("#ac-maps").onclick = e => { const b = e.target.closest("[data-game]"); if (!b) return; F.game = F.game === b.dataset.game ? "" : b.dataset.game; reload(); };
  $("#ac-ft").onchange = e => { F.tag = e.target.value; reload(); };
  $("#ac-fk").onchange = e => { F.key = e.target.value; reload(); };
  $("#ac-so").onchange = e => { F.sort = e.target.value; F.rev = false; reload(); };
  $("#ac-clear").onclick = () => { Object.assign(F, { q: "", state: "all", game: "", tag: "", key: "" }); $("#ac-q").value = ""; $("#ac-fs").value = "all"; optSig = ""; reload(); };
  $("#ac-clean").onclick = cleanup;
  $("#ac-selmode").onclick = () => { selForce = !selForce; if (!selForce) sel.clear(); renderList(); };
  $("#ac-more").onclick = () => loadMore();
  $("#ac-ftoggle").onclick = e => { const o = $("#ac-filters").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); e.currentTarget.classList.toggle("on", o); };
  $("#ac-alerts").onclick = alerts;
  $("#ac-export").onclick = exportCsv;
  $("#ac-iq").oninput = debounce(e => { q2 = $("#ac-iq").value; runItems(); }, 300);
  $$(".seg button").forEach(b => b.onclick = () => { view = b.dataset.v; store.set("rvx-ac-view", view); $$(".seg button").forEach(x => x.classList.toggle("on", x === b)); renderList(); });
  $$("[data-tab]").forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    $$("[data-tab]").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-selected", on); });
    for (const k of ["accounts", "items", "income"]) $("#p-" + k).hidden = k !== tab;
    if (tab === "income") loadChart();
  });
  $$("[data-days]").forEach(b => b.onclick = () => { days = +b.dataset.days; $$("[data-days]").forEach(x => x.classList.toggle("on", x === b)); loadChart(); });
  $("#ac-sum").onclick = e => {
    const g = e.target.closest("[data-go]"); if (!g) return;
    F.state = F.state === g.dataset.go ? "all" : g.dataset.go; $("#ac-fs").value = F.state; reload();
  };
  $("#ac-sel").onclick = e => {
    const b = e.target.closest("[data-b]"); if (!b) return;
    if (b.dataset.b === "none") { sel.clear(); renderList(); }
    else if (b.dataset.b === "all") { accts.forEach(a => sel.add(a.id)); renderList(); }
    else if (b.dataset.b === "del") bulkDelete();
    else bulkGroup();
  };
  $("#ac-ir").onclick = e => { const b = e.target.closest("[data-open]"); if (!b) return; $$("[data-tab]")[0].click(); open = null; openDetail(b.dataset.open); };
  const list = $("#ac-list");
  list.addEventListener("change", e => {
    const c = e.target.closest("[data-sel]"); if (!c) return;
    c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); renderSel();
  });
  list.addEventListener("click", e => {
    if (e.target.closest("[data-sel],.ac-ck")) { e.stopPropagation(); return; }
    const th = e.target.closest("th[data-sort]");
    if (th) { const k = th.dataset.sort; F.rev = F.sort === k ? !F.rev : false; F.sort = k; $("#ac-so").value = k; accts = []; load(); return; }
    const c = e.target.closest("[data-id]"); if (c) openDetail(c.dataset.id);
  });
  list.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-id]")) { e.preventDefault(); openDetail(e.target.dataset.id); } });
}

/* ---------------- โหลดข้อมูล ---------------- */
function qs(offset, limit) {
  const p = new URLSearchParams({ offset, limit, sort: F.sort });
  if (F.rev) p.set("dir", "rev");
  for (const k of ["q", "game", "tag", "key"]) if (F[k]) p.set(k, F[k]);
  if (F.state !== "all") p.set("state", F.state);
  return p.toString();
}
function apply(r) {
  data = r;
  if (!data.keys) { msg(t("ac.noKeyT"), esc(t("ac.noKeyD")), `<a class="btn-pill primary" href="/buy"><span>${esc(t("ac.buy"))}</span></a>`); return false; }
  if (!data.summary.total) { msg(t("ac.emptyT"), esc(t("ac.emptyD"))); return false; }
  if (mode !== "main" || !$("#ac-list")) shell();
  renderSummary(); renderOptions(); renderMaps(); renderList();
  return true;
}
async function load() {
  if (busy) return; busy = true;
  try {
    const keep = Math.min(PAGE_MAX, Math.max(PAGE, accts.length));
    const r = await api("/api/acct/list?" + qs(0, keep));
    accts = r.accounts;
    if (apply(r)) await loadDetail();
    syncLang();
  } catch (e) {
    if (e.status === 401) msg(t("ac.loginT"), esc(t("ac.loginD")), `<a class="btn-pill primary" href="${esc(loginHref())}"><span>${esc(t("buy.login"))}</span></a>`);
    else if (e.status === 403) msg(t("buy.banned"), "");
    else if (!data) msg(t("err.generic"), "");
  } finally { busy = false; }
}
async function loadMore() {
  if (busy) return; busy = true;
  const b = $("#ac-more"); if (b) b.disabled = true;
  try {
    const r = await api("/api/acct/list?" + qs(accts.length, PAGE));
    const seen = new Set(accts.map(a => a.id)); accts = accts.concat(r.accounts.filter(a => !seen.has(a.id)));
    apply({ ...r, accounts: accts });
  } catch (e) { toast(errText(e), "er"); }
  finally { busy = false; const b2 = $("#ac-more"); if (b2) b2.disabled = false; }
}
/* ให้ข้อความแจ้งเตือนผ่าน Webhook ใช้ภาษาเดียวกับหน้าเว็บ */
let langSent = "";
function syncLang() {
  const l = loc(); if (!data || !data.prefs || !data.prefs.hookSet || data.prefs.lang === l || langSent === l) return;
  langSent = l; api("/api/acct/prefs", "POST", { lang: l }).then(() => { data.prefs.lang = l; }).catch(() => { langSent = ""; });
}

function tick() { clearTimeout(timer); timer = setTimeout(async () => { if (!document.hidden && !document.querySelector(".dlg")) await load(); tick(); }, POLL * 1e3); }
try { matchMedia("(max-width:720px)").addEventListener("change", () => { if (mode === "main" && data) renderList(); }); } catch {}
document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
window.addEventListener("langchange", () => {
  if (mode === "msg" && lastMsg) return lastMsg();
  if (mode === "main" && data) { const keepOpen = detail; shell(); renderSummary(); renderOptions(); renderMaps(); renderList(); if (keepOpen) { $("#ac-detail").dataset.id = ""; renderDetail(); } syncLang(); }
});
load().then(tick);
})();
