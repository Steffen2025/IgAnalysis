---
# ============================================================
# Instagram Growth Blueprint — EXAMPLE DATA (Northside Studio)
# This is a complete, valid instance of "Blueprint — Data Schema.md".
# Your Claude Code project should produce a file shaped exactly like this.
# ============================================================

# 1 · META
client_name: Northside Studio
handle: "@northsidestudio"
client_descriptor: Social-first creative studio
city: Hamilton
region: Hamilton, ON
cta_link: northsidestudio.ca/start
prepared_by: Steffen deGraaf · BotLogix
prepared_date: May 31, 2026
checkpoint_date: June 27, 2026
current_score: 46
target_score: 68
score_delta: "+22"
profile_stats: { posts: 128, followers: "1,940", following: 312 }
profile_bio: We make Hamilton businesses impossible to scroll past. HamOnt · book a free audit.

# 2 · PILLARS (exactly 5)
pillars:
  - key: local_visibility
    name: Local visibility
    score: 0
    status: Fix first
    one_liner: The single lowest score in the audit — and the highest-leverage thing to fix this week.
    what_measured: Geotags on posts, use of local hashtags, a location and service area in the bio, and neighbourhood mentions in captions. Across the last 30 posts, 0% geotagged, no local hashtag sets, and the bio names no city.
    why_matters: The large majority of local discovery on Instagram happens through location pages and local hashtag surfaces. With zero location signals you are effectively invisible to the Hamilton-area businesses most likely to hire you.
    what_next: Add your city to the handle and bio, geotag every post, build three localized hashtag sets, and put your service area in the first line of every caption.
    metrics:
      - { label: Geotagged posts,   value: "0%", target: "100%" }
      - { label: Local hashtag sets, value: "0", target: "3 sets" }
      - { label: City in bio,       value: "No", target: "Yes" }
  - key: profile_conversion
    name: Profile conversion
    score: 55
    status: Needs work
    one_liner: A visitor decides in about three seconds whether to follow or bounce. Right now it's a coin-flip.
    what_measured: Profile photo, bio value proposition, a single clear CTA link, story highlights, and pinned posts. Clean photo and working link, but the bio reads as a label and nothing is pinned.
    why_matters: The profile is the storefront window. A vague bio and empty pinned row means even interested visitors leave without understanding what you'd do for them.
    what_next: Write a one-line value prop, set a single CTA link, add three highlights (Work · Reviews · Start here), and pin three conversion posts.
    metrics:
      - { label: Value-prop bio, value: Weak,    target: Strong }
      - { label: CTA link,       value: Present, target: Present }
      - { label: Highlights,     value: None,    target: "3" }
      - { label: Pinned posts,   value: "0 / 3", target: "3 / 3" }
  - key: content_performance
    name: Content performance
    score: 50
    status: Needs work
    one_liner: The algorithm rewards saves and sends. A static-only feed with soft hooks caps your reach.
    what_measured: Hook strength, format mix, posting cadence, save/share signals, caption length. ~1.2 posts/week, mostly single statics, ~40-word captions, ~3 saves per post.
    why_matters: Reach is earned by saves and shares, which come from reels and carousels with a hook in the first three words. A low-cadence static feed gives the algorithm nothing to push.
    what_next: Lead with reels and carousels, hook in the first three words, post 4×/week, and write captions that earn the save.
    metrics:
      - { label: Reels share,  value: "10%", target: "40%" }
      - { label: Carousels,    value: "5%",  target: "35%" }
      - { label: Static posts, value: "85%", target: "25%" }
      - { label: Posts / week, value: "1.2", target: "4.0" }
  - key: sales_readiness
    name: Sales readiness
    score: 56
    status: Needs work
    one_liner: Reach without a path to “talk to us” is vanity. Most posts end with a full stop, not a next step.
    what_measured: CTAs in captions, a DM funnel, offer clarity, visible social proof, and a lead-capture path. ~1 in 5 posts has a CTA, no pinned offer, testimonials hidden.
    why_matters: Every post is a chance to start a conversation. Without an intent CTA and an obvious next step, warm attention cools and disappears.
    what_next: Add an intent CTA to every post, pin an offer, put a “book a call” link in the bio, and surface three testimonials in a Reviews highlight.
    metrics:
      - { label: Posts w/ CTA,  value: "~20%", target: "100%" }
      - { label: Pinned offer,  value: None,   target: "1" }
      - { label: Social proof,  value: Hidden, target: Visible }
      - { label: Lead capture,  value: Link set, target: Link set }
  - key: competitor_gap
    name: Competitor gap
    score: 70
    status: Closest to par
    one_liner: Your best score. The accounts beside you are beatable — they're just out-working you on cadence.
    what_measured: Posting frequency, caption length, format mix and engagement, benchmarked against five regional accounts.
    why_matters: You compete for the same local attention in the same feed. They out-signal you on volume and format, but their local specificity is generic — that's the opening.
    what_next: Match their 4–5 posts/week, borrow their carousel education format, and beat them on local specificity.
    metrics:
      - { label: Posts / week, value: "1.2", target: "4.0" }
      - { label: Locality,     value: Generic, target: Specific }

# 3 · 5-STAGE CHAIN
chain:
  - { n: 1, name: Get found,         question: Can the right local people discover you at all?, score: 6,  status: Critical,   bottleneck: true }
  - { n: 2, name: Make sense fast,    question: In 3 seconds, do they get who you help?,         score: 55, status: Needs work }
  - { n: 3, name: Be worth following, question: Does it earn the save and the share?,            score: 50, status: Needs work }
  - { n: 4, name: Stand out,          question: Are you distinct from the feed beside you?,       score: 62, status: Developing }
  - { n: 5, name: Drive action,       question: Is there a clear next step to a conversation?,    score: 56, status: Needs work }
chain_note: Stage 01 — Get found — is the bottleneck. At a 6, almost nobody reaches the other four stages. Fix discovery first and you raise the ceiling on every stage downstream.

# 4 · COMPETITORS & DATA GAPS
benchmark_count: 5
competitors:
  - { handle: "@awanidigitals",     type: Regional digital agency · educator,   metric: 5 posts / wk,   does_well: Tight “swipe to learn” carousels with a strong promise on slide one., borrow: The 5-slide carousel skeleton — problem → 3 tips → CTA. }
  - { handle: "@vitamindmarketing", type: Founder-led studio · brand-consistent, metric: 4 posts / wk,   does_well: A recognisable brand system and founder face-to-camera reels.,        borrow: Founder reels + single-offer bio. }
  - { handle: "@socialnest.co",     type: Local content shop · geo machine,      metric: 90% geotagged,  does_well: Every post is location-stacked — they own local discovery.,            borrow: Their location-stacking method. }
  - { handle: "@theburlingtonbrand",type: Boutique brand studio · reels-first,   metric: 60% reels,      does_well: Cinematic reels with one locked colour grade.,                        borrow: A locked visual template — same fonts, grade and intro on every reel. }
  - { handle: "@steeltownsocial",   type: Local social agency · community-first, metric: Top DM volume,  does_well: Replies within the hour and reposts client wins.,                     borrow: The daily 20-min engagement sprint. }
cadence_standings:
  top_performer: { label: "Top performer · @awanidigitals", value: 5.0 }
  average:       { label: Five-account average, value: 4.4 }
  you:           { label: "You · @northsidestudio", value: 1.2 }
  target_line:   4.0
data_gaps:
  benchmark_label: Benchmarked against 5 regional accounts · table shows the two strongest
  columns: ["@awanidigitals", "@vitamindmarketing"]
  rows:
    - { metric: Posts / week,     you: "1.2",   comps: ["5.0","4.0"],     target: "4.0" }
    - { metric: Caption length,   you: "~40 w", comps: ["~120 w","~90 w"], target: "80–120 w" }
    - { metric: Reels share,      you: "10%",   comps: ["45%","50%"],     target: "40%" }
    - { metric: Carousels,        you: "5%",    comps: ["40%","30%"],     target: "35%" }
    - { metric: Geotagged posts,  you: "0%",    comps: ["90%","70%"],     target: "100%" }
    - { metric: Avg saves / post, you: "3",     comps: ["60","40"],       target: "30+" }
  gap_cards:
    - { title: The volume gap, value: "4×",  unit: less often,         fill: 24, target: 80 }
    - { title: The format gap, value: "15%", unit: reels + carousels,  fill: 19, target: 94 }
    - { title: The local gap,  value: "0%",  unit: geotagged,          fill: 2,  target: 100 }
  quick_win: The geotag line is the easiest to close — it's a setting, not a skill. Start there and Pillar 1 climbs from your very next post.

# 5 · 7-DAY PLAN
seven_day_plan:
  - { day: 1, minutes: 20, title: Fix the profile signals,            desc: Add your city to the handle line, rewrite the bio to a one-line value prop, set the location and service area. }
  - { day: 2, minutes: 25, title: Highlights & link,                  desc: Build three highlight covers — Work · Reviews · Start here — and set one clear CTA link in the bio. }
  - { day: 3, minutes: 30, title: Build the hashtag systems,          desc: Create three saved localized sets — Local · Niche · Community — of ~12 tags each, ready to paste. }
  - { day: 4, minutes: 30, title: Publish the pinned conversion posts, desc: Post and pin three — Who we help · Proof · The offer. }
  - { day: 5, minutes: 25, title: Record your first reel,             desc: Founder face-to-camera, one useful tip, hook in the first three words, geotagged to a Hamilton location., output: First geotagged founder reel }
  - { day: 6, minutes: 20, title: Build one carousel,                 desc: Use the 5-slide skeleton — problem → 3 fixes → CTA — on a topic clients always ask about., output: First educational carousel }
  - { day: 7, minutes: 15, title: Engagement sprint & review,         desc: Comment on 10 local accounts, reply to every DM and comment, then review the week., output: Week reviewed + next 3 posts planned }
week1_done_checklist:
  - City + value-prop bio, location set
  - 3 highlights + single CTA link live
  - 3 localized hashtag sets saved
  - 3 pinned conversion posts
  - First geotagged founder reel
  - First educational carousel
week1_score_move: { from: 46, to: 53 }

# 6 · CALENDAR, CADENCE & RHYTHM
calendar:
  - week: 1
    theme: Foundation
    posts:
      - { format: Carousel, title: Who we help (pinned), note: The 3 businesses we make unmissable. }
      - { format: Reel,     title: Founder intro,        note: "Face to camera: why this studio exists." }
      - { format: Static,   title: Local proof,          note: A Hamilton client result, geotagged. }
  - week: 2
    theme: Authority
    posts:
      - { format: Carousel, title: Problem → 3 fixes, note: The borrowed education skeleton. }
      - { format: Reel,     title: Myth-buster,      note: One thing local owners get wrong. }
      - { format: Static,   title: Behind the scenes, note: How a post actually gets made. }
  - week: 3
    theme: Proof
    posts:
      - { format: Carousel, title: Case study,   note: Before → what we did → after. }
      - { format: Static,   title: Testimonial,  note: A real client quote, on brand. }
      - { format: Reel,     title: Before / after, note: A visible transformation in 15s. }
  - week: 4
    theme: Convert
    posts:
      - { format: Static,   title: The offer,    note: One clear thing to book, pinned. }
      - { format: Carousel, title: FAQ,          note: The 5 questions before they buy. }
      - { format: Reel,     title: "“Booking June”", note: Local urgency CTA to the link. }
cadence_slots:
  - { day: Mon, purpose: Educate,         format: Carousel,       window: "11:00–13:00", watch: Saves,            example: "“3 fixes most [niche] miss”" }
  - { day: Wed, purpose: Connect,         format: Reel,           window: "17:00–19:00", watch: Follows · visits, example: Founder face-to-camera tip }
  - { day: Fri, purpose: Prove / Convert, format: Static or reel, window: "12:00–14:00", watch: DMs · link clicks, example: A client win, or the offer }
four_week_arc:
  - { n: 1, name: Foundation, desc: Tell people who you help and prove you're real and local. }
  - { n: 2, name: Authority,  desc: Teach. Every post leaves them smarter and positions you as the obvious expert. }
  - { n: 3, name: Proof,      desc: Show results. Case studies and testimonials turn interest into belief. }
  - { n: 4, name: Convert,    desc: Make the ask. A clear offer and local urgency turn a warm audience into booked calls. }
weekly_workflow:
  - { step: Sun,    label: Choose topics }
  - { step: Mon,    label: Publish carousel }
  - { step: Wed,    label: Publish reel }
  - { step: Fri,    label: Proof / offer }
  - { step: Weekly, label: Check saves · DMs · visits }

# 7 · TOOLKIT
hook_starters:
  - "If you run a [business type] in [city], stop doing [common mistake]."
  - "3 reasons [local audience] aren't booking with you yet."
  - "The [city] [niche] playbook nobody hands you."
  - "We took a [client type] in [neighbourhood] from [before] to [after]."
  - "Save this if you [target action] in [city]."
caption_frameworks:
  - { name: PAS,         body: Problem → Agitate → Solve → CTA. The default for a pain your audience feels. }
  - { name: Local proof, body: "Hook → mini case study → “we're [n] min from [landmark]” → CTA." }
  - { name: The list,    body: Hook → 3 numbered tips → “which are you trying?” → CTA. Perfect for carousels. }
cta_ladder:
  - { stage: Awareness,     line: "“Follow for [city] [niche] tips every week.”" }
  - { stage: Consideration, line: "“Save this for when you're ready to [outcome].”" }
  - { stage: Decision,      line: "“DM AUDIT for a free 15-min look at your account.”" }
  - { stage: Local urgency, line: "“Booking [month] for [city] businesses — link in bio.”" }
hashtag_sets:
  - { name: SET A · LOCAL,     tags: "#HamOnt #HamiltonOntario #BurlingtonON #905 #GoldenHorseshoe #StoneyCreek #Ancaster #Dundas #DowntownHamilton #HamiltonBusiness #905Creative #SteelCity" }
  - { name: SET B · NICHE,     tags: "#SocialMediaMarketing #ContentStrategy #SmallBusinessMarketing #ReelsStrategy #InstagramForBusiness #SocialMediaTips #ContentCreator #MarketingStudio #BrandBuilding #OrganicGrowth #SMMA #ContentThatConverts" }
  - { name: SET C · COMMUNITY, tags: "#ShopLocalHamilton #SupportLocal905 #HamiltonBiz #BurlingtonBusiness #LocalBusinessOntario #MadeInHamilton #HamiltonMakers #SupportSmallBiz #OntarioBusiness #ShopSmall905 #HamOntEats #LocalLove" }
hashtag_how_to: Mix ~10–15 tags per post — a few from each set. Rotate them so you never repeat the exact same block, and always include at least three local tags to keep feeding Pillar 1.

# 8 · OFFER & CONTACT
offer_paths:
  - { name: Do it yourself, desc: Follow the 7-day plan and the calendar. Everything you need is already in these pages. }
  - { name: Done with you,  desc: We build the systems, you make the content. A weekly 30-min working session keeps it on track., popular: true }
  - { name: Done for you,   desc: We run the full 30 days end to end. You just show up for the founder reels. }
contact:
  name: Steffen deGraaf · BotLogix
  site: botlogix.ca · Burlington, Ontario
---

# Notes (ignored by the filler)

This block is the canonical example output. Everything above the closing `---`
is the data; prose below it is free-form and not parsed.
