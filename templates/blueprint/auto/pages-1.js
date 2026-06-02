/* Instagram Growth Blueprint — page builders P1–P5 */
(function () {
  var BP = window.BP, P = (window.BP_PAGES = window.BP_PAGES || []);
  var br1 = function (s) { return String(s).replace(" ", "<br>"); };

  /* ---- P1 · COVER --------------------------------------------------------*/
  P.push(function (d) {
    return '<section class="page dark" data-screen-label="01 Cover" style="padding:0;">' +
      '<div style="position:absolute;inset:0;background:var(--grad-deep);"></div>' +
      '<div style="position:absolute;top:-120px;right:-120px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(42,143,214,.34),transparent 66%);"></div>' +
      '<div style="position:absolute;bottom:-160px;left:-120px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(91,200,232,.16),transparent 66%);"></div>' +
      '<div style="position:relative;height:100%;display:flex;flex-direction:column;padding:24mm 20mm 18mm;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<img src="assets/botlogix-logo.png" alt="BotLogix" style="height:80px;width:auto;">' +
          '<span class="mono" style="font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.55);">Social Growth Studio</span>' +
        '</div>' +
        '<div style="margin-top:15mm;">' +
          '<p class="eyebrow" style="color:var(--brand-300);">Instagram Growth Audit &nbsp;·&nbsp; 30-Day Execution Blueprint</p>' +
          '<h1 class="display" style="font-size:62px;margin-top:18px;color:#fff;">Your next 30&nbsp;days,<br>mapped inside.</h1>' +
          '<p class="lead" style="color:#AFC4D4;max-width:118mm;margin-top:18px;font-size:15px;">' + BP.fmt(d.narrative.cover_lead) + '</p>' +
          '<div style="display:flex;gap:36px;margin-top:34px;flex-wrap:wrap;">' +
            '<div><p class="mono" style="font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px;">Prepared for</p>' +
              '<p style="color:#EAF1F6;font-size:13px;font-weight:600;margin:0;">' + d.client_name + '</p>' +
              '<p class="small" style="color:#8FA6B7;margin:0;">' + d.client_descriptor + ' · ' + d.region + '</p></div>' +
            '<div><p class="mono" style="font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px;">Prepared by</p>' +
              '<p style="color:#EAF1F6;font-size:13px;font-weight:600;margin:0;">' + d.prepared_by + '</p>' +
              '<p class="small" style="color:#8FA6B7;margin:0;">' + d.prepared_date + ' · Next checkpoint ' + d.checkpoint_date + '</p></div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;display:flex;align-items:center;gap:18px;border-top:1px solid rgba(255,255,255,.12);padding-top:18px;">' +
          '<div style="flex:1;"><p class="mono" style="font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin:0 0 4px;">Current Power Level</p>' +
            '<p style="margin:0;font-family:var(--font-display);font-size:15px;color:#fff;">' + BP.fmt(d.narrative.cover_powerline) + '</p></div>' +
          '<div style="display:flex;align-items:baseline;gap:4px;">' +
            '<span style="font-family:var(--font-display);font-size:64px;font-weight:500;color:#fff;line-height:.9;">' + d.current_score + '</span>' +
            '<span class="mono" style="font-size:13px;color:var(--brand-300);">/100</span></div>' +
        '</div>' +
      '</div></section>';
  });

  /* ---- P2 · THE HOOK -----------------------------------------------------*/
  P.push(function (d) {
    var cards = d.narrative.hook_cards.map(function (c) {
      return '<div style="border-top:2px solid ' + BP.toneVar(c.tone) + ';padding-top:12px;">' +
        '<p class="mono" style="font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);margin:0 0 6px;">' + c.label + '</p>' +
        '<p style="margin:0;color:#EAF1F6;font-size:12px;line-height:1.5;">' + c.text + '</p></div>';
    }).join("");
    return '<section class="page dark" data-screen-label="02 The Hook">' +
      BP.head("The diagnosis", "Instagram Growth Blueprint · " + d.handle) +
      '<div class="body" style="justify-content:center;">' +
        '<p class="eyebrow" style="color:var(--brand-300);">The undeniable truth</p>' +
        '<h1 class="display" style="font-size:36px;margin-top:14px;max-width:150mm;color:#fff;">You\'re scoring <span style="color:var(--warning);">' + d.current_score + ' out of 100</span>. ' + d.narrative.hook_headline_unbuilt + '</h1>' +
        '<div style="display:flex;align-items:center;gap:34px;margin-top:34px;">' +
          '<div class="ring" style="width:150px;height:150px;background:' + BP.ringStyle(d.current_score, "amber", true) + ';">' +
            '<div class="val"><div class="n" style="font-size:46px;color:#fff;">' + d.current_score + '</div><div class="d" style="color:rgba(255,255,255,.5);">/ 100 power</div></div></div>' +
          '<div style="flex:1;">' +
            '<p class="lead" style="color:#B6CAD9;font-size:14.5px;">' + d.narrative.hook_para_1 + '</p>' +
            '<p class="lead" style="color:#B6CAD9;font-size:14.5px;margin-top:14px;">' + d.narrative.hook_para_2 + '</p></div>' +
        '</div>' +
        '<div class="grid3" style="margin-top:40px;">' + cards + '</div>' +
        '<div style="margin-top:38px;display:flex;align-items:center;gap:16px;border-left:3px solid var(--brand-400);padding-left:18px;">' +
          '<p style="margin:0;font-family:var(--font-display);font-style:italic;font-size:18px;color:#fff;line-height:1.35;">“' + d.narrative.hook_quote + '”</p></div>' +
      '</div>' + BP.foot(2) + '</section>';
  });

  /* ---- P3 · EXECUTIVE DASHBOARD -----------------------------------------*/
  P.push(function (d) {
    var cards = d.narrative.dashboard_cards.map(function (c, i) {
      var tint = i === 3 ? " tint" : "";
      return '<div class="card' + tint + '" style="border-top:3px solid ' + BP.toneVar(c.tone) + ';">' +
        '<p class="mono" style="font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:' + BP.toneVar(c.tone) + ';margin:0 0 8px;">' + c.label + '</p>' +
        '<p class="h3" style="font-size:17px;">' + c.title + '</p>' +
        '<p style="margin-top:7px;">' + c.desc + '</p></div>';
    }).join("");
    var grad = { red: "linear-gradient(180deg,#F0B8AC,#E0533B)", amber: "linear-gradient(180deg,#F4DCAE,#E0A030)",
                 green: "linear-gradient(180deg,#7FD3AE,#1FA971)", brand: "linear-gradient(180deg,#A9D6F1,#2A8FD6)" };
    var bars = BP.ladder(d.pillars, d.target_score).map(function (b) {
      var inner = b.locked ? '<span class="mono" style="font-size:7px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;">Locked</span>'
              : b.isTarget ? '<span class="mono" style="font-size:7px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;">Target</span>' : "";
      var pad = inner ? "display:flex;align-items:flex-start;justify-content:center;padding-top:7px;" : "";
      var nameColor = b.isTarget ? "var(--ink-900)" : "var(--ink-800)";
      return '<div style="display:flex;flex-direction:column;justify-content:flex-end;height:100%;">' +
        '<p style="text-align:center;margin:0 0 6px;font-family:var(--font-display);font-size:17px;font-weight:600;color:' + BP.toneVar(b.tone) + ';">' + b.score + '</p>' +
        '<div style="height:' + b.h + '%;border-radius:11px 11px 0 0;background:' + (grad[b.tone] || grad.amber) + ';' + pad + '">' + inner + '</div>' +
        '<p style="text-align:center;margin:8px 0 0;font-size:9.5px;font-weight:700;color:' + nameColor + ';line-height:1.2;">' + br1(b.name) + '</p></div>';
    }).join("");
    return '<section class="page" data-screen-label="03 Executive Dashboard">' +
      BP.head("Section 01 · Executive dashboard", "The 10-second diagnosis") +
      '<div class="body">' +
        '<p class="eyebrow">The short version</p>' +
        '<h2 class="h1" style="margin-top:8px;">Four numbers, then you\'re caught up.</h2>' +
        '<p class="lead" style="margin-top:12px;max-width:150mm;">You\'re busy. So here\'s the whole audit in four cards — the single biggest opportunity, the weakness dragging the score, the win you can land today, and where we\'re taking it in 30 days.</p>' +
        '<div class="grid2" style="margin-top:22px;gap:14px;">' + cards + '</div>' +
        '<div style="margin-top:22px;padding-top:18px;border-top:1px solid var(--ink-200);">' +
          '<p style="display:flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:8px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-400);margin:0 0 14px;"><span style="color:var(--brand-600);">Fig. 01</span> The opportunity ladder — fix the floor and the climb opens up</p>' +
          '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;align-items:end;height:172px;">' + bars + '</div>' +
        '</div>' +
        '<div class="fnote" style="margin-top:20px;"><div class="ic"><img src="assets/botlogix-mascot.png" alt="" style="height:24px;width:auto;"></div>' +
          '<div><p class="lbl">BotLogix field note</p><p>' + d.narrative.dashboard_note + '</p></div></div>' +
      '</div>' + BP.foot(3) + '</section>';
  });

  /* ---- P4 · THE 5-STAGE CHAIN -------------------------------------------*/
  P.push(function (d) {
    var arrow = function (c) { return '<div style="width:20px;align-self:center;display:flex;justify-content:center;"><span style="width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:8px solid ' + c + ';"></span></div>'; };
    var cells = [];
    d.chain.forEach(function (s, i) {
      var two = (i + 1 < 10 ? "0" : "") + (i + 1);
      if (s.bottleneck) {
        cells.push('<div style="flex:1.18;border:1.6px solid var(--danger);border-radius:15px;padding:14px 11px 13px;display:flex;flex-direction:column;text-align:center;background:linear-gradient(180deg,#FCEEEB,#fff 60%);position:relative;">' +
          '<span class="mono" style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);font-size:7px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:var(--danger);border-radius:5px;padding:3px 8px;white-space:nowrap;">Bottleneck</span>' +
          '<span style="font-family:var(--font-display);font-size:30px;font-weight:600;color:var(--danger);line-height:1;margin-top:4px;">' + two + '</span>' +
          '<p class="h3" style="font-size:13px;margin-top:7px;">' + s.name + '</p>' +
          '<p class="small" style="margin-top:4px;font-size:9px;line-height:1.35;">' + s.question + '</p>' +
          '<div class="bar" style="margin-top:9px;height:6px;"><i class="' + BP.toneBg(s.tone) + '" style="width:' + s.score + '%;"></i></div>' +
          '<span class="pill ' + BP.tonePill(s.tone) + '" style="margin-top:9px;align-self:center;font-size:8px;padding:3px 8px;">' + s.status + ' · ' + s.score + '</span></div>');
      } else {
        cells.push('<div style="flex:1;border:1px solid var(--ink-200);border-radius:15px;padding:14px 11px 13px;display:flex;flex-direction:column;text-align:center;background:var(--white);">' +
          '<span style="font-family:var(--font-display);font-size:30px;font-weight:600;color:var(--ink-300);line-height:1;margin-top:4px;">' + two + '</span>' +
          '<p class="h3" style="font-size:13px;margin-top:7px;">' + s.name + '</p>' +
          '<p class="small" style="margin-top:4px;font-size:9px;line-height:1.35;">' + s.question + '</p>' +
          '<div class="bar" style="margin-top:9px;height:6px;"><i class="' + BP.toneBg(s.tone) + '" style="width:' + s.score + '%;"></i></div>' +
          '<span class="pill ' + BP.tonePill(s.tone) + '" style="margin-top:9px;align-self:center;font-size:8px;padding:3px 8px;">' + s.status + ' · ' + s.score + '</span></div>');
      }
      if (i < d.chain.length - 1) cells.push(arrow(s.bottleneck ? "var(--danger)" : "var(--ink-300)"));
    });
    return '<section class="page" data-screen-label="04 The 5-Stage Chain">' +
      BP.head("Section 01 · Executive dashboard", "The growth chain") +
      '<div class="body">' +
        '<p class="eyebrow">The 5-stage chain</p>' +
        '<h2 class="h1" style="margin-top:8px;">Attention moves in one direction.</h2>' +
        '<p class="lead" style="margin-top:12px;max-width:152mm;">Every follower and every sale travels the same five links — in order. A break early in the chain starves everything after it. Here\'s where each link stands today.</p>' +
        '<div style="flex:1 0 16px;"></div>' +
        '<div style="display:flex;align-items:stretch;gap:0;">' + cells.join("") + '</div>' +
        '<div style="margin-top:20px;display:flex;align-items:center;gap:14px;">' +
          '<div style="flex:1;height:10px;border-radius:999px;background:linear-gradient(90deg,var(--danger) 0%,var(--warning) 22%,var(--warning) 100%);position:relative;">' +
            '<span style="position:absolute;left:0;top:-5px;width:20px;height:20px;border-radius:50%;background:var(--danger);border:3px solid #fff;box-shadow:0 0 0 1px var(--danger);"></span></div>' +
          '<span class="mono" style="font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-500);">A break early starves everything after it</span></div>' +
        '<div style="flex:1 0 16px;"></div>' +
        '<div class="fnote amber" style="margin-top:0;"><div class="ic">!</div>' +
          '<div><p class="lbl">Why this matters</p><p>' + d.chain_note + '</p></div></div>' +
      '</div>' + BP.foot(4) + '</section>';
  });

  /* ---- P5 · SECTION 2 DIVIDER + RADAR -----------------------------------*/
  var RADAR_SUB = {
    local_visibility: "Can the right people find you?",
    profile_conversion: "Does the storefront convert a visit to a follow?",
    content_performance: "Does the content earn reach?",
    sales_readiness: "Is there a path from post to conversation?",
    competitor_gap: "How far behind the accounts beside you?"
  };
  // constant label anchor positions around the pentagon (px within 200×190 box)
  var RADAR_LABELS = [
    { top: -2, left: "50%", tx: "translateX(-50%)" },
    { top: 46, left: "158px" }, { top: 168, left: "126px" },
    { top: 168, left: "14px" }, { top: 46, left: "-8px" }
  ];
  P.push(function (d) {
    var rows = d.pillars.map(function (p, i) {
      var two = "0" + (i + 1);
      var last = i === d.pillars.length - 1;
      var numColor = ({ red: "var(--danger)", amber: "var(--warning)", brand: "var(--brand-300)" })[p.chip_tone] || "var(--brand-300)";
      return '<div style="display:grid;grid-template-columns:34px 1fr 200px 64px;gap:16px;align-items:center;' +
        (last ? "padding-bottom:4px;" : "border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:14px;") + '">' +
        '<span style="font-family:var(--font-display);font-size:20px;color:rgba(255,255,255,.4);">' + two + '</span>' +
        '<div><p style="margin:0;color:#fff;font-weight:700;font-size:14px;">' + p.name + '</p>' +
          '<p class="small" style="color:#8FA6B7;margin:0;">' + (RADAR_SUB[p.key] || p.one_liner) + '</p></div>' +
        '<div class="bar" style="background:rgba(255,255,255,.12);"><i class="' + BP.toneBg(p.chip_tone) + '" style="width:' + Math.max(p.score, 2) + '%;"></i></div>' +
        '<span class="mono" style="color:' + numColor + ';font-weight:700;font-size:14px;text-align:right;">' + p.score + '</span></div>';
    }).join("");

    var r = BP.radar(d.pillars.map(function (p) { return p.score; }));
    function poly(pts, fill, stroke, sw) { return '<polygon points="' + pts + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + (fill !== "none" ? ' stroke-linejoin="round"' : "") + '/>'; }
    var svg = '<svg viewBox="0 0 190 175" width="200" height="184" style="display:block;overflow:visible;">' +
      poly(r.grid, "none", "rgba(255,255,255,.14)", 1) +
      poly(r.rings[0], "none", "rgba(255,255,255,.10)", 1) +
      poly(r.rings[1], "none", "rgba(255,255,255,.10)", 1) +
      poly(r.rings[2], "none", "rgba(255,255,255,.08)", 1);
    r.spokes.forEach(function (s) { var xy = s.split(","); svg += '<line x1="' + r.cx + '" y1="' + r.cy + '" x2="' + xy[0] + '" y2="' + xy[1] + '" stroke="rgba(255,255,255,.12)" stroke-width="1"/>'; });
    svg += poly(r.poly, "rgba(42,143,214,.30)", "#79BEE8", 2);
    r.dots.forEach(function (pt, i) {
      var red = d.pillars[i].chip_tone === "red";
      svg += '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="' + (red ? 4.2 : 3.4) + '" fill="' + (red ? "#E0533B" : "#79BEE8") + '"/>';
    });
    svg += "</svg>";
    var labels = d.pillars.map(function (p, i) {
      var L = RADAR_LABELS[i], abbr = p.name.split(" ")[0];
      var val = p.chip_tone === "red" ? '<b style="color:#E0533B;">' + p.score + "</b>" : p.score;
      return '<span style="position:absolute;top:' + L.top + 'px;left:' + L.left + ';' + (L.tx ? "transform:" + L.tx + ";" : "") + 'font-family:var(--font-mono);font-size:8px;letter-spacing:.04em;color:rgba(255,255,255,.7);white-space:nowrap;">' + abbr + ' · ' + val + '</span>';
    }).join("");

    return '<section class="page dark" data-screen-label="05 Section 2 Divider">' +
      BP.head("Section 02", "Deep-dive diagnostics") +
      '<div class="body">' +
        '<p class="eyebrow" style="color:var(--brand-300);">Section 02 · The “why”</p>' +
        '<h1 class="display" style="font-size:42px;margin-top:14px;max-width:150mm;color:#fff;">Deep-dive diagnostics.</h1>' +
        '<p class="lead" style="color:#B6CAD9;margin-top:16px;max-width:148mm;font-size:14.5px;">Five pillars decide your power level. For each one we lay out the same three things, plainly: <strong style="color:#fff;">what we measured</strong>, <strong style="color:#fff;">why it matters</strong>, and <strong style="color:#fff;">what to do next</strong>. No jargon, no padding.</p>' +
        '<div style="margin-top:34px;display:flex;flex-direction:column;gap:14px;">' + rows + '</div>' +
        '<div class="fig"><p class="fig-h"><span class="tag">Fig. 00</span> The shape of your account today</p>' +
          '<div style="display:flex;align-items:center;gap:34px;">' +
            '<div style="position:relative;width:200px;height:190px;flex:none;">' + svg + labels + '</div>' +
            '<div style="flex:1;">' +
              '<p style="margin:0;color:#B6CAD9;font-size:12.5px;line-height:1.6;">Plotted together, the five pillars make a lopsided shape — four of them mid-climb, and <strong style="color:#fff;">one collapsed flat to the centre.</strong> That single flat spoke is ' + d.pillars[0].name + ', and it\'s why the whole figure looks unbalanced.</p>' +
              '<p style="margin:12px 0 0;color:#B6CAD9;font-size:12.5px;line-height:1.6;">Pull that one point outward and the shape fills toward a confident pentagon — which is exactly what the next five pages set out to do.</p></div>' +
          '</div></div>' +
      '</div>' + BP.foot(5) + '</section>';
  });
})();
