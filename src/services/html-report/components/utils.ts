import { marked } from "marked";

export interface SignalArray {
  label: string;
  value: number;
  max: number;
  direction: "positive" | "negative";
}

export function scoreColor(score: number): string {
  if (score >= 70) return "var(--score-high)";
  if (score >= 40) return "var(--score-mid)";
  return "var(--score-low)";
}

export function scoreLabelClass(score: number): string {
  if (score >= 70) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function markdownToHTML(md: string): string {
  // marked.parse can return string or Promise — use synchronous API
  const result = marked.parse(md, { async: false });
  return result as string;
}

export function addReauditDate(auditDate: Date): string {
  const d = new Date(auditDate);
  d.setDate(d.getDate() + 30);
  return formatDate(d);
}

// Parse a markdown table into row arrays
// Returns [header[], ...rows[]]
export function parseMarkdownTable(md: string): string[][] {
  const lines = md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !l.match(/^\|[-: |]+\|$/));
  return lines.map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim())
  );
}

// Extract days from next_7_days markdown
export interface DayData {
  label: string; // "Day 1 — Fix What People See First"
  title: string;
  items: string[];
}

export function parseDays(md: string): DayData[] {
  const days: DayData[] = [];
  const dayPattern = /\*\*Day (\d+)[^*]*\*\*\n([\s\S]*?)(?=\*\*Day \d+|\Z|$)/g;
  let match;
  const text = md + "\n**Day 99"; // sentinel
  while ((match = dayPattern.exec(text)) !== null) {
    const num = match[1];
    const body = match[2].trim();
    const lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-"))
      .map((l) => l.replace(/^-\s*/, ""));
    // Get the full day heading
    const headingMatch = md.match(
      new RegExp(`\\*\\*Day ${num}[^*]*\\*\\*`)
    );
    const heading = headingMatch ? headingMatch[0].replace(/\*\*/g, "") : `Day ${num}`;
    days.push({ label: heading, title: heading, items: lines });
  }
  return days.slice(0, 7);
}

// Parse reels from content_kit markdown
export interface ReelData {
  number: number;
  topic: string;
  contrast?: string;
  hookPattern?: string;
  compositeScore?: string;
  hook: string;
  body: string[];
  caption: string;
  cta: string;
}

export interface CarouselData {
  number: number;
  topic: string;
  slides: string[];
  caption: string;
  cta: string;
}

export function parseReels(md: string): ReelData[] {
  const reels: ReelData[] = [];
  // Match each reel block
  const reelPattern =
    /\*\*Reel (\d+)\s*[—–-]\s*([^\n*]+)\*\*\n([\s\S]*?)(?=\*\*Reel \d+|\*\*Carousel|\Z|---\n\n## 3 Carousel)/g;
  let match;
  while ((match = reelPattern.exec(md)) !== null) {
    const num = parseInt(match[1]);
    const topic = match[2].trim();
    const body = match[3];

    const contrastMatch = body.match(/Contrast:\s*([^\n]+)/);
    const patternMatch = body.match(/Hook pattern:\s*([^\|]+)\|?\s*Composite score:\s*([^\n]+)/);
    const hookMatch = body.match(/Hook(?:\s*\([^)]*\))?:\s*([^\n]+)/);

    const bodyLines: string[] = [];
    const bodySection = body.match(/Body:\n([\s\S]*?)(?=\nCaption:|$)/);
    if (bodySection) {
      const bLines = bodySection[1]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("-"))
        .map((l) => l.replace(/^-\s*/, ""));
      bodyLines.push(...bLines);
    }

    const captionMatch = body.match(/Caption(?:\s*\([^)]*\))?:\s*([^\n]+(?:\n(?!CTA:)[^\n]+)*)/);
    const ctaMatch = body.match(/CTA:\s*([^\n]+)/);

    reels.push({
      number: num,
      topic,
      contrast: contrastMatch ? contrastMatch[1].trim() : undefined,
      hookPattern: patternMatch ? patternMatch[1].trim() : undefined,
      compositeScore: patternMatch ? patternMatch[2].trim() : undefined,
      hook: hookMatch ? hookMatch[1].trim() : "",
      body: bodyLines,
      caption: captionMatch ? captionMatch[1].trim() : "",
      cta: ctaMatch ? ctaMatch[1].trim() : "",
    });
  }
  return reels.slice(0, 3);
}

export function parseCarousels(md: string): CarouselData[] {
  const carousels: CarouselData[] = [];
  const carouselPattern =
    /\*\*Carousel (\d+)\s*[—–-]\s*([^\n*]+)\*\*\n([\s\S]*?)(?=\*\*Carousel \d+|\Z|---\n\n##|$)/g;
  let match;
  const searchText = md + "\n---\n\n## END";
  while ((match = carouselPattern.exec(searchText)) !== null) {
    const num = parseInt(match[1]);
    const topic = match[2].trim();
    const body = match[3];

    const slides: string[] = [];
    const slidePattern = /Slide (\d+):\s*([^\n]+)/g;
    let sm;
    while ((sm = slidePattern.exec(body)) !== null) {
      slides.push(sm[2].trim());
    }

    const captionMatch = body.match(/Caption(?:\s*\([^)]*\))?:\s*([^\n]+(?:\n(?!CTA:)[^\n]+)*)/);
    const ctaMatch = body.match(/CTA:\s*([^\n]+)/);

    carousels.push({
      number: num,
      topic,
      slides,
      caption: captionMatch ? captionMatch[1].trim() : "",
      cta: ctaMatch ? ctaMatch[1].trim() : "",
    });
  }
  return carousels.slice(0, 3);
}

// Parse do_this_next into 10 items
export interface ActionItem {
  number: number;
  text: string;
  timeTag: string;
}

export function parseActions(md: string): ActionItem[] {
  const items: ActionItem[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s+(.+)/);
    if (m) {
      const num = parseInt(m[1]);
      const text = m[2].trim();
      let timeTag = "THIS WEEK";
      if (/\(today\)/i.test(text)) timeTag = "TODAY";
      else if (/\(this month\)/i.test(text)) timeTag = "THIS MONTH";
      else if (/30 days/i.test(text)) timeTag = "IN 30 DAYS";
      else if (/\(this week\)/i.test(text)) timeTag = "THIS WEEK";
      items.push({ number: num, text: text.replace(/\s*\([^)]+\)\s*$/, "").trim(), timeTag });
    }
  }
  return items.slice(0, 10);
}

// Parse battle plan priorities (numbered list items)
export interface Priority {
  number: number;
  title: string;
  body: string;
}

export function parsePriorities(md: string): Priority[] {
  const priorities: Priority[] = [];
  // Match **bold title** followed by explanation
  const pattern = /(\d+)\.\s+\*\*([^*]+)\*\*\s*([\s\S]*?)(?=\n\d+\.|\n\nThis report|$)/g;
  let match;
  while ((match = pattern.exec(md)) !== null) {
    priorities.push({
      number: parseInt(match[1]),
      title: match[2].trim(),
      body: match[3].trim(),
    });
  }
  return priorities.slice(0, 5);
}
