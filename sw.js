/* Cache de l'application pour un fonctionnement hors ligne */
const CACHE = "cdj-v2";
const SHELL = [
  "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "data/calendrier.json", "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => updateWindowsWidgets())
  );
});

/* ---------- widget Windows 11 (Widgets Board) ---------- */

/* Rend le widget à partir du modèle Adaptive Card et des données du jour.
   Les URL viennent de la définition du widget dans le manifeste. */
async function renderWindowsWidget(widget) {
  try {
    const template = await (await fetch(widget.definition.msAcTemplate)).text();
    const data = await (await fetch(widget.definition.data)).text();
    await self.widgets.updateByTag(widget.definition.tag, { template, data });
  } catch (err) { /* widget non pris en charge ici */ }
}

async function updateWindowsWidgets() {
  if (!self.widgets) return;
  try {
    const widget = await self.widgets.getByTag("citation");
    if (widget) await renderWindowsWidget(widget);
  } catch (err) { /* silencieux */ }
}

/* Le widget vient d'être épinglé : on l'affiche tout de suite. */
self.addEventListener("widgetinstall", (e) => {
  e.waitUntil(renderWindowsWidget(e.widget));
});

/* Le panneau des widgets reprend le rendu : on rafraîchit. */
self.addEventListener("widgetresume", (e) => {
  e.waitUntil(updateWindowsWidgets());
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.pathname.endsWith("/data/calendrier.json") || url.pathname.endsWith("/api/quote.json")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});

/* Clic sur une notification : ouvrir l'application sur la bonne date */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const date = e.notification.data && e.notification.data.date;
  const url = date ? `/?date=${date}` : "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          if ("navigate" in c) c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

/* Rappel périodique (best effort, dépend du navigateur et de l'installation) */
self.addEventListener("periodicsync", (e) => {
  if (e.tag !== "cdj-daily") return;
  e.waitUntil((async () => {
    try {
      const res = await caches.match("data/calendrier.json");
      const data = res ? await res.json() : [];
      const iso = new Date().toISOString().slice(0, 10);
      const row = data.find((r) => r.date === iso);
      if (!row) return;
      await self.registration.showNotification("Citation du jour", {
        body: `« ${row.citation} » — ${row.auteur}`,
        tag: "cdj-daily",
        icon: "icons/icon-192.png",
        badge: "icons/icon-192.png",
        data: { date: row.date }
      });
    } catch (err) { /* silencieux */ }
  })());
});
