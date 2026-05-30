# Reference: Competitor Tracking

> On-demand reference. Read only when building or reviewing a competitor set.

## Relevance gate (reject before you analyze)
Hard-reject handles that match on junk rather than category: music/DJ, tattoo,
event/model accounts, and matches produced by a bad category string (e.g. a raw
IG `business_category` like `None,Software`). Use a clean, inferred category for
the unit, not the raw IG string.

Score remaining candidates by keyword/category overlap with the unit's real
vocabulary. Keep a one-line human reason for each kept competitor.

## Output table
```markdown
| Competitor | Why relevant | Cadence | Format mix | Standout move |
|-----------|--------------|---------|-----------|---------------|
| @handle | [reason] | [x/wk] | [posts/reels/carousels] | [link — what they do] |
```

## What to copy / what to avoid
- **Copy**: [concrete, repeatable tactics observed in the set]
- **Avoid**: [things that underperform or are off-brand]

## Rules
- Don't analyze every competitor at once — track a focused set.
- Region-specific when local (Burlington = Burlington, ON).
- Raw data separate from recommendations; mark gaps `[TO CONFIRM]`.
