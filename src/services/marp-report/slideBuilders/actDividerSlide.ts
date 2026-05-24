export interface ActDividerInput {
  roman: "I" | "II" | "III";
  title: string;
  intent: string;
}

export function actDividerSlide(input: ActDividerInput): string {
  return `<!-- _class: act-divider -->

<div class="roman">${input.roman}</div>
<h2 class="act-title">${input.title}</h2>
<p class="act-intent">${input.intent}</p>`;
}
