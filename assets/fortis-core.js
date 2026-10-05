/*!
 * Fortis calculators – shared core
 * Pricing, lead capture, PDF loading, analytics and embed support for all three calculators.
 * Edit prices and the lead endpoint in CONFIG below. Nothing else needs to change.
 */
(function () {
  "use strict";

  var CONFIG = {
    pricing_version: "2026-10-v2",

    // POST endpoint for leads (Make.com / Zapier / HubSpot / CRM webhook). Empty = demo mode (no data sent).
    lead_endpoint: "",
    // "json" sends Content-Type: application/json (needs CORS on the endpoint).
    // "text" sends the same JSON as text/plain, which avoids a CORS preflight (works with most webhooks).
    lead_format: "text",
    lead_timeout_ms: 8000,

    site: "https://fortisamlconsulting.com",
    contact_url: "https://fortisamlconsulting.com/contact-us/",
    privacy_url: "https://fortisamlconsulting.com/privacy-policy/",

    jspdf: {
      url: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      integrity: "sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA=="
    },

    /* ---------- One-time setup services (CAD) ---------- */
    setup: {
      assessment:   { name: "Regulatory & Business Model Assessment", price: 2500 },
      registration: { name: "FINTRAC MSB Registration", price: 5000 },
      policies:     { name: "AML/ATF Policies & Procedures", price: 10000 },
      ewra:         { name: "Enterprise-Wide Risk Assessment", price: 5000 },
      clientrisk:   { name: "Client Risk Assessment Methodology", price: 3500 },
      kyc:          { name: "KYC / KYB & Beneficial Ownership Procedures", price: 3500 },
      tm:           { name: "Transaction Monitoring Framework", price: 5000 },
      kyt:          { name: "Crypto KYT / Blockchain Monitoring Framework", price: 5000 },
      sanctions:    { name: "Sanctions, PEP & HIO Framework", price: 3500 },
      str:          { name: "STR & Regulatory Reporting Procedures", price: 3500 },
      travel:       { name: "Travel Rule Procedures", price: 2500 },
      records:      { name: "Record Keeping Framework", price: 2500 },
      training:     { name: "AML Compliance Training", price: 2500 },
      forms:        { name: "Compliance Forms & Templates", price: 2500 },
      banking:      { name: "Banking / Banking Partner Readiness", price: 5000 },
      tech:         { name: "Compliance Technology Implementation Support", price: 5000, from: true }
    },
    package: {
      name: "Complete Crypto Compliance Program", price: 25000,
      includes: ["assessment", "registration", "policies", "ewra", "clientrisk", "kyc", "tm", "kyt", "sanctions", "str", "travel", "records", "training", "forms"]
    },

    /* ---------- Monthly support (CAD / month) ---------- */
    monthly: {
      camlo:      { name: "Fractional CAMLO", price: 5000, from: true },
      enhanced:   { name: "Enhanced Fractional CAMLO", price: 7500 },
      full:       { name: "Full-Service Fractional CAMLO", price: 10000 },
      advisory:   { name: "Ongoing AML Compliance Advisory", price: 2500, from: true },
      outsourced: { name: "Fully Outsourced Crypto Compliance Function", price: 10000, from: true }
    },
    addons: [
      { id: "gap", name: "Compliance Gap Assessment" },
      { id: "exam", name: "FINTRAC Examination Preparation" },
      { id: "remediation", name: "Remediation Support" },
      { id: "review", name: "Independent Effectiveness Review" }
    ],
    higher_risk_services: ["custody", "otc", "crypto_to_fiat", "transfers"],

    /* ---------- Savings calculator ---------- */
    savings: {
      default_salary: 147000,     // PayScale 2026 median, CCO with AML skills, Toronto
      salary_min: 80000,
      salary_max: 250000,
      benefits_load: 0.20,        // payroll taxes + benefits, % of salary
      recruiting_fee: 0.20,       // one-time recruiter fee, % of salary
      annual_raise: 0.03,         // used for the 3-year view
      tiers: { under_1m: "camlo", "1m_5m": "enhanced", "5m_25m": "full", "25m_plus": "full" },
      setup: {
        none:    { name: "Complete Crypto Compliance Program", price: 25000 },
        partial: { name: "Targeted program build", price: 22500 },
        yes:     { name: "Regulatory & Business Model Assessment", price: 2500 }
      }
    }
  };

  var F = (window.Fortis = { CONFIG: CONFIG, name: "fortis" });
  var root = document.documentElement;
  var params = new URLSearchParams(location.search);
  F.params = params;

  /* ---------- Embed / theme detection (runs before first paint) ---------- */
  var inFrame;
  try { inFrame = window.self !== window.top; } catch (e) { inFrame = true; }
  F.inFrame = inFrame;
  F.embed = inFrame || params.get("embed") === "1";
  if (F.embed) root.classList.add("embed");
  if (params.get("header") === "1") root.classList.add("show-header");
  if (params.get("bg") === "transparent") root.classList.add("bg-transparent");
  var theme = params.get("theme");
  if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);

  /* ---------- Small helpers ---------- */
  F.$ = function (id) { return document.getElementById(id); };
  F.fmt = function (n) { return "$" + Math.round(n).toLocaleString("en-CA"); };
  F.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  F.reducedMotion = function () {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };
  F.emailOk = function (s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); };
  F.today = function () {
    return new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  };

  /* ---------- Messaging to the host page (iframe embeds) ---------- */
  function post(type, data) {
    if (!inFrame) return;
    try {
      window.parent.postMessage(Object.assign({ source: "fortis-calculator", type: type, calculator: F.name }, data || {}), "*");
    } catch (e) {}
  }
  F.post = post;

  /* Analytics: GTM dataLayer inside the page + forwarded to the host page (no personal data). */
  F.track = function (ev, data) {
    var payload = Object.assign({ event: ev, calculator: F.name }, data || {});
    try { (window.dataLayer = window.dataLayer || []).push(payload); } catch (e) {}
    post("event", { event: ev, data: data || {} });
  };

  /* ---------- Auto-height for iframe embeds ---------- */
  var lastH = 0, openSheet = null;
  function measure() {
    var wrap = document.querySelector(".wrap");
    var h = wrap ? wrap.getBoundingClientRect().bottom + window.scrollY : document.body.scrollHeight;
    if (openSheet) h = Math.max(h, openSheet.getBoundingClientRect().bottom + window.scrollY + 24);
    return Math.ceil(h);
  }
  F.sendSize = function () {
    if (!inFrame) return;
    var h = measure();
    if (Math.abs(h - lastH) > 1) { lastH = h; post("resize", { height: h }); }
  };
  function startResize() {
    if (!inFrame) return;
    F.sendSize();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { F.sendSize(); });
      ro.observe(document.body);
      var wrap = document.querySelector(".wrap");
      if (wrap) ro.observe(wrap);
    }
    window.addEventListener("load", F.sendSize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(F.sendSize);
  }
  F.scrollIntoView = function (el) {
    if (!el) return;
    if (inFrame) {
      post("scroll", { top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 16) });
    } else {
      el.scrollIntoView({ behavior: F.reducedMotion() ? "auto" : "smooth", block: "start" });
    }
  };

  /* ---------- Toast ---------- */
  var toastT;
  F.toast = function (t) {
    var el = F.$("toast");
    if (!el) return;
    el.textContent = t;
    el.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove("show"); }, 2800);
  };

  /* ---------- Animated number ---------- */
  F.countTo = function (el, to, format) {
    format = format || F.fmt;
    var from = el._v == null ? 0 : el._v;
    el._v = to;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (F.reducedMotion() || from === to || document.hidden) { el.textContent = format(to); return; }
    var t0 = performance.now(), dur = 450;
    (function step(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = format(from + (to - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    })(t0);
  };

  /* ---------- Copy to clipboard ---------- */
  F.copy = function (text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      return ok ? Promise.resolve() : Promise.reject();
    }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(fallback);
    return fallback();
  };
  /* Link to the standalone page (never the embed URL) with state in the hash. */
  F.shareUrl = function (hash) {
    return location.origin + location.pathname + (hash ? "#" + hash : "");
  };

  /* ---------- Source / attribution ---------- */
  F.source = function () {
    var o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"].forEach(function (k) {
      if (params.get(k)) o[k] = params.get(k);
    });
    o.page = params.get("host_page") || location.href.split("#")[0].split("?")[0];
    o.calculator_url = location.origin + location.pathname;
    o.referrer = params.get("host_ref") || document.referrer || "";
    o.embedded = F.embed;
    return o;
  };

  /* ---------- Lead submission ---------- */
  F.sendLead = function (data) {
    post("lead", { intent: data.intent }); // host page gets the event only, never the personal data
    var url = CONFIG.lead_endpoint;
    if (!url) return Promise.resolve({ ok: false, demo: true });
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, CONFIG.lead_timeout_ms) : null;
    var json = CONFIG.lead_format === "json";
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": json ? "application/json" : "text/plain;charset=UTF-8" },
      body: JSON.stringify(data),
      signal: ctl ? ctl.signal : undefined,
      keepalive: true
    }).then(function (r) { return { ok: r.ok }; })
      .catch(function () { return { ok: false }; })
      .then(function (r) { if (timer) clearTimeout(timer); return r; });
  };

  /* ---------- Form validation helpers ---------- */
  F.setErr = function (id, msg) {
    var el = F.$(id), f = el.closest(".f");
    if (f) {
      f.classList.toggle("bad", !!msg);
      var e = f.querySelector(".err");
      if (e) { e.textContent = msg || ""; if (!e.id) e.id = id + "-err"; }
      if (msg && e) el.setAttribute("aria-describedby", e.id); else el.removeAttribute("aria-describedby");
    }
    if (msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
  };

  /* ---------- Accessible modal with focus trap ---------- */
  F.modal = function (el) {
    var sheet = el.querySelector(".sheet"), lastFocus = null, open = false;
    function focusables() {
      return [].filter.call(
        el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select,textarea'),
        function (x) { return x.offsetParent !== null; }
      );
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(); if (!f.length) return;
      var a = f[0], b = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    }
    function show(trigger) {
      lastFocus = trigger || document.activeElement;
      el.classList.add("open");
      open = true;
      if (F.embed) {
        // Inside an iframe the page is as tall as its content, so place the sheet near the button
        // and ask the host page to scroll it into view.
        var t = trigger && trigger.getBoundingClientRect ? trigger.getBoundingClientRect().top + window.scrollY : 0;
        var limit = measure() - sheet.offsetHeight - 24; // keep the sheet inside the current content height
        var top = Math.max(16, Math.min(t - 240, limit));
        sheet.style.marginTop = top + "px";
        openSheet = sheet;
        F.sendSize();
        post("scroll", { top: Math.max(0, top - 16) });
      } else {
        document.body.style.overflow = "hidden";
      }
      document.addEventListener("keydown", onKey);
      setTimeout(function () {
        var first = el.querySelector('form:not(.hide) input:not([type=checkbox]):not([tabindex="-1"])');
        (first && first.offsetParent !== null ? first : sheet).focus({ preventScroll: F.embed });
      }, 40);
    }
    function close() {
      if (!open) return;
      open = false;
      el.classList.remove("open");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      sheet.style.marginTop = "";
      openSheet = null;
      F.sendSize();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: F.embed });
    }
    sheet.setAttribute("tabindex", "-1");
    el.addEventListener("click", function (e) { if (e.target === el) close(); });
    el.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", close); });
    return { open: show, close: close, isOpen: function () { return open; } };
  };

  /* ---------- PDF (jsPDF is loaded only when needed) ---------- */
  var pdfPromise = null;
  F.loadPdf = function () {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (pdfPromise) return pdfPromise;
    pdfPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = CONFIG.jspdf.url;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.referrerPolicy = "no-referrer";
      if (CONFIG.jspdf.integrity) s.integrity = CONFIG.jspdf.integrity;
      s.onload = function () {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else { pdfPromise = null; reject(new Error("jsPDF missing")); }
      };
      s.onerror = function () { pdfPromise = null; reject(new Error("jsPDF failed to load")); };
      document.head.appendChild(s);
    });
    return pdfPromise;
  };
  F.PDF = { navy: [15, 27, 51], gold: [184, 137, 59], muted: [94, 107, 126], red: [179, 38, 30], line: [227, 231, 237], tint: [251, 245, 234] };
  /* jsPDF's built-in fonts only cover Latin-1: replace typographic characters it cannot draw. */
  F.pdfText = function (s) {
    return String(s == null ? "" : s)
      .replace(/[‒-―]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/…/g, "...").replace(/→/g, "->").replace(/[^\x00-\xFF]/g, "");
  };
  F.pdfHeader = function (doc, title, H) {
    var C = F.PDF, W = 612, M = 48;
    H = H || 84;
    doc.setFillColor.apply(doc, C.navy); doc.rect(0, 0, W, H, "F");
    doc.setFillColor.apply(doc, C.gold); doc.rect(0, H, W, 3, "F");
    doc.setTextColor.apply(doc, C.gold); doc.setFont("times", "bold"); doc.setFontSize(25); doc.text("FORTIS", M, H / 2 + 4);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text("COMPLIANCE SHIELD PARTNERS", M, H / 2 + 17);
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(F.pdfText(title), W - M, H / 2 + 4, { align: "right" });
    doc.text(F.today(), W - M, H / 2 + 17, { align: "right" });
  };
  F.pdfCta = function (doc, y, title, sub) {
    var C = F.PDF, W = 612, M = 48;
    doc.setFillColor.apply(doc, C.tint); doc.roundedRect(M, y, W - 2 * M, 66, 8, 8, "F");
    doc.setFillColor.apply(doc, C.gold); doc.rect(M, y, 4, 66, "F");
    doc.setTextColor.apply(doc, C.navy); doc.setFont("times", "bold"); doc.setFontSize(14); doc.text(F.pdfText(title), M + 18, y + 24);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(F.pdfText(sub), M + 18, y + 40);
    doc.setTextColor.apply(doc, C.gold); doc.setFont("helvetica", "bold");
    doc.textWithLink(CONFIG.contact_url, M + 18, y + 55, { url: CONFIG.contact_url });
    return y + 66;
  };
  F.pdfFooter = function (doc, text) {
    var C = F.PDF, W = 612, Hp = 792, M = 48, pages = doc.getNumberOfPages();
    for (var i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor.apply(doc, C.line); doc.line(M, Hp - 50, W - M, Hp - 50);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor.apply(doc, C.muted);
      doc.text(doc.splitTextToSize(F.pdfText(text + " Pricing version " + CONFIG.pricing_version + ". Page " + i + " of " + pages + "."), W - 2 * M), M, Hp - 38);
    }
  };
  F.download = function (blob, filename) {
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000);
  };
  F.safeFile = function (s) { return String(s || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); };

  /* ---------- Page bootstrap ---------- */
  F.init = function (name) {
    F.name = name;
    startResize();
    // Warm up jsPDF when the user shows intent, so the download is instant.
    document.querySelectorAll("[data-pdf]").forEach(function (b) {
      ["pointerenter", "focus", "touchstart"].forEach(function (ev) {
        b.addEventListener(ev, function () { F.loadPdf().catch(function () {}); }, { once: true, passive: true });
      });
    });
    document.querySelectorAll("[data-ev]").forEach(function (a) {
      a.addEventListener("click", function () { F.track(a.getAttribute("data-ev")); });
    });
    post("ready", { height: measure() });
  };
})();
