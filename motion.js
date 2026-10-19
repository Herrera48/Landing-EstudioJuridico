(function () {
  "use strict";

  var preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var observed = new Map();
  var enterObserver = null;
  var exitObserver = null;
  var mutationObserver = null;
  var active = false;
  var scheduled = false;
  var generation = 0;

  var selector = [
    "main .reveal",
    "main .motion-reveal",
    "main .btn",
    "main .person .linkedin-btn",
    "main .section h2:not(.sr-only)",
    "main .clients h2",
    ".section-intro",
    ".reviews-head > p",
    ".reviews-summary .rating-badge",
    ".hero-title",
    ".hero-address",
    ".hero-rating",
    ".hero-content .rating-badge",
    ".practice-list > li",
    ".person-plate",
    ".person-role",
    ".person-name",
    ".person-meta",
    "#google-reviews-list > .review-card",
    ".contact-lead",
    ".contact-list > div"
  ].join(",");

  var wrapperSelector = [
    ".hero-actions", ".person", ".contact-copy", ".section-head",
    ".reviews-head", ".reviews-summary", ".reviews-toolbar",
    ".google-reviews-bar", ".google-reviews-header", ".review-cta", ".clients-head"
  ].join(",");

  function permitted(el) {
    return !!el.closest("main") && !el.closest("dialog, [role=dialog], .dialog, .header, .wa-float, .sr-only, [aria-hidden=true]");
  }

  function releaseLegacy(el) {
    if (!el.classList.contains("reveal")) return;
    el.classList.remove("reveal", "is-in");
    el.classList.add("reveal-motion-owned");
  }

  function delayFor(el) {
    var hero = el.closest(".hero-content");
    if (hero) {
      var heroItems = Array.prototype.slice.call(hero.querySelectorAll(".hero-title, .hero-address, .btn, .hero-rating, .rating-badge"));
      return Math.min(450, Math.max(0, heroItems.indexOf(el)) * 140);
    }

    var person = el.closest(".person");
    if (person) {
      var people = Array.prototype.slice.call(person.parentElement.querySelectorAll(":scope > .person"));
      var parts = Array.prototype.slice.call(person.querySelectorAll(".person-plate, .person-role, .person-name, .person-meta, .linkedin-btn, .btn"));
      return Math.min(450, Math.max(0, people.indexOf(person)) * 120 + Math.max(0, parts.indexOf(el)) * 70);
    }

    var parent = el.parentElement;
    if (!parent) return 0;
    var siblings = Array.prototype.slice.call(parent.children).filter(function (sibling) {
      return sibling.matches(selector) && permitted(sibling);
    });
    return Math.min(450, Math.max(0, siblings.indexOf(el)) * 140);
  }

  function show(el, immediate) {
    var state = observed.get(el);
    if (!state || !active) return;
    state.visible = true;
    if (immediate) el.classList.add("motion-immediate");
    var currentGeneration = generation;
    window.requestAnimationFrame(function () {
      if (active && generation === currentGeneration && state.visible && el.isConnected) {
        el.classList.add("motion-visible");
      }
    });
  }

  function hideOffscreen(el) {
    var state = observed.get(el);
    if (!state || !state.visible || el.contains(document.activeElement)) return;
    state.visible = false;
    el.classList.remove("motion-visible", "motion-immediate");
  }

  function discover() {
    scheduled = false;
    if (!active) return;

    /* Split composition wrappers so that the text and CTA never animate twice. */
    document.querySelectorAll("main .reveal").forEach(function (el) {
      if (el.matches(wrapperSelector)) releaseLegacy(el);
    });

    var candidates = Array.prototype.slice.call(document.querySelectorAll(selector)).filter(permitted);
    var candidateSet = new Set(candidates);

    candidates.forEach(function (el) {
      if (observed.has(el)) return;

      /* A card can animate as one unit; its nested controls keep their own hover. */
      var ancestor = el.parentElement;
      while (ancestor && ancestor !== document.body) {
        if (candidateSet.has(ancestor)) {
          releaseLegacy(el);
          return;
        }
        ancestor = ancestor.parentElement;
      }

      try {
        enterObserver.observe(el);
        exitObserver.observe(el);
        observed.set(el, { visible: false });
        releaseLegacy(el);
        el.style.setProperty("--motion-delay", delayFor(el) + "ms");
        el.classList.add("motion-reveal", "motion-pending");
        if (el.contains(document.activeElement)) show(el, true);
      } catch (error) {
        /* Enhancement is optional: a failed node stays readable and usable. */
        el.classList.remove("motion-pending", "motion-visible", "motion-immediate");
        observed.delete(el);
      }
    });

    observed.forEach(function (state, el) {
      if (el.isConnected) return;
      enterObserver.unobserve(el);
      exitObserver.unobserve(el);
      observed.delete(el);
    });
  }

  function scheduleDiscovery() {
    if (!active || scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(discover);
  }

  function stop() {
    active = false;
    scheduled = false;
    generation += 1;
    if (enterObserver) enterObserver.disconnect();
    if (exitObserver) exitObserver.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
    enterObserver = null;
    exitObserver = null;
    mutationObserver = null;
    observed.forEach(function (state, el) {
      el.classList.remove("motion-pending", "motion-visible", "motion-immediate");
    });
    observed.clear();
  }

  function init() {
    if (active || preference.matches || !("IntersectionObserver" in window)) return;
    try {
      enterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var rootHeight = entry.rootBounds ? entry.rootBounds.height : window.innerHeight * .9;
          var tallElement = entry.boundingClientRect.height > rootHeight * .85;
          if (entry.isIntersecting && (entry.intersectionRatio >= .12 || tallElement)) show(entry.target, false);
        });
      }, { rootMargin: "-5% 0px -5% 0px", threshold: [0, .12] });

      /* Reset only after fully leaving a generous buffer outside the viewport. */
      exitObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) hideOffscreen(entry.target);
        });
      }, { rootMargin: "96px 0px 96px 0px", threshold: 0 });

      active = true;
      generation += 1;
      discover();

      if ("MutationObserver" in window) {
        mutationObserver = new MutationObserver(function (records) {
          if (records.some(function (record) { return record.addedNodes.length || record.removedNodes.length; })) {
            scheduleDiscovery();
          }
        });
        var main = document.querySelector("main");
        if (main) mutationObserver.observe(main, { childList: true, subtree: true });
      }
    } catch (error) {
      stop();
    }
  }

  document.addEventListener("focusin", function (event) {
    if (!active) return;
    var target = event.target.closest(".motion-reveal");
    if (target) show(target, true);
  });

  function syncPreference() {
    if (preference.matches) stop();
    else init();
  }
  if (preference.addEventListener) preference.addEventListener("change", syncPreference);
  else if (preference.addListener) preference.addListener(syncPreference);

  /* Test/debug entry points; no scroll listeners, timers or page-wide reveal. */
  window.LandingMotion = { init: init, refresh: scheduleDiscovery, stop: stop };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
