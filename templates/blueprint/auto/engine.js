/* ============================================================================
 * Instagram Growth Blueprint — RENDER ENGINE  (do not edit per client)
 * Shared helpers, tone→colour maps, and all chart geometry computed from the
 * scores in data.js. Page builders live in pages-*.js and register into
 * window.BP_PAGES; this file assembles them into #app on load.
 * ==========================================================================*/
(function () {
  "use strict";

  var BP = (window.BP = window.BP || {});

  /* ---- token interpolation: {handle} {city} {client_name} … --------------*/
  BP.fmt = function (str) {
    if (str == null) return "";
    var d = window.BLUEPRINT_DATA;
    return String(str).replace(/\{([a-z_]+)\}/g, function (m, k) {
      return d[k] != null ? d[k] : m;
    });
  };

  /* ---- tone → colour ------------------------------------------------------*/
  // CSS custom-property name for solid fills / text
  BP.toneVar = function (t) {
    return ({
      red: "var(--danger)", danger: "var(--danger)",
      amber: "var(--warning)", warning: "var(--warning)",
      green: "var(--success)", success: "var(--success)",
      brand: "var(--brand-500)"
    })[t] || "var(--ink-400)";
  };
  // bar fill helper class
  BP.toneBg = function (t) {
    return ({ red: "bg-red", danger: "bg-red", amber: "bg-amber", warning: "bg-amber",
              green: "bg-green", success: "bg-green", brand: "bg-brand" })[t] || "bg-brand";
  };
  // text severity class
  BP.toneSev = function (t) {
    return ({ red: "sev-red", danger: "sev-red", amber: "sev-amber", warning: "sev-amber",
              green: "sev-green", success: "sev-green", brand: "sev-brand" })[t] || "";
  };
  // pill class
  BP.tonePill = function (t) {
    return ({ red: "red", danger: "red", amber: "amber", warning: "amber",
              green: "green", success: "green", brand: "brand" })[t] || "brand";
  };
  // ring arc colour
  BP.ringColor = function (t) {
    return ({ red: "var(--danger)", amber: "var(--warning)", green: "var(--success)",
              brand: "var(--brand-500)" })[t] || "var(--brand-500)";
  };

  /* ---- score ring: conic-gradient style string ---------------------------*/
  // pct 0–100, tone for arc colour, dark=true → translucent track for dark pages
  BP.ringStyle = function (pct, tone, dark) {
    var c = BP.ringColor(tone);
    var track = dark ? "rgba(255,255,255,.12)" : "var(--ink-100)";
    return "conic-gradient(" + c + " 0% " + pct + "%, " + track + " " + pct + "% 100%)";
  };

  /* ---- radar pentagon (P5): 5 scores → SVG ------------------------------*/
  // returns { grid:[outer ring pts], rings:[3 inner pts strings], spokes:[...],
  //           poly:"x,y x,y…", dots:[{x,y}] } using centre 95,95 R 78
  BP.radar = function (scores) {
    var cx = 95, cy = 95, R = 78, N = scores.length;
    function pt(i, r) {
      var a = (-90 + (360 / N) * i) * Math.PI / 180;
      return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) };
    }
    function ringPts(rr) {
      var s = [];
      for (var i = 0; i < N; i++) { var p = pt(i, rr); s.push(p.x + "," + p.y); }
      return s.join(" ");
    }
    var grid = ringPts(R);
    var rings = [ringPts(R * 0.75), ringPts(R * 0.5), ringPts(R * 0.25)];
    var spokes = [];
    for (var i = 0; i < N; i++) { var p = pt(i, R); spokes.push(p.x + "," + p.y); }
    var dots = [], polyArr = [];
    for (var j = 0; j < N; j++) {
      var d = pt(j, R * (Math.max(0, Math.min(100, scores[j])) / 100));
      dots.push(d); polyArr.push(d.x + "," + d.y);
    }
    return { cx: cx, cy: cy, R: R, grid: grid, rings: rings, spokes: spokes,
             poly: polyArr.join(" "), dots: dots, labelPts: spokes };
  };

  /* ---- opportunity ladder (P3): pillar scores + target → bar heights -----*/
  BP.ladder = function (pillars, target) {
    var bars = pillars.slice(0, 4).map(function (p) {
      return { score: p.score, h: Math.max(p.score, 24), tone: p.chip_tone,
               name: p.name, locked: p.score < 10 };
    });
    bars.push({ score: target, h: Math.min(target + 24, 100), tone: "green",
                name: "30-day power level", isTarget: true });
    return bars;
  };

  /* ---- standings bars (P10): value → width% against scale_max ------------*/
  BP.barPct = function (value, max) {
    return Math.max(0, Math.min(100, (value / (max || 5)) * 100));
  };

  /* ---- escape (for plain-text fields used in attributes) -----------------*/
  BP.esc = function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  /* ---- shared chrome ------------------------------------------------------*/
  BP.foot = function (n) {
    return '<div class="pfoot"><span class="brandmark"><img src="assets/botlogix-logo.png" alt="BotLogix"> ' +
      '<span style="opacity:.85;">Instagram Growth Blueprint</span></span><span>' +
      (n < 10 ? "0" + n : n) + " / 20</span></div>";
  };
  BP.head = function (sec, doc) {
    return '<div class="phead"><span class="sec">' + sec + '</span><span class="doc">' + doc + "</span></div>";
  };

  /* ---- mount --------------------------------------------------------------*/
  BP.mount = function () {
    var d = window.BLUEPRINT_DATA;
    if (!d) { console.error("BLUEPRINT_DATA missing — check data.js"); return; }
    document.title = "Instagram Growth Blueprint — " + d.client_name;
    var html = (window.BP_PAGES || []).map(function (fn) {
      try { return fn(d); }
      catch (e) { console.error("Page render error:", e); return '<section class="page"><pre style="padding:20px;color:#b00;">' + BP.esc(e.message) + "</pre></section>"; }
    }).join("\n");
    var app = document.getElementById("app");
    app.innerHTML = html;
    // auto-print variant
    if (/[?&]print/.test(location.search)) setTimeout(function () { window.print(); }, 600);
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", BP.mount);
  else BP.mount();
})();
