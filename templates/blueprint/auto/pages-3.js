/* Instagram Growth Blueprint — page builders P13–P20 */
(function () {
  var BP = window.BP, P = (window.BP_PAGES = window.BP_PAGES || []);
  function bracket(s, size) { return String(s).replace(/\[([^\]]+)\]/g, '<span class="mono sev-brand" style="font-size:' + (size || 11) + 'px;">[$1]</span>'); }

  /* ---- P13 · 7-DAY PLAN (Days 1–4) --------------------------------------*/
  P.push(function (d) {
    var dots = "";
    for (var i = 0; i < 7; i++) dots += i < 4
      ? '<span style="width:13px;height:13px;border-radius:50%;background:var(--brand-400);"></span>'
      : '<span style="width:13px;height:13px;border-radius:50%;border:1.5px solid rgba(255,255,255,.3);"></span>';
    var cards = d.seven_day_plan.slice(0, 4).map(function (day) {
      return '<div style="display:flex;gap:14px;align-items:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-left:3px solid var(--brand-400);border-radius:13px;padding:13px 16px;">' +
        '<div style="width:40px;height:40px;border-radius:11px;background:var(--grad-azure);display:grid;place-items:center;flex:none;"><span style="font-family:var(--font-display);font-size:21px;color:#fff;font-weight:600;line-height:1;">' + day.day + '</span></div>' +
        '<div style="flex:1;"><div style="display:flex;align-items:center;gap:10px;"><p style="margin:0;color:#fff;font-weight:700;font-size:14px;">' + day.title + '</p>' +
          '<span class="mono" style="font-size:7.5px;font-weight:700;letter-spacing:.06em;color:var(--brand-300);background:rgba(42,143,214,.16);border-radius:5px;padding:2px 7px;">' + day.minutes + ' MIN</span></div>' +
          '<p class="small" style="color:#9FB6C7;margin:3px 0 0;">' + day.desc + '</p></div>' +
        '<div style="width:20px;height:20px;border:1.8px solid var(--brand-400);border-radius:6px;flex:none;"></div></div>';
    }).join("");
    var low2 = d.pillars.slice().sort(function (a, b) { return a.score - b.score; }).slice(0, 2).map(function (p) { return p.name; });
    return '<section class="page dark" data-screen-label="13 7-Day Blueprint A">' +
      BP.head("Section 04 · The 7-day execution blueprint", "Days 1 – 4") +
      '<div class="body">' +
        '<p class="eyebrow" style="color:var(--brand-300);">Section 04 · Effortless momentum</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:34px;color:#fff;">Seven days. Fifteen minutes each.</h2>' +
        '<p class="lead" style="color:#B6CAD9;margin-top:12px;max-width:150mm;font-size:13.5px;">Strategy is overwhelming; a checklist isn\'t. Each day is one small, finished thing. Tick the box, build the streak — by Sunday the foundation is live.</p>' +
        '<div style="margin-top:18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">' +
          '<span class="pill brand" style="background:rgba(42,143,214,.16);border-color:rgba(42,143,214,.4);color:var(--brand-300);">Foundation sprint · Part 1 of 2</span>' +
          '<div style="display:flex;gap:6px;align-items:center;">' + dots + '</div>' +
          '<span class="mono" style="font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#8FA6B7;">Days 1–4 of 7</span></div>' +
        '<div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;">' + cards + '</div>' +
        '<div class="fnote ig" style="margin-top:auto;"><div class="ic">½</div><div><p class="lbl">Halfway — foundation locked by Day 4</p>' +
          '<p>Four short sessions and the entire foundation is rebuilt. The two lowest pillars — <strong>' + low2[0] + '</strong> and <strong>' + low2[1] + '</strong> — are already climbing before you\'ve published a single new reel.</p></div></div>' +
      '</div>' + BP.foot(13) + '</section>';
  });

  /* ---- P14 · 7-DAY PLAN (Days 5–7) --------------------------------------*/
  P.push(function (d) {
    var cards = d.seven_day_plan.slice(4).map(function (day) {
      var out = day.output ? '<p style="margin:0;font-size:10px;"><span class="mono" style="font-size:7.5px;font-weight:700;letter-spacing:.08em;color:var(--success);">OUTPUT →</span> <strong>' + day.output + '</strong></p>' : "";
      return '<div style="display:flex;gap:14px;align-items:center;border:1px solid var(--ink-200);border-left:3px solid var(--brand-400);border-radius:13px;padding:12px 16px;">' +
        '<div style="width:40px;height:40px;border-radius:11px;background:var(--grad-azure);display:grid;place-items:center;flex:none;"><span style="font-family:var(--font-display);font-size:21px;color:#fff;font-weight:600;line-height:1;">' + day.day + '</span></div>' +
        '<div style="flex:1;"><div style="display:flex;align-items:center;gap:10px;"><p class="h3" style="font-size:14px;">' + day.title + '</p>' +
          '<span class="mono" style="font-size:7.5px;font-weight:700;letter-spacing:.06em;color:var(--brand-700);background:var(--brand-50);border-radius:5px;padding:2px 7px;">' + day.minutes + ' MIN</span></div>' +
          '<p class="small" style="margin:3px 0 5px;">' + day.desc + '</p>' + out + '</div>' +
        '<div style="width:20px;height:20px;border:1.8px solid var(--brand-400);border-radius:6px;flex:none;"></div></div>';
    }).join("");
    var check = d.week1_done_checklist.map(function (t) {
      return '<p style="margin:0;font-size:11px;display:flex;gap:7px;align-items:center;"><span style="width:15px;height:15px;border-radius:50%;background:var(--success);color:#fff;display:grid;place-items:center;font-size:8px;flex:none;">✓</span> ' + t + '</p>';
    }).join("");
    var mv = d.week1_score_move;
    return '<section class="page" data-screen-label="14 7-Day Blueprint B">' +
      BP.head("Section 04 · The 7-day execution blueprint", "Days 5 – 7") +
      '<div class="body">' +
        '<p class="eyebrow">The home stretch</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:34px;">Now you\'re publishing.</h2>' +
        '<p class="lead" style="margin-top:12px;max-width:150mm;">The foundation is live — the back half of the week is about putting real content through it and proving the rhythm is repeatable.</p>' +
        '<div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;">' + cards + '</div>' +
        '<div style="margin-top:18px;background:#F4FBF8;border:1px solid #BCE6D3;border-radius:14px;padding:14px 18px;">' +
          '<div style="display:flex;align-items:center;gap:9px;margin-bottom:11px;"><span style="width:22px;height:22px;border-radius:7px;background:var(--success);color:#fff;display:grid;place-items:center;font-family:var(--font-display);font-size:13px;">★</span>' +
            '<p class="mono" style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#157A52;margin:0;font-weight:700;">What “done” looks like by Sunday night</p></div>' +
          '<div class="grid2" style="gap:8px 22px;">' + check + '</div></div>' +
        '<div class="fnote" style="margin-top:auto;align-items:center;"><div style="display:flex;align-items:center;gap:8px;flex:none;">' +
          '<span style="font-family:var(--font-display);font-size:22px;font-weight:600;color:var(--ink-500);">' + mv.from + '</span>' +
          '<span style="width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid var(--brand-500);"></span>' +
          '<span style="font-family:var(--font-display);font-size:22px;font-weight:600;color:var(--brand-600);">' + mv.to + '</span></div>' +
          '<div><p class="lbl">Foundation complete — week 1 impact</p><p><strong>One week in, the score has already moved.</strong> Weeks 2–4 are pure repetition with the calendar on page 17 — the hard part, deciding what to post, is already handled.</p></div></div>' +
      '</div>' + BP.foot(14) + '</section>';
  });

  /* ---- P15 · TOOLKIT — HOOKS & FRAMEWORKS -------------------------------*/
  P.push(function (d) {
    var hooks = d.hook_starters.map(function (h) {
      return '<div class="card" style="padding:11px 16px;font-family:var(--font-display);font-size:14px;color:var(--ink-900);">' + bracket(h, 11) + '</div>';
    }).join("");
    var frames = d.caption_frameworks.map(function (f) {
      return '<div class="card tint"><p class="mono sev-brand" style="font-size:9px;font-weight:700;margin:0 0 6px;">' + f.name + '</p><p style="margin:0;font-size:11px;">' + bracket(f.body, 11) + '</p></div>';
    }).join("");
    var a = d.hook_anatomy;
    var tags = a.tags.map(function (t, i) { return '<span class="tagchip"><span class="b">' + (i + 1) + '</span> ' + t + '</span>'; }).join("");
    return '<section class="page" data-screen-label="15 Toolkit Hooks">' +
      BP.head("Section 05 · The copy-and-use toolkit", "Hooks &amp; caption frameworks") +
      '<div class="body">' +
        '<p class="eyebrow">Section 05 · Zero-friction assets</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:34px;">Steal these. Fill the brackets.</h2>' +
        '<p class="lead" style="margin-top:12px;max-width:152mm;">No blank-page paralysis. Swap the <span class="mono sev-brand">[brackets]</span> for your details and post. Every template is tuned for a local ' + d.city + ' service audience.</p>' +
        '<h3 class="kicker" style="margin-top:22px;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-400);">Hook starters</h3>' +
        '<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">' + hooks + '</div>' +
        '<h3 class="kicker" style="margin-top:20px;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-400);">Caption frameworks</h3>' +
        '<div class="grid3" style="margin-top:10px;">' + frames + '</div>' +
        '<div class="fig"><p class="fig-h"><span class="tag">Fig. 07</span> Anatomy of a scroll-stopping post</p>' +
          '<div style="display:flex;gap:24px;align-items:center;">' +
            '<div class="hookph"><span class="mono" style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-400);">Reel · 9:16</span></div>' +
            '<div style="flex:1;"><p style="margin:0;font-family:var(--font-display);font-size:15px;line-height:1.4;color:var(--ink-900);">' +
              '<span class="hl-hook">' + a.hook + '</span>' + a.body + '<span class="hl-cta">' + a.cta + '</span>' + a.tail + '</p>' +
              '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">' + tags + '</div></div>' +
          '</div></div>' +
      '</div>' + BP.foot(15) + '</section>';
  });

  /* ---- P16 · TOOLKIT — CTAs & HASHTAGS ----------------------------------*/
  P.push(function (d) {
    var topB = ["var(--ink-400)", "var(--brand-300)", "var(--brand-500)", "var(--warning)"];
    var lblC = ["var(--ink-500)", "var(--brand-500)", "var(--brand-600)", "#9A6B14"];
    var arrowC = ["var(--ink-300)", "var(--brand-300)", "var(--brand-500)"];
    var ladder = "";
    d.cta_ladder.forEach(function (c, i) {
      var last = i === 3;
      var extra = last ? "background:#FCF4E3;" : "";
      var border = last ? "1px solid #EFD9A8" : "1px solid var(--ink-200)";
      ladder += '<div style="flex:1;border:' + border + ';border-top:3px solid ' + topB[i] + ';border-radius:13px;padding:9px 12px;display:flex;flex-direction:column;gap:5px;' + extra + '">' +
        '<span class="mono" style="font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:' + lblC[i] + ';font-weight:700;">0' + (i + 1) + ' · ' + c.stage + '</span>' +
        '<p style="margin:0;font-size:10.5px;color:var(--ink-900);line-height:1.4;">' + c.line + '</p></div>';
      if (i < 3) ladder += '<div style="width:18px;align-self:center;display:flex;justify-content:center;"><span style="width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:8px solid ' + arrowC[i] + ';"></span></div>';
    });
    var sets = d.hashtag_sets.map(function (s) {
      return '<div style="border:1px solid var(--ink-200);border-radius:12px;overflow:hidden;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--ink-50);padding:5px 11px;border-bottom:1px solid var(--ink-200);"><span class="mono sev-brand" style="font-size:9px;font-weight:700;">' + s.name + '</span>' +
          '<span class="mono" style="font-size:7.5px;font-weight:700;letter-spacing:.08em;color:var(--ink-400);border:1px solid var(--ink-300);border-radius:5px;padding:2px 7px;">COPY</span></div>' +
        '<p class="mono" style="font-size:9px;line-height:1.45;color:var(--ink-600);margin:0;padding:7px 11px;">' + s.tags + '</p></div>';
    }).join("");
    return '<section class="page" data-screen-label="16 Toolkit CTAs">' +
      BP.head("Section 05 · The copy-and-use toolkit", "CTAs &amp; hashtag sets") +
      '<div class="body">' +
        '<p class="eyebrow">Intent-based CTA lines</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:32px;">Match the ask to the moment.</h2>' +
        '<p class="lead" style="margin-top:10px;max-width:152mm;">Different viewers are at different stages. Climb the ladder with them — match the ask to the moment, and never end a post on a full stop.</p>' +
        '<div style="margin-top:11px;display:flex;align-items:stretch;gap:0;">' + ladder + '</div>' +
        '<div style="margin-top:8px;display:flex;align-items:center;gap:11px;"><span class="mono" style="font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-400);">Lower intent</span>' +
          '<div style="flex:1;height:6px;border-radius:999px;background:linear-gradient(90deg,var(--ink-300),var(--brand-400) 45%,var(--brand-600) 72%,var(--warning));"></div>' +
          '<span class="mono" style="font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#9A6B14;">Ready to buy</span></div>' +
        '<h3 class="kicker" style="font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-400);margin-top:14px !important;">Localized hashtag sets · copy-ready</h3>' +
        '<div class="grid3" style="margin-top:12px;">' + sets + '</div>' +
        '<div class="fnote amber" style="margin-top:auto;padding:11px 16px 11px 14px;"><div class="ic">↻</div><div><p class="lbl">Action note · how to use</p><p>' + d.hashtag_how_to + '</p></div></div>' +
      '</div>' + BP.foot(16) + '</section>';
  });

  /* ---- P17 · 30-DAY CALENDAR --------------------------------------------*/
  var FMT_PILL = { Carousel: "brand", Reel: "amber", Static: "green" };
  P.push(function (d) {
    var rows = d.calendar.map(function (w, i) {
      var bg = i === 0 ? "var(--ink-900)" : i === 3 ? "var(--grad-azure)" : "var(--ink-800)";
      var monoC = i === 3 ? "rgba(255,255,255,.85)" : "var(--brand-300)";
      var posts = w.posts.map(function (post) {
        var tone = FMT_PILL[post.format] || "brand";
        return '<div class="card" style="padding:11px 13px;"><span class="pill ' + tone + '" style="font-size:8px;padding:2px 7px;">' + post.format + '</span>' +
          '<p style="margin:7px 0 0;font-size:11px;color:var(--ink-900);font-weight:600;">' + post.title + '</p>' +
          '<p class="small" style="margin:2px 0 0;">' + post.note + '</p></div>';
      }).join("");
      var two = "0" + w.week;
      return '<div style="display:grid;grid-template-columns:90px 1fr 1fr 1fr;gap:9px;align-items:stretch;">' +
        '<div style="background:' + bg + ';border-radius:12px;padding:12px;display:flex;flex-direction:column;justify-content:center;">' +
          '<p class="mono" style="font-size:8px;letter-spacing:.12em;color:' + monoC + ';margin:0;">WEEK ' + two + '</p>' +
          '<p style="font-family:var(--font-display);color:#fff;font-size:17px;margin:3px 0 0;">' + w.theme + '</p></div>' + posts + '</div>';
    }).join("");
    var calCells = "";
    for (var k = 0; k < 4; k++) {
      calCells += '<div class="wk">W' + (k + 1) + '</div>' +
        '<div class="cell on"><span class="pt" style="background:var(--brand-500);"></span></div><div class="cell"></div>' +
        '<div class="cell on"><span class="pt" style="background:var(--brand-300);"></span></div><div class="cell"></div>' +
        '<div class="cell on"><span class="pt" style="background:var(--success);"></span></div><div class="cell"></div><div class="cell"></div>';
    }
    return '<section class="page" data-screen-label="17 30-Day Calendar">' +
      BP.head("Section 06 · The 30-day calendar", "12 posts · 4 weeks") +
      '<div class="body">' +
        '<p class="eyebrow">Section 06 · The master calendar</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:32px;">Your month, already written.</h2>' +
        '<p class="lead" style="margin-top:10px;max-width:152mm;font-size:13px;">Twelve strategic posts — three a week — that walk a stranger from “who are these people?” to “let\'s book a call.” Each cell has a format and an angle. Just make it.</p>' +
        '<div style="margin-top:18px;display:flex;flex-direction:column;gap:10px;">' + rows + '</div>' +
        '<div class="fig"><p class="fig-h"><span class="tag">Fig. 08</span> Three slots a week — the month at a glance</p>' +
          '<div class="cal"><div></div><div class="hd">Mon</div><div class="hd">Tue</div><div class="hd">Wed</div><div class="hd">Thu</div><div class="hd">Fri</div><div class="hd">Sat</div><div class="hd">Sun</div>' + calCells + '</div>' +
          '<div style="display:flex;gap:20px;margin-top:14px;"><span class="leg"><span class="sw" style="background:var(--brand-500);"></span> Mon · Educate (carousel)</span>' +
            '<span class="leg"><span class="sw" style="background:var(--brand-300);"></span> Wed · Connect (reel)</span>' +
            '<span class="leg"><span class="sw" style="background:var(--success);"></span> Fri · Prove / Convert</span></div></div>' +
      '</div>' + BP.foot(17) + '</section>';
  });

  /* ---- P18 · CADENCE & THEMES -------------------------------------------*/
  P.push(function (d) {
    function rowKV(k, v, c) { return '<div style="display:flex;justify-content:space-between;font-size:10px;border-top:1px solid var(--ink-100);padding:5px 0;' + (k === "Format" ? "margin-top:9px;" : "") + '"><span class="mono" style="color:var(--ink-400);font-size:8px;letter-spacing:.06em;text-transform:uppercase;">' + k + '</span><span style="font-weight:600;color:' + (c || "var(--ink-800)") + ';">' + v + '</span></div>'; }
    var slots = d.cadence_slots.map(function (s) {
      return '<div class="card" style="padding:13px 15px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;"><p style="font-family:var(--font-display);font-size:22px;margin:0;color:var(--brand-600);">' + s.day + '</p><span class="pill ' + BP.tonePill(s.tone) + '" style="font-size:8px;padding:2px 8px;">' + s.purpose + '</span></div>' +
        rowKV("Format", s.format) + rowKV("Window", s.window) + rowKV("Watch", s.watch, BP.toneVar(s.watch_tone)) +
        '<p class="small" style="margin:7px 0 0;font-size:9.5px;font-style:italic;color:var(--ink-500);">' + s.example + '</p></div>';
    }).join("");
    var arc = d.four_week_arc.map(function (a, i) {
      var last = i === d.four_week_arc.length - 1;
      var two = "0" + a.n;
      return '<div style="display:grid;grid-template-columns:120px 1fr;gap:16px;align-items:center;' + (last ? "" : "border-bottom:1px solid var(--ink-100);padding-bottom:10px;") + '">' +
        '<p style="margin:0;font-family:var(--font-display);font-size:16px;color:' + (a.highlight ? "var(--brand-600)" : "var(--ink-900)") + ';">' + two + ' · ' + a.name + '</p>' +
        '<p style="margin:0;font-size:11.5px;">' + a.desc + '</p></div>';
    }).join("");
    var steps = "";
    d.weekly_workflow.forEach(function (w, i) {
      steps += '<div style="flex:1;text-align:center;display:flex;flex-direction:column;align-items:center;gap:5px;"><span style="width:24px;height:24px;border-radius:50%;background:' + (w.green ? "var(--success)" : "var(--brand-500)") + ';color:#fff;font-family:var(--font-mono);font-size:10px;font-weight:700;display:grid;place-items:center;">' + (i + 1) + '</span><span style="font-size:9.5px;line-height:1.3;color:var(--ink-700);"><strong>' + w.step + '</strong><br>' + w.label + '</span></div>';
      if (i < d.weekly_workflow.length - 1) steps += '<div style="width:16px;align-self:flex-start;margin-top:6px;display:flex;justify-content:center;"><span style="width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:7px solid var(--ink-300);"></span></div>';
    });
    return '<section class="page" data-screen-label="18 Cadence & Themes">' +
      BP.head("Section 06 · The 30-day calendar", "Cadence &amp; rhythm") +
      '<div class="body">' +
        '<p class="eyebrow">Posting cadence</p>' +
        '<h2 class="h1" style="margin-top:8px;font-size:32px;">Three slots a week. Keep them sacred.</h2>' +
        '<p class="lead" style="margin-top:10px;max-width:152mm;">Consistency beats intensity. Block the same three windows every week and the calendar runs itself.</p>' +
        '<div class="grid3" style="margin-top:18px;">' + slots + '</div>' +
        '<h3 class="kicker" style="margin-top:26px;font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-400);">The four-week arc</h3>' +
        '<div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">' + arc + '</div>' +
        '<div class="card tint" style="margin-top:auto;padding:14px 17px;">' +
          '<div style="display:flex;align-items:center;gap:11px;margin-bottom:12px;"><img src="assets/botlogix-mascot.png" alt="" style="height:30px;flex:none;">' +
            '<p style="margin:0;font-size:11.5px;"><strong>Batch it — the weekly workflow.</strong> Two focused hours on Sunday covers the whole week and removes the daily “what do I post?” tax.</p></div>' +
          '<div style="display:flex;align-items:flex-start;gap:0;">' + steps + '</div></div>' +
      '</div>' + BP.foot(18) + '</section>';
  });

  /* ---- P19 · ACCOUNTABILITY BRIDGE --------------------------------------*/
  P.push(function (d) {
    var metrics = d.narrative.checkpoint_metrics.map(function (m) {
      return '<span style="display:flex;align-items:center;gap:7px;font-size:11px;color:#EAF1F6;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px 13px;"><span style="width:7px;height:7px;border-radius:50%;background:var(--brand-300);"></span> ' + m + '</span>';
    }).join("");
    var pday = String(d.prepared_date).split(",")[0];
    return '<section class="page dark" data-screen-label="19 Accountability Bridge">' +
      BP.head("Section 06 · The checkpoint", "The accountability bridge") +
      '<div class="body" style="justify-content:center;">' +
        '<p class="eyebrow" style="color:var(--brand-300);">The checkpoint</p>' +
        '<h1 class="display" style="font-size:40px;margin-top:14px;max-width:152mm;color:#fff;">Let\'s measure it on <span style="color:var(--brand-300);">' + (d.checkpoint_short || d.checkpoint_date) + '</span>.</h1>' +
        '<p class="lead" style="color:#B6CAD9;margin-top:16px;max-width:150mm;font-size:14px;">' + BP.fmt(d.narrative.accountability_intro) + '</p>' +
        '<div class="grid3" style="margin-top:30px;">' +
          '<div style="border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px;text-align:center;"><p class="mono" style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);margin:0 0 8px;">Today</p><p style="font-family:var(--font-display);font-size:40px;color:#fff;margin:0;line-height:1;">' + d.current_score + '</p><p class="small" style="color:#8FA6B7;margin:6px 0 0;">Power level · ' + pday + '</p></div>' +
          '<div style="border:1px solid rgba(42,143,214,.4);background:rgba(42,143,214,.1);border-radius:14px;padding:18px;text-align:center;"><p class="mono" style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand-300);margin:0 0 8px;">30-day target</p><p style="font-family:var(--font-display);font-size:40px;color:var(--brand-300);margin:0;line-height:1;">' + d.target_score + '</p><p class="small" style="color:#8FA6B7;margin:6px 0 0;">Checkpoint · ' + (d.checkpoint_short || d.checkpoint_date) + '</p></div>' +
          '<div style="border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:18px;text-align:center;"><p class="mono" style="font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);margin:0 0 8px;">The move</p><p style="font-family:var(--font-display);font-size:40px;color:var(--success);margin:0;line-height:1;">' + d.score_delta + '</p><p class="small" style="color:#8FA6B7;margin:6px 0 0;">In a single month</p></div>' +
        '</div>' +
        '<div style="margin-top:24px;border-left:3px solid var(--brand-400);padding-left:16px;"><p style="margin:0;color:#CFE0EC;font-size:13px;">' + BP.fmt(d.narrative.accountability_review) + '</p></div>' +
        '<div style="margin-top:26px;"><p class="mono" style="font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin:0 0 11px;">What we measure again on ' + (d.checkpoint_short || d.checkpoint_date) + '</p>' +
          '<div style="display:flex;gap:9px;flex-wrap:wrap;">' + metrics + '</div></div>' +
      '</div>' + BP.foot(19) + '</section>';
  });

  /* ---- P20 · CLOSE -------------------------------------------------------*/
  P.push(function (d) {
    var cards = d.offer_paths.map(function (o, i) {
      var two = "0" + (i + 1);
      if (o.popular) {
        return '<div style="background:linear-gradient(160deg,rgba(42,143,214,.22),rgba(42,143,214,.08));border:1px solid rgba(42,143,214,.45);border-radius:16px;padding:18px;position:relative;">' +
          '<span class="mono" style="position:absolute;top:-9px;left:18px;font-size:7.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#06283D;background:var(--brand-300);border-radius:5px;padding:3px 8px;">Most popular</span>' +
          '<p class="mono" style="font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-300);margin:0 0 9px;">Path ' + two + '</p>' +
          '<p style="margin:0;color:#fff;font-weight:700;font-size:14px;">' + o.name + '</p>' +
          '<p class="small" style="color:#CFE0EC;margin:7px 0 0;line-height:1.5;">' + o.desc + '</p></div>';
      }
      return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:18px;">' +
        '<p class="mono" style="font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.4);margin:0 0 9px;">Path ' + two + '</p>' +
        '<p style="margin:0;color:#fff;font-weight:700;font-size:14px;">' + o.name + '</p>' +
        '<p class="small" style="color:#9FB6C7;margin:7px 0 0;line-height:1.5;">' + o.desc + '</p></div>';
    }).join("");
    return '<section class="page dark" data-screen-label="20 Close" style="padding:0;">' +
      '<div style="position:absolute;inset:0;background:var(--grad-deep);"></div>' +
      '<div style="position:absolute;bottom:-150px;right:-120px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(42,143,214,.3),transparent 66%);"></div>' +
      '<div style="position:relative;height:100%;display:flex;flex-direction:column;padding:22mm 20mm 18mm;">' +
        '<img src="assets/botlogix-logo.png" alt="BotLogix" style="height:62px;width:auto;align-self:center;">' +
        '<div style="margin-top:auto;">' +
          '<p class="eyebrow" style="color:var(--brand-300);">What happens next</p>' +
          '<h1 class="display" style="font-size:44px;margin-top:14px;color:#fff;max-width:150mm;">' + d.narrative.close_headline + '</h1>' +
          '<p class="lead" style="color:#B6CAD9;margin-top:16px;max-width:140mm;font-size:14px;">' + BP.fmt(d.narrative.close_lead) + '</p>' +
          '<div class="grid3" style="margin-top:26px;gap:14px;">' + cards + '</div>' +
        '</div>' +
        '<div style="margin-top:26px;border-top:1px solid rgba(255,255,255,.12);padding-top:18px;display:flex;justify-content:space-between;align-items:flex-end;">' +
          '<div><p class="mono" style="font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin:0 0 6px;">Book the next step</p>' +
            '<p style="margin:0;color:#fff;font-size:14px;font-weight:600;">' + d.contact.name + '</p>' +
            '<p class="small" style="color:#8FA6B7;margin:2px 0 0;">' + d.contact.site + '</p></div>' +
          '<div style="text-align:right;"><p class="mono" style="font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45);margin:0 0 4px;">Next checkpoint</p>' +
            '<p style="margin:0;font-family:var(--font-display);font-size:20px;color:var(--brand-300);">' + d.checkpoint_date + '</p></div>' +
        '</div>' +
      '</div></section>';
  });
})();
