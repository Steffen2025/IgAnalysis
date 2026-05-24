import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface PostTemplate {
  number: number;
  style: string;
  title: string;
  purpose: string;
  copy: string;
  whenToUse: string;
}

function buildTemplates(data: ReportData): PostTemplate[] {
  const city = data.audit.city ?? "[city]";
  const cat = data.audit.business_category ?? "service business";
  const offer = data.audit.main_offer ?? "AI automation";
  const audience = data.audit.target_audience ?? "small business owners";
  const citySlug = city.toLowerCase().replace(/\s+/g, "");

  return [
    {
      number: 1,
      style: "THE WIN STORY",
      title: "Build trust through proof",
      purpose: "The single highest-impact content type for service businesses. One real client result, told specifically, does more than ten motivational posts.",
      copy: `Last week we helped a [client type] save [X hours / $X / Y leads].

Before: [1–2 sentences describing the pain point]

What we built: [1–2 sentences describing the ${offer} solution]

What it's doing now: [specific numbers]

If your week looks like that, send "AUTOMATE" in a DM.

#${citySlug}business #aiautomation #[clientindustry] #${citySlug}agency`,
      whenToUse: "Monday. Once per week. Builds trust and generates DMs.",
    },
    {
      number: 2,
      style: "THE QUESTION HOOK",
      title: "Generate comments — and next-audit data",
      purpose: `Questions drive comments. Comments become the audience language data the next audit mines for insight. Post one every mid-week.`,
      copy: `What if your [business process] could run while you sleep?

Most ${audience} I talk to do this manually. Three follow-up emails per lead, every day. By Friday, it's a part-time job nobody got hired for.

Here's what one ${city} client did differently: [1 sentence]

What's the one task you'd hand off first?

#${citySlug}business #aiautomation #smallbiz${citySlug} #productivity`,
      whenToUse: "Mid-week. The comments you get back are content for the next audit.",
    },
    {
      number: 3,
      style: "THE BEHIND-THE-SCENES",
      title: "Show the work. Build personality.",
      purpose: `Reference accounts in the ${cat} category post this kind of content far more. It humanizes the offer and shows competence without claiming it.`,
      copy: `Here's what we set up for a [client type] in ${city} this week:

→ [Specific automation 1]
→ [Specific automation 2]
→ [Specific automation 3]

Took us [time]. Will save them [hours/week].

Manual work compounds. Every week your team spends 4 hours on something a system could handle is 200 hours a year you can't get back.

DM us.

#${citySlug}business #${citySlug}ontario #automation #aiconsulting`,
      whenToUse: "Friday. Show the work week. Tag the city every time.",
    },
    {
      number: 4,
      style: "THE TOOL DEMO (REEL)",
      title: "Show your product working in 30 seconds",
      purpose: `Highest-engagement format for ${cat} on Instagram. Screen recording + real numbers + one DM CTA.`,
      copy: `HOOK (0–3s): "Watch this AI [action] in 30 seconds."

BODY (3–25s): Screen recording of the workflow.
Voiceover: "I gave it [input]. It returned [output]. The whole thing took [time]. Built for a [client type] in ${city} — runs [X times/day] in the background."

CTA (25–30s): "Send AUTOMATE in a DM."

Caption: [Restate demo + CTA + 8 hashtags including #${citySlug}business]`,
      whenToUse: "Bi-weekly. Highest-conversion format for this category in 2026.",
    },
  ];
}

export function postTemplateSlide(data: ReportData, num: 1 | 2 | 3 | 4): string {
  const templates = buildTemplates(data);
  const t = templates[num - 1];

  // Truncate copy to fit slide
  const copyPreview = t.copy.split("\n").slice(0, 10).join("\n");

  return `<span class="eyebrow">Toolkit · Post Template ${t.number} of 4</span>

<div class="post-template-card">
  <div class="badge">${t.number}</div>
  <span class="style-label">${e(t.style)}</span>
  <div class="style-title">${e(t.title)}</div>
  <p class="purpose">${e(t.purpose)}</p>
  <div class="copy-block">${e(copyPreview)}</div>
  <div class="when"><strong>When:</strong> ${e(t.whenToUse)}</div>
</div>`;
}
