/* ============================================================================
 * Instagram Growth Blueprint — CLIENT DATA
 * ----------------------------------------------------------------------------
 * THIS is the only file your workflow regenerates per client.
 * Edit the values, keep the keys. Open blueprint.html → the 20 pages re-skin.
 *
 *  • Field contract + cardinalities: see  Blueprint - Data Schema.md
 *  • Scores / percentages = integers 0–100 (no % sign — the template adds it).
 *  • Charts (radar, rings, ladder, bars, calendar) are COMPUTED from the scores
 *    below — you never position anything by hand.
 *  • [brackets] in the toolkit copy stay literal (they're prompts for the reader).
 *
 * Current instance: Northside Studio (the canonical example).
 * ==========================================================================*/

window.BLUEPRINT_DATA = {

  /* 1 · META ---------------------------------------------------------------*/
  client_name: "Northside Studio",
  handle: "@northsidestudio",
  client_descriptor: "Social-first creative studio",
  city: "Hamilton",
  region: "Hamilton, ON",
  cta_link: "northsidestudio.ca/start",
  prepared_by: "Steffen deGraaf · BotLogix",
  prepared_date: "May 31, 2026",
  checkpoint_date: "June 27, 2026",
  checkpoint_short: "June 27",          // short form used in headlines
  current_score: 46,
  target_score: 68,
  score_delta: "+22",                   // = target_score − current_score
  profile_stats: { posts: 128, followers: "1,940", following: 312 },
  profile_bio: "We make Hamilton businesses impossible to scroll past. 📍 HamOnt · book a free audit ↓",

  /* 2 · PILLARS — exactly 5, in order. Drive radar, ladder, deep-dives ------*/
  pillars: [
    {
      key: "local_visibility", name: "Local visibility", score: 0, status: "Fix first",
      eyebrow: "Pillar 01 · Get found", chip_tone: "red",
      one_liner: "The single lowest score in the audit — and the highest-leverage thing to fix this week.",
      what_measured: "Geotags on posts, use of local hashtags, a location and service area in the bio, and neighbourhood mentions in captions. Across the last 30 posts: <strong>0% geotagged</strong>, <strong>no local hashtag sets</strong>, and the bio names no city.",
      why_matters: "The large majority of local discovery on Instagram happens through location pages and local hashtag surfaces. With zero location signals, you are effectively invisible to the " + "Hamilton-area businesses most likely to hire you — no matter how good the work is.",
      what_next: "Add your city to the handle line and bio, geotag <strong>every</strong> post to a real Hamilton location, build three localized hashtag sets (Local · Niche · Community), and put your service area in the first line of every caption. All of this is on Day 1 and Day 3 of the plan.",
      metrics: [
        { label: "Geotagged posts", value: "0%", target: "100%" },
        { label: "Local hashtag sets", value: "0", target: "3 sets" },
        { label: "City in bio", value: "No", target: "Yes" }
      ]
    },
    {
      key: "profile_conversion", name: "Profile conversion", score: 55, status: "Needs work",
      eyebrow: "Pillar 02 · Make sense fast", chip_tone: "amber",
      one_liner: "A visitor decides in about three seconds whether to follow or bounce. Right now it's a coin-flip.",
      what_measured: "Profile photo clarity, the bio's value proposition, a single clear CTA link, story highlights, and pinned posts. You have a clean photo and a working link, but the bio reads as a label, not a promise — and nothing is pinned to greet a first-time visitor.",
      why_matters: "The profile is the storefront window. People arrive from a single post, glance at the top of the profile, and decide instantly. A vague bio and an empty pinned row means even interested visitors leave without understanding what you'd do for them.",
      what_next: "Write a one-line value prop (“We make local Hamilton businesses impossible to scroll past”), set a single CTA link, add three highlights — <strong>Work · Reviews · Start here</strong> — and pin three conversion posts. Days 1, 2 and 4.",
      metrics: [
        { label: "Value-prop bio", value: "Weak", tone: "amber" },
        { label: "CTA link", value: "Present", tone: "green" },
        { label: "Highlights", value: "None", tone: "red" },
        { label: "Pinned posts", value: "0 / 3", tone: "red" }
      ]
    },
    {
      key: "content_performance", name: "Content performance", score: 50, status: "Needs work",
      eyebrow: "Pillar 03 · Be worth following", chip_tone: "amber",
      one_liner: "The algorithm rewards saves and sends. A static-only feed with soft hooks caps your reach.",
      what_measured: "Hook strength, format mix (reels / carousels / statics), posting cadence, save-and-share signals, and caption length. You post about <strong>1.2×/week</strong>, mostly single static images, with captions averaging ~40 words and roughly <strong>3 saves</strong> per post.",
      why_matters: "Reach today is earned by saves and shares, and those come from reels and carousels with a hook in the first three words. A low-cadence, static feed gives the algorithm almost nothing to push — so good work reaches almost no one new.",
      what_next: "Lead with reels and carousels, put the hook in the first three words, post <strong>4×/week</strong>, and write captions that earn the save (a clear takeaway people want to keep). The toolkit on pages 15–16 gives you the hooks and frameworks to do it fast.",
      // P8 format-mix figure: today vs target (percent shares)
      format_mix: {
        today:  { reels: 10, carousels: 5, static: 85, saves: "3 saves" },
        target: { reels: 40, carousels: 35, static: 25, saves: "30+ saves" }
      },
      metrics: [
        { label: "Reels share", value: "10%", target: "40%" },
        { label: "Carousels", value: "5%", target: "35%" },
        { label: "Static posts", value: "85%", target: "25%" },
        { label: "Posts / week", value: "1.2", target: "4.0" }
      ]
    },
    {
      key: "sales_readiness", name: "Sales readiness", score: 56, status: "Needs work",
      eyebrow: "Pillar 04 · Drive action", chip_tone: "amber",
      one_liner: "Reach without a path to “talk to us” is vanity. Most posts end with a full stop, not a next step.",
      what_measured: "CTAs in captions, a DM funnel, offer clarity, visible social proof, and a lead-capture path. About <strong>1 in 5 posts</strong> has any call to action, there's no pinned offer, and testimonials live in a highlight that doesn't exist yet.",
      why_matters: "Every post is a chance to start a conversation. Without an intent-based CTA and an obvious next step, even the people you impress have nowhere to go — and the warm attention you earned cools off and disappears.",
      what_next: "Add an intent-based CTA to <strong>every</strong> post, pin an offer, put a “book a call” link in the bio, and surface three testimonials in a Reviews highlight. The CTA library on page 16 is built for exactly this.",
      // P9 funnel figure: 4 stages, top→bottom widths (%)
      funnel: [
        { label: "Reach earned by a post", width: 100 },
        { label: "Profile visit", width: 66 },
        { label: "Save / DM", width: 36 },
        { label: "Booked", width: 15 }
      ],
      metrics: [
        { label: "Posts w/ CTA", value: "~20%", tone: "amber" },
        { label: "Pinned offer", value: "None", tone: "red" },
        { label: "Social proof", value: "Hidden", tone: "amber" },
        { label: "Lead capture", value: "Link set", tone: "green" }
      ]
    },
    {
      key: "competitor_gap", name: "Competitor gap", score: 70, status: "Closest to par",
      eyebrow: "Pillar 05 · Stand out", chip_tone: "brand",
      one_liner: "Your best score. The accounts beside you in the feed are beatable — they're just out-working you on cadence.",
      what_measured: "Posting frequency, caption length, format mix and engagement, benchmarked against <strong>five regional accounts</strong> competing for the same Hamilton attention. They aren't more talented — they're more consistent and more local than you are right now.",
      why_matters: "You compete for the same local attention in the same feed. Right now they out-signal you on volume and format — but their local specificity is generic. That's the opening: be unmistakably Hamilton and you leapfrog them.",
      what_next: "Match their <strong>4–5 posts/week</strong>, borrow their carousel education format, and beat them on local specificity — real neighbourhoods, real landmarks, real client names. The full competitor breakdown is on the next two pages.",
      metrics: [
        { label: "Posts / week", value: "1.2", target: "4.0" },
        { label: "Locality", value: "Generic", target: "Specific" }
      ]
    }
  ],

  /* 3 · 5-STAGE CHAIN → P4 -------------------------------------------------*/
  chain: [
    { n: 1, name: "Get found", question: "Can the right local people discover you at all?", score: 6,  status: "Critical",   tone: "red",   bottleneck: true },
    { n: 2, name: "Make sense fast", question: "In 3 seconds, do they get who you help?", score: 55, status: "Needs work", tone: "amber" },
    { n: 3, name: "Be worth following", question: "Does it earn the save and the share?", score: 50, status: "Needs work", tone: "amber" },
    { n: 4, name: "Stand out", question: "Are you distinct from the feed beside you?", score: 62, status: "Developing", tone: "amber" },
    { n: 5, name: "Drive action", question: "Is there a clear next step to a conversation?", score: 56, status: "Needs work", tone: "amber" }
  ],
  chain_note: "Attention only flows one way. <strong>Stage 01 — Get found — is the bottleneck:</strong> at a 6, almost nobody reaches the other four stages, so improving them changes little. Fix discovery first and you raise the ceiling on every stage downstream. That's why the 7-day plan attacks it on Day 1.",

  /* 4 · COMPETITORS & DATA GAPS → P10–P12 ----------------------------------*/
  benchmark_count: 5,
  competitors: [
    { handle: "@awanidigitals", type: "Regional digital agency · educator", metric: "5 posts / wk",
      does_well: "Tight “swipe to learn” carousels with a strong promise on slide one. Value-first, never salesy.",
      borrow: "The <strong>5-slide carousel skeleton</strong>: problem → 3 tips → CTA. Fresh topic every week." },
    { handle: "@vitamindmarketing", type: "Founder-led studio · brand-consistent", metric: "4 posts / wk",
      does_well: "A recognisable brand system and founder face-to-camera reels that build trust fast.",
      borrow: "<strong>Founder reels + single-offer bio.</strong> Put a face to the studio; make the one booking obvious." },
    { handle: "@socialnest.co", type: "Local content shop · geo machine", metric: "90% geotagged",
      does_well: "Every post is location-stacked — geotag plus neighbourhood hashtags. They own local discovery.",
      borrow: "Their <strong>location-stacking method</strong> — exactly the thing your Pillar 1 is missing." },
    { handle: "@theburlingtonbrand", type: "Boutique brand studio · reels-first", metric: "60% reels",
      does_well: "Cinematic reels with one locked colour grade — the feed reads as a single unmistakable brand.",
      borrow: "A <strong>locked visual template</strong> — same fonts, grade and intro on every reel." },
    { handle: "@steeltownsocial", type: "Local social agency · community-first", metric: "Top DM volume",
      does_well: "Replies within the hour and reposts client wins — the conversation lives in the DMs.",
      borrow: "The <strong>daily 20-min engagement sprint</strong> that turns reach into relationships." }
  ],
  cadence_standings: {
    top_performer: { label: "Top performer · @awanidigitals", value: 5.0 },
    average:       { label: "Five-account average", value: 4.4 },
    you:           { label: "You · @northsidestudio", value: 1.2 },
    target_line:   4.0,
    scale_max:     5.0   // value that maps to a full bar
  },
  data_gaps: {
    benchmark_label: "Benchmarked against 5 regional accounts · table shows the two strongest",
    columns: ["@awanidigitals", "@vitamindmarketing"],
    rows: [
      { metric: "Posts / week",    you: "1.2",   comps: ["5.0","4.0"],      target: "4.0" },
      { metric: "Caption length",  you: "~40 w", comps: ["~120 w","~90 w"], target: "80–120 w" },
      { metric: "Reels share",     you: "10%",   comps: ["45%","50%"],      target: "40%" },
      { metric: "Carousels",       you: "5%",    comps: ["40%","30%"],      target: "35%" },
      { metric: "Geotagged posts", you: "0%",    comps: ["90%","70%"],      target: "100%" },
      { metric: "Avg saves / post",you: "3",     comps: ["60","40"],        target: "30+" }
    ],
    gap_cards: [
      { title: "The volume gap", value: "4×",  unit: "less often",        fill: 24, target: 80,  note: "Cadence is the cheapest lever — consistency, not budget." },
      { title: "The format gap", value: "15%", unit: "reels + carousels", fill: 19, target: 94,  note: "They live in reels &amp; carousels; you live in statics." },
      { title: "The local gap",  value: "0%",  unit: "geotagged",         fill: 2,  target: 100, note: "Zero vs their 70–90%. Fastest gap to close, highest payoff." }
    ],
    quick_win: "<strong>The geotag line is the easiest to close — it's a setting, not a skill.</strong> Every other gap takes weeks of consistent posting; this one moves the moment you tap “add location.” Start there and Pillar 1 climbs from your very next post."
  },

  /* 5 · 7-DAY PLAN → P13 (1–4) + P14 (5–7) ---------------------------------*/
  seven_day_plan: [
    { day: 1, minutes: 20, title: "Fix the profile signals", desc: "Add your city to the handle line, rewrite the bio to a one-line value prop, set the location and service area." },
    { day: 2, minutes: 25, title: "Highlights &amp; link", desc: "Build three highlight covers — Work · Reviews · Start here — and set one clear CTA link in the bio." },
    { day: 3, minutes: 30, title: "Build the hashtag systems", desc: "Create three saved localized sets — Local · Niche · Community — of ~12 tags each, ready to paste (page 16)." },
    { day: 4, minutes: 30, title: "Publish the pinned conversion posts", desc: "Post and pin three: <strong style=\"color:#fff;\">Who we help · Proof · The offer.</strong> The storefront a new visitor lands on." },
    { day: 5, minutes: 25, title: "Record your first reel", desc: "Founder face-to-camera, one useful tip, hook in the first three words, geotagged to a Hamilton location.", output: "First geotagged founder reel" },
    { day: 6, minutes: 20, title: "Build one carousel", desc: "Use the borrowed 5-slide skeleton: problem → 3 fixes → CTA. One topic your clients always ask about.", output: "First educational carousel" },
    { day: 7, minutes: 15, title: "Engagement sprint &amp; review", desc: "Comment on 10 local accounts, reply to every DM and comment, then glance back at the week.", output: "Week reviewed + next 3 posts planned" }
  ],
  week1_done_checklist: [
    "City + value-prop bio, location set",
    "3 highlights + single CTA link live",
    "3 localized hashtag sets saved",
    "3 pinned conversion posts",
    "First geotagged founder reel",
    "First educational carousel"
  ],
  week1_score_move: { from: 46, to: 53 },

  /* 6 · CALENDAR, CADENCE & RHYTHM → P17, P18 ------------------------------*/
  calendar: [
    { week: 1, theme: "Foundation", posts: [
      { format: "Carousel", title: "Who we help (pinned)", note: "The 3 businesses we make unmissable." },
      { format: "Reel", title: "Founder intro", note: "Face to camera: why this studio exists." },
      { format: "Static", title: "Local proof", note: "A Hamilton client result, geotagged." } ] },
    { week: 2, theme: "Authority", posts: [
      { format: "Carousel", title: "Problem → 3 fixes", note: "The borrowed education skeleton." },
      { format: "Reel", title: "Myth-buster", note: "One thing local owners get wrong." },
      { format: "Static", title: "Behind the scenes", note: "How a post actually gets made." } ] },
    { week: 3, theme: "Proof", posts: [
      { format: "Carousel", title: "Case study", note: "Before → what we did → after." },
      { format: "Static", title: "Testimonial", note: "A real client quote, on brand." },
      { format: "Reel", title: "Before / after", note: "A visible transformation in 15s." } ] },
    { week: 4, theme: "Convert", posts: [
      { format: "Static", title: "The offer", note: "One clear thing to book, pinned." },
      { format: "Carousel", title: "FAQ", note: "The 5 questions before they buy." },
      { format: "Reel", title: "“Booking June”", note: "Local urgency CTA to the link." } ] }
  ],
  cadence_slots: [
    { day: "Mon", purpose: "Educate", tone: "brand", format: "Carousel", window: "11:00–13:00", watch: "Saves", watch_tone: "brand", example: "“3 fixes most [niche] miss”" },
    { day: "Wed", purpose: "Connect", tone: "brand", format: "Reel", window: "17:00–19:00", watch: "Follows · visits", watch_tone: "brand", example: "Founder face-to-camera tip" },
    { day: "Fri", purpose: "Prove / Convert", tone: "green", format: "Static or reel", window: "12:00–14:00", watch: "DMs · link clicks", watch_tone: "green", example: "A client win, or the offer" }
  ],
  four_week_arc: [
    { n: 1, name: "Foundation", desc: "Tell people who you help and prove you're real and local. Build the trust floor." },
    { n: 2, name: "Authority", desc: "Teach. Every post leaves them smarter and positions you as the obvious expert." },
    { n: 3, name: "Proof", desc: "Show results. Case studies and testimonials turn interest into belief." },
    { n: 4, name: "Convert", desc: "Make the ask. A clear offer and local urgency turn a warm audience into booked calls.", highlight: true }
  ],
  weekly_workflow: [
    { step: "Sun", label: "Choose topics" },
    { step: "Mon", label: "Publish carousel" },
    { step: "Wed", label: "Publish reel" },
    { step: "Fri", label: "Proof / offer" },
    { step: "Weekly", label: "Check saves · DMs · visits", green: true }
  ],

  /* 7 · TOOLKIT → P15, P16 -------------------------------------------------*/
  hook_starters: [
    "If you run a [business type] in [city], stop doing [common mistake].",
    "3 reasons [local audience] aren't booking with you yet.",
    "The [city] [niche] playbook nobody hands you.",
    "We took a [client type] in [neighbourhood] from [before] to [after].",
    "Save this if you [target action] in [city]."
  ],
  caption_frameworks: [
    { name: "PAS", body: "Problem → Agitate → Solve → CTA. The default for a pain your audience feels." },
    { name: "Local proof", body: "Hook → mini case study → “we're [n] min from [landmark]” → CTA." },
    { name: "The list", body: "Hook → 3 numbered tips → “which are you trying?” → CTA. Perfect for carousels." }
  ],
  // P15 hook-anatomy figure (illustrative example caption)
  hook_anatomy: {
    hook: "Stop losing Hamilton clients", body: " to a prettier feed — three fixes most local studios miss. ", cta: "DM “AUDIT”", tail: " for a free look.",
    tags: ["Hook in the first 3 words", "Local specificity", "CTA = a clear next step"]
  },
  cta_ladder: [
    { stage: "Awareness", line: "“Follow for <span class=\"mono sev-brand\" style=\"font-size:9.5px;\">[city]</span> <span class=\"mono sev-brand\" style=\"font-size:9.5px;\">[niche]</span> tips every week.”" },
    { stage: "Consideration", line: "“Save this for when you're ready to <span class=\"mono sev-brand\" style=\"font-size:9.5px;\">[outcome]</span>.”" },
    { stage: "Decision", line: "“DM <strong>AUDIT</strong> for a free 15-min look at your account.”" },
    { stage: "Local urgency", line: "“Booking <span class=\"mono sev-brand\" style=\"font-size:9.5px;\">[month]</span> for <span class=\"mono sev-brand\" style=\"font-size:9.5px;\">[city]</span> businesses — link in bio.”" }
  ],
  hashtag_sets: [
    { name: "SET A · LOCAL", tags: "#HamOnt #HamiltonOntario #BurlingtonON #905 #GoldenHorseshoe #StoneyCreek #Ancaster #Dundas #DowntownHamilton #HamiltonBusiness #905Creative #SteelCity" },
    { name: "SET B · NICHE", tags: "#SocialMediaMarketing #ContentStrategy #SmallBusinessMarketing #ReelsStrategy #InstagramForBusiness #SocialMediaTips #ContentCreator #MarketingStudio #BrandBuilding #OrganicGrowth #SMMA #ContentThatConverts" },
    { name: "SET C · COMMUNITY", tags: "#ShopLocalHamilton #SupportLocal905 #HamiltonBiz #BurlingtonBusiness #LocalBusinessOntario #MadeInHamilton #HamiltonMakers #SupportSmallBiz #OntarioBusiness #ShopSmall905 #HamOntEats #LocalLove" }
  ],
  hashtag_how_to: "Mix <strong>~10–15 tags per post</strong> — a few from each set. Rotate them so you never repeat the exact same block, and always include at least three <strong>local</strong> tags to keep feeding Pillar 1.",

  /* 8 · OFFER & CONTACT → P20 ----------------------------------------------*/
  offer_paths: [
    { name: "Do it yourself", desc: "Follow the 7-day plan and the calendar. Everything you need is already in these pages." },
    { name: "Done with you", desc: "We build the systems, you make the content. A weekly 30-min working session keeps it on track.", popular: true },
    { name: "Done for you", desc: "We run the full 30 days end to end. You just show up for the founder reels." }
  ],
  contact: { name: "Steffen deGraaf · BotLogix", site: "botlogix.ca · Burlington, Ontario" },

  /* 9 · NARRATIVE — bespoke connective copy (the few non-schema paragraphs).
   *     Optional: omit any field and the engine derives a sensible default
   *     from the pillars/scores above. Provided here for the Northside instance.*/
  narrative: {
    cover_lead: "A full diagnostic of <strong style=\"color:#fff;\">{handle}</strong> — where you're invisible, where you're leaking attention, and the exact moves to fix it. Read it in ten minutes. Act on it Monday.",
    cover_powerline: "A long way from invisible to in-demand — and the climb is faster than you think.",
    hook_headline_unbuilt: "Not broken — <span style=\"color:var(--brand-300);\">unbuilt.</span>",
    hook_para_1: "Half the building blocks of a converting Instagram presence are missing — not because the work is hard, but because no one has handed you the order to do it in. <strong style=\"color:#fff;\">This document is that order.</strong>",
    hook_para_2: "One pillar is sitting at <strong style=\"color:var(--danger);\">zero</strong>. Fix it first and the score moves more in a week than the rest will move in a month.",
    hook_cards: [
      { tone: "red",   label: "Where you stand", text: "Invisible in local discovery. The right people can't find you." },
      { tone: "amber", label: "Where you leak",  text: "Visitors land, hesitate, and bounce. No clear next step." },
      { tone: "brand", label: "Where you win",   text: "The gap to local competitors is narrow — and entirely beatable." }
    ],
    hook_quote: "Something you can act on Monday — not a 60-page deck.",
    dashboard_cards: [
      { tone: "brand",   label: "Biggest opportunity", title: "Switch on local visibility", desc: "It's the one lever sitting at zero. Geotags, local hashtags and a service-area bio turn a silent account into one the right people actually surface." },
      { tone: "danger",  label: "Biggest weakness",    title: "Local visibility — <span class=\"sev-red\">0/100</span>", desc: "No location in the bio, zero geotagged posts, no local hashtag sets. To anyone searching Hamilton, you don't exist yet." },
      { tone: "warning", label: "Fastest win",         title: "Rewrite the bio + pin one post", desc: "Thirty minutes. A one-line value prop, your city, one CTA link, and a single “start here” pinned post. It compounds from the moment it's live." },
      { tone: "success", label: "30-day target",       title: "Power level <span class=\"sev-green\">46 → 68</span>", desc: "Get Found out of the red, a conversion-ready pinned grid, and a repeatable 3-posts-a-week rhythm you can actually keep." }
    ],
    dashboard_note: "<strong>Read this like a map, not a report card.</strong> The score is a starting coordinate, not a judgement. Local visibility is the locked bottom rung — clear it and every rung above climbs faster, because the fixes are ordered so the earliest moves unlock the rest.",
    accountability_intro: "A plan with no checkpoint is a wish. Thirty days from today we re-run this exact audit and watch the numbers move. Same five pillars, same scoring — so the progress is undeniable, not a vibe.",
    accountability_review: "On <strong style=\"color:#fff;\">{checkpoint_short}</strong> we'll review: did Get Found clear the red? Is the pinned grid converting? Is the 3-a-week rhythm holding? Then we set the next 30-day target together — and decide what's worth handing off so you can stop running it manually.",
    checkpoint_metrics: ["Local visibility", "Profile conversion", "Content cadence", "CTA usage", "Saves · DMs · profile visits"],
    close_headline: "You have the map.<br>Want us to drive?",
    close_lead: "Everything in here is yours to run solo — that's the point. But if you'd rather spend your time on clients than on captions, we'll execute the whole 30 days for you and report the score on {checkpoint_short}."
  }
};
