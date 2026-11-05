// Slate serves every file with "Cache-Control: max-age=31536000", so browsers would keep
// showing an old version of the pages for a year. This worker makes pages and page data
// check with the server first (a cheap 304 when unchanged). Hashed files under
// /_next/static/ never change, so they keep using the normal cache.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/_next/static/")) return;

  event.respondWith((async () => {
    // A navigation request can't be re-issued with new options, so fetch its URL instead.
    const res = req.mode === "navigate"
      ? await fetch(req.url, { cache: "no-cache", credentials: "same-origin" })
      : await fetch(req, { cache: "no-cache" });
    return res.redirected && req.mode === "navigate" ? Response.redirect(res.url, 302) : res;
  })());
});
