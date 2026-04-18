declare var self: ServiceWorkerGlobalScope;

// To bypass TS complaining about `self` being the Window object
export {};

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    // Notification data payload looks like:
    // { title: "Laundry Done!", body: "Machine 1 is ready", url: "/dashboard" }
    
    event.waitUntil(
      self.registration.showNotification(data.title || "WashBook Update", {
        body: data.body || "You have a new WashBook notification.",
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: {
          url: data.url || "/",
        },
      })
    );
  } catch (err) {
    console.error('Error parsing push payload', err);
    // Fallback if not JSON
    event.waitUntil(
      self.registration.showNotification("WashBook", {
        body: event.data.text(),
        icon: '/icon-192x192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if the app is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If not open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
