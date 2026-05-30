# Skill: Instagram Analysis

## Purpose
Analyze a single Instagram account and produce a structured markdown insight
report (profile, posts, reels, stories, carousels) for a BotLogix business unit.

## When to use
When asked to analyze, audit, or review an Instagram account for BotLogix,
BoxBuddy, or AEC Benefits.

## Required inputs
- Account handle(s) — start with the selected 5 per business unit, not all.
- Business unit (BotLogix / BoxBuddy / AEC Benefits).
- Time window (default: 30-day tracking).
- Any captured raw data (Apify export, Social Blade figures) if available.

## Process
1. Confirm the handle, business unit, and window.
2. Collect raw data: profile stats, recent posts, reels, stories, carousels.
   Keep raw figures and source links in a clearly labeled raw-data section.
3. Compute the basics: cadence, format mix, engagement per format, best/worst.
4. Separate observations (data) from recommendations (interpretation).
5. Mark anything unverified as `[TO CONFIRM]`.
6. Write the report in the output template structure.

## Output format
Structured markdown. Use the layout in
`.claude/references/instagram-analysis-output-template.md`.
Designed/PDF output only when explicitly requested.

## Quality rules
- Raw data separate from recommendations.
- Metric-aware advice only (never "post more" to an account already above market).
- Preserve source links. Mark uncertainty `[TO CONFIRM]`.
- Practical, direct, no hype.

## Reference files (read only when needed)
- `.claude/references/instagram-analysis-output-template.md`
- `.claude/references/carousel-review-reference.md`
- `.claude/references/thirty-day-success-meter-reference.md`
- `.claude/references/[unit]-brand-voice-reference.md`
