"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createHandler } = require("../api/google-reviews.js");
const browser = require("../reviews.js");

function response() {
  return {
    headers: {}, code: null, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("missing credentials returns 503 without making a request", async () => {
  let called = false;
  const handler = createHandler({ env: {}, fetch: async () => { called = true; } });
  const res = response();
  await handler({ method: "GET" }, res);
  assert.equal(res.code, 503);
  assert.deepEqual(res.body, { error: "reviews_not_configured" });
  assert.equal(called, false);
  assert.match(res.headers["Cache-Control"], /no-store/);
});

test("the endpoint requests only the configured place and keeps all ratings in Google order", async () => {
  const fixture = {
    id: "ChIJ_test", rating: 4.2,
    googleMapsUri: "https://maps.google.com/?cid=123",
    googleMapsLinks: { reviewsUri: "https://www.google.com/maps/reviews", writeAReviewUri: "https://www.google.com/maps/write" },
    reviews: [
      { rating: 2, authorAttribution: { displayName: "Primera", uri: "https://www.google.com/maps/contrib/1", photoUri: "https://lh3.googleusercontent.com/photo" }, originalText: { text: "Una opinión crítica", languageCode: "es" }, googleMapsUri: "https://www.google.com/maps/review/1" },
      { rating: 5, authorAttribution: { displayName: "Segunda" }, text: { text: "Una opinión favorable", languageCode: "es" } }
    ],
    attributions: [{ provider: "Proveedor", providerUri: "https://example.org/" }]
  };
  let request;
  const handler = createHandler({
    env: { GOOGLE_PLACES_API_KEY: "server-secret", GOOGLE_PLACE_ID: "ChIJ_test" },
    fetch: async (url, options) => { request = { url, options }; return { ok: true, json: async () => fixture }; }
  });
  const res = response();
  await handler({ method: "GET", query: { placeId: "a-different-place" } }, res);
  assert.equal(res.code, 200);
  assert.equal(new URL(request.url).pathname, "/v1/places/ChIJ_test");
  assert.equal(request.options.headers["X-Goog-Api-Key"], "server-secret");
  assert.equal(request.options.headers["X-Goog-FieldMask"], "id,rating,reviews,googleMapsUri,googleMapsLinks,attributions");
  assert.equal(request.options.cache, "no-store");
  assert.deepEqual(res.body.reviews.map(review => review.rating), [2, 5]);
  assert.equal(res.body.reviews[0].text, "Una opinión crítica");
  assert.equal(res.body.reviews[0].author.name, "Primera");
  assert.equal(res.body.reviews[0].url, "https://www.google.com/maps/review/1");
  assert.equal(res.body.writeReviewUrl, "https://www.google.com/maps/write");
  assert.equal(res.body.attributions[0].name, "Proveedor");
  assert.equal(JSON.stringify(res.body).includes("server-secret"), false);
  assert.equal(Object.hasOwn(res.body, "userRatingCount"), false);
});

test("upstream errors never expose keys or diagnostics", async () => {
  const handler = createHandler({
    env: { GOOGLE_PLACES_API_KEY: "private-key", GOOGLE_PLACE_ID: "ChIJ_test" },
    fetch: async () => { throw new Error("private-key request failed"); }
  });
  const res = response();
  await handler({ method: "GET" }, res);
  assert.equal(res.code, 502);
  assert.deepEqual(res.body, { error: "google_reviews_unavailable" });
});

test("POST and malformed Place IDs are rejected before calling Google", async () => {
  const handler = createHandler({ env: { GOOGLE_PLACES_API_KEY: "secret", GOOGLE_PLACE_ID: "places/../other" }, fetch: async () => assert.fail("unexpected request") });
  const post = response();
  await handler({ method: "POST" }, post);
  assert.equal(post.code, 405);
  assert.equal(post.headers.Allow, "GET");
  const get = response();
  await handler({ method: "GET" }, get);
  assert.equal(get.code, 503);
});

// A small DOM double covers safe rendering without loading dependencies or using a browser/network.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.textContent = ""; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(node) { this.children.push(node); node.parentNode = this; return node; }
  replaceChildren(...nodes) { this.children = []; nodes.forEach(node => this.appendChild(node)); }
  insertBefore(node, next) { const i = this.children.indexOf(next); if (i < 0) return this.appendChild(node); this.children.splice(i, 0, node); node.parentNode = this; return node; }
  get firstChild() { return this.children[0] || null; }
  get nextSibling() { if (!this.parentNode) return null; return this.parentNode.children[this.parentNode.children.indexOf(this) + 1] || null; }
}

function documentDouble() {
  const root = new Element("main");
  const list = root.appendChild(new Element("div"));
  list.id = "google-reviews-list";
  const original = list.appendChild(new Element("article"));
  original.textContent = "Comentario estático verificado";
  const rating = new Element("strong");
  const listeners = {};
  function find(node, id) { if (node.id === id) return node; for (const child of node.children) { const found = find(child, id); if (found) return found; } return null; }
  return {
    list, original, rating, root, listeners, visibilityState: "visible",
    createElement: tag => new Element(tag), createElementNS: (_, tag) => new Element(tag),
    getElementById: id => find(root, id),
    querySelectorAll: selector => selector === '[data-contact-text="rating"]' ? [rating] : [],
    addEventListener: (name, fn) => { listeners[name] = fn; },
    removeEventListener: name => { delete listeners[name]; }
  };
}

function allNodes(node) { return [node].concat(...node.children.map(allNodes)); }

test("rendering uses text nodes, links to the real author/review and includes negative ratings", () => {
  const doc = documentDouble();
  browser.applyData(doc, doc.list, {
    source: "Google Maps", rating: 4.3, mapsUrl: "https://maps.google.com/?cid=123",
    reviews: [{ author: { name: '<img src=x onerror="alert(1)">', url: "https://www.google.com/maps/contrib/1" }, rating: 1, text: "<script>alert(2)</script>", url: "https://www.google.com/maps/review/1" }],
    attributions: []
  });
  assert.equal(doc.list.dataset.reviewsStatus, "live");
  assert.equal(doc.rating.textContent, "4,3");
  assert.equal(doc.list.children.length, 1);
  assert.equal(doc.list.children[0].className, "review-card");
  const nodes = allNodes(doc.list);
  assert(nodes.some(node => node.tagName === "blockquote" && node.textContent === "<script>alert(2)</script>"));
  assert.equal(nodes.some(node => node.tagName === "script"), false);
  assert(nodes.some(node => node.className === "review-author" && node.href === "https://www.google.com/maps/contrib/1"));
  assert(nodes.some(node => node.className === "review-source" && node.href === "https://www.google.com/maps/review/1"));
  assert(nodes.some(node => node.attributes["aria-label"] === "1,0 de 5 estrellas"));
  assert(doc.getElementById("google-reviews-attributions"));
});

test("503 leaves the checked static cards intact and the client doesn't announce a fake sync", async () => {
  const doc = documentDouble();
  let calls = 0;
  let recurring;
  const win = {
    ESTUDIO: { google: { endpoint: "/api/custom-reviews" } }, AbortController,
    fetch: async (url, options) => { calls++; assert.equal(url, "/api/custom-reviews"); assert.equal(options.cache, "no-store"); return { ok: false, status: 503 }; },
    setTimeout: () => 1, clearTimeout: () => {},
    setInterval: (fn, ms) => { recurring = fn; assert.equal(ms, 300000); return 1; }, clearInterval: () => {}
  };
  const instance = browser.start(win, doc);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(doc.list.dataset.reviewsStatus, "unconfigured");
  assert.equal(doc.list.children[0], doc.original);
  doc.visibilityState = "hidden";
  recurring();
  assert.equal(calls, 1);
  instance.stop();
  assert.equal(doc.listeners.visibilitychange, undefined);
});

test("unsafe URLs are rejected in browser rendering", () => {
  assert.equal(browser.httpsUrl("javascript:alert(1)"), "");
  assert.equal(browser.httpsUrl("data:text/html,test"), "");
  assert.equal(browser.httpsUrl("https://name:password@example.org/"), "");
  assert.equal(browser.httpsUrl("https://www.google.com/maps/"), "https://www.google.com/maps/");
});

test("Business Profile is preferred and requests recent updates without exposing OAuth credentials", async () => {
  const env = {
    GOOGLE_BUSINESS_LOCATION_NAME: "accounts/123/locations/456",
    GOOGLE_CLIENT_ID: "private-client-id", GOOGLE_CLIENT_SECRET: "private-client-secret", GOOGLE_REFRESH_TOKEN: "private-refresh-token",
    GOOGLE_PLACES_API_KEY: "unused-place-key", GOOGLE_PLACE_ID: "Unused_Place",
    GOOGLE_MAPS_URL: "https://share.google/bdxVpSeGXEgWI7CLY"
  };
  const requests = [];
  const handler = createHandler({ env, fetch: async (url, options) => {
    requests.push({ url, options });
    if (url === "https://oauth2.googleapis.com/token") {
      const form = new URLSearchParams(options.body);
      assert.equal(options.method, "POST");
      assert.equal(form.get("grant_type"), "refresh_token");
      assert.equal(form.get("client_secret"), "private-client-secret");
      return { ok: true, json: async () => ({ access_token: "private-access-token" }) };
    }
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/v4/accounts/123/locations/456/reviews");
    assert.equal(parsed.searchParams.get("pageSize"), "6");
    assert.equal(parsed.searchParams.get("orderBy"), "updateTime desc");
    assert.equal(options.headers.Authorization, "Bearer private-access-token");
    return { ok: true, json: async () => ({ averageRating: 4.1, totalReviewCount: 25, reviews: [
      { reviewId: "recent", reviewer: { displayName: "Reciente", profilePhotoUrl: "https://lh3.googleusercontent.com/author" }, starRating: "ONE", comment: "Reseña reciente", createTime: "2026-10-18T10:00:00Z", updateTime: "2026-10-18T11:00:00Z" },
      { reviewId: "older", reviewer: { displayName: "Anterior" }, starRating: "FIVE", comment: "Reseña anterior", createTime: "2026-10-17T10:00:00Z", updateTime: "2026-10-17T10:00:00Z" }
    ] }) };
  } });
  const res = response();
  await handler({ method: "GET" }, res);
  assert.equal(res.code, 200);
  assert.equal(requests.length, 2);
  assert.equal(res.body.provider, "google-business-profile");
  assert.equal(res.body.ordering, "newest");
  assert.equal(res.body.rating, 4.1);
  assert.deepEqual(res.body.reviews.map(review => review.rating), [1, 5]);
  assert.equal(res.body.reviews[0].id, "recent");
  assert.equal(res.body.reviews[0].author.url, "");
  assert.equal(res.body.reviews[0].url, "");
  assert.equal(res.body.reviews[0].publishTime, "2026-10-18T10:00:00Z");
  assert.equal(res.body.reviews[0].updateTime, "2026-10-18T11:00:00Z");
  assert.equal(JSON.stringify(res.body).includes("private-"), false);
  assert.equal(Object.hasOwn(res.body, "totalReviewCount"), false);

  const doc = documentDouble();
  browser.applyData(doc, doc.list, res.body);
  const nodes = allNodes(doc.root);
  assert(nodes.some(node => node.className === "google-reviews-note" && node.textContent.includes("actualización más reciente")));
  assert(nodes.some(node => node.className === "review-source" && node.attributes["aria-label"] === "Ver reseñas en Google Maps"));
});

test("OAuth failure returns a generic error and does not silently switch to relevance", async () => {
  let calls = 0;
  const handler = createHandler({
    env: {
      GOOGLE_BUSINESS_LOCATION_NAME: "accounts/123/locations/456", GOOGLE_CLIENT_ID: "private-client",
      GOOGLE_CLIENT_SECRET: "private-secret", GOOGLE_REFRESH_TOKEN: "private-refresh",
      GOOGLE_PLACES_API_KEY: "private-places-key", GOOGLE_PLACE_ID: "ChIJ_test"
    },
    fetch: async () => { calls++; return { ok: false, json: async () => ({ error_description: "private-secret token failure" }) }; }
  });
  const res = response();
  await handler({ method: "GET" }, res);
  assert.equal(res.code, 502);
  assert.equal(calls, 1);
  assert.deepEqual(res.body, { error: "google_reviews_unavailable" });
});
