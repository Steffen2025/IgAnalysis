import type { ReportData } from "../../report/reportDataAssembler.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function audienceVoiceSlide(data: ReportData, audienceMd: string): string {
  const comments = data.comments as any;
  const questions: string[] = comments?.topQuestions ?? [];
  const city = e(data.reportContext.localMarketLabel ?? "your city");

  if (questions.length > 0) {
    const items = questions.slice(0, 5).map(q => `<div class="pull-quote" style="font-size:20px;margin:8px 0;padding:10px 0 10px 20px">${e(q)}</div>`).join("");
    return `<span class="eyebrow">What Your Audience Is Saying</span>

# Top questions from your comments

${items}`;
  }

  // No comments — graceful fallback
  const prose = audienceMd
    .split("\n")
    .filter(l => l.trim() && !l.startsWith("#"))
    .map(l => l.replace(/\*\*/g, ""))
    .slice(0, 4)
    .join(" ")
    .slice(0, 500);

  return `<span class="eyebrow">What Your Audience Is Saying</span>

# Audience voice: data gap

<div style="background:var(--bg-card);border-left:3px solid var(--accent);padding:24px 28px;margin-top:16px">
  <p style="font-size:18px;margin-bottom:12px">No comment data available for this audit period. This is common for newer accounts or those with comments turned off.</p>
  <p style="font-size:16px">The 7-day plan in this report is designed to generate the first wave of audience language — questions, objections, and vocabulary — from real ${city} buyers. Run the audit again in 30 days.</p>
</div>

${prose ? `<p style="font-size:17px;margin-top:16px">${e(prose)}</p>` : ""}`;
}
