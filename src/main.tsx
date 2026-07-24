import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent PWA service worker from interfering in iframe/preview contexts.
// A stale SW can hijack navigations after a refresh and return cached 404s,
// so we aggressively unregister and purge caches on preview/iframe hosts.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
  if (typeof caches !== "undefined") {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
}

createRoot(document.getElementById("root")!).render(<App />);
