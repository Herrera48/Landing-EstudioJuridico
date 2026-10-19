"use strict";

// Vercel Node Function. The API key never leaves the server.
const FIELD_MASK = "id,rating,reviews,googleMapsUri,googleMapsLinks,attributions";
const DEFAULT_MAPS_URL = "https://share.google/bdxVpSeGXEgWI7CLY";

function httpsUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch (_) { return ""; }
}

function text(value) { return typeof value === "string" ? value : ""; }

function rating(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5 ? value : null;
}

function normalizePlace(place) {
  const links = place.googleMapsLinks || {};
  const mapsUrl = httpsUrl(links.placeUri) || httpsUrl(place.googleMapsUri);
  return {
    source: "Google Maps",
    provider: "google-places",
    ordering: "relevance",
    rating: rating(place.rating),
    mapsUrl,
    reviewsUrl: httpsUrl(links.reviewsUri) || mapsUrl,
    writeReviewUrl: httpsUrl(links.writeAReviewUri),
    // Preserve Google's order and every supplied rating. No positive-review filter.
    reviews: (Array.isArray(place.reviews) ? place.reviews : []).map(function (review) {
      const author = review.authorAttribution || {};
      const original = review.originalText || review.text || {};
      return {
        author: {
          name: text(author.displayName),
          url: httpsUrl(author.uri),
          photoUrl: httpsUrl(author.photoUri)
        },
        rating: rating(review.rating),
        text: text(original.text),
        languageCode: text(original.languageCode),
        publishTime: text(review.publishTime),
        relativePublishTime: text(review.relativePublishTimeDescription),
        url: httpsUrl(review.googleMapsUri),
        reportUrl: httpsUrl(review.flagContentUri)
      };
    }),
    attributions: (Array.isArray(place.attributions) ? place.attributions : []).map(function (attribution) {
      return { name: text(attribution.provider), url: httpsUrl(attribution.providerUri) };
    })
  };
}

function normalizeBusinessReviews(data, mapsUrl) {
  const stars = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return {
    source: "Google Maps",
    provider: "google-business-profile",
    ordering: "newest",
    rating: rating(data.averageRating),
    mapsUrl,
    reviewsUrl: mapsUrl,
    writeReviewUrl: "",
    reviews: (Array.isArray(data.reviews) ? data.reviews : []).map(function (review) {
      const author = review.reviewer || {};
      return {
        id: text(review.reviewId),
        author: { name: text(author.displayName), url: "", photoUrl: httpsUrl(author.profilePhotoUrl) },
        rating: stars[review.starRating] || null,
        text: text(review.comment),
        languageCode: "",
        publishTime: text(review.createTime),
        updateTime: text(review.updateTime),
        relativePublishTime: "",
        // Business Profile does not supply public profile/individual review URLs.
        // A review ID must not be turned into an invented Google Maps URL.
        url: "",
        reportUrl: ""
      };
    }),
    attributions: []
  };
}

async function fetchBusinessReviews(request, env, location, signal) {
  const tokenResponse = await request("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN
    }).toString(),
    signal,
    cache: "no-store"
  });
  if (!tokenResponse.ok) throw new Error("oauth_unavailable");
  const token = await tokenResponse.json();
  if (!token || typeof token.access_token !== "string" || !token.access_token) throw new Error("oauth_invalid_response");

  const url = "https://mybusiness.googleapis.com/v4/" + location + "/reviews?pageSize=6&orderBy=updateTime%20desc";
  const response = await request(url, {
    headers: { Authorization: "Bearer " + token.access_token },
    signal,
    cache: "no-store"
  });
  if (!response.ok) throw new Error("business_reviews_unavailable");
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data) || data.error || (data.reviews && !Array.isArray(data.reviews))) {
    throw new Error("business_reviews_invalid_response");
  }
  const mapsUrl = httpsUrl(env.GOOGLE_MAPS_URL) || DEFAULT_MAPS_URL;
  return normalizeBusinessReviews(data, mapsUrl);
}

function createHandler(options) {
  options = options || {};
  const env = options.env || process.env;
  const request = options.fetch || globalThis.fetch;

  return async function googleReviews(req, res) {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const businessConfig = [env.GOOGLE_BUSINESS_LOCATION_NAME, env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REFRESH_TOKEN].map(value => text(value).trim());
    const businessRequested = businessConfig.some(Boolean);
    const useBusiness = businessConfig.every(Boolean);
    if (businessRequested && !useBusiness) return res.status(503).json({ error: "reviews_not_configured" });
    const location = businessConfig[0];
    const key = text(env.GOOGLE_PLACES_API_KEY).trim();
    const placeId = text(env.GOOGLE_PLACE_ID).trim();
    if (!useBusiness && (!key || !placeId)) return res.status(503).json({ error: "reviews_not_configured" });
    // Only the configured place can be requested: the public route isn't an arbitrary proxy.
    if ((useBusiness && !/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+$/.test(location)) || (!useBusiness && !/^[A-Za-z0-9_-]+$/.test(placeId))) {
      return res.status(503).json({ error: "reviews_configuration_invalid" });
    }

    const abort = new AbortController();
    const timeout = setTimeout(function () { abort.abort(); }, 8000);
    try {
      if (useBusiness) return res.status(200).json(await fetchBusinessReviews(request, env, location, abort.signal));
      const url = "https://places.googleapis.com/v1/places/" + encodeURIComponent(placeId) + "?languageCode=es&regionCode=AR";
      const response = await request(url, {
        headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
        signal: abort.signal,
        cache: "no-store"
      });
      if (!response.ok) return res.status(502).json({ error: "google_reviews_unavailable" });
      const place = await response.json();
      if (!place || typeof place !== "object" || Array.isArray(place) || typeof place.id !== "string") {
        return res.status(502).json({ error: "google_reviews_invalid_response" });
      }
      return res.status(200).json(normalizePlace(place));
    } catch (_) {
      // Do not return Google's diagnostics or request headers, which could expose credentials.
      return res.status(502).json({ error: "google_reviews_unavailable" });
    } finally {
      clearTimeout(timeout);
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.normalizePlace = normalizePlace;
module.exports.normalizeBusinessReviews = normalizeBusinessReviews;
module.exports.httpsUrl = httpsUrl;
