(function () {
  "use strict";

  var C = window.ESTUDIO || {};
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Datos de contacto desde config.js ---------- */
  function waLink(number, text) {
    return "https://wa.me/" + number + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  function applyConfig() {
    var google = C.google || {};
    var hrefs = {
      tel: C.telefono && "tel:" + C.telefono.enlace,
      email: C.email && "mailto:" + C.email,
      whatsapp: C.whatsapp && waLink(C.whatsapp),
      maps: google.ficha,
      google: google.ficha,
      review: google.escribirResena || google.ficha
    };
    var texts = {
      tel: C.telefono && C.telefono.visible,
      email: C.email,
      rating: google.puntuacion,
      dir1: C.direccion && C.direccion.linea1,
      dir2: C.direccion && C.direccion.linea2,
      dias: C.horario && C.horario.dias,
      horas: C.horario && C.horario.horas
    };
    $$("[data-contact]").forEach(function (el) {
      var value = hrefs[el.getAttribute("data-contact")];
      if (value) el.setAttribute("href", value);
    });
    $$("[data-contact-text]").forEach(function (el) {
      var value = texts[el.getAttribute("data-contact-text")];
      if (value) el.textContent = value;
    });
    $$('.form-actions button[type="submit"]').forEach(function (button) {
      var available = button.value === 'email' ? !!C.email : !!C.whatsapp;
      button.disabled = !available;
      if (available) button.lastChild.textContent = button.value === 'email' ? 'Preparar email' : 'Preparar mensaje en WhatsApp';
    });
    if (C.email || C.whatsapp) $('#dialog-desc').textContent = 'Completá tus datos y prepará tu consulta. Vas a poder revisarla antes de enviarla; el estudio confirmará la cita.';
    var floating = $('.wa-float');
    if (floating && C.whatsapp) {
      floating.setAttribute('aria-label', 'Contactar al estudio por WhatsApp');
      floating.removeAttribute('data-consulta');
      floating.addEventListener('click', function () { window.open(waLink(C.whatsapp), '_blank', 'noopener,noreferrer'); });
    }
  }

  /* ---------- Perfiles de los socios ---------- */
  function renderPartners() {
    var socios = C.socios || {};
    $$("[data-socio]").forEach(function (card) {
      var key = card.getAttribute("data-socio");
      var data = socios[key];
      var box = $("[data-person-actions]", card);
      if (!data || !box) return;

      box.replaceChildren();
      box.appendChild(partnerAction(data.whatsapp ? waLink(data.whatsapp) : null, "WhatsApp", "i-whatsapp", "btn btn-ghost btn-sm btn-wa", data.nombre));
      box.appendChild(partnerAction(data.email ? "mailto:" + data.email : null, "Email", "i-mail", "btn btn-ghost btn-sm", data.nombre));
      var linkedin = $("[data-person-linkedin]", card);
      if (linkedin) linkedin.replaceChildren(partnerAction(data.linkedin, "", "i-linkedin", "linkedin-btn", "LinkedIn de " + data.nombre));
    });
  }

  function partnerAction(href, label, icon, className, name) {
    if (href) return actionLink(href, label, icon, className, label ? label + " de " + name : name);
    var button = document.createElement("button");
    button.type = "button";
    button.disabled = true;
    button.className = className;
    button.title = (label || "LinkedIn") + " pendiente de conectar";
    button.setAttribute("aria-label", (label || "LinkedIn") + ", pendiente de conectar");
    button.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + icon + '"/></svg>';
    if (label) button.appendChild(document.createTextNode(label));
    return button;
  }

  function actionLink(href, label, icon, className, aria) {
    var a = document.createElement("a");
    a.className = className;
    a.href = href;
    if (href.indexOf("http") === 0) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
    a.setAttribute("aria-label", aria);
    a.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + icon + '"/></svg>';
    a.appendChild(document.createTextNode(label));
    return a;
  }

  /* ---------- Encabezado ---------- */
  var header = $("#header");
  function onScroll() {
    header.classList.toggle("is-solid", window.scrollY > 24);
  }

  /* ---------- Menú móvil ---------- */
  var menuBtn = $(".menu-toggle");
  var nav = $("#navegacion");
  var menuLabel = $("[data-menu-label]");
  var mqDesktop = window.matchMedia("(min-width: 921px)");

  function setMenu(open, restoreFocus) {
    root.classList.toggle("menu-open", open);
    document.body.classList.toggle("is-locked", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? "Cerrar menú" : "Abrir menú";
    updateFloat();
    if (open) {
      var first = $("a", nav);
      if (first) first.focus();
    } else if (restoreFocus) {
      menuBtn.focus();
    }
  }
  function isMenuOpen() { return root.classList.contains("menu-open"); }

  menuBtn.addEventListener("click", function () { setMenu(!isMenuOpen(), true); });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a") && isMenuOpen()) setMenu(false, false);
  });
  document.addEventListener("keydown", function (e) {
    if (!isMenuOpen()) return;
    if (e.key === "Escape") { setMenu(false, true); return; }
    if (e.key === "Tab") trapFocus(e, [header]);
  });
  document.addEventListener("click", function (e) {
    if (isMenuOpen() && !header.contains(e.target)) setMenu(false, false);
  });
  mqDesktop.addEventListener("change", function (e) { if (e.matches && isMenuOpen()) setMenu(false, false); });

  /* ---------- Sección activa en el menú ---------- */
  function initActiveNav() {
    var links = $$(".nav-list a");
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var link = map[entry.target.id];
        if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- Carrusel de clientes ---------- */
  function initMarquee() {
    var marquee = $("[data-marquee]");
    if (!marquee) return;
    var list = $(".marquee-list", marquee);
    var track = null;

    function start() {
      if (track) return;
      track = document.createElement("div");
      track.className = "marquee-track";
      marquee.insertBefore(track, list);
      track.appendChild(list);
      var copy = list.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      $$("a, button", copy).forEach(function (el) { el.setAttribute("tabindex", "-1"); });
      track.appendChild(copy);
      marquee.classList.add("is-running");
      var width = list.getBoundingClientRect().width;
      marquee.style.setProperty("--marquee-duration", Math.max(24, Math.round(width / 40)) + "s");
    }
    function stop() {
      if (!track) return;
      marquee.insertBefore(list, track);
      track.remove();
      track = null;
      marquee.classList.remove("is-running", "is-paused");
    }
    function sync() { if (reduceMotion.matches) stop(); else start(); }
    reduceMotion.addEventListener("change", sync);
    sync();
  }

  /* ---------- WhatsApp flotante ---------- */
  var floatBtn = $(".wa-float");
  var floatBlocked = false;
  function updateFloat() {
    if (!floatBtn) return;
    var dialogOpen = dialog && dialog.open;
    floatBtn.classList.toggle("is-hidden", floatBlocked || isMenuOpen() || dialogOpen);
  }
  function initFloat() {
    if (!floatBtn || !("IntersectionObserver" in window)) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      floatBlocked = visible.size > 0;
      updateFloat();
    }, { threshold: 0.05 });
    [$("#contacto"), $(".footer")].forEach(function (el) { if (el) io.observe(el); });
  }

  /* ---------- Foco contenido ---------- */
  function focusables(containers) {
    var sel = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    var out = [];
    containers.forEach(function (c) {
      $$(sel, c).forEach(function (el) { if (el.offsetParent !== null || el === document.activeElement) out.push(el); });
    });
    return out;
  }
  function trapFocus(e, containers) {
    var els = focusables(containers);
    if (!els.length) return;
    var first = els[0], last = els[els.length - 1];
    var inside = containers.some(function (c) { return c.contains(document.activeElement); });
    if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Formulario de consulta ---------- */
  var dialog = $("#consulta");
  var form = $("#consulta-form");
  var areaSelect = $("#f-area");
  var socioInput = $("#f-socio");
  var socioNote = $("#socio-note");
  var status = $("#form-status");
  var counter = $("[data-count]", form);
  var opener = null;
  var attempted = false;

  function openDialog(trigger) {
    opener = trigger || document.activeElement;
    var area = trigger ? trigger.getAttribute("data-consulta") : "";
    var socioKey = trigger ? trigger.getAttribute("data-socio-ref") : "";
    var socio = socioKey && C.socios ? C.socios[socioKey] : null;

    areaSelect.value = area || "Otra consulta";
    socioInput.value = socio ? socio.nombre : "";
    if (socio) {
      socioNote.innerHTML = "";
      socioNote.appendChild(document.createTextNode("Consulta dirigida a "));
      var strong = document.createElement("strong");
      strong.textContent = socio.nombre;
      socioNote.appendChild(strong);
      socioNote.appendChild(document.createTextNode(". La recibe el contacto general del estudio, que la deriva al profesional."));
      socioNote.hidden = false;
    } else {
      socioNote.hidden = true;
    }
    status.textContent = "";
    status.className = "form-status";

    if (isMenuOpen()) setMenu(false, false);
    dialog.showModal();
    document.body.classList.add("is-locked");
    updateFloat();

    var coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) $("#dialog-title").focus();
    else $("#f-nombre").focus();
  }

  function closeDialog() {
    if (!dialog.open) return;
    dialog.close();
  }

  dialog.addEventListener("close", function () {
    document.body.classList.remove("is-locked");
    updateFloat();
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  });
  dialog.addEventListener("cancel", function (e) { e.preventDefault(); closeDialog(); });
  dialog.addEventListener("keydown", function (e) { if (e.key === "Tab") trapFocus(e, [dialog]); });
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) closeDialog();
    if (e.target.closest("[data-close]")) closeDialog();
  });

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-consulta]");
    if (!trigger || dialog.contains(trigger)) return;
    e.preventDefault();
    openDialog(trigger);
  });

  var rules = {
    nombre: function (v) { return v.trim().length >= 3 ? "" : "Ingresá tu nombre y apellido."; },
    telefono: function (v) {
      var digits = v.replace(/\D/g, "");
      if (!digits) return "Ingresá un número de WhatsApp.";
      return digits.length >= 8 && digits.length <= 15 ? "" : "Revisá el número: incluí el código de área (ej.: 351 123 4567).";
    },
    email: function (v) {
      if (!v.trim()) return "Ingresá tu email.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Revisá el formato del email (ej.: nombre@correo.com).";
    },
    area: function (v) { return v ? "" : "Elegí el motivo de tu consulta."; },
    caso: function (v) { return v.trim().length >= 15 ? "" : "Contanos un poco más (al menos 15 caracteres)."; }
  };

  function validateField(el) {
    var rule = rules[el.name];
    if (!rule) return true;
    var msg = rule(el.value);
    var err = document.getElementById("e-" + el.name);
    if (msg) { el.setAttribute("aria-invalid", "true"); err.textContent = msg; err.hidden = false; }
    else { el.removeAttribute("aria-invalid"); err.textContent = ""; err.hidden = true; }
    return !msg;
  }

  $$("input, select, textarea", form).forEach(function (el) {
    el.addEventListener("blur", function () { if (attempted || el.value) validateField(el); });
    el.addEventListener("input", function () { if (el.getAttribute("aria-invalid")) validateField(el); });
  });
  form.caso.addEventListener("input", function () { counter.textContent = form.caso.value.length; });

  function buildMessage(d) {
    var lines = [
      "Hola, quisiera solicitar una cita con el Estudio Jurídico Bonzani Rinaldi.",
      "",
      "Nombre y apellido: " + d.nombre,
      "WhatsApp: " + d.telefono,
      "Email: " + d.email,
      "Motivo de consulta: " + d.area
    ];
    if (d.socio) lines.push("Profesional: " + d.socio);
    lines.push("", "Descripción del caso:", d.caso, "", "Quedo a la espera de su respuesta para coordinar día y horario.");
    return lines.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    attempted = true;
    var channel = e.submitter && e.submitter.value === "email" ? "email" : "whatsapp";
    if (!(channel === 'email' ? C.email : C.whatsapp)) {
      status.className = 'form-status';
      status.textContent = 'Este canal de contacto estará disponible próximamente.';
      return;
    }
    var fields = ["nombre", "telefono", "email", "area", "caso"].map(function (n) { return form.elements[n]; });
    var invalid = fields.filter(function (el) { return !validateField(el); });
    if (invalid.length) {
      status.className = "form-status is-error";
      status.textContent = invalid.length === 1 ? "Revisá el campo marcado." : "Revisá los " + invalid.length + " campos marcados.";
      invalid[0].focus();
      return;
    }

    var data = {
      nombre: form.nombre.value.trim(),
      telefono: form.telefono.value.trim(),
      email: form.email.value.trim(),
      area: form.area.value,
      caso: form.caso.value.trim(),
      socio: socioInput.value
    };
    var text = buildMessage(data);

    if (channel === "whatsapp") {
      var win = window.open(waLink(C.whatsapp, text), "_blank");
      if (win) win.opener = null;
      else window.location.href = waLink(C.whatsapp, text);
      status.className = "form-status is-ok";
      status.textContent = "Abrimos WhatsApp con tu consulta escrita. Todavía no fue enviada: revisala y tocá Enviar. El estudio te responderá para confirmar día y horario.";
    } else {
      var subject = "Solicitud de cita · " + data.area + " · " + data.nombre;
      window.location.href = "mailto:" + C.email +
        "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
      status.className = "form-status is-ok";
      status.textContent = "Preparamos el email en tu programa de correo. Todavía no fue enviado: revisalo y envialo desde ahí.";
    }
  });

  /* ---------- Inicio ---------- */
  applyConfig();
  renderPartners();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  initActiveNav();
  initMarquee();
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
  window.__landingReady = true;
})();
