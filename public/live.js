(() => {
"use strict";

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = n => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const TAU = Math.PI * 2, rad = d => d * Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = t => 1 - Math.pow(1 - t, 3);
const rtf = new Intl.RelativeTimeFormat("th", { numeric: "auto" });
function ago(t) {
  const d = (t - Date.now()) / 1000, a = Math.abs(d);
  if (a < 20) return "เมื่อสักครู่";
  if (a < 3600) return rtf.format(Math.round(d / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(d / 3600), "hour");
  return rtf.format(Math.round(d / 86400), "day");
}
function dur(since) {
  const m = Math.floor((Date.now() - since) / 60000);
  if (m < 1) return "เพิ่งเข้า";
  if (m < 60) return m + " นาที";
  return Math.floor(m / 60) + " ชม. " + (m % 60) + " น.";
}
function toast(msg, err) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.innerHTML = ic(err ? "alert" : "check") + `<span>${esc(msg)}</span>`;
  $("#toasts").append(t); setTimeout(() => t.remove(), 2600);
}

/* ---------- state ---------- */
const S = {
  pid: (() => { try { return localStorage.getItem("sv-live-project") || "all"; } catch { return "all"; } })(),
  projects: [], snap: null, timeline: [], range: 60, demo: false, es: null, open: new Set(), evSeen: null
};

/* ---------- number tweening ---------- */
const nums = new Set();
function setNum(el, v) {
  if (!el) return;
  if (el._to === v) return;
  el._from = el._v ?? 0; el._to = v; el._t0 = performance.now(); nums.add(el);
}
function tickNums(now) {
  for (const el of nums) {
    const p = clamp((now - el._t0) / 800, 0, 1), v = el._from + (el._to - el._from) * easeOut(p);
    el._v = v; el.textContent = Math.round(v).toLocaleString();
    if (p >= 1) { el._v = el._to; nums.delete(el); }
  }
}

/* ---------- api / connection ---------- */
async function getJSON(url) {
  const r = await fetch(url, { credentials: "same-origin" });
  if (r.status === 401) throw new Error("unauthorized");
  if (!r.ok) throw new Error("request failed");
  return r.json();
}
function setPill(text, off) { $("#pillt").textContent = text; $("#pill").classList.toggle("off", !!off); }

function connect() {
  if (S.es) { S.es.close(); S.es = null; }
  stopDemo();
  S.snap = null; S.evSeen = null;
  if (S.demo) { startDemo(); return; }
  setPill("Connecting", true);
  const es = new EventSource("/api/live/stream?project=" + encodeURIComponent(S.pid));
  es.onopen = () => setPill("Live", false);
  es.onmessage = e => { setPill("Live", false); apply(JSON.parse(e.data)); };
  es.onerror = () => {
    setPill("Reconnecting", true);
  };
  S.es = es;
  loadTimeline();
}
async function loadTimeline() {
  if (S.demo) return;
  try { S.timeline = await getJSON("/api/live/timeline?project=" + encodeURIComponent(S.pid)); drawChart(); renderHero(); } catch {}
}

/* ---------- apply snapshot ---------- */
function apply(snap) {
  S.snap = snap;
  updateMarkers(snap.points);
  renderHero(); renderMaps(); renderCountries(); renderEvents();
  drawChart();
  renderViewers(snap);
  $("#nodata").classList.toggle("on", snap.total === 0 && !S.demo && !!S.authed); // public viewers never see the empty-state popup
}

function renderHero() {
  const s = S.snap; if (!s) return;
  setNum($("#big"), s.total);
  const peak = Math.max(s.total, ...S.timeline.filter(p => p[0] > Date.now() - 864e5).map(p => p[1]));
  setNum($("#s-peak"), peak);
  setNum($("#s-maps"), s.maps.length);
  setNum($("#s-ctry"), s.countries.length);
  setNum($("#s-srv"), s.maps.reduce((n, m) => n + m.servers, 0));
  const hourAgo = S.timeline.find(p => p[0] >= Date.now() - 3600e3 - 90e3);
  const d = $("#delta");
  if (hourAgo && S.timeline.length > 5 && Date.now() - S.timeline[0][0] > 20 * 60e3) {
    const diff = s.total - hourAgo[1];
    d.textContent = diff === 0 ? "เท่ากับเมื่อชั่วโมงก่อน" : (diff > 0 ? "เพิ่มขึ้น " : "ลดลง ") + Math.abs(diff) + " จากชั่วโมงก่อน";
  } else d.textContent = s.unknown ? s.unknown + " คนยังระบุตำแหน่งไม่ได้" : "";
}

/* keyed list sync: keeps DOM nodes (and their CSS transitions) alive between updates */
function syncList(box, items, keyFn, create, update, emptyHtml) {
  if (!items.length) { if (!box.querySelector(".empty-s")) box.innerHTML = `<div class="empty-s">${emptyHtml}</div>`; return; }
  const e = box.querySelector(".empty-s"); if (e) e.remove();
  const old = new Map([...box.children].map(c => [c.dataset.k, c]));
  let prev = null;
  for (const it of items) {
    const k = String(keyFn(it)); let el = old.get(k);
    if (el) old.delete(k); else { el = create(it); el.dataset.k = k; }
    update(el, it);
    const want = prev ? prev.nextSibling : box.firstChild;
    if (el !== want) box.insertBefore(el, want);
    prev = el;
  }
  old.forEach(el => el.remove());
}

/* รวม "แมพที่รองรับ" (จาก map list) เข้ากับแมพที่มีคนเล่นอยู่ — แมพที่ไม่มีคนจะแสดงเป็น 0 */
function mergeSupported(snap) {
  const live = snap.maps || [], sup = snap.supported || [];
  const liveIds = new Set(live.map(m => String(m.id)));
  const idle = [];
  for (const g of sup) {
    if (g.ids.some(id => liveIds.has(String(id)))) continue;
    idle.push({ id: g.ids[0], name: g.name, count: 0, servers: 0, players: [], idle: true, ids: g.ids, off: !!g.off, msg: g.msg || "" });
  }
  idle.sort((a, b) => a.name.localeCompare(b.name));
  return live.concat(idle);
}

function renderMaps() {
  const maps = mergeSupported(S.snap), max = Math.max(1, ...maps.map(m => m.count));
  const active = maps.filter(m => !m.idle).length;
  $("#maps-n").textContent = maps.length ? (active ? active + " กำลังเล่น  |  " : "") + maps.length + " แมพ" : "";
  syncList($("#maps"), maps, m => m.id || m.name,
    () => {
      const el = document.createElement("div"); el.className = "mrow";
      el.innerHTML = `<button class="mhead"><div class="mt"><span class="mn"></span><span class="mi"></span><span class="mm"></span></div><span class="mc num"></span><div class="bt"><i></i></div></button>
        <div class="mbody"><div class="mbody-in"></div></div>`;
      $(".mhead", el).onclick = () => {
        const k = el.dataset.k;
        if (S.open.has(k)) S.open.delete(k); else S.open.add(k);
        el.classList.toggle("open", S.open.has(k)); renderMaps();
      };
      return el;
    },
    (el, m) => {
      $(".mn", el).textContent = m.name;
      $(".mi", el).textContent = m.off ? "ปิดอัพเดทชั่วคราว" : (m.idle ? "รองรับ · ยังไม่มีคนเล่น" : m.servers + " เซิร์ฟเวอร์");
      const mm = $(".mm", el);
      mm.textContent = m.off ? (m.msg || "แมพนี้ปิดปรับปรุงชั่วคราว โปรดรอการอัปเดต") : "";
      mm.hidden = !m.off;
      el.classList.toggle("idle", !!m.idle);
      el.classList.toggle("off", !!m.off);
      setNum($(".mc", el), m.count);
      $(".bt i", el).style.width = (m.count / max * 100) + "%";
      const open = S.open.has(el.dataset.k); el.classList.toggle("open", open);
      if (open) {
        const ids = (m.ids && m.ids.length ? m.ids : [m.id]).filter(Boolean);
        const chips = ids.length ? `<div class="pids">` + ids.map(i =>
          `<button class="pid" data-id="${esc(i)}" title="คัดลอก Place ID">Place ${esc(i)}<svg class="i"><use href="#i-copy"/></svg></button>`).join("") + `</div>` : "";
        const html = chips + (m.players.length ? `<div class="pl-h"></div>` : "") + m.players.map(p =>
          `<div class="pl"><span class="cc">${esc(p.cc || "--")}</span><span class="pn">${esc(p.u)}<span class="muted">${p.city ? "  " + esc(p.city) : ""}</span></span><span class="pd">${dur(p.since)}</span></div>`).join("");
        if (el._ph !== html) { $(".mbody-in", el).innerHTML = html; el._ph = html; }
      }
    }, "ยังไม่มีผู้ใช้ในแมพใดเลย");
}

function renderCountries() {
  const list = S.snap.countries, max = Math.max(1, ...list.map(c => c.count));
  $("#ctry-n").textContent = list.length ? list.length + " ประเทศ" : "";
  syncList($("#ctry"), list, c => c.cc,
    c => {
      const el = document.createElement("div"); el.className = "crow";
      el.innerHTML = `<button class="chead"><div class="mt"><span class="mn"><i class="cc"></i><b class="cn"></b></span></div><span class="mc num"></span><div class="bt"><i></i></div></button>`;
      $(".chead", el).onclick = () => focusCountry(el.dataset.k);
      return el;
    },
    (el, c) => {
      $(".cc", el).textContent = c.cc; $(".cn", el).textContent = c.country; $(".cn", el).style.fontWeight = 500;
      setNum($(".mc", el), c.count);
      $(".bt i", el).style.width = (c.count / max * 100) + "%";
    }, "ยังไม่มีข้อมูลตำแหน่ง");
}

function renderEvents() {
  const evs = S.snap.events, first = S.evSeen === null;
  const seen = S.evSeen || new Set(); const keys = new Set();
  syncList($("#events"), evs, e => e.t + e.type + e.u,
    e => { const el = document.createElement("div"); el.className = "ev " + e.type + (first || seen.has(e.t + e.type + e.u) ? "" : " new"); el.innerHTML = `<i class="dt"></i><div class="tx"></div>`; return el; },
    (el, e) => {
      keys.add(e.t + e.type + e.u);
      const html = `<b>${esc(e.u)}</b> <span>${e.type === "join" ? "เข้าร่วม" : "ออกจาก"}</span> ${esc(e.game)}<small>${esc([e.city, e.cc].filter(Boolean).join(", ") || "ไม่ทราบตำแหน่ง")}  |  ${ago(e.t)}</small>`;
      if (el._h !== html) { $(".tx", el).innerHTML = html; el._h = html; }
    }, "ยังไม่มีความเคลื่อนไหว");
  S.evSeen = keys;
}

/* ---------- chart ---------- */
let chartPts = [];
function smoothPath(p, H) {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
    const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6, 0, H), c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6, 0, H);
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}
function drawChart() {
  const svg = $("#chart"), box = $("#chartbox"), W = box.clientWidth || 300, H = 92, T = 8;
  const to = Date.now(), from = to - S.range * 60e3;
  let data = S.timeline.filter(p => p[0] >= from);
  if (S.snap) data = data.filter(p => p[0] < to - 30e3).concat([[to, S.snap.total]]);
  if (data.length < 2) { svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">กำลังเก็บข้อมูล</text>`; chartPts = []; return; }
  const buckets = Math.min(90, data.length), step = data.length / buckets, pts = [];
  for (let i = 0; i < buckets; i++) {
    const slice = data.slice(Math.floor(i * step), Math.max(Math.floor(i * step) + 1, Math.floor((i + 1) * step)));
    pts.push([slice[slice.length - 1][0], Math.max(...slice.map(s => s[1]))]);
  }
  const max = Math.max(1, ...pts.map(p => p[1])) * 1.15, t0 = pts[0][0], t1 = pts[pts.length - 1][0] || t0 + 1;
  const xy = pts.map(p => [(p[0] - t0) / Math.max(1, t1 - t0) * W, T + (1 - p[1] / max) * (H - T)]);
  chartPts = pts.map((p, i) => ({ x: xy[i][0], y: xy[i][1], t: p[0], n: p[1] }));
  const line = smoothPath(xy, H + T), last = xy[xy.length - 1];
  svg.setAttribute("viewBox", `0 0 ${W} ${H + 14}`);
  svg.innerHTML = `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fg)" stop-opacity=".22"/><stop offset="1" stop-color="var(--fg)" stop-opacity="0"/></linearGradient></defs>
    <line class="gl" x1="0" x2="${W}" y1="${T}" y2="${T}"/><line class="gl" x1="0" x2="${W}" y1="${H}" y2="${H}"/>
    <path d="${line} L${W},${H} L0,${H} Z" fill="url(#cg)"/><path class="ln" d="${line}"/>
    <circle class="cur" cx="${last[0]}" cy="${last[1]}" r="3"/>
    <line class="xh" id="xh" y1="${T}" y2="${H}"/><circle class="cur" id="xd" r="3.5" style="opacity:0"/>
    <text x="0" y="${H + 12}">${new Date(t0).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</text>
    <text x="${W}" y="${H + 12}" text-anchor="end">ตอนนี้</text><text x="0" y="${T - 2}">${Math.round(max / 1.15)}</text>`;
}
$("#chartbox").addEventListener("pointermove", e => {
  if (!chartPts.length) return;
  const r = $("#chartbox").getBoundingClientRect(), W = r.width, x = (e.clientX - r.left) / r.width * ($("#chart").viewBox.baseVal.width || W);
  let best = chartPts[0]; for (const p of chartPts) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
  const xh = $("#xh"), xd = $("#xd"), tip = $("#ctip");
  xh.setAttribute("x1", best.x); xh.setAttribute("x2", best.x); xh.style.opacity = .35;
  xd.setAttribute("cx", best.x); xd.setAttribute("cy", best.y); xd.style.opacity = 1;
  tip.textContent = `${best.n} คน  |  ${new Date(best.t).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
  tip.style.left = clamp(best.x / ($("#chart").viewBox.baseVal.width || W) * r.width, 50, r.width - 50) + "px"; tip.style.opacity = 1;
});
$("#chartbox").addEventListener("pointerleave", () => {
  const xh = $("#xh"), xd = $("#xd"); if (xh) xh.style.opacity = 0; if (xd) xd.style.opacity = 0; $("#ctip").style.opacity = 0;
});
$("#range").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  S.range = +b.dataset.r; $$("#range button").forEach(x => x.classList.toggle("on", x === b)); placeThumb(); drawChart();
});

/* ผู้ชมหน้าเว็บคนอื่น — เซิร์ฟเวอร์ส่ง snap.viewers มาเฉพาะผู้ดูแลระบบ คนทั่วไปจะไม่เห็นป้ายนี้เลย */
function renderViewers(snap) {
  const el = $("#viewers"); if (!el) return;
  const v = snap.viewers;
  if (!S.authed || !v) { el.hidden = true; return; }
  el.hidden = false;
  $("#viewers-n").textContent = v.others;
  $("#viewers-t").textContent = v.others ? " คนอื่นดูอยู่" : " ไม่มีคนอื่นดู";
  el.classList.toggle("on", v.others > 0);
  el.title = v.others
    ? `มีคนอื่นกำลังดูหน้านี้ ${v.others} คน (เป็นผู้ดูแลระบบ ${v.admins} คน) — ไม่นับคุณ นับ IP เดียวกันเป็นคนเดียว`
    : "ตอนนี้ไม่มีคนอื่นเปิดหน้านี้อยู่";
}

/* segmented control: ก้อนสีเลื่อนไปหาปุ่มที่เลือก (แบบ iOS) */
function placeThumb() {
  const seg = $("#range"), on = seg && seg.querySelector(".on"); if (!on) return;
  seg.style.setProperty("--x", on.offsetLeft + "px"); seg.style.setProperty("--w", on.offsetWidth + "px");
}
requestAnimationFrame(placeThumb);
addEventListener("resize", placeThumb);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);

/* กดชิป Place ID เพื่อคัดลอก */
$("#maps").addEventListener("click", async e => {
  const b = e.target.closest(".pid"); if (!b) return;
  e.stopPropagation();
  const ok = await copyText(b.dataset.id, b);
  toast(ok ? "คัดลอก Place ID แล้ว" : "คัดลอกไม่สำเร็จ", !ok);
});

/* มือถือ: การ์ดทั้งหมดเป็น bottom sheet ลากขึ้นลงได้ (peek <-> full) */
(function bottomSheet() {
  const ui = $(".ui"), mq = matchMedia("(max-width:1000px)");
  const grab = document.createElement("div"); grab.className = "grab"; grab.innerHTML = "<i></i>";
  grab.setAttribute("role", "button"); grab.setAttribute("aria-label", "ขยายหรือย่อรายละเอียด");
  ui.prepend(grab);
  let state = "peek", dragging = false, startY = 0, startOff = 0, lastY = 0, lastT = 0, vel = 0;
  const peekOff = () => Math.max(0, ui.offsetHeight - innerHeight * 0.4);
  const offFor = s => s === "full" ? 0 : peekOff();
  function set(s) {
    state = s; ui.classList.toggle("full", s === "full");
    ui.style.setProperty("--sy", offFor(s) + "px"); grab.setAttribute("aria-expanded", s === "full");
  }
  function sync() {
    if (mq.matches) set(state);
    else { ui.classList.remove("full", "drag"); ui.style.removeProperty("--sy"); }
  }
  grab.addEventListener("pointerdown", e => {
    if (!mq.matches) return;
    dragging = true; startY = lastY = e.clientY; lastT = performance.now(); vel = 0; startOff = offFor(state);
    ui.classList.add("drag"); try { grab.setPointerCapture(e.pointerId); } catch {}
  });
  grab.addEventListener("pointermove", e => {
    if (!dragging) return;
    const t = performance.now(); vel = (e.clientY - lastY) / Math.max(1, t - lastT); lastY = e.clientY; lastT = t;
    ui.style.setProperty("--sy", Math.min(peekOff(), Math.max(0, startOff + e.clientY - startY)) + "px");
  });
  const end = e => {
    if (!dragging) return; dragging = false; ui.classList.remove("drag");
    const cur = parseFloat(ui.style.getPropertyValue("--sy")) || 0;
    let next = cur < peekOff() / 2 ? "full" : "peek";
    if (Math.abs(vel) > 0.5) next = vel < 0 ? "full" : "peek";
    if (Math.abs(lastY - startY) < 5) next = state === "full" ? "peek" : "full"; // แตะเฉยๆ = สลับ
    set(next);
  };
  grab.addEventListener("pointerup", end); grab.addEventListener("pointercancel", end);
  addEventListener("resize", sync);
  (mq.addEventListener ? mq.addEventListener("change", sync) : mq.addListener(sync));
  sync();
})();

/* ---------- globe ---------- */
const canvas = $("#globe"), ctx = canvas.getContext("2d");
const COL = { fg: [255, 255, 255], bg: [10, 10, 10] };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const hex = v => { v = v.trim().replace("#", ""); if (v.length === 3) v = v.replace(/./g, "$&$&"); return [0, 2, 4].map(i => parseInt(v.substr(i, 2), 16) || 0); };
  COL.fg = hex(cs.getPropertyValue("--fg")); COL.bg = hex(cs.getPropertyValue("--bg"));
}
let X, Y, Z, LAND, N = 20000, view = { w: 0, h: 0, dpr: 1, cx: 0, cy: 0, R: 200 };
function buildDots() {
  const ga = Math.PI * (3 - Math.sqrt(5)), bin = atob(window.LAND_MASK.data), bits = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
  X = new Float32Array(N); Y = new Float32Array(N); Z = new Float32Array(N); LAND = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = ga * i, x = Math.cos(th) * r, z = Math.sin(th) * r;
    const lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(x, z) * 180 / Math.PI;
    const col = Math.min(359, Math.floor(lon + 180)), row = Math.min(179, Math.floor(90 - lat)), idx = row * 360 + col;
    X[i] = x; Y[i] = y; Z[i] = z; LAND[i] = (bits[idx >> 3] >> (idx & 7)) & 1;
  }
}
function layout() {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = innerWidth, h = innerHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  view = { w, h, dpr, cx: w / 2, cy: h / 2 + 18, R: Math.min(h * 0.40, Math.max(200, (w - 780) / 2)) };
  if (w < 1000) { view.cy = 56 + h * 0.23; view.R = Math.min(w * 0.42, h * 0.21); }
  drawChart();
}

const G = { lon: rad(100), lat: rad(18), zoom: 0.62, zoomT: 1, vx: 0.9, vy: 0, drag: false, idle: 0, focus: null, moved: 0 };
const markers = new Map(); let hover = null;

const latlonVec = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
function updateMarkers(points) {
  const seen = new Set();
  for (const p of points) {
    const k = p.lat + "," + p.lon; seen.add(k);
    let m = markers.get(k);
    if (!m) { m = { k, lat: rad(p.lat), lon: rad(p.lon), a: 0, c: 0, seed: Math.random() * 10 }; m.v = latlonVec(m.lat, m.lon); markers.set(k, m); }
    m.tc = p.count; m.ta = 1; m.city = p.city; m.cc = p.cc; m.country = p.country;
  }
  for (const [k, m] of markers) if (!seen.has(k)) { m.ta = 0; m.tc = 0; }
}
function focusOn(lat, lon) { G.focus = { lat, lon }; G.idle = 0; G.zoomT = Math.max(G.zoomT, 1.2); G.vx = 0; G.vy = 0; hideHint(); }
function focusCountry(cc) {
  let sx = 0, sy = 0, sz = 0;
  for (const m of markers.values()) if (m.cc === cc && m.ta) { const w = m.tc; sx += m.v[0] * w; sy += m.v[1] * w; sz += m.v[2] * w; }
  if (!sx && !sy && !sz) return;
  focusOn(Math.atan2(sy, Math.hypot(sx, sz)), Math.atan2(sx, sz));
}

const hintEl = $("#hintbar"); let hintOff = false;
function hideHint() { if (!hintOff) { hintOff = true; hintEl.classList.add("off"); } }

/* interaction */
const ptrs = new Map(); let pinch = 0, downAt = null;
canvas.addEventListener("pointerdown", e => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  G.drag = ptrs.size === 1; G.focus = null; G.idle = 0; G.moved = 0; downAt = [e.clientX, e.clientY];
  canvas.classList.add("grabbing"); hideHint();
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
});
canvas.addEventListener("pointermove", e => {
  const prev = ptrs.get(e.pointerId);
  if (!prev) { hoverAt(e.clientX, e.clientY); return; }
  const dx = e.clientX - prev[0], dy = e.clientY - prev[1]; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch) G.zoomT = clamp(G.zoomT * d / pinch, .75, 2.4); pinch = d; return;
  }
  const R = view.R * G.zoom; G.moved += Math.abs(dx) + Math.abs(dy);
  G.lon -= dx / R; G.lat = clamp(G.lat + dy / R, -1.25, 1.25);
  G.vx = -dx / R * 60; G.vy = dy / R * 60; G.idle = 0;
});
const endPtr = e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId); pinch = 0; G.drag = ptrs.size === 1;
  if (!ptrs.size) {
    canvas.classList.remove("grabbing");
    if (G.moved < 5 && hover) focusOn(hover.lat, hover.lon);
  }
};
canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
canvas.addEventListener("pointerleave", () => { if (!ptrs.size) { hover = null; $("#tip").classList.remove("on"); canvas.classList.remove("hot"); } });
canvas.addEventListener("wheel", e => { e.preventDefault(); G.zoomT = clamp(G.zoomT * Math.exp(-e.deltaY * .0012), .75, 2.4); G.idle = 0; hideHint(); }, { passive: false });

function hoverAt(px, py) {
  let best = null, bd = 18;
  for (const m of markers.values()) { if (!m.vis || m.a < .3) continue; const d = Math.hypot(m.sx - px, m.sy - py); if (d < bd) { bd = d; best = m; } }
  hover = best; canvas.classList.toggle("hot", !!best);
  const tip = $("#tip");
  if (best) {
    tip.innerHTML = `<b>${esc([best.city, best.country].filter(Boolean).join(", ") || best.cc || "ไม่ทราบ")}</b>${Math.round(best.tc)} คนออนไลน์`;
    tip.style.left = Math.min(innerWidth - 190, px + 16) + "px"; tip.style.top = Math.max(60, py - 14) + "px"; tip.classList.add("on");
  } else tip.classList.remove("on");
}

/* drawing */
const bxy = Array.from({ length: 6 }, () => new Float32Array(N * 2)), bn = new Int32Array(6);
function drawGlobe(ts) {
  const { w, h, dpr } = view, R = view.R * G.zoom, cx = view.cx, cy = view.cy, fg = COL.fg;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const cl = Math.cos(G.lon), sl = Math.sin(G.lon), cp = Math.cos(G.lat), sp = Math.sin(G.lat);

  let g = ctx.createRadialGradient(cx, cy, R * .92, cx, cy, R * 1.5);
  g.addColorStop(0, rgba(fg, .11)); g.addColorStop(1, rgba(fg, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.5, 0, TAU); ctx.fill();
  g = ctx.createRadialGradient(cx - R * .3, cy - R * .35, R * .1, cx, cy, R);
  g.addColorStop(0, rgba(fg, .07)); g.addColorStop(1, rgba(fg, .012));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(fg, .26); ctx.lineWidth = 1; ctx.stroke();

  // graticule
  ctx.strokeStyle = rgba(fg, .07); ctx.beginPath();
  const line = (la, lo, pen) => { const v = latlonVec(la, lo), x1 = v[0] * cl - v[2] * sl, z1 = v[0] * sl + v[2] * cl, y2 = v[1] * cp - z1 * sp, z2 = v[1] * sp + z1 * cp;
    if (z2 <= 0) return false; const sx = cx + R * x1, sy = cy - R * y2; pen ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); return true; };
  for (let lo = 0; lo < 360; lo += 30) { let pen = false; for (let la = -90; la <= 90; la += 6) pen = line(rad(la), rad(lo), pen); }
  for (let la = -60; la <= 60; la += 30) { let pen = false; for (let lo = 0; lo <= 360; lo += 6) pen = line(rad(la), rad(lo), pen); }
  ctx.stroke();

  // dots
  bn.fill(0); const px = Math.max(.95, R / 340);
  ctx.fillStyle = rgba(fg, .09); ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const x = X[i], y = Y[i], z = Z[i], x1 = x * cl - z * sl, z1 = x * sl + z * cl, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    if (z2 <= 0) continue;
    const sx = cx + R * x1, sy = cy - R * y2;
    if (LAND[i]) { const b = Math.min(5, (z2 * 6) | 0), k = bn[b]++; bxy[b][k * 2] = sx; bxy[b][k * 2 + 1] = sy; }
    else ctx.rect(sx - px * .35, sy - px * .35, px * .7, px * .7);
  }
  ctx.fill();
  for (let b = 0; b < 6; b++) {
    ctx.fillStyle = rgba(fg, .16 + b * .13); ctx.beginPath(); const r = px * (.55 + b * .1);
    for (let k = 0; k < bn[b]; k++) { const x = bxy[b][k * 2], y = bxy[b][k * 2 + 1]; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
    ctx.fill();
  }

  // markers: project
  const list = [];
  for (const m of markers.values()) {
    const v = m.v, x1 = v[0] * cl - v[2] * sl, z1 = v[0] * sl + v[2] * cl, y2 = v[1] * cp - z1 * sp, z2 = v[1] * sp + z1 * cp;
    m.z = z2; m.vis = z2 > .02; m.sx = cx + R * x1; m.sy = cy - R * y2; m.x1 = x1; m.y2 = y2;
    if (m.vis && m.a > 0) list.push(m);
  }
  // arcs to the busiest location
  const hub = [...markers.values()].filter(m => m.ta).sort((a, b) => b.tc - a.tc)[0];
  if (hub) {
    const others = [...markers.values()].filter(m => m.ta && m !== hub).sort((a, b) => b.tc - a.tc).slice(0, 12);
    for (const m of others) {
      const dot = clamp(m.v[0] * hub.v[0] + m.v[1] * hub.v[1] + m.v[2] * hub.v[2], -1, 1), ang = Math.acos(dot);
      if (ang < .05) continue;
      const sa = Math.sin(ang), lift = .05 + .22 * (ang / Math.PI), S = 28, pts = [];
      for (let i = 0; i <= S; i++) {
        const t = i / S, a = Math.sin((1 - t) * ang) / sa, b = Math.sin(t * ang) / sa, e = 1 + lift * Math.sin(Math.PI * t);
        const vx = (a * m.v[0] + b * hub.v[0]) * e, vy = (a * m.v[1] + b * hub.v[1]) * e, vz = (a * m.v[2] + b * hub.v[2]) * e;
        const x1 = vx * cl - vz * sl, z1 = vx * sl + vz * cl, y2 = vy * cp - z1 * sp, z2 = vy * sp + z1 * cp;
        const bz = (a * m.v[0] + b * hub.v[0]) * sl + (a * m.v[2] + b * hub.v[2]) * cl, bd = (a * m.v[1] + b * hub.v[1]) * sp + bz * cp;
        pts.push([cx + R * x1, cy - R * y2, bd]);
      }
      const al = Math.min(m.a, hub.a);
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(fg, .2 * al); ctx.beginPath(); let pen = false;
      for (const p of pts) { if (p[2] > 0) { pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; } else pen = false; }
      ctx.stroke();
      const ph = ((ts * .00035 + m.seed) % 1), i1 = Math.floor(ph * S), i0 = Math.max(0, i1 - 4);
      ctx.strokeStyle = rgba(fg, .95 * al); ctx.lineWidth = 1.6; ctx.beginPath(); pen = false;
      for (let i = i0; i <= i1; i++) { const p = pts[i]; if (p[2] > 0) { pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; } }
      ctx.stroke();
    }
  }
  // pillars, glow, ripples
  list.sort((a, b) => a.z - b.z);
  for (const m of list) {
    const fade = clamp(m.z / .25, 0, 1) * easeOut(m.a), c = Math.max(1, m.c), hgt = clamp(.035 + .035 * Math.log2(1 + c), 0, .2);
    const tx = cx + (m.sx - cx) * (1 + hgt), ty = cy + (m.sy - cy) * (1 + hgt);
    const lg = ctx.createLinearGradient(m.sx, m.sy, tx, ty); lg.addColorStop(0, rgba(fg, .0)); lg.addColorStop(1, rgba(fg, .9 * fade));
    ctx.strokeStyle = lg; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(tx, ty); ctx.stroke();
    const rr = 2 + Math.min(4.5, Math.log2(1 + c) * 1.05);
    const gl = ctx.createRadialGradient(m.sx, m.sy, 0, m.sx, m.sy, rr * 5);
    gl.addColorStop(0, rgba(fg, .45 * fade)); gl.addColorStop(1, rgba(fg, 0));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(m.sx, m.sy, rr * 5, 0, TAU); ctx.fill();
    for (let i = 0; i < 2; i++) {
      const ph = ((ts * .00045 + m.seed + i * .5) % 1);
      ctx.strokeStyle = rgba(fg, (1 - ph) * .55 * fade); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(m.sx, m.sy, rr + ph * 26, (rr + ph * 26) * Math.max(.25, m.z), Math.atan2(m.sy - cy, m.sx - cx) + Math.PI / 2, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = rgba(fg, fade); ctx.beginPath(); ctx.arc(m.sx, m.sy, rr * (hover === m ? 1.4 : 1), 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(tx, ty, 1.6, 0, TAU); ctx.fill();
  }
}

let last = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
  G.zoom += (G.zoomT - G.zoom) * (1 - Math.exp(-dt * 4));
  if (G.focus) {
    let dl = G.focus.lon - G.lon; dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    const k = 1 - Math.exp(-dt * 3.2); G.lon += dl * k; G.lat += (clamp(G.focus.lat, -1.2, 1.2) - G.lat) * k;
  } else if (!G.drag) {
    G.idle += dt;
    const auto = G.idle > 3 ? .07 : 0, k = 1 - Math.exp(-dt * 1.6);
    G.vx += (auto - G.vx) * k; G.vy *= Math.exp(-dt * 4);
    G.lon += G.vx * dt; G.lat = clamp(G.lat + G.vy * dt, -1.25, 1.25);
  }
  for (const [k, m] of markers) {
    m.a = clamp(m.a + (m.ta ? 1 : -1) * dt / .7, 0, 1); m.c += (m.tc - m.c) * (1 - Math.exp(-dt * 4));
    if (m.a <= 0 && !m.ta) markers.delete(k);
  }
  drawGlobe(ts); tickNums(ts);
  requestAnimationFrame(frame);
}

/* ---------- demo mode (simulated data, runs in the browser only) ---------- */
const DEMO_CITIES = [["Bangkok","TH","Thailand",13.8,100.5,10],["Chiang Mai","TH","Thailand",18.8,99,3],["Tokyo","JP","Japan",35.7,139.7,6],["Osaka","JP","Japan",34.7,135.5,2],
  ["Seoul","KR","South Korea",37.6,127,4],["Singapore","SG","Singapore",1.3,103.8,4],["Jakarta","ID","Indonesia",-6.2,106.8,4],["Manila","PH","Philippines",14.6,121,4],
  ["Hanoi","VN","Vietnam",21,105.8,3],["Kuala Lumpur","MY","Malaysia",3.1,101.7,3],["Mumbai","IN","India",19.1,72.9,3],["Dubai","AE","United Arab Emirates",25.2,55.3,2],
  ["Istanbul","TR","Turkiye",41,29,2],["Moscow","RU","Russia",55.8,37.6,2],["London","GB","United Kingdom",51.5,-.1,4],["Paris","FR","France",48.9,2.4,3],
  ["Berlin","DE","Germany",52.5,13.4,3],["Madrid","ES","Spain",40.4,-3.7,2],["Cairo","EG","Egypt",30,31.2,2],["Johannesburg","ZA","South Africa",-26.2,28,2],
  ["Lagos","NG","Nigeria",6.5,3.4,1],["New York","US","United States",40.7,-74,6],["Chicago","US","United States",41.9,-87.6,3],["Los Angeles","US","United States",34.1,-118.2,5],
  ["Toronto","CA","Canada",43.7,-79.4,2],["Mexico City","MX","Mexico",19.4,-99.1,3],["Sao Paulo","BR","Brazil",-23.5,-46.6,4],["Buenos Aires","AR","Argentina",-34.6,-58.4,2],["Sydney","AU","Australia",-33.9,151.2,3]];
const DEMO_MAPS = [["1000001","Pet Rider Simulator",5],["1000002","Tower Defense Arena",4],["1000003","Obby Parkour World",3],["1000004","Island Tycoon",2],["1000005","Fruit Battlegrounds",2]];
const D = { users: [], events: [], iv: null, n: 0 };
const pick = list => { let t = list.reduce((s, x) => s + x[x.length - 1], 0) * Math.random(); for (const x of list) { t -= x[x.length - 1]; if (t <= 0) return x; } return list[0]; };
function demoUser(ago0) {
  const c = pick(DEMO_CITIES), m = pick(DEMO_MAPS);
  return { u: "Player" + (1000 + Math.floor(Math.random() * 9000)), c, m, job: 1 + Math.floor(Math.random() * 8), since: Date.now() - (ago0 ?? 0) };
}
function demoEvent(type, u) { D.events.unshift({ t: Date.now() + (D.n++ % 1000) / 1000, type, u: u.u, game: u.m[1], cc: u.c[1], city: u.c[0] }); if (D.events.length > 30) D.events.length = 30; }
function demoSnap() {
  const maps = new Map(), pts = new Map(), ctry = new Map();
  for (const u of D.users) {
    let m = maps.get(u.m[0]); if (!m) { m = { id: u.m[0], name: u.m[1], count: 0, jobs: new Set(), players: [] }; maps.set(u.m[0], m); }
    m.count++; m.jobs.add(u.m[0] + "-" + u.job); m.players.push({ u: u.u, cc: u.c[1], city: u.c[0], since: u.since });
    const k = u.c[3] + "," + u.c[4], p = pts.get(k) || { lat: u.c[3], lon: u.c[4], count: 0, city: u.c[0], cc: u.c[1], country: u.c[2] }; p.count++; pts.set(k, p);
    const c = ctry.get(u.c[1]) || { cc: u.c[1], country: u.c[2], count: 0 }; c.count++; ctry.set(u.c[1], c);
  }
  return { t: Date.now(), total: D.users.length, unknown: 0,
    maps: [...maps.values()].sort((a, b) => b.count - a.count).map(m => ({ id: m.id, name: m.name, count: m.count, servers: m.jobs.size, players: m.players.sort((a, b) => a.since - b.since).slice(0, 60) })),
    supported: [{ ids: ["1000006"], name: "Build A Boat (ตัวอย่าง)", off: true, msg: "กำลังปรับปรุงระบบ จะกลับมาเร็วๆ นี้" }],
    points: [...pts.values()], countries: [...ctry.values()].sort((a, b) => b.count - a.count), events: D.events.slice() };
}
function startDemo() {
  setPill("Demo", false);
  D.users = Array.from({ length: 150 }, () => demoUser(Math.random() * 40 * 60e3)); D.events = [];
  for (let i = 0; i < 8; i++) demoEvent(i % 3 ? "join" : "leave", demoUser());
  const now = Date.now(); S.timeline = [];
  for (let i = 1440; i > 0; i--) { const t = now - i * 60e3; S.timeline.push([t, Math.max(8, Math.round(120 + 55 * Math.sin(i / 160) + 22 * Math.sin(i / 23) + (Math.random() - .5) * 14))]); }
  const tick = () => {
    const target = 150 + Math.round(30 * Math.sin(Date.now() / 40000));
    for (let i = D.users.length - 1; i >= 0; i--) if (Math.random() < .035) { demoEvent("leave", D.users[i]); D.users.splice(i, 1); }
    while (D.users.length < target) { const u = demoUser(); D.users.push(u); demoEvent("join", u); if (Math.random() < .4) break; }
    apply(demoSnap());
  };
  tick(); D.iv = setInterval(tick, 2500);
}
function stopDemo() { if (D.iv) { clearInterval(D.iv); D.iv = null; } }

/* ---------- controls ---------- */
function buildSelect() {
  const sel = $("#proj");
  sel.innerHTML = `<option value="all">ทุกโปรเจกต์</option>` + S.projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
  if (S.pid !== "all" && !S.projects.some(p => p.id === S.pid)) S.pid = "all";
  sel.value = S.pid;
  sel.onchange = () => { S.pid = sel.value; try { localStorage.setItem("sv-live-project", S.pid); } catch {} S.timeline = []; connect(); };
}
function setDemo(on) {
  S.demo = on; $("#demo").setAttribute("aria-pressed", on); $("#demo").classList.toggle("on", on);
  $("#demo span").textContent = on ? "Stop demo" : "Demo"; S.timeline = []; connect();
}
$("#demo").onclick = () => setDemo(!S.demo);
$("#nd-demo").onclick = () => setDemo(true);
/* dark theme only: ignore any saved/system preference and remove the toggle */
document.documentElement.dataset.theme = "dark";
{ const tb = $("#theme"); if (tb) tb.remove(); }

function luaSnippet(url) {
  return `-- Script Vault Live: ส่งสถานะทุก 30 วินาที (ใส่ไว้ในสคริปต์ของคุณ)
local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local Market = game:GetService("MarketplaceService")
local send = (syn and syn.request) or (http and http.request) or http_request or request

local URL = "${url}"
local lp = Players.LocalPlayer
local sid = HttpService:GenerateGUID(false)
local gameName = "Unknown"
pcall(function() gameName = Market:GetProductInfo(game.PlaceId).Name end)

local function ping(leave)
    pcall(send, {
        Url = URL, Method = "POST",
        Headers = { ["Content-Type"] = "application/json" },
        Body = HttpService:JSONEncode({
            sid = sid, uid = lp.UserId, user = lp.Name,
            placeId = game.PlaceId, game = gameName, jobId = game.JobId, leave = leave
        })
    })
end

ping()
task.spawn(function() while task.wait(30) do ping() end end)
Players.PlayerRemoving:Connect(function(p) if p == lp then ping(true) end end)`;
}
function openSetup() {
  const ov = document.createElement("div"); ov.className = "overlay";
  const opts = S.projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
  ov.innerHTML = `<div class="modal wide" role="dialog" aria-modal="true"><h3>ติดตั้งโค้ดติดตามผู้ใช้</h3>
    <p class="muted">วางโค้ดนี้ในสคริปต์ที่ผู้ใช้รัน เมื่อมีผู้ใช้เปิดสคริปต์ จะแสดงบนหน้านี้ภายในไม่กี่วินาที</p>
    ${S.projects.length ? `<label class="lbl" for="sp">โปรเจกต์</label><select class="input" id="sp">${opts}</select><pre class="code" id="sc"></pre>`
      : `<p style="margin-top:12px">ยังไม่มีโปรเจกต์ สร้างโปรเจกต์ที่หน้าแรกก่อน</p>`}
    <ul><li>ระบบเก็บตำแหน่งระดับเมืองโดยประมาณจาก IP ไม่เก็บ IP และไม่แสดงต่อใคร</li>
    <li>ตำแหน่งจะถูกต้องเมื่อโค้ดนี้รันบนเครื่องของผู้เล่น ถ้ารันบนเซิร์ฟเวอร์เกมจะได้ตำแหน่งของศูนย์ข้อมูล Roblox</li>
    <li>ควรแจ้งผู้ใช้ว่ามีการเก็บสถิติการใช้งาน ลบ <code>user = lp.Name</code> ออกได้ถ้าไม่ต้องการแสดงชื่อ</li></ul>
    <div class="actions"><button class="btn ghost" data-x>ปิด</button><button class="btn" id="cp">คัดลอกโค้ด</button></div></div>`;
  document.body.append(ov);
  const close = () => { ov.remove(); document.removeEventListener("keydown", key); }, key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key); ov.onmousedown = e => { if (e.target === ov) close(); }; $("[data-x]", ov).onclick = close;
  const sp = $("#sp", ov), draw = () => { if (sp) $("#sc", ov).textContent = luaSnippet(`${location.origin}/track/${sp.value}`); };
  if (sp) { if (S.pid !== "all") sp.value = S.pid; sp.onchange = draw; draw(); }
  $("#cp", ov).onclick = async () => { if (!sp) return; try { await navigator.clipboard.writeText($("#sc", ov).textContent); toast("คัดลอกแล้ว"); } catch { toast("คัดลอกไม่สำเร็จ", true); } };
}
$("#setup").onclick = openSetup; $("#nd-setup").onclick = openSetup;

/* ---------- get script (button + modal) ---------- */
/* โค้ดรับสคริปต์ดึงจากเว็บนี้เอง (โปรเจกต์หลักของแต่ละเว็บ) ไม่ผูกกับ project ID ตายตัว */
let GET_LOAD = "";
const loadGetCode = async () => {
  try { const j = await (await fetch("/api/public/site", { cache: "no-store" })).json(); GET_LOAD = (j.settings && j.settings.loadstring) || ""; } catch {}
  return GET_LOAD;
};
const getCode = () => GET_LOAD || "-- ยังไม่มีสคริปต์หลัก (main.lua) ในเว็บนี้";
loadGetCode();
const gsSvg = d => `<svg class="gs-i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I_ZAP = '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>';
const I_COPY = '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>';
const I_OK = '<path d="M20 6 9 17l-5-5"/>';
const I_X = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';

async function copyText(text, el) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    try {
      const r = document.createRange(); r.selectNodeContents(el);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      return document.execCommand("copy");
    } catch { return false; }
  }
}

function openGet() {
  if ($(".gs-ov")) return;
  const prev = document.activeElement;
  const ov = document.createElement("div"); ov.className = "gs-ov";
  ov.innerHTML = `<div class="gs-card" role="dialog" aria-modal="true" aria-labelledby="gs-t"><div class="gs-in">
    <button class="gs-x" aria-label="ปิด">${gsSvg(I_X)}</button>
    <div class="gs-eye"><i class="gs-dot"></i><span>RVX HUB</span><i class="gs-sep"></i><span><b class="num" id="gs-on">0</b> ออนไลน์ตอนนี้</span></div>
    <h2 class="gs-h" id="gs-t">รับสคริปต์</h2>
    <p class="gs-p">คัดลอกโค้ดบรรทัดเดียว แล้ววางใน executor ตอนอยู่ในเกม</p>
    <div class="gs-code"><code id="gs-c" tabindex="0"></code>
      <button class="gs-copy" id="gs-cp">${gsSvg(I_COPY).replace('class="gs-i"', 'class="gs-i cp"')}${gsSvg(I_OK).replace('class="gs-i"', 'class="gs-i ok"')}<span>คัดลอก</span></button></div>
    <ol class="gs-steps"><li><b>1</b>คัดลอกโค้ดด้านบน</li><li><b>2</b>เข้าเกมที่รองรับ</li><li><b>3</b>วางใน executor แล้วกดรัน</li></ol>
    <div class="gs-foot">อัปเดตอัตโนมัติ ไม่ต้องคัดลอกใหม่</div>
  </div></div>`;
  document.body.append(ov);
  const code = $("#gs-c", ov), cp = $("#gs-cp", ov), x = $(".gs-x", ov), on = $("#gs-on", ov);
  code.textContent = getCode();
  loadGetCode().then(() => { code.textContent = getCode(); });
  const upd = () => { on.textContent = (S.snap ? S.snap.total : 0).toLocaleString(); };
  upd(); const iv = setInterval(upd, 1000);
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.classList.add("on"); cp.focus({ preventScroll: true }); }));

  const close = () => {
    clearInterval(iv); document.removeEventListener("keydown", key);
    ov.classList.remove("on"); setTimeout(() => ov.remove(), 450);
    if (prev && prev.focus) prev.focus({ preventScroll: true });
  };
  const key = e => {
    if (e.key === "Escape") return close();
    if (e.key === "Tab") {
      const f = [x, code, cp], i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  };
  document.addEventListener("keydown", key);
  ov.onmousedown = e => { if (e.target === ov) close(); };
  x.onclick = close;
  code.onclick = () => { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
  cp.onclick = async () => {
    const ok = await copyText(getCode(), code);
    if (!ok) return toast("คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วคัดลอกเอง", true);
    cp.classList.add("copied"); $("span", cp).textContent = "คัดลอกแล้ว"; toast("คัดลอกสคริปต์แล้ว");
    clearTimeout(cp._t); cp._t = setTimeout(() => { cp.classList.remove("copied"); $("span", cp).textContent = "คัดลอก"; }, 2200);
  };
}
(() => {
  const b = document.createElement("button");
  b.className = "get-btn"; b.id = "getscript"; b.innerHTML = gsSvg(I_ZAP) + "<span>รับสคริปต์</span>";
  b.onclick = openGet;
  $(".tb-r").append(b);
})();

/* ---------- boot ---------- */
async function boot() {
  buildDots(); readColors(); layout();
  addEventListener("resize", layout);
  requestAnimationFrame(frame);
  let authed = false;
  try {
    const st = await (await fetch("/api/status")).json();
    authed = !!st.authed;
    if (authed) S.projects = await getJSON("/api/projects");
  } catch {}
  S.authed = authed;
  const back = $(".tb-l .icon-btn");
  if (authed) { buildSelect(); back.href = "/admin"; back.title = "จัดการสคริปต์"; }
  else {
    S.pid = "all";
    for (const el of [$("#proj"), $("#setup"), $("#nd-setup"), $("#demo")]) el.style.display = "none";
  }
  if (authed && new URLSearchParams(location.search).has("demo")) setDemo(true); else connect();
  setInterval(loadTimeline, 30000);
  setInterval(() => { if (S.snap) { renderEvents(); } }, 15000);
}
boot();
})();
