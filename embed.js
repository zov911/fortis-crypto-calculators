/*!
 * Fortis calculators – embed loader
 *
 *   <div data-fortis-calculator="cost"></div>        cost | readiness | savings
 *   <script src="https://zov911.github.io/fortis-crypto-calculators/embed.js" async></script>
 *
 * Optional attributes on the <div>:
 *   data-theme="light|dark"        force a colour scheme (default: follows the visitor's system setting)
 *   data-header="true"             show the Fortis brand bar inside the calculator (hidden by default when embedded)
 *   data-transparent="true"        transparent page background
 *   data-scroll-offset="80"        height of a sticky site header, so pop-ups are not hidden under it
 *   data-min-height="640"          height reserved before the calculator loads (avoids layout shift)
 *
 * The iframe resizes itself to its content. Calculator events are pushed to the host page's
 * window.dataLayer (prefixed "fortis_") and dispatched as "fortis:event" / "fortis:lead" DOM events.
 */
(function () {
  "use strict";
  if (window.FortisCalculators && window.FortisCalculators.__loaded) { window.FortisCalculators.scan(); return; }

  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/embed\.js(\?.*)?$/, "") : "https://zov911.github.io/fortis-crypto-calculators/";
  var ORIGIN = new URL(BASE, location.href).origin;
  var CALCS = {
    cost:      { path: "cost/",      title: "Crypto Compliance Cost Calculator – Fortis",      min: 1500 },
    readiness: { path: "readiness/", title: "Crypto Compliance Readiness Scorecard – Fortis", min: 760 },
    savings:   { path: "savings/",   title: "Compliance Savings Calculator – Fortis",          min: 900 }
  };
  var frames = [];

  function truthy(v) { return v === "" || v === "true" || v === "1" || v === "yes"; }

  function mount(el) {
    if (!el || el.__fortisMounted) return;
    var name = (el.getAttribute("data-fortis-calculator") || "").toLowerCase();
    var cfg = CALCS[name];
    if (!cfg) { if (window.console) console.warn("[Fortis] Unknown calculator:", name); return; }
    el.__fortisMounted = true;

    var q = new URLSearchParams();
    q.set("embed", "1");
    var theme = el.getAttribute("data-theme");
    if (theme === "light" || theme === "dark") q.set("theme", theme);
    if (truthy(el.getAttribute("data-header"))) q.set("header", "1");
    if (truthy(el.getAttribute("data-transparent"))) q.set("bg", "transparent");
    // Pass campaign attribution from the host page through to the lead payload
    var hp = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"].forEach(function (k) {
      if (hp.get(k)) q.set(k, hp.get(k));
    });
    q.set("host_page", location.href.split("#")[0]);
    if (document.referrer) q.set("host_ref", document.referrer);

    var f = document.createElement("iframe");
    f.src = BASE + cfg.path + "?" + q.toString();
    f.title = el.getAttribute("data-title") || cfg.title;
    f.setAttribute("scrolling", "no");
    f.setAttribute("allow", "clipboard-write");
    f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    f.style.cssText = "display:block;width:100%;border:0;overflow:hidden;background:transparent;min-height:" +
      (parseInt(el.getAttribute("data-min-height"), 10) || cfg.min) + "px";
    f.__fortisHost = el;
    el.appendChild(f);
    frames.push(f);
  }

  function frameFor(source) {
    for (var i = 0; i < frames.length; i++) if (frames[i].contentWindow === source) return frames[i];
    return null;
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN) return;
    var d = e.data;
    if (!d || d.source !== "fortis-calculator") return;
    var f = frameFor(e.source);
    if (!f) return;
    var host = f.__fortisHost;

    if ((d.type === "resize" || d.type === "ready") && d.height > 0) {
      f.style.height = Math.ceil(d.height) + "px";
      f.style.minHeight = "0";
    } else if (d.type === "scroll") {
      var off = parseInt(host.getAttribute("data-scroll-offset"), 10);
      if (isNaN(off)) off = 80;
      var top = f.getBoundingClientRect().top + window.pageYOffset + (d.top || 0) - off;
      var smooth = !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
    } else if (d.type === "event" || d.type === "lead") {
      var payload = d.type === "lead"
        ? { event: "fortis_lead_submitted", fortis_calculator: d.calculator, fortis_intent: d.intent }
        : Object.assign({ event: "fortis_" + d.event, fortis_calculator: d.calculator }, d.data || {});
      try { (window.dataLayer = window.dataLayer || []).push(payload); } catch (err) {}
      try {
        host.dispatchEvent(new CustomEvent(d.type === "lead" ? "fortis:lead" : "fortis:event", { detail: d, bubbles: true }));
      } catch (err) {}
    }
  });

  function scan() { document.querySelectorAll("[data-fortis-calculator]").forEach(mount); }

  window.FortisCalculators = { __loaded: true, scan: scan, mount: mount, base: BASE };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
  else scan();
})();
