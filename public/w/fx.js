/* RVX FX — เอฟเฟกต์ร้านค้า 3 อย่างในไฟล์เดียว
   1) พลุกระดาษตอนซื้อสำเร็จ     RVXFX.confetti() / RVXFX.celebrate({title, lines})
   2) การ์ดสินค้าเอียง 3 มิติ + แสงสะท้อนวิ่งผ่าน (อัตโนมัติกับ .pcard และ .mk-card)
   3) การ์ดโปรไฟล์แชร์เป็นรูปภาพ (วาดด้วย canvas ไม่ต้องใช้ไลบรารี) RVXFX.card.mount(el, data)
   โหลดทุกหน้าจาก views/_foot.html ต่อจาก acct.js · ข้อความสองภาษาลงทะเบียนเองในไฟล์นี้ */
(() => {
"use strict";
if (window.RVXFX) return;

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lang = () => (document.documentElement.lang === "en" ? "en" : "th");
const loc = () => (lang() === "en" ? "en-GB" : "th-TH");
const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
const baht = s => "฿" + (Math.abs(s) / 100).toLocaleString(loc(), { maximumFractionDigits: 2 });

/* ---------- ข้อความสองภาษา (ลงทะเบียนเข้า window.I18N เดียวกับทั้งเว็บ) ---------- */
const STR = {
  "fx.buyT": ["ซื้อสำเร็จ!", "Purchase complete!"],
  "fx.extT": ["ต่ออายุสำเร็จ!", "Renewed!"],
  "fx.subNew": ["ขอบคุณที่อุดหนุน RVX Hub คีย์ของคุณพร้อมใช้งานแล้ว", "Thanks for supporting RVX Hub. Your key is ready to use."],
  "fx.subExt": ["เพิ่มเวลาให้คีย์เดิมแล้ว ใช้งานต่อได้ทันที", "Time added to your key. Keep going right away."],
  "fx.perDay": ["เฉลี่ยวันละ {p} เท่านั้น คุ้มสุด ๆ", "Only {p} per day. Great value."],
  "fx.life": ["จ่ายครั้งเดียว ใช้ได้ตลอดไป คุ้มที่สุด", "Pay once, use forever. The best deal."],
  "fx.lvUp": ["เลื่อนระดับเป็น {l} แล้ว!", "Level up! You're now {l}."],
  "lv.member": ["สมาชิก", "Member"], "lv.bronze": ["บรอนซ์", "Bronze"], "lv.silver": ["ซิลเวอร์", "Silver"],
  "lv.gold": ["โกลด์", "Gold"], "lv.diamond": ["ไดมอนด์", "Diamond"],
  "card.title": ["การ์ดโปรไฟล์ของฉัน", "My profile card"],
  "card.desc": ["สร้างรูปการ์ดโชว์ชื่อ ระยะเวลาที่ใช้ และระดับของคุณ เอาไปโพสต์ใน Discord ได้เลย", "A shareable image with your name, time with us and level. Ready to post on Discord."],
  "card.dl": ["ดาวน์โหลดรูป", "Download"], "card.copy": ["คัดลอกรูป", "Copy image"], "card.share": ["แชร์", "Share"],
  "card.copied": ["คัดลอกรูปแล้ว ไปวางในแชท Discord ได้เลย", "Image copied. Paste it into Discord."],
  "card.copyFail": ["คัดลอกรูปไม่ได้ ลองกดดาวน์โหลดแทน", "Couldn't copy the image. Try Download instead."],
  "card.err": ["สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง", "Couldn't create the image. Please try again."],
  "card.how": ["วิธีโพสต์ใน Discord: กด “คัดลอกรูป” แล้ววางในช่องแชท (Ctrl+V) หรือดาวน์โหลดแล้วลากไฟล์ไปวาง การ์ดไม่แสดง Discord ID หรืออีเมลของคุณ", "To post on Discord: tap “Copy image” and paste it into a chat (Ctrl+V), or download it and drag the file in. The card never shows your Discord ID or email."],
  "card.using": ["ใช้งานมาแล้ว", "Time with us"], "card.level": ["ระดับ", "Level"],
  "card.days": ["{n} วัน", "{n} days"], "card.today": ["วันนี้วันแรก", "First day"],
  "card.since": ["เป็นสมาชิกตั้งแต่ {d}", "Member since {d}"],
  "card.next": ["อีก {a} ถึงระดับ {l}", "{a} more to reach {l}"], "card.max": ["คุณอยู่ระดับสูงสุดแล้ว", "You've reached the top level"],
  "card.tile": ["การ์ดโปรไฟล์", "Profile card"], "card.tileD": ["รูปแชร์ลง Discord", "Share on Discord"]
};
const D = (window.I18N = window.I18N || { th: {}, en: {} });
D.th = D.th || {}; D.en = D.en || {};
for (const k in STR) { D.th[k] = STR[k][0]; D.en[k] = STR[k][1]; }
const t = (k, p) => {
  let s = (D[lang()] && D[lang()][k]) ?? (D.th && D.th[k]) ?? k;
  if (p) for (const a in p) s = s.split("{" + a + "}").join(p[a]);
  return s;
};
const ic = n => `<svg class="i" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const toast = (m, k) => { if (window.RVX && window.RVX.toast) window.RVX.toast(m, k); };

/* ---------- ระดับสมาชิก ----------
   คิดจากยอดใช้จ่ายสะสม (หน่วยสตางค์ 100 = 1 บาท) ปรับเกณฑ์ได้ตรงนี้ที่เดียว
   ค่าเริ่มต้นตรงกับราคาแพ็กเกจเริ่มต้น: 1 วัน=฿29 · 7 วัน=฿99 · 30 วัน=฿249 · ถาวร=฿699 */
const LEVELS = [
  { id: "member",  min: 0,     c: ["#cbd5e1", "#64748b"] },
  { id: "bronze",  min: 2900,  c: ["#fdba74", "#c2410c"] },
  { id: "silver",  min: 9900,  c: ["#f1f5f9", "#94a3b8"] },
  { id: "gold",    min: 24900, c: ["#fde68a", "#f59e0b"] },
  { id: "diamond", min: 69900, c: ["#67e8f9", "#a78bfa"] }
];
function level(spent) {
  spent = Math.max(0, Number(spent) || 0);
  let i = 0;
  LEVELS.forEach((l, k) => { if (spent >= l.min) i = k; });
  const cur = LEVELS[i], nx = LEVELS[i + 1] || null;
  return {
    i, id: cur.id, name: t("lv." + cur.id), colors: cur.c,
    next: nx ? { i: i + 1, name: t("lv." + nx.id), need: nx.min - spent } : null,
    pct: nx ? clamp((spent - cur.min) / (nx.min - cur.min), 0, 1) : 1
  };
}
const GEM = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="currentColor"/><path d="M2 9h20M9 3 7 9l5 12 5-12-2-6" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/></svg>';
const badge = L => `<span class="lv-badge" style="--c1:${L.colors[0]};--c2:${L.colors[1]}">${GEM}${esc(L.name)}</span>`;

/* =====================================================================
   1) พลุกระดาษ
   ===================================================================== */
const COLORS = ["#ff4d6d", "#ffb703", "#ffd60a", "#4cc9f0", "#7b61ff", "#06d6a0", "#f72585", "#ffffff"];
let cv = null, cx = null, parts = [], raf = 0, last = 0, W = 0, H = 0, dpr = 1;

function sizeCanvas() {
  if (!cv) return;
  dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
}
function spawn(o) {
  for (let i = 0; i < o.count; i++) {
    const a = (o.angle + (Math.random() - .5) * o.spread) * Math.PI / 180, v = o.speed * (.5 + Math.random() * .6);
    parts.push({
      x: o.x + (o.jx || 0) * (Math.random() - .5), y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 7, r: Math.random() * 6.28, vr: (Math.random() - .5) * .35,
      f: Math.random() * 6.28, vf: .08 + Math.random() * .2, c: COLORS[(Math.random() * COLORS.length) | 0],
      round: Math.random() < .22, g: .15 + Math.random() * .08, life: 0, ttl: 2600 + Math.random() * 1500
    });
  }
}
function frame(now) {
  const dt = clamp((now - last) / 16.67, .2, 3); last = now;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt * 16.67;
    if (p.life > p.ttl || p.y > H + 30) { parts.splice(i, 1); continue; }
    const drag = Math.pow(.985, dt);
    p.vx *= drag; p.vy = p.vy * drag + p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.f += p.vf * dt;
    const left = (p.ttl - p.life) / (p.ttl * .3);
    cx.globalAlpha = left < 1 ? Math.max(0, left) : 1;
    cx.fillStyle = p.c;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.scale(1, Math.cos(p.f));
    if (p.round) { cx.beginPath(); cx.arc(0, 0, p.w * .42, 0, 6.2832); cx.fill(); }
    else cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cx.restore();
  }
  cx.globalAlpha = 1;
  if (parts.length) raf = requestAnimationFrame(frame);
  else stop();
}
function stop() {
  cancelAnimationFrame(raf); raf = 0; parts = [];
  window.removeEventListener("resize", sizeCanvas);
  if (cv) { cv.remove(); cv = null; cx = null; }
}
function confetti() {
  if (reduced() || !document.body) return;
  if (!cv) {
    cv = document.createElement("canvas"); cv.className = "fx-confetti"; cv.setAttribute("aria-hidden", "true");
    document.body.append(cv); cx = cv.getContext("2d"); sizeCanvas(); window.addEventListener("resize", sizeCanvas);
  }
  const k = W < 640 ? .6 : 1, sp = clamp(H * .028, 14, 26);
  const cannon = (delay, n, spd) => setTimeout(() => {
    if (!cv) return;
    spawn({ x: -6, y: H * .96, angle: -58, spread: 34, speed: spd, count: Math.round(n * k) });
    spawn({ x: W + 6, y: H * .96, angle: -122, spread: 34, speed: spd, count: Math.round(n * k) });
  }, delay);
  cannon(0, 70, sp); cannon(220, 46, sp * .86);
  setTimeout(() => { if (cv) spawn({ x: W / 2, y: -14, jx: W, angle: 90, spread: 40, speed: 3, count: Math.round(70 * k) }); }, 420);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
}
function celebrate({ title, lines = [], icon = "🎉", ms = 4600 } = {}) {
  document.querySelectorAll(".fx-cele").forEach(e => e.remove());
  const el = document.createElement("div");
  el.className = "fx-cele"; el.setAttribute("role", "status");
  el.innerHTML = `<div class="fx-cele-in"><span class="fx-cele-ic" aria-hidden="true">${icon}</span><b>${esc(title)}</b>${lines.filter(Boolean).map(l => `<span class="fx-cele-l">${esc(l)}</span>`).join("")}</div>`;
  document.body.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
  const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 450); };
  el.addEventListener("click", close); setTimeout(close, ms);
  confetti();
}

/* =====================================================================
   2) การ์ดเอียง 3 มิติ
   ===================================================================== */
const TILT_SEL = ".pcard, .mk-card, .sc-stage";
function initTilt() {
  if (!window.matchMedia || !matchMedia("(hover:hover) and (pointer:fine)").matches || reduced()) return;
  const MAX = 9;
  let cur = null, rect = null, ev = null, tick = 0;
  const glare = el => {
    if (el.querySelector(":scope > .fx-glare")) return;
    const g = document.createElement("i"); g.className = "fx-glare"; g.setAttribute("aria-hidden", "true"); el.append(g);
  };
  const paint = () => {
    tick = 0; if (!cur || !ev || !rect) return;
    const px = clamp((ev.clientX - rect.left) / rect.width, 0, 1), py = clamp((ev.clientY - rect.top) / rect.height, 0, 1), s = cur.style;
    s.setProperty("--rx", ((.5 - py) * 2 * MAX).toFixed(2) + "deg");
    s.setProperty("--ry", ((px - .5) * 2 * MAX).toFixed(2) + "deg");
    s.setProperty("--gx", (px * 100).toFixed(1) + "%");
    s.setProperty("--gy", (py * 100).toFixed(1) + "%");
    s.setProperty("--sx", (px * 150 - 25).toFixed(1) + "%");
  };
  const leave = () => {
    if (!cur) return;
    cur.classList.remove("fx-on");
    cur.style.setProperty("--rx", "0deg"); cur.style.setProperty("--ry", "0deg");
    cur = null; rect = null;
  };
  const enter = el => {
    leave(); cur = el; glare(el);
    rect = el.getBoundingClientRect();           // วัดก่อนเอียง เพื่อไม่ให้ขอบสั่น
    el.classList.add("fx-t", "fx-on");
  };
  document.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    const el = e.target && e.target.closest ? e.target.closest(TILT_SEL) : null;
    if (!el) { leave(); return; }
    if (el !== cur) enter(el);
    ev = e; if (!tick) tick = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") leave(); }, { passive: true });
  document.documentElement.addEventListener("mouseleave", leave);
  window.addEventListener("blur", leave);
  window.addEventListener("scroll", () => { if (cur) { leave(); } }, { passive: true });
}

/* =====================================================================
   3) การ์ดโปรไฟล์แชร์เป็นรูป
   ===================================================================== */
const CW = 1200, CH = 630;
const FONT = '"Inter","Noto Sans Thai",system-ui,-apple-system,"Segoe UI",sans-serif';
const MONO = '"JetBrains Mono",ui-monospace,Consolas,monospace';
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const imgCache = new Map();

function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function glow(c, x, y, r, color, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
}
function gemPath(c, x, y, w, h) {
  c.beginPath(); c.moveTo(x + w * .25, y); c.lineTo(x + w * .75, y); c.lineTo(x + w, y + h * .38); c.lineTo(x + w * .5, y + h); c.lineTo(x, y + h * .38); c.closePath();
}
function fitText(c, text, maxW, size, weight, min) {
  let s = size;
  for (; s >= min; s -= 2) { c.font = `${weight} ${s}px ${FONT}`; if (c.measureText(text).width <= maxW) return { text, size: s }; }
  c.font = `${weight} ${min}px ${FONT}`;
  const chars = Array.from(text);
  while (chars.length > 1 && c.measureText(chars.join("") + "…").width > maxW) chars.pop();
  return { text: chars.join("") + "…", size: min };
}
function loadImg(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise(res => {
    const im = new Image(); let done = false;
    const fin = v => { if (!done) { done = true; res(v); } };
    im.crossOrigin = "anonymous"; im.referrerPolicy = "no-referrer";
    im.onload = () => fin(im); im.onerror = () => fin(null);
    setTimeout(() => fin(null), 6000); im.src = src;
  });
  imgCache.set(src, p); return p;
}
async function loadFonts(sample) {
  if (!document.fonts || !document.fonts.load) return;
  const jobs = ['700 84px "Noto Sans Thai"', '500 28px "Noto Sans Thai"', '700 84px "Inter"', '500 28px "Inter"', '500 22px "JetBrains Mono"']
    .map(f => document.fonts.load(f, sample).catch(() => {}));
  await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 2500))]);
}
const avatarUrl = d => (d.avatar && /^[a-z0-9_]{1,64}$/i.test(d.avatar) && /^\d{5,25}$/.test(String(d.id)))
  ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png?size=256` : "";
const daysSince = ms => Math.max(0, Math.floor((Date.now() - (Number(ms) || Date.now())) / 864e5));

/* d = { name, id, avatar, createdAt, totalSpent } */
async function drawCard(canvas, d, { avatar = true } = {}) {
  const c = canvas.getContext("2d"), L = level(d.totalSpent), [c1, c2] = L.colors;
  const name = String(d.name || "RVX").trim() || "RVX";
  const days = daysSince(d.createdAt);
  const useVal = days < 1 ? t("card.today") : t("card.days", { n: days.toLocaleString(loc()) });
  const sinceTxt = t("card.since", { d: new Date(d.createdAt || Date.now()).toLocaleDateString(loc(), { dateStyle: "medium" }) });
  const lvlTxt = L.name.toUpperCase();
  const [img] = await Promise.all([
    avatar && avatarUrl(d) ? loadImg(avatarUrl(d)) : Promise.resolve(null),
    loadFonts(name + useVal + sinceTxt + t("card.using") + t("card.level") + L.name + "0123456789")
  ]);
  canvas.width = CW; canvas.height = CH;

  // พื้นหลัง
  let g = c.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, "#09090f"); g.addColorStop(1, "#15111f");
  c.fillStyle = g; c.fillRect(0, 0, CW, CH);
  glow(c, CW * .88, -30, 560, c1, .3); glow(c, CW * .06, CH + 40, 520, c2, .26);
  c.fillStyle = "rgba(255,255,255,.055)";
  for (let x = 44; x < CW; x += 30) for (let y = 44; y < CH; y += 30) c.fillRect(x, y, 2, 2);
  g = c.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, hexA(c1, .7)); g.addColorStop(1, hexA(c2, .7));
  c.lineWidth = 2; c.strokeStyle = g; rr(c, 24, 24, CW - 48, CH - 48, 34); c.stroke();

  // แบรนด์ซ้ายบน
  c.fillStyle = "rgba(255,255,255,.08)"; rr(c, 64, 58, 46, 46, 13); c.fill();
  c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 1.5; rr(c, 64, 58, 46, 46, 13); c.stroke();
  c.fillStyle = "#fff"; c.font = `600 21px ${MONO}`; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillText(">_", 87, 88);
  c.textAlign = "left"; c.font = `700 28px ${FONT}`; c.fillStyle = "#fff"; c.fillText("RVX", 126, 91);
  const rw = c.measureText("RVX ").width; c.fillStyle = "rgba(255,255,255,.5)"; c.fillText("HUB", 126 + rw, 91);

  // ป้ายระดับขวาบน
  c.font = `700 25px ${FONT}`;
  const tw = c.measureText(lvlTxt).width, pw = tw + 100, px = CW - 64 - pw;
  g = c.createLinearGradient(px, 0, px + pw, 0); g.addColorStop(0, c1); g.addColorStop(1, c2);
  c.fillStyle = g; rr(c, px, 56, pw, 50, 25); c.fill();
  c.fillStyle = "rgba(10,10,16,.88)"; gemPath(c, px + 24, 69, 26, 24); c.fill();
  c.fillStyle = "#0b0b12"; c.textAlign = "left"; c.fillText(lvlTxt, px + 62, 90);

  // รูปโปรไฟล์
  const ax = 215, ay = 352, ar = 108;
  glow(c, ax, ay, 230, c1, .25);
  g = c.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar); g.addColorStop(0, c1); g.addColorStop(1, c2);
  c.lineWidth = 7; c.strokeStyle = g; c.beginPath(); c.arc(ax, ay, ar + 13, 0, Math.PI * 2); c.stroke();
  c.save(); c.beginPath(); c.arc(ax, ay, ar, 0, Math.PI * 2); c.clip();
  if (img) c.drawImage(img, ax - ar, ay - ar, ar * 2, ar * 2);
  else {
    g = c.createLinearGradient(ax - ar, ay - ar, ax + ar, ay + ar); g.addColorStop(0, hexA(c1, .55)); g.addColorStop(1, hexA(c2, .55));
    c.fillStyle = g; c.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    c.fillStyle = "#fff"; c.font = `700 112px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(Array.from(name)[0].toUpperCase(), ax, ay + 6); c.textBaseline = "alphabetic";
  }
  c.restore(); c.textAlign = "left";

  // ชื่อ + วันที่เป็นสมาชิก
  const X = 388, fit = fitText(c, name, CW - 64 - X, 86, 700, 40);
  c.fillStyle = "#fff"; c.font = `700 ${fit.size}px ${FONT}`; c.fillText(fit.text, X, 330);
  c.fillStyle = "rgba(255,255,255,.55)"; c.font = `500 27px ${FONT}`; c.fillText(sinceTxt, X, 378);

  // สถิติ: ระยะเวลาที่ใช้ + ระดับ
  c.fillStyle = "rgba(255,255,255,.5)"; c.font = `500 24px ${FONT}`;
  c.fillText(t("card.using"), X, 456); c.fillText(t("card.level"), X + 352, 456);
  c.fillStyle = "#fff"; c.font = `700 58px ${FONT}`; c.fillText(useVal, X, 522);
  c.font = `700 58px ${FONT}`;
  const lw = c.measureText(L.name).width;
  g = c.createLinearGradient(X + 352, 0, X + 352 + lw, 0); g.addColorStop(0, c1); g.addColorStop(1, c2);
  c.fillStyle = g; c.fillText(L.name, X + 352, 522);
  c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(X + 322, 424, 2, 112);

  // ท้ายการ์ด
  c.fillStyle = "rgba(255,255,255,.4)"; c.font = `500 22px ${MONO}`; c.textAlign = "right";
  c.fillText(location.host || "rvx", CW - 64, 578); c.textAlign = "left";
}
const toBlob = canvas => new Promise((res, rej) => {
  try { canvas.toBlob(b => (b ? res(b) : rej(new Error("blob"))), "image/png"); } catch (e) { rej(e); }
});
async function makeBlob(d) {
  const canvas = document.createElement("canvas");
  try { await drawCard(canvas, d, { avatar: true }); return await toBlob(canvas); }
  catch { await drawCard(canvas, d, { avatar: false }); return await toBlob(canvas); }
}
const fileName = d => "rvx-profile-" + (String(d.name || "card").toLowerCase().replace(/[^a-z0-9ก-๙_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "card") + ".png";

const card = {
  draw: drawCard, makeBlob,
  mount(root, d) {
    if (!root || !d) return;
    const L = level(d.totalSpent);
    const canShareFiles = (() => {
      try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob(["x"])], "a.png", { type: "image/png" })] })); } catch { return false; }
    })();
    const canCopy = !!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem);
    root.innerHTML = `<section class="sc-wrap" style="--c1:${L.colors[0]};--c2:${L.colors[1]}">
      <div class="sc-h"><div><h3>${esc(t("card.title"))}</h3><p class="muted">${esc(t("card.desc"))}</p></div>${badge(L)}</div>
      <div class="sc-stage"><canvas id="sc-cv" width="${CW}" height="${CH}" role="img" aria-label="${esc(t("card.title"))}"></canvas></div>
      <div class="sc-prog"><div class="sc-bar" aria-hidden="true"><i style="width:${Math.round(L.pct * 100)}%"></i></div>
        <small class="muted">${esc(L.next ? t("card.next", { a: baht(L.next.need), l: L.next.name }) : t("card.max"))}</small></div>
      <div class="sc-acts">
        <button type="button" class="btn-pill primary" data-sc="dl">${ic("download")}<span>${esc(t("card.dl"))}</span></button>
        ${canCopy ? `<button type="button" class="btn-pill ghost" data-sc="copy">${ic("copy")}<span>${esc(t("card.copy"))}</span></button>` : ""}
        ${canShareFiles ? `<button type="button" class="btn-pill ghost" data-sc="share">${ic("send")}<span>${esc(t("card.share"))}</span></button>` : ""}
      </div>
      <p class="fine">${esc(t("card.how"))}</p></section>`;
    const canvas = $("#sc-cv", root);
    // วาดพรีวิว แล้วเก็บรูปไว้ใช้ตอนกดปุ่ม (กดแล้วได้ทันที ไม่ต้องรอวาดใหม่)
    const ready = drawCard(canvas, d).then(() => toBlob(canvas)).catch(() => makeBlob(d));
    root.onclick = async e => {
      const b = e.target.closest("[data-sc]"); if (!b || b.disabled) return;
      const act = b.dataset.sc; b.disabled = true;
      try {
        if (act === "dl") {
          const blob = await ready, url = URL.createObjectURL(blob), a = document.createElement("a");
          a.href = url; a.download = fileName(d); document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        } else if (act === "copy") {
          try { await navigator.clipboard.write([new ClipboardItem({ "image/png": ready })]); toast(t("card.copied")); }
          catch { toast(t("card.copyFail"), "er"); }
        } else if (act === "share") {
          const blob = await ready, f = new File([blob], fileName(d), { type: "image/png" });
          try { await navigator.share({ files: [f], title: "RVX Hub" }); } catch (x) { if (x && x.name !== "AbortError") toast(t("card.err"), "er"); }
        }
      } catch { toast(t("card.err"), "er"); }
      finally { b.disabled = false; }
    };
  }
};

window.RVXFX = { confetti, celebrate, level, levels: LEVELS, badge, card, t };
initTilt();
})();
