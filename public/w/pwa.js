(() => {
"use strict";
/* ติดตั้งเป็นแอป + แจ้งเตือน + เสียงเตือนในเว็บ (เวอร์ชันปรับ UX) */
const $ = s => document.querySelector(s);
const DAY = 864e5;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} }
};
const TXT = {
  th: { install: "ติดตั้งเป็นแอป", iosHow: "กดปุ่มแชร์ด้านล่าง แล้วเลือก \"เพิ่มไปยังหน้าจอโฮม\"", notifOn: "เปิดแจ้งเตือน", notifOff: "ปิดแจ้งเตือนแล้ว", notifIsOn: "เปิดแจ้งเตือนอยู่", denied: "ถูกบล็อกการแจ้งเตือน เปิดได้ที่ตั้งค่าเบราว์เซอร์",
        iosNeed: "ต้องติดตั้งเป็นแอปก่อน แล้วค่อยเปิดแจ้งเตือน", ok: "เปิดแจ้งเตือนแล้ว", fail: "เปิดแจ้งเตือนไม่สำเร็จ", sndOn: "เสียงเตือน: เปิด", sndOff: "เสียงเตือน: ปิด", newUp: "มีอัปเดตใหม่", newMap: "มีแมพใหม่",
        pushT: "รับแจ้งเตือนอัปเดตและแมพใหม่", pushB: "เราจะแจ้งเตือนเฉพาะตอนมีของใหม่จริง ๆ", installT: "ติดตั้งไว้บนหน้าจอโฮม", installB: "เปิดได้เร็วขึ้นเหมือนแอปจริง",
        iosT: "ติดตั้งเพื่อรับแจ้งเตือนบน iPhone", iosB: "กดปุ่มแชร์ด้านล่าง แล้วเลือก \"เพิ่มไปยังหน้าจอโฮม\"",
        yes: "เปิดเลย", later: "ไว้ก่อน", gotIt: "เข้าใจแล้ว", close: "ปิด", fabPush: "แจ้งเตือน", fabPushOn: "แจ้งเตือนเปิดอยู่", fabInstall: "ติดตั้งแอป", busy: "กำลังเปิด…", installManualB: "กดเมนู (จุดสามจุด) มุมขวาบน แล้วเลือก \"ติดตั้งแอป\" หรือ \"เพิ่มไปยังหน้าจอหลัก\"" },
  en: { install: "Install app", iosHow: "Tap Share below, then \"Add to Home Screen\"", notifOn: "Turn on notifications", notifOff: "Notifications off", notifIsOn: "Notifications on", denied: "Notifications are blocked. Enable them in browser settings",
        iosNeed: "Install the app first, then turn on notifications", ok: "Notifications on", fail: "Couldn't turn on notifications", sndOn: "Sound: on", sndOff: "Sound: off", newUp: "New update", newMap: "New map",
        pushT: "Get notified about updates and new maps", pushB: "We only notify you when something new is really out", installT: "Add to your home screen", installB: "Opens faster, like a real app",
        iosT: "Install to get notifications on iPhone", iosB: "Tap Share below, then \"Add to Home Screen\"",
        yes: "Turn on", later: "Not now", gotIt: "Got it", close: "Close", fabPush: "Notifications", fabPushOn: "Notifications on", fabInstall: "Install app", busy: "Turning on…", installManualB: "Open the browser menu (top right) and choose \"Install app\" or \"Add to Home screen\"" }
};
const L = () => ((store.get("sv-lang") || document.documentElement.lang || "th").startsWith("en") ? "en" : "th");
const t = k => TXT[L()][k];

/* ---------- นับจำนวนวันที่เข้าเว็บ (นับวันละครั้ง) ---------- */
(function countVisit() {
  const now = Date.now(), last = +store.get("sv-last-visit") || 0;
  if (now - last > 30 * 60e3) store.set("sv-days", String((+store.get("sv-days") || 0) + 1));
  store.set("sv-last-visit", String(now));
})();
const days = () => +store.get("sv-days") || 0;
const snooze = (k, d) => store.set(k, String(Date.now() + d * DAY));
const snoozed = k => Date.now() < (+store.get(k) || 0);
const canAsk = () => days() >= 2; // ถามตั้งแต่เข้าเว็บรอบที่ 2 ขึ้นไป

function toast(msg) {
  const box = $("#toasts"); if (!box) return;
  const el = document.createElement("div"); el.className = "toast"; el.innerHTML = "<span></span>"; el.firstChild.textContent = msg;
  box.append(el);
  setTimeout(() => { el.style.transition = "opacity .3s"; el.style.opacity = 0; setTimeout(() => el.remove(), 300); }, 4200);
}

/* ---------- สไตล์ + ไอคอน (ใช้ตัวแปรสีของเว็บ ทั้งโหมดสว่างและมืด) ---------- */
const ICON = {
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  down: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  share: '<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/>'
};
const svg = k => '<svg class="rvx-i" viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg>';
const css = `
.rvx-tb{position:relative}
.rvx-tb[hidden]{display:none}
.rvx-tb .rvx-i{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.rvx-dot{position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:#2fbf71;box-shadow:0 0 0 2px var(--bg,#000000);display:none}
.rvx-tb.on .rvx-dot{display:block}
.rvx-tb.busy{opacity:.45;pointer-events:none;animation:rvxpulse 1s ease-in-out infinite}
@keyframes rvxpulse{50%{opacity:.8}}
.rvx-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;justify-content:center;padding:0 12px calc(env(safe-area-inset-bottom,0px) + 12px);opacity:0;transform:translateY(28px);transition:opacity .3s var(--ease,ease),transform .45s var(--ease,ease);pointer-events:none;font-family:var(--font,system-ui,sans-serif)}
.rvx-sheet.in{opacity:1;transform:none;pointer-events:auto}
.rvx-sheet.out{opacity:0;transform:translateY(28px);pointer-events:none}
.rvx-card{position:relative;width:100%;max-width:440px;background:color-mix(in srgb,var(--bg,#000000) 94%,transparent);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);color:var(--fg,#f5f5f4);border:1px solid var(--line,rgba(128,128,128,.2));border-radius:var(--r,20px);padding:22px 20px 18px;box-shadow:0 30px 70px -20px rgba(0,0,0,.6)}
.rvx-top{display:flex;gap:14px;align-items:flex-start;padding-right:36px}
.rvx-tile{width:42px;height:42px;flex:none;border-radius:12px;background:var(--card2,rgba(128,128,128,.12));border:1px solid var(--line,rgba(128,128,128,.2));display:grid;place-items:center}
.rvx-tile .rvx-i{width:20px;height:20px;stroke:var(--fg,#f5f5f4);fill:none;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.rvx-h{font-size:16px;font-weight:600;letter-spacing:-.01em;margin:2px 0 4px;line-height:1.35}
.rvx-p{font-size:13.5px;line-height:1.55;color:var(--mut,#8c8c8c)}
.rvx-x{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:50%;border:0;background:transparent;color:var(--mut,#8c8c8c);display:grid;place-items:center;cursor:pointer;transition:background .2s,color .2s}
.rvx-x:hover{background:var(--card2,rgba(128,128,128,.12));color:var(--fg,#f5f5f4)}
.rvx-x .rvx-i{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.75;stroke-linecap:round}
.rvx-row{display:flex;gap:10px;margin-top:18px}
.rvx-btn{flex:1;height:44px;border-radius:999px;border:1px solid var(--line2,rgba(128,128,128,.25));background:transparent;color:var(--fg,#f5f5f4);font:500 14px/1 var(--font,system-ui,sans-serif);cursor:pointer;transition:border-color .2s,background .2s,transform .2s var(--ease,ease)}
.rvx-btn:hover{border-color:var(--fg,#f5f5f4)}
.rvx-btn:active{transform:scale(.97)}
.rvx-btn.primary{background:var(--fg,#f5f5f4);color:var(--inv,#000000);border-color:transparent}
.rvx-btn.primary:hover{box-shadow:0 0 0 6px color-mix(in srgb,var(--fg,#f5f5f4) 14%,transparent)}
`;
const style = document.createElement("style"); style.textContent = css; document.head.append(style);

/* ---------- การ์ดแจ้งเตือนลอยด้านล่าง (ปิดได้ด้วย X หรือ "ไว้ก่อน") ---------- */
let sheetOpen = false;
function sheet(o) {
  if (sheetOpen) return;
  sheetOpen = true;
  const el = document.createElement("div");
  el.className = "rvx-sheet";
  el.setAttribute("role", "dialog");
  el.innerHTML = '<div class="rvx-card"><button type="button" class="rvx-x"></button>' +
    '<div class="rvx-top"><div class="rvx-tile"></div><div><div class="rvx-h"></div><p class="rvx-p"></p></div></div>' +
    '<div class="rvx-row"><button type="button" class="rvx-btn rvx-sec"></button>' + (o.primary ? '<button type="button" class="rvx-btn primary rvx-pri"></button>' : '') + '</div></div>';
  el.querySelector(".rvx-x").innerHTML = svg("x");
  el.querySelector(".rvx-x").setAttribute("aria-label", t("close"));
  el.querySelector(".rvx-tile").innerHTML = svg(o.icon || "bell");
  el.querySelector(".rvx-h").textContent = o.title;
  el.querySelector(".rvx-p").textContent = o.body;
  el.querySelector(".rvx-sec").textContent = o.secondary || t("later");
  if (o.primary) el.querySelector(".rvx-pri").textContent = o.primary;
  const done = fn => { sheetOpen = false; el.classList.add("out"); setTimeout(() => el.remove(), 350); if (fn) fn(); };
  el.querySelector(".rvx-x").onclick = () => done(o.onDismiss);
  el.querySelector(".rvx-sec").onclick = () => done(o.onDismiss);
  if (o.primary) el.querySelector(".rvx-pri").onclick = () => done(o.onAccept); // เรียกแบบ synchronous ภายในการกด จึงขอสิทธิ์/ติดตั้งได้
  document.body.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
}

/* ---------- ปุ่มบนแถบด้านบน (ข้างปุ่มภาษา/ธีม) ---------- */
const svgI = k => '<svg class="rvx-i" viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg>';
let pushVisible = false;
const themeBtn = document.querySelector("#theme");
const topWrap = themeBtn ? themeBtn.parentElement : null;
function mkTop(id, icon) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "icon-btn rvx-tb"; b.id = id; b.hidden = true;
  b.innerHTML = svgI(icon) + '<span class="rvx-dot"></span>';
  return b;
}
const tbPush = mkTop("rvx-tb-push", "bell"), tbInstall = mkTop("rvx-tb-install", "down");
if (topWrap) { topWrap.insertBefore(tbPush, themeBtn); topWrap.insertBefore(tbInstall, themeBtn); }

/* ---------- ติดตั้ง / แจ้งเตือน / เสียง ---------- */
const box = $("#pwa-box"), bInstall = $("#pwa-install"), bPush = $("#push-toggle"), bSound = $("#snd-toggle");
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let deferred = null, swReg = null, pushKey = "", subscribed = false;

let ctx = null;
const soundOn = () => store.get("sv-sound") !== "0";
function unlock() { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); } catch {} }
["pointerdown", "keydown", "touchstart"].forEach(ev => addEventListener(ev, unlock, { once: true, passive: true }));
function chime() {
  if (!soundOn()) return;
  unlock(); if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.02;
  [[880, 0], [1318.5, 0.13], [1760, 0.26]].forEach(([f, d]) => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f; o2.type = "triangle"; o2.frequency.value = f * 2;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.16, t0 + d + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.7);
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(ctx.destination);
    o.start(t0 + d); o2.start(t0 + d); o.stop(t0 + d + 0.75); o2.stop(t0 + d + 0.75);
  });
  if (navigator.vibrate) try { navigator.vibrate([80, 40, 80]); } catch {}
}
window.rvxChime = chime;

function label(btn, text) { const s = btn && btn.querySelector(".rvx-lb, span:last-child"); if (s) s.textContent = text; }
function render() {
  if (box) {
    if (bInstall) { bInstall.hidden = standalone || !(deferred || isIOS); label(bInstall, t("install")); }
    if (bPush) { label(bPush, subscribed ? t("notifIsOn") : t("notifOn")); bPush.classList.toggle("on", subscribed); }
    if (bSound) { label(bSound, soundOn() ? t("sndOn") : t("sndOff")); }
    box.hidden = [bInstall, bPush, bSound].every(b => !b || b.hidden);
  }
  tbPush.hidden = !pushVisible;
  tbPush.classList.toggle("on", subscribed);
  tbPush.title = tbPush.ariaLabel = subscribed ? t("fabPushOn") : t("fabPush");
  tbInstall.hidden = standalone || !(deferred || isIOS);
  tbInstall.title = tbInstall.ariaLabel = t("fabInstall");
}
addEventListener("langchange", render);

addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferred = e; render();
  if (!standalone && canAsk() && !snoozed("sv-snz-install")) {
    setTimeout(() => {
      if (!deferred || standalone) return;
      sheet({ icon: "down", title: t("installT"), body: t("installB"), primary: t("yes"), onAccept: installApp, onDismiss: () => snooze("sv-snz-install", 7) });
    }, 3000);
  }
});
addEventListener("appinstalled", () => { deferred = null; render(); });
async function installApp() {
  if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch {} deferred = null; render(); }
  else if (isIOS) toast(t("iosHow"));
}
tbInstall.addEventListener("click", installApp);
if (bInstall) bInstall.addEventListener("click", installApp);
if (bSound) bSound.addEventListener("click", () => { store.set("sv-sound", soundOn() ? "0" : "1"); unlock(); render(); if (soundOn()) chime(); });

const b64 = s => { const p = "=".repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, c => c.charCodeAt(0)); };
const pushOK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function subscribeNow(cur) {
  if (cur) { try { await cur.unsubscribe(); } catch {} }
  const sub = await swReg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(pushKey) });
  const r = await fetch("/api/public/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sub: sub.toJSON(), lang: L() }) });
  if (!r.ok) throw new Error("HTTP " + r.status);
  subscribed = true; render();
}

/* ถ้ากุญแจเปลี่ยนแล้ว การสมัครเก่าใช้ไม่ได้ ให้ลบทิ้ง */
async function dropStaleSub(cur) {
  const old = cur && cur.options && cur.options.applicationServerKey;
  if (!cur || !old) return cur;
  const a = new Uint8Array(old), b = b64(pushKey);
  if (a.length === b.length && a.every((v, i) => v === b[i])) return cur;
  try { await fetch("/api/public/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: cur.endpoint }) }); } catch {}
  try { await cur.unsubscribe(); } catch {}
  return null;
}

function setBusy(on) {
  [tbPush, bPush].forEach(b => { if (!b) return; b.classList.toggle("busy", on); b.disabled = on; });
  if (on && bPush) { const sp = bPush.querySelector("span"); if (sp) sp.textContent = t("busy"); }
}
async function enablePush() {
  if (!pushOK) { toast(t("iosNeed")); return; }
  setBusy(true); // ตอบสนองทันทีที่กด ไม่ให้ผู้ใช้รู้สึกว่าค้าง
  let step = "sw";
  try {
    if (!swReg) swReg = await navigator.serviceWorker.ready;
    step = "check";
    const cur = await swReg.pushManager.getSubscription();
    if (cur && subscribed) {
      await fetch("/api/public/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: cur.endpoint }) });
      await cur.unsubscribe(); subscribed = false; render(); toast(t("notifOff")); return;
    }
    step = "permission";
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") { toast(t("denied")); return; }
    step = "subscribe";
    await subscribeNow(cur);
    unlock(); chime(); toast(t("ok"));
  } catch (e) {
    console.error("push enable failed at", step, e);
    toast(t("fail") + " [" + step + ": " + String((e && (e.name || e.message)) || "error").slice(0, 40) + "]");
  }
  finally { setBusy(false); render(); }
}
if (bPush) bPush.addEventListener("click", enablePush);
tbPush.addEventListener("click", enablePush);

async function initPush() {
  if (!pushOK && !(isIOS && !standalone)) return;
  let enabled = false;
  try {
    const r = await fetch("/api/public/push/key", { cache: "no-store" }); const d = await r.json();
    enabled = !!d.enabled; pushKey = d.key || "";
  } catch { return; }
  if (!enabled) return;

  if (pushOK && swReg) {
    try {
      let cur = await swReg.pushManager.getSubscription();
      cur = await dropStaleSub(cur);
      if (!cur && Notification.permission === "granted") { try { await subscribeNow(null); } catch {} }
      else subscribed = !!cur && Notification.permission === "granted";
    } catch {}
  }
  if (bPush) bPush.hidden = false;
  pushVisible = pushOK; // iPhone ที่ยังไม่ติดตั้งจะไม่เห็นปุ่มนี้ (ใช้ปุ่มติดตั้งแทน)
  render();

  // ถามเรื่องแจ้งเตือนตั้งแต่เข้ารอบที่ 2 และไม่ถามซ้ำถ้าเคยกดไว้ก่อน (เลื่อน 7 วัน)
  if (pushOK && !subscribed && Notification.permission === "default" && canAsk() && !snoozed("sv-snz-push")) {
    setTimeout(() => {
      if (subscribed) return;
      sheet({ title: t("pushT"), body: t("pushB"), primary: t("yes"), onAccept: enablePush, onDismiss: () => snooze("sv-snz-push", 7) });
    }, 3000);
  }
}

/* iPhone ที่ยังไม่ได้ติดตั้ง: ชวนให้เพิ่มไปหน้าจอโฮม */
if (isIOS && !standalone && canAsk() && !snoozed("sv-snz-ios")) {
  setTimeout(() => sheet({ icon: "share", title: t("iosT"), body: t("iosB"), secondary: t("gotIt"), onDismiss: () => snooze("sv-snz-ios", 30) }), 3000);
}

/* เบราว์เซอร์บางตัวไม่ส่งสัญญาณติดตั้งมา (เช่น Chrome ยังไม่ถือว่าเว็บมีส่วนร่วมพอ) ให้บอกวิธีติดตั้งจากเมนูแทน */
if (!standalone && !isIOS && canAsk() && !snoozed("sv-snz-install")) {
  setTimeout(() => {
    if (deferred || standalone) return;
    sheet({ icon: "down", title: t("installT"), body: t("installManualB"), secondary: t("gotIt"), onDismiss: () => snooze("sv-snz-install", 7) });
  }, 6000);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(reg => { swReg = reg; return navigator.serviceWorker.ready; })
    .then(reg => { swReg = reg; initPush(); }).catch(() => { render(); });
  navigator.serviceWorker.addEventListener("message", e => {
    const d = e.data || {}; if (d.type !== "push") return;
    if (document.visibilityState === "visible") { toast((d.title || "") + (d.body ? " — " + d.body : "")); chime(); }
  });
} else render();
render();

/* ---------- ตรวจของใหม่ขณะเปิดเว็บอยู่ (เสียง + ข้อความ) ---------- */
async function check() {
  if (document.hidden) return;
  try {
    const r = await fetch("/api/public/site", { cache: "no-store" }); if (!r.ok) return;
    const s = await r.json();
    const ups = (s.updates || []).map(u => u.id), maps = (s.maps || []).filter(m => m.status !== "soon").map(m => m.key);
    let seen = null; try { seen = JSON.parse(store.get("sv-seen") || "null"); } catch {}
    if (seen) {
      const newU = ups.filter(id => !seen.u.includes(id)), newM = maps.filter(k => !seen.m.includes(k));
      if (newU.length || newM.length) {
        const first = newU.length ? (s.updates.find(u => u.id === newU[0]) || {}).title : (s.maps.find(m => m.key === newM[0]) || {}).name;
        toast((newU.length ? t("newUp") : t("newMap")) + (first ? ": " + first : "")); chime();
      }
    }
    store.set("sv-seen", JSON.stringify({ u: ups.slice(0, 200), m: maps.slice(0, 500) }));
  } catch {}
}
setTimeout(check, 2500);
setInterval(check, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
})();
