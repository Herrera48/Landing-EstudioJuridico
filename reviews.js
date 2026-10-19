(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root.document) api.start(root, root.document);
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var starId = 0;
  var REFRESH_MS = 5 * 60 * 1000;

  function httpsUrl(value) {
    if (typeof value !== "string") return "";
    try {
      var url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch (_) { return ""; }
  }

  function validRating(value) { return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5; }
  function plainText(value) { return typeof value === "string" ? value : ""; }
  function score(value) { return value.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

  function element(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function link(doc, href, className, text) {
    var node = element(doc, "a", className, text);
    node.href = href;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    return node;
  }

  function icon(doc, reference, className) {
    var svg = doc.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    var use = doc.createElementNS(SVG_NS, "use");
    use.setAttribute("href", "#" + reference);
    svg.appendChild(use);
    return svg;
  }

  function fillStars(doc, node, value) {
    node.replaceChildren();
    node.setAttribute("role", "img");
    node.removeAttribute("aria-hidden");
    node.setAttribute("aria-label", score(value) + " de 5 estrellas");
    for (var i = 0; i < 5; i++) {
      var svg = icon(doc, "i-star");
      svg.setAttribute("width", "16");
      svg.setAttribute("height", "16");
      svg.setAttribute("fill", "currentColor");
      var base = svg.firstChild;
      base.setAttribute("opacity", "0.22");
      var portion = Math.min(1, Math.max(0, value - i));
      if (portion > 0) {
        var clipId = "google-star-" + (++starId);
        var clip = doc.createElementNS(SVG_NS, "clipPath");
        clip.setAttribute("id", clipId);
        var rect = doc.createElementNS(SVG_NS, "rect");
        rect.setAttribute("width", String(24 * portion));
        rect.setAttribute("height", "24");
        clip.appendChild(rect);
        svg.appendChild(clip);
        var front = doc.createElementNS(SVG_NS, "use");
        front.setAttribute("href", "#i-star");
        front.setAttribute("clip-path", "url(#" + clipId + ")");
        svg.appendChild(front);
      }
      node.appendChild(svg);
    }
  }

  function createReviewCard(doc, review, fallbackUrl) {
    var card = element(doc, "article", "review-card");
    var heading = element(doc, "div", "review-card-heading");
    var author = review.author || {};
    var authorUrl = httpsUrl(author.url);
    var authorBox = authorUrl ? link(doc, authorUrl, "review-author") : element(doc, "span", "review-author");
    var photoUrl = httpsUrl(author.photoUrl);
    if (photoUrl) {
      var avatar = element(doc, "img", "review-avatar");
      avatar.src = photoUrl;
      avatar.alt = "";
      avatar.width = 36;
      avatar.height = 36;
      avatar.loading = "lazy";
      avatar.referrerPolicy = "no-referrer";
      authorBox.appendChild(avatar);
    } else {
      var initials = (plainText(author.name) || "G").trim().split(/\s+/).slice(0, 2).map(function (word) { return word[0]; }).join("").toUpperCase();
      var placeholder = element(doc, "span", "review-avatar", initials);
      placeholder.setAttribute("aria-hidden", "true");
      authorBox.appendChild(placeholder);
    }
    authorBox.appendChild(element(doc, "span", "review-author-name", plainText(author.name) || "Usuario de Google Maps"));
    heading.appendChild(authorBox);
    card.appendChild(heading);

    if (validRating(review.rating)) {
      var stars = element(doc, "span", "review-stars rating-stars rating-stars-sm");
      fillStars(doc, stars, review.rating);
      card.appendChild(stars);
    }
    var comment = plainText(review.text);
    if (comment) card.appendChild(element(doc, "blockquote", "review-text", comment));
    var date = plainText(review.relativePublishTime);
    if (!date) {
      var time = new Date(review.updateTime || review.publishTime || "");
      if (Number.isFinite(time.getTime())) date = time.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
    }
    if (date) card.appendChild(element(doc, "p", "review-date", date));
    var individualUrl = httpsUrl(review.url);
    var reviewUrl = individualUrl || fallbackUrl;
    if (reviewUrl) {
      var source = link(doc, reviewUrl, "review-source");
      source.setAttribute("aria-label", individualUrl ? "Ver reseña en Google Maps" : "Ver reseñas en Google Maps");
      var googleIcon = icon(doc, "i-google-color", "google-source-logo");
      googleIcon.setAttribute("viewBox", "0 0 48 48");
      source.appendChild(googleIcon);
      var sourceText = element(doc, "span", "", "Publicado en");
      sourceText.appendChild(element(doc, "strong", "", "Google"));
      source.appendChild(sourceText);
      card.appendChild(source);
    }
    return card;
  }

  function applyData(doc, list, data) {
    if (!data || data.source !== "Google Maps" || !Array.isArray(data.reviews)) throw new Error("invalid_response");
    var mapsUrl = httpsUrl(data.mapsUrl);
    var reviewsUrl = httpsUrl(data.reviewsUrl) || mapsUrl;
    var cards = data.reviews.map(function (review) { return createReviewCard(doc, review, reviewsUrl); });
    list.replaceChildren.apply(list, cards);
    if (validRating(data.rating)) {
      doc.querySelectorAll('[data-contact-text="rating"]').forEach(function (node) { node.textContent = score(data.rating); });
      doc.querySelectorAll(".hero-rating .rating-stars, .rating-badge .rating-stars").forEach(function (node) { fillStars(doc, node, data.rating); });
      doc.querySelectorAll(".hero-rating, .rating-badge").forEach(function (node) {
        node.setAttribute("aria-label", "Puntuación " + score(data.rating) + " de 5 en Google Maps. Ver reseñas.");
      });
    }
    if (reviewsUrl) doc.querySelectorAll('[data-contact="google"]').forEach(function (node) { node.href = reviewsUrl; });
    var writeUrl = httpsUrl(data.writeReviewUrl);
    if (writeUrl) doc.querySelectorAll('[data-contact="review"]').forEach(function (node) { node.href = writeUrl; });

    var attribution = doc.getElementById("google-reviews-attributions");
    if (!attribution) {
      attribution = element(doc, "div", "google-reviews-attributions");
      attribution.id = "google-reviews-attributions";
      list.parentNode.insertBefore(attribution, list.nextSibling);
    }
    attribution.replaceChildren();
    var mapsCredit = reviewsUrl ? link(doc, reviewsUrl, "google-maps-attribution", "Google Maps") : element(doc, "span", "google-maps-attribution", "Google Maps");
    mapsCredit.setAttribute("translate", "no");
    attribution.appendChild(mapsCredit);
    var ordering = data.ordering === "newest" ? "Reseñas ordenadas por actualización más reciente, sin filtros de puntuación." : "Reseñas ordenadas por relevancia, sin filtros de puntuación.";
    attribution.appendChild(element(doc, "p", "google-reviews-note", ordering));
    (Array.isArray(data.attributions) ? data.attributions : []).forEach(function (provider) {
      var name = plainText(provider.name);
      if (!name) return;
      var uri = httpsUrl(provider.url);
      attribution.appendChild(uri ? link(doc, uri, "google-reviews-provider", name) : element(doc, "span", "google-reviews-provider", name));
    });
    list.dataset.reviewsStatus = "live";
  }

  function start(win, doc) {
    var list = doc.getElementById("google-reviews-list");
    if (!list || typeof win.fetch !== "function") return null;
    var config = win.ESTUDIO && win.ESTUDIO.google || {};
    var endpoint = config.endpoint || "/api/google-reviews";
    var busy = false;
    var lastAttempt = 0;

    async function refresh() {
      if (busy) return;
      busy = true;
      lastAttempt = Date.now();
      list.dataset.reviewsStatus = "loading";
      var controller = new win.AbortController();
      var timer = win.setTimeout(function () { controller.abort(); }, 10000);
      try {
        var response = await win.fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        if (!response.ok) {
          list.dataset.reviewsStatus = response.status === 503 ? "unconfigured" : "unavailable";
          return;
        }
        applyData(doc, list, await response.json());
      } catch (_) {
        // Keep the original verified snapshot (or current page result) on failure.
        // No fabricated reviews, success state or technical message in the interface.
        list.dataset.reviewsStatus = "unavailable";
      } finally {
        win.clearTimeout(timer);
        busy = false;
      }
    }

    function refreshWhenVisible() {
      if (doc.visibilityState !== "hidden" && Date.now() - lastAttempt >= REFRESH_MS) return refresh();
    }
    var interval = win.setInterval(refreshWhenVisible, REFRESH_MS);
    doc.addEventListener("visibilitychange", refreshWhenVisible);
    refresh();
    return {
      refresh: refresh,
      stop: function () { win.clearInterval(interval); doc.removeEventListener("visibilitychange", refreshWhenVisible); }
    };
  }

  return { start: start, applyData: applyData, createReviewCard: createReviewCard, fillStars: fillStars, httpsUrl: httpsUrl };
});
