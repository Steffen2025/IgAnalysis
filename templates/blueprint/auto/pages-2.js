/* Instagram Growth Blueprint — page builders P6–P12 */
(function () {
  var BP = window.BP, P = (window.BP_PAGES = window.BP_PAGES || []);

  /* shared: pillar deep-dive top (ring + header + 3 diagnostic boxes) ------*/
  function pillarTop(p) {
    return '<div style="display:flex;align-items:center;gap:24px;">' +
      '<div class="ring" style="width:104px;height:104px;background:' + BP.ringStyle(Math.max(p.score, 2), p.chip_tone, false) + ';">' +
        '<div class="val"><div class="n ' + BP.toneSev(p.chip_tone) + '" style="font-size:34px;">' + p.score + '</div><div class="d">/ 100</div></div></div>' +
      '<div style="flex:1;">' +
        '<div style="display:flex;align-items:center;gap:10px;"><p class="eyebrow">' + p.eyebrow + '</p><span class="pill ' + BP.tonePill(p.chip_tone) + '">' + p.status + '</span></div>' +
        '<h2 class="h1" style="font-size:33px;margin-top:6px;">' + p.name + '</h2>' +
        '<p class="lead" style="margin-top:8px;font-size:13px;">' + p.one_liner + '</p></div></div>' +
      '<hr class="rule" style="margin:22px 0;">' +
      '<div style="display:flex;flex-direction:column;gap:18px;">' +
        '<div class="qbox measured"><h5><span class="dot ' + BP.toneBg(p.chip_tone) + '"></span>What we measured</h5><p>' + p.what_measured + '</p></div>' +
        '<div class="qbox matters"><h5><span class="dot bg-brand"></span>Why it matters</h5><p>' + p.why_matters + '</p></div>' +
        '<div class="qbox next"><h5><span class="dot bg-amber"></span>What to do next</h5><p>' + p.what_next + '</p></div>' +
      '</div>';
  }
  // metric cards — grid3 with value+target (big display number)
  function metricsBig(p) {
    return '<div class="grid3" style="margin-top:22px;">' + p.metrics.map(function (m) {
      return '<div class="card tint"><p class="mono" style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-400);margin:0 0 4px;">' + m.label + '</p>' +
        '<p style="margin:0;font-family:var(--font-display);font-size:24px;color:' + BP.toneVar(p.chip_tone) + ';">' + m.value + '</p>' +
        '<p class="small" style="margin:0;">Target: ' + m.target + '</p></div>';
    }).join("") + '</div>';
  }
  // metric cards — grid4 value + tone
  function metricsTone(p) {
    return '<div class="grid4" style="margin-top:22px;">' + p.metrics.map(function (m) {
      return '<div class="card tint"><p class="small mono" style="margin:0 0 4px;color:var(--ink-400);">' + m.label + '</p>' +
        '<p style="margin:0;font-weight:700;font-size:12px;" class="' + BP.toneSev(m.tone) + '">' + m.value + '</p></div>';
    }).join("") + '</div>';
  }
  var DD = '<span class="sec">Section 02 · Deep-dive diagnostics</span>';

  /* ---- P6 · PILLAR 1 — LOCAL VISIBILITY ---------------------------------*/
  P.push(function (d) {
    var p = d.pillars[0];
    var fig = '<div class="fig"><p class="fig-h"><span class="tag">Fig. 01</span> From invisible to on the map</p>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div style="flex:none;width:118px;text-align:center;"><div style="width:74px;height:74px;border-radius:50%;margin:0 auto;border:2px dashed var(--danger);background:radial-gradient(circle,#FCEEEB,#F7D9D2);display:grid;place-items:center;"><span class="mono" style="font-size:8.5px;font-weight:700;letter-spacing:.06em;color:var(--danger);">YOU</span></div>' +
          '<p style="margin:9px 0 0;font-size:10px;font-weight:700;color:var(--danger);">Today · invisible</p><p class="small" style="margin:1px 0 0;font-size:9px;">Outside every local surface</p></div>' +
        '<div style="flex:1;position:relative;display:flex;flex-direction:column;align-items:center;padding:0 4px;">' +
          '<span class="mono" style="font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ig-purple);margin-bottom:7px;">The bridge</span>' +
          '<div style="width:100%;position:relative;display:flex;align-items:center;"><div class="ig-rule" style="flex:1;"></div><span style="width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:10px solid var(--ig-purple);"></span></div>' +
          '<span style="margin-top:8px;font-size:9.5px;font-weight:600;color:var(--ink-700);text-align:center;line-height:1.3;">Geotags + local<br>hashtag sets</span></div>' +
        '<div class="radar" style="width:150px;height:150px;">' +
          '<div class="ring2" style="inset:0;border-color:rgba(31,169,113,.5);"></div><div class="ring2" style="inset:26px;border-color:rgba(42,143,214,.45);"></div><div class="ring2" style="inset:52px;border-color:rgba(42,143,214,.35);"></div>' +
          '<div class="pin buyer" style="left:30%;top:30%;"></div><div class="pin buyer" style="left:72%;top:38%;"></div><div class="pin buyer" style="left:36%;top:70%;"></div><div class="pin buyer" style="left:66%;top:66%;"></div><div class="pin buyer" style="left:50%;top:22%;"></div>' +
          '<div class="pin" style="left:50%;top:50%;width:42px;height:42px;border-radius:50%;background:radial-gradient(circle,rgba(31,169,113,.3),transparent 70%);transform:translate(-50%,-50%);"></div>' +
          '<div class="pin" style="left:50%;top:50%;width:17px;height:17px;border-radius:50%;background:var(--success);box-shadow:0 0 0 4px rgba(31,169,113,.18);transform:translate(-50%,-50%);"></div></div>' +
      '</div>' +
      '<div style="display:flex;gap:22px;margin-top:14px;flex-wrap:wrap;">' +
        '<span class="leg"><span class="sw" style="background:var(--danger);"></span> You today — invisible</span>' +
        '<span class="leg"><span class="sw" style="background:var(--brand-400);"></span> ' + d.city + ' buyers searching now</span>' +
        '<span class="leg"><span class="sw" style="background:var(--success);box-shadow:0 0 0 3px rgba(31,169,113,.18);"></span> You at target — discoverable</span></div></div>';
    return '<section class="page" data-screen-label="06 Pillar 1 Local Visibility">' +
      BP.head("Section 02 · Deep-dive diagnostics", "Pillar 1 of 5") +
      '<div class="body">' + pillarTop(p) + metricsBig(p) + fig + '</div>' + BP.foot(6) + '</section>';
  });

  /* ---- P7 · PILLAR 2 — PROFILE CONVERSION -------------------------------*/
  P.push(function (d) {
    var p = d.pillars[1], s = d.profile_stats || {};
    var mock = '<div class="mock" style="position:relative;">' +
      '<span class="mk" style="top:80px;">1</span><span class="mk" style="top:112px;">2</span><span class="mk" style="top:140px;">3</span><span class="mk" style="top:198px;">4</span>' +
      '<div style="display:flex;align-items:center;gap:14px;"><div class="av"></div>' +
        '<div style="display:flex;gap:18px;flex:1;justify-content:space-around;text-align:center;">' +
          '<div><p style="margin:0;font-weight:800;font-size:12px;color:var(--ink-900);">' + (s.posts != null ? s.posts : "—") + '</p><p class="small mono" style="margin:0;font-size:7.5px;color:var(--ink-400);">posts</p></div>' +
          '<div><p style="margin:0;font-weight:800;font-size:12px;color:var(--ink-900);">' + (s.followers != null ? s.followers : "—") + '</p><p class="small mono" style="margin:0;font-size:7.5px;color:var(--ink-400);">followers</p></div>' +
          '<div><p style="margin:0;font-weight:800;font-size:12px;color:var(--ink-900);">' + (s.following != null ? s.following : "—") + '</p><p class="small mono" style="margin:0;font-size:7.5px;color:var(--ink-400);">following</p></div></div></div>' +
      '<p style="margin:11px 0 0;font-weight:800;font-size:11.5px;color:var(--ink-900);">' + d.client_name + '</p>' +
      '<p style="margin:2px 0 0;font-size:10px;line-height:1.45;color:var(--ink-600);">' + (d.profile_bio || "") + '</p>' +
      '<p style="margin:3px 0 0;font-size:10px;color:var(--brand-600);font-weight:600;">' + d.cta_link + '</p>' +
      '<div style="display:flex;gap:16px;margin-top:12px;">' +
        '<div style="text-align:center;"><div class="hl"></div><p class="small mono" style="margin:4px 0 0;font-size:7.5px;color:var(--ink-500);">Work</p></div>' +
        '<div style="text-align:center;"><div class="hl"></div><p class="small mono" style="margin:4px 0 0;font-size:7.5px;color:var(--ink-500);">Reviews</p></div>' +
        '<div style="text-align:center;"><div class="hl"></div><p class="small mono" style="margin:4px 0 0;font-size:7.5px;color:var(--ink-500);">Start</p></div></div>' +
      '<div class="gridmock"><i class="pin3"></i><i class="pin3"></i><i class="pin3"></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>';
    var fig = '<div class="fig"><p class="fig-h"><span class="tag">Fig. 02</span> The storefront we\'re building</p>' +
      '<div style="display:flex;gap:30px;align-items:stretch;">' + mock +
        '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;">' +
          '<p style="margin:0;font-size:11.5px;">Four fixes turn a three-second glance into a follow — and a follow into a booked call:</p>' +
          '<div class="anno"><span class="num">1</span><p style="margin:0;font-size:11px;"><strong>One-line value-prop bio</strong> — a promise, not a label.</p></div>' +
          '<div class="anno"><span class="num">2</span><p style="margin:0;font-size:11px;"><strong>A single CTA link</strong> straight to your booking page.</p></div>' +
          '<div class="anno"><span class="num">3</span><p style="margin:0;font-size:11px;"><strong>Three highlights</strong> — Work · Reviews · Start here.</p></div>' +
          '<div class="anno"><span class="num">4</span><p style="margin:0;font-size:11px;"><strong>Three pinned posts</strong> that greet every new visitor.</p></div></div>' +
      '</div></div>';
    return '<section class="page" data-screen-label="07 Pillar 2 Profile Conversion">' +
      BP.head("Section 02 · Deep-dive diagnostics", "Pillar 2 of 5") +
      '<div class="body">' + pillarTop(p) + metricsTone(p) + fig + '</div>' + BP.foot(7) + '</section>';
  });

  /* ---- P8 · PILLAR 3 — CONTENT PERFORMANCE ------------------------------*/
  P.push(function (d) {
    var p = d.pillars[2], fm = p.format_mix;
    function mixCard(state, kind) {
      var today = kind === "today";
      var head = today
        ? '<div style="display:flex;align-items:center;justify-content:space-between;"><p class="mono" style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-500);margin:0;">Today</p><span class="pill red" style="font-size:8px;padding:3px 8px;">Static-heavy · low reach</span></div>'
        : '<div style="display:flex;align-items:center;justify-content:space-between;"><p class="mono" style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#157A52;margin:0;">30-day target</p><span class="pill green" style="font-size:8px;padding:3px 8px;">Reel-led · save-friendly</span></div>';
      var rC = today ? "var(--ink-300)" : "var(--brand-500)", rTxt = today ? "var(--ink-600)" : "var(--brand-600)";
      var cTxt = today ? "var(--ink-600)" : "var(--brand-600)";
      var sBg = today ? "var(--danger)" : "var(--ink-300)", sTxt = today ? "var(--danger)" : "var(--ink-500)";
      var carInB = today ? "#E3EAEF" : "var(--brand-200)", carInF = today ? "var(--ink-300)" : "var(--brand-400)";
      var propR = today ? "var(--brand-400)" : "var(--brand-500)", propC = today ? "var(--brand-200)" : "var(--brand-300)", propS = today ? "var(--danger)" : "var(--ink-300)";
      var note = today ? 'Reach engine idling — roughly <strong>' + state.saves + '</strong> per post.' : 'Algorithm has fuel to push — target <strong style="color:#157A52;">' + state.saves + '</strong> per post.';
      return '<div class="card" style="flex:1;border-top:3px solid ' + (today ? "var(--danger)" : "var(--success)") + ';' + (today ? "" : "background:#F4FBF8;") + 'padding:14px 16px;">' + head +
        '<div style="display:flex;gap:10px;margin-top:13px;">' +
          '<div style="flex:1;text-align:center;"><div style="width:22px;height:32px;border-radius:5px;background:' + rC + ';display:grid;place-items:center;margin:0 auto;"><span style="width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid #fff;"></span></div><p style="margin:7px 0 0;font-family:var(--font-display);font-size:16px;color:' + rTxt + ';">' + state.reels + '%</p><p class="small mono" style="margin:0;font-size:7.5px;color:var(--ink-400);">Reels</p></div>' +
          '<div style="flex:1;text-align:center;"><div style="position:relative;width:30px;height:30px;margin:0 auto;"><div style="position:absolute;inset:2px 0 0 6px;border-radius:5px;background:' + carInB + ';"></div><div style="position:absolute;inset:0 6px 2px 0;border-radius:5px;background:' + carInF + ';"></div></div><p style="margin:7px 0 0;font-family:var(--font-display);font-size:16px;color:' + cTxt + ';">' + state.carousels + '%</p><p class="small mono" style="margin:0;font-size:7.5px;color:var(--ink-400);">Carousels</p></div>' +
          '<div style="flex:1;text-align:center;"><div style="width:30px;height:30px;border-radius:5px;background:' + sBg + ';margin:0 auto;"></div><p style="margin:7px 0 0;font-family:var(--font-display);font-size:16px;color:' + sTxt + ';">' + state.static + '%</p><p class="small mono" style="margin:0;font-size:7.5px;color:var(--ink-400);">Static</p></div></div>' +
        '<div class="prop" style="margin-top:14px;height:9px;"><span style="width:' + state.reels + '%;background:' + propR + ';"></span><span style="width:' + state.carousels + '%;background:' + propC + ';"></span><span style="width:' + state.static + '%;background:' + propS + ';"></span></div>' +
        '<p class="small" style="margin:9px 0 0;">' + note + '</p></div>';
    }
    var fig = '<div class="fig"><p class="fig-h"><span class="tag">Fig. 03</span> Today vs the 30-day target — shift the format mix</p>' +
      '<div style="display:flex;gap:16px;align-items:stretch;">' + mixCard(fm.today, "today") +
        '<div style="align-self:center;flex:none;"><span style="width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-left:12px solid var(--brand-400);display:block;"></span></div>' +
        mixCard(fm.target, "target") + '</div></div>';
    return '<section class="page" data-screen-label="08 Pillar 3 Content Performance">' +
      BP.head("Section 02 · Deep-dive diagnostics", "Pillar 3 of 5") +
      '<div class="body">' + pillarTop(p) + fig + '</div>' + BP.foot(8) + '</section>';
  });

  /* ---- P9 · PILLAR 4 — SALES READINESS ----------------------------------*/
  P.push(function (d) {
    var p = d.pillars[3];
    var shades = ["var(--brand-300)", "var(--brand-400)", "var(--brand-500)", "var(--brand-700)"];
    var bars = p.funnel.map(function (f, i) {
      var first = i === 0, lastSmall = f.width <= 16;
      return '<div class="funnel-bar" style="width:' + f.width + '%;' + (first ? "" : "margin:0 auto;") + 'background:' + shades[i] + ';' + (lastSmall ? "font-size:8.5px;padding:0 6px;" : "") + '">' + f.label + '</div>';
    }).join("");
    var fig = '<div class="fig"><p class="fig-h"><span class="tag">Fig. 04</span> Where attention leaks today</p>' +
      '<div style="display:flex;gap:32px;align-items:center;">' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:7px;">' + bars + '</div>' +
        '<div style="flex:none;width:170px;">' +
          '<p style="margin:0;"><strong>The drop happens mid-funnel.</strong> With a CTA on only ~1 in 5 posts and no pinned offer, the people you reach have nowhere to go — so the warm attention cools and leaks out.</p>' +
          '<p style="margin:10px 0 0;font-size:10px;color:var(--danger);font-weight:600;">Add an intent CTA to every post and the funnel holds its shape.</p></div></div></div>';
    return '<section class="page" data-screen-label="09 Pillar 4 Sales Readiness">' +
      BP.head("Section 02 · Deep-dive diagnostics", "Pillar 4 of 5") +
      '<div class="body">' + pillarTop(p) + metricsTone(p) + fig + '</div>' + BP.foot(9) + '</section>';
  });

  /* ---- P10 · PILLAR 5 — COMPETITOR GAP ----------------------------------*/
  P.push(function (d) {
    var p = d.pillars[4], cs = d.cadence_standings, max = cs.scale_max || 5;
    function row(s, opts) {
      opts = opts || {};
      var w = BP.barPct(s.value, max), tgt = BP.barPct(cs.target_line, max);
      var fill = opts.you ? '<i class="bg-red" style="width:' + w + '%;"></i>' : '<i style="width:' + w + '%;background:var(--ink-300);"></i>';
      return '<div class="barwrap"><span class="mono" style="width:160px;font-size:10px;' + (opts.you ? "font-weight:700;color:var(--ink-900);" : "color:var(--ink-700);") + '">' + s.label + '</span>' +
        '<div class="gaptrack">' + fill + '<span class="tgt" style="left:' + tgt + '%;"></span></div>' +
        '<span class="bnum' + (opts.you ? " sev-red" : "") + '">' + s.value.toFixed(1) + '</span></div>';
    }
    var fig = '<div class="fig"><p class="fig-h"><span class="tag">Fig. 05</span> The whole gap, in one metric — posts / week</p>' +
      '<div style="display:flex;flex-direction:column;gap:11px;">' + row(cs.top_performer) + row(cs.average) + row(cs.you, { you: true }) + '</div>' +
      '<p style="margin:12px 0 0;font-size:11px;"><span style="display:inline-block;width:3px;height:11px;border-radius:2px;background:var(--brand-600);vertical-align:middle;margin-right:6px;"></span>The blue line marks your <strong>target of ' + cs.target_line.toFixed(1) + ' posts/week</strong> — level with the market. One metric, the whole gap.</p></div>';
    var note = '<div class="fnote green" style="margin-top:20px;"><div class="ic"><img src="assets/botlogix-mascot.png" alt="" style="height:24px;width:auto;"></div>' +
      '<div><p class="lbl">Quick win</p><p><strong>Cadence is the cheapest lever you have</strong> — it costs consistency, not budget or talent. A ' + p.score + ' means the market isn\'t far ahead: close the cadence gap, win on locality, and “stand out” flips from amber to green inside the 30 days.</p></div></div>';
    return '<section class="page" data-screen-label="10 Pillar 5 Competitor Gap">' +
      BP.head("Section 02 · Deep-dive diagnostics", "Pillar 5 of 5") +
      '<div class="body">' + pillarTop(p) + fig + note + '</div>' + BP.foot(10) + '</section>';
  });

  /* ---- P11 · COMPETITOR MATRIX ------------------------------------------*/
  P.push(function (d) {
    var rows = d.competitors.map(function (c) {
      return '<div class="card" style="display:grid;grid-template-columns:150px 1fr 1fr;gap:16px;padding:11px 16px;align-items:start;">' +
        '<div><p class="mono sev-brand" style="font-size:12px;font-weight:700;margin:0;">' + c.handle + '</p>' +
          '<p class="small" style="margin-top:2px;font-size:9px;">' + c.type + '</p>' +
          '<span class="pill brand" style="margin-top:6px;font-size:8px;padding:2px 8px;">' + c.metric + '</span></div>' +
        '<div><p class="mono" style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-400);margin:0 0 4px;">What they do well</p><p style="font-size:10.5px;line-height:1.5;">' + c.does_well + '</p></div>' +
        '<div><p class="mono" style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-600);margin:0 0 4px;">Framework to borrow</p><p style="font-size:10.5px;line-height:1.5;">' + c.borrow + '</p></div></div>';
    }).join("");
    return '<section class="page" data-screen-label="11 Competitor Matrix">' +
      BP.head("Section 03 · Competitive intelligence", "The competitor matrix") +
      '<div class="body">' +
        '<p class="eyebrow">Section 03 · Market frameworks</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:36px;">Borrow what\'s already working.</h2>' +
        '<p class="lead" style="margin-top:11px;max-width:152mm;">We benchmarked the <strong>' + d.benchmark_count + ' regional accounts</strong> winning the attention you want. You don\'t need to out-spend them — lift their best structural moves and out-local them. Here\'s exactly what to take from each.</p>' +
        '<div style="margin-top:18px;display:flex;flex-direction:column;gap:9px;">' + rows + '</div>' +
        '<p style="margin-top:auto;border-left:3px solid var(--brand-400);padding-left:14px;font-size:12px;"><strong>The pattern:</strong> across all five, none are out-creating you on talent. They win on <strong>consistency, format and locality</strong> — all three are systems you can install in a week, not skills you have to grow.</p>' +
      '</div>' + BP.foot(11) + '</section>';
  });

  /* ---- P12 · DATA GAPS ---------------------------------------------------*/
  P.push(function (d) {
    var g = d.data_gaps;
    var thead = '<thead><tr><th style="width:24%;">Metric</th><th>You</th>' +
      g.columns.map(function (c) { return '<th>' + c + '</th>'; }).join("") +
      '<th style="color:var(--brand-600);">Your target</th></tr></thead>';
    var tbody = '<tbody>' + g.rows.map(function (r) {
      return '<tr><td><b>' + r.metric + '</b></td><td class="num sev-red">' + r.you + '</td>' +
        r.comps.map(function (c) { return '<td class="num">' + c + '</td>'; }).join("") +
        '<td class="num sev-brand">' + r.target + '</td></tr>';
    }).join("") + '</tbody>';
    var dots = "";
    for (var i = 0; i < d.benchmark_count; i++) dots += '<span style="width:7px;height:7px;border-radius:50%;background:var(--brand-400);"></span>';
    var cards = g.gap_cards.map(function (c) {
      return '<div class="card tint" style="padding:13px 15px;"><p class="mono" style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-400);margin:0;">' + c.title + '</p>' +
        '<p style="margin:5px 0 9px;font-family:var(--font-display);font-size:22px;color:var(--danger);line-height:1;">' + c.value + ' <span style="font-family:var(--font-sans);font-size:11px;color:var(--ink-600);font-weight:600;">' + c.unit + '</span></p>' +
        '<div class="gaptrack"><i class="bg-red" style="width:' + c.fill + '%;"></i><span class="tgt" style="left:' + c.target + '%;"></span></div>' +
        '<p class="small" style="margin:8px 0 0;font-size:10px;">' + c.note + '</p></div>';
    }).join("");
    return '<section class="page" data-screen-label="12 Data Gaps">' +
      BP.head("Section 03 · Competitive intelligence", "The data gaps") +
      '<div class="body">' +
        '<p class="eyebrow">The data gaps</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:36px;">Why you\'re being out-signalled.</h2>' +
        '<p class="lead" style="margin-top:12px;max-width:152mm;">Side by side, the gap isn\'t mysterious. It\'s volume, length and format — measurable things with a clear target. Hit the right-hand column and you\'re competing on equal footing.</p>' +
        '<table class="tbl" style="margin-top:22px;">' + thead + tbody + '</table>' +
        '<div style="margin-top:11px;display:flex;align-items:center;gap:9px;"><span style="display:flex;gap:3px;">' + dots + '</span>' +
          '<span class="mono" style="font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-500);">' + g.benchmark_label + '</span></div>' +
        '<div class="grid3" style="margin-top:18px;">' + cards + '</div>' +
        '<div class="fnote green" style="margin-top:auto;"><div class="ic">✓</div><div><p class="lbl">Quick win</p><p>' + g.quick_win + '</p></div></div>' +
      '</div>' + BP.foot(12) + '</section>';
  });
})();
