/* หน้า /key (รับคีย์ฟรี) — ตรรกะเดิมของระบบภารกิจ ใส่ดีไซน์เดียวกับหน้าหลัก */
(() => {
"use strict";
const R = window.RVX; if (!R) return;
const { t, esc, api, toast, fmt, ic } = R;
const $ = id => document.getElementById(id);
const CIRC = 163.4;
function newId() { const a = new Uint8Array(32); crypto.getRandomValues(a); return Array.from(a, x => x.toString(16).padStart(2, "0")).join(""); }
let device = null;
try { device = localStorage.getItem("sv_device_id"); } catch {}
if (!device) { const m = document.cookie.match(/(?:^|; )sv_device_id=([A-Za-z0-9_.:-]{8,128})/); if (m) device = m[1]; }
if (!device) device = newId();
try { localStorage.setItem("sv_device_id", device); } catch {}
try { document.cookie = "sv_device_id=" + device + "; max-age=63072000; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : ""); } catch {}
const CK = "sv_key_cache";
const saveKey = (key, expAt) => { try { localStorage.setItem(CK, JSON.stringify({ key, expAt })); } catch {} };
const loadKey = () => { try { const o = JSON.parse(localStorage.getItem(CK) || "null"); return o && o.key && o.expAt > Date.now() ? o : null; } catch { return null; } };
const dropKey = () => { try { localStorage.removeItem(CK); } catch {} };
let S = null, tick = null, busy = false, exp = null, mode = "boot", info = null, keyState = null, keyMeta = null;

const life = h => (h >= 48 && h % 24 === 0 ? t("u.days", { n: h / 24 }) : t("u.hours", { n: h }));
const head = (ti, d) => { $("title").textContent = ti; $("desc").textContent = d || ""; };
const setRing = (done, total, txt) => { $("rc").style.strokeDashoffset = CIRC * (1 - (total ? done / total : 0)); $("rt").textContent = txt !== undefined ? txt : (total ? done + "/" + total : "·"); };
const errView = (m, retry) => { clearInterval(tick); $("view").innerHTML = `<div class="msgbox block">${esc(m)}</div>${retry ? `<button type="button" class="btn-pill ghost full" id="retry">${esc(t("kg.retry"))}</button>` : ""}`; if (retry) $("retry").onclick = retry; };

const now = () => Date.now() - S.skew;
const remain = id => { const o = S.opened[id]; return o ? Math.max(0, Math.ceil((o + S.minWait * 1000 - now()) / 1000)) : null; };
const frac = id => { const o = S.opened[id]; return o ? Math.min(1, (now() - o) / (S.minWait * 1000)) : 0; };
function adopt(d) { S.session = d.session || S.session; S.completed = d.completed || []; S.opened = d.opened || {}; S.minWait = d.minWaitSeconds || S.minWait; if (d.serverTime) S.skew = Date.now() - d.serverTime; }
const taskState = tk => { if (S.completed.includes(tk.id)) return "done"; const r = remain(tk.id); return r === null ? "new" : r > 0 ? "wait" : "ready"; };
const label = (tk, st) => st === "done" ? t("kg.done") : st === "new" ? t("kg.new", { n: S.minWait }) : st === "wait" ? t("kg.wait", { n: remain(tk.id) }) : t("kg.ready");

function facts(i) {
  $("facts").innerHTML = `<li><b>${esc(life(i.keyHours))}</b><span>${esc(t("kg.fLife"))}</span></li><li><b>${esc(t("kg.fTasksN", { n: i.taskCount || "—" }))}</b><span>${esc(t("kg.fTasks"))}</span></li><li><b>${esc(t("kg.fWaitN", { n: i.minWaitSeconds }))}</b><span>${esc(t("kg.fWait"))}</span></li>`;
}

function render() {
  mode = "tasks";
  const total = S.tasks.length, done = S.completed.length, all = done === total;
  head(t("kg.tasksT"), t(all ? "kg.allDone" : "kg.tasksD")); setRing(done, total);
  $("view").innerHTML = `<div class="tasks">${S.tasks.map(tk => {
    const st = taskState(tk), i = S.tasks.indexOf(tk);
    return `<div class="task ${st === "done" ? "done" : ""} ${st === "ready" ? "ready" : ""} ${S.opened[tk.id] && st !== "done" ? "opened" : ""}" data-id="${esc(tk.id)}">
      <span class="no">${st === "done" ? ic("check") : i + 1}</span>
      <div class="tt"><b>${esc(tk.title)}</b><small class="st">${esc(label(tk, st))}</small><div class="tbar"><i style="width:${frac(tk.id) * 100}%"></i></div></div>
      <div class="ta">${st === "done" ? "" : `<a class="btn-pill sm ${st === "new" ? "primary" : "ghost"}" href="${esc(tk.url)}" target="_blank" rel="noopener noreferrer" data-open="${esc(tk.id)}"><span>${esc(t("kg.open"))}</span>${ic("up-right")}</a><button type="button" class="btn-pill sm ghost cf" data-done="${esc(tk.id)}" ${st === "ready" ? "" : "disabled"}><span>${esc(t("kg.confirm"))}</span></button>`}</div></div>`;
  }).join("")}</div>
  <button type="button" class="btn-pill primary lg full" id="claim" ${all ? "" : "disabled"}><span>${esc(all ? t("kg.claim") : t("kg.moreN", { n: total - done }))}</span></button>`;
  $("claim").onclick = claim; startTick();
}
function startTick() {
  clearInterval(tick);
  tick = setInterval(() => {
    if (!S || mode !== "tasks") return;
    document.querySelectorAll(".task:not(.done)").forEach(el => {
      const tk = S.tasks.find(x => x.id === el.dataset.id); if (!tk) return;
      const st = taskState(tk), sm = el.querySelector(".st"), cf = el.querySelector(".cf"), bar = el.querySelector(".tbar i"), txt = label(tk, st);
      if (sm.textContent !== txt) sm.textContent = txt;
      if (bar) bar.style.width = frac(tk.id) * 100 + "%";
      const rd = st === "ready"; el.classList.toggle("ready", rd);
      if (cf && cf.disabled === rd) cf.disabled = !rd;
    });
  }, 250);
}
async function claim() {
  if (busy) return; busy = true;
  const b = $("claim"); b.disabled = true; b.querySelector("span").textContent = t("kg.issuing");
  try { const d = await api("/api/key/claim", "POST", { session: S.session, device }); keyView(d.key, d.expiresAt, false, { devices: 0, maxDevices: (info && info.maxDevices) || 1 }); }
  catch (e) { toast(e.message, "er"); render(); }
  finally { busy = false; }
}
function keyView(key, expAt, already, meta) {
  clearInterval(tick); exp = expAt; mode = "key"; meta = meta || keyMeta; keyMeta = meta; keyState = { key, expAt, already }; saveKey(key, expAt);
  head(t(already ? "kg.haveT" : "kg.gotT"), t("kg.gotD")); setRing(1, 1, "✓");
  $("view").innerHTML = `<div class="kg-key"><code id="kv">${[...key].map((c, i) => `<span style="--i:${i}">${esc(c)}</span>`).join("")}</code></div>
    <button type="button" class="btn-pill primary lg full" id="cp">${ic("copy")}<span>${esc(t("kg.copyKey"))}</span></button>
    <div class="kg-exp"><span>${esc(t("kg.expAt", { d: fmt(expAt) }))}</span><span>${esc(t("kg.left"))} <b id="cd">—</b></span></div>
    ${meta ? `<div class="kg-exp"><span>${esc(t("kg.devs", { n: meta.devices || 0, m: meta.maxDevices || 1 }))}</span><span>${esc(meta.resetsLeft !== undefined ? t("kg.resetLeft", { n: meta.resetsLeft }) : "")}</span></div>` : ""}
    ${meta && meta.canReset !== undefined ? `<button type="button" class="btn-pill ghost full" id="rs" style="margin-top:10px" ${meta.canReset && !(meta.nextResetAt > Date.now()) ? "" : "disabled"}>${ic("refresh")}<span>${esc(meta.nextResetAt > Date.now() ? t("kg.resetAt", { d: fmt(meta.nextResetAt) }) : t("kg.reset"))}</span></button>` : ""}
    <p class="fine" style="margin-top:14px">${esc(t("kg.moreHint"))} <a href="/buy" style="text-decoration:underline">${esc(t("nav.shop"))}</a></p>`;
  $("cp").onclick = async () => {
    if (await R.copy(key)) { toast(t("k.copied")); $("cp").querySelector("span").textContent = t("kg.copied"); }
    else { const r = document.createRange(); r.selectNodeContents($("kv")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast(t("k.copyManual")); }
  };
  const rs = $("rs");
  if (rs) rs.onclick = async () => {
    if (busy || !confirm(t("kg.resetQ"))) return; busy = true; rs.disabled = true;
    try { const d = await api("/api/key/reset", "POST", { device }); keyView(d.key, d.expiresAt, true, d); toast(t("kg.resetDone")); }
    catch (e) { toast(e.message, "er"); rs.disabled = false; }
    finally { busy = false; }
  };
  const up = () => { let s = Math.max(0, Math.floor((exp - Date.now()) / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s %= 60; const el = $("cd"); if (el) el.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; };
  up(); tick = setInterval(up, 1000);
}
async function begin() {
  clearInterval(tick); mode = "boot"; head(t("kg.getT"), t("kg.checking")); setRing(0, 0, "·");
  try {
    info = await api("/api/key/info"); facts(info);
    let mine = null, offline = false;
    try { mine = await api("/api/key/mine", "POST", { device }); } catch (e) { offline = !e.status || e.status >= 500; }
    if (mine && mine.has) { keyView(mine.key, mine.expiresAt, true, mine); return; }
    if (offline) { const c = loadKey(); if (c) { keyView(c.key, c.expAt, true); return; } }
    dropKey();
    if (!info.enabled) { mode = "off"; head(t("kg.offT"), t("kg.offD")); setRing(0, 0, "⏸"); $("view").innerHTML = `<div class="infobox">${esc(t("kg.offN"))}</div>`; return; }
    if (!info.hasTasks) { mode = "off"; head(t("kg.noTasksT"), t("kg.noTasksD")); setRing(0, 0, "…"); $("view").innerHTML = `<div class="infobox">${esc(t("kg.tryLater"))}</div>`; return; }
    mode = "ready"; head(t("kg.readyT"), t("kg.readyD", { l: life(info.keyHours) })); setRing(0, 0, "0");
    $("view").innerHTML = `<button type="button" class="btn-pill primary lg full" id="go"><span>${esc(t("kg.start"))}</span></button>`; $("go").onclick = start;
  } catch (e) { const c = loadKey(); if (c) { keyView(c.key, c.expAt, true); return; } head(t("kg.failT"), ""); errView(e.message, begin); }
}
async function start() {
  const g = $("go"); if (g) { g.disabled = true; g.querySelector("span").textContent = t("kg.starting"); }
  try {
    const d = await api("/api/key/start", "POST", { device });
    if (d.already) { let m = null; try { m = await api("/api/key/mine", "POST", { device }); } catch {} keyView(d.key, d.expiresAt, true, m && m.has ? m : null); return; }
    S = { tasks: d.tasks, minWait: d.minWaitSeconds, skew: 0, completed: [], opened: {} }; adopt(d); render();
  } catch (e) { errView(e.message, e.status === 403 || e.status === 503 ? null : begin); }
}

document.addEventListener("click", async e => {
  const o = e.target.closest("[data-open]");
  if (o && S) {
    const id = o.dataset.open;
    if (!S.opened[id]) { try { adopt(await api("/api/key/open", "POST", { session: S.session, device, taskId: id })); render(); } catch (x) { toast(x.message, "er"); if (x.status === 410) { S = null; begin(); } } }
    return;
  }
  const b = e.target.closest("[data-done]"); if (!b || !S || busy || b.disabled) return;
  busy = true; b.disabled = true; b.querySelector("span").textContent = t("kg.checkingTask");
  try { adopt(await api("/api/key/task", "POST", { session: S.session, device, taskId: b.dataset.done })); render(); toast(t("kg.taskOk")); }
  catch (x) {
    if (x.status === 410) { toast(x.message, "er"); S = null; begin(); }
    else { toast(x.message, "er"); if (x.data && x.data.wait && S.opened[b.dataset.done]) S.opened[b.dataset.done] = now() - (S.minWait - x.data.wait) * 1000; render(); }
  } finally { busy = false; }
});
const card = $("card");
if (card) { let raf = 0; card.addEventListener("pointermove", e => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const r = card.getBoundingClientRect(); card.style.setProperty("--mx", (e.clientX - r.left) + "px"); card.style.setProperty("--my", (e.clientY - r.top) + "px"); }); }); }

/* เปลี่ยนภาษา: วาดหน้าตามสถานะปัจจุบันใหม่ โดยไม่เริ่มรอบใหม่ */
window.addEventListener("langchange", () => {
  if (info) facts(info);
  if (mode === "tasks" && S) render();
  else if (mode === "key" && keyState) { clearInterval(tick); keyView(keyState.key, keyState.expAt, keyState.already); }
  else if (mode === "ready" && info) { head(t("kg.readyT"), t("kg.readyD", { l: life(info.keyHours) })); const g = $("go"); if (g) g.querySelector("span").textContent = t("kg.start"); }
});
begin();
})();
