# Reference: Report Format

> On-demand reference. Read only when assembling a report.
> Real worked examples in this repo:
> - Single audit (markdown): `reports/audit-26.md`, `reports/audit-27.md`
> - Designed decks (Marp, only when explicitly requested): `reports/marp/*.md`
> - Implementation narrative: `docs/workbook-v2-implementation-note.md`

## Default report order
1. **Title + meta** — handle/unit, window, date.
2. **Summary** — short, plain-English.
3. **Top 3 Action Items** — specific and metric-aware, first thing the reader sees.
4. **Raw Data** — labeled, links preserved, no interpretation.
5. **Observations** — factual patterns.
6. **Recommendations** — interpretation anchored to observations.
7. **30-Day Delta** (if tracking) — see thirty-day-success-meter-reference.md.
8. **Open Questions / [TO CONFIRM]**.

## Rules
- Useful before pretty. Markdown is the default deliverable.
- Designed/PDF/Marp output only on explicit request, and only after the markdown
  logic is proven.
- Never mix raw data into recommendations.
- Practical, direct, human BotLogix language. No hype.
