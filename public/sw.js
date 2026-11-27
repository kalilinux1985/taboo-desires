// Taboo Desires service worker: shows push notifications and opens the right
// page when one is tapped. It does no caching.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Taboo Desires";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "You have a new notification",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: data.tag || "notifications",
      renotify: true,
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/notifications" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of open) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
