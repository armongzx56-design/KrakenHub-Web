"use strict";
/* Service worker: ให้ติดตั้งเป็นแอปได้ + รับแจ้งเตือน (ไม่แคชหน้าเว็บ ไม่แตะ /raw /api) */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RVX Hub</title>' +
  '<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#060606;color:#eee;font:16px system-ui,sans-serif;text-align:center;padding:24px">' +
  '<div><h1 style="font-size:22px;margin:0 0 8px">ออฟไลน์อยู่</h1><p style="opacity:.7;margin:0 0 18px">เชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่<br>You are offline. Check your connection.</p>' +
  '<button onclick="location.reload()" style="padding:10px 22px;border-radius:99px;border:0;font:inherit;cursor:pointer">ลองใหม่ / Retry</button></div>';

self.addEventListener("fetch", e => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    wins.forEach(w => w.postMessage({ type: "push", title: d.title, body: d.body, url: d.url })); // ให้หน้าที่เปิดอยู่เล่นเสียงเตือนในเว็บ
    await self.registration.showNotification(d.title || "RVX Hub", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge.png",
      tag: d.tag || "rvx",
      renotify: true,
      vibrate: [120, 60, 120],
      data: { url: d.url || "/" }
    });
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  let url = (e.notification.data && e.notification.data.url) || "/";
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) url = "/";
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) { await w.focus(); try { await w.navigate(url); } catch {} return; }
    }
    await self.clients.openWindow(url);
  })());
});
