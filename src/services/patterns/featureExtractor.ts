import { classifyHook } from "./classifiers/hookClassifier.js";
import { classifyTone } from "./classifiers/toneClassifier.js";
import { detectContentElements } from "./classifiers/contentElementDetector.js";

export interface ExtractedFeatures {
  caption_length: number;
  emoji_count: number;
  emoji_density: number;
  hook_type: string;
  tone: string;
  content_elements: string[];
  hashtag_count: number;
}

// Unicode property escape for emoji — works in Node 16+
const EMOJI_RE = /\p{Extended_Pictographic}/gu;

function countEmoji(text: string): number {
  return (text.match(EMOJI_RE) ?? []).length;
}

function isValidHashtag(h: unknown): h is string {
  if (typeof h !== "string") return false;
  const tag = h.replace(/^#/, "");
  return tag.length >= 3 && !/^\d+$/.test(tag);
}

function parseHashtagCount(hashtagsJson: string | null | undefined): number {
  if (!hashtagsJson) return 0;
  try {
    const arr = JSON.parse(hashtagsJson);
    return Array.isArray(arr) ? arr.filter(isValidHashtag).length : 0;
  } catch {
    return 0;
  }
}

export function extractFeatures(
  post: {
    caption: string | null | undefined;
    post_type: string | null | undefined;
    hashtags: string | null | undefined;
  },
  clientCity?: string | null,
): ExtractedFeatures {
  const caption = post.caption ?? "";
  const caption_length = caption.length;
  const emoji_count = countEmoji(caption);
  const emoji_density = caption_length > 0 ? (emoji_count / caption_length) * 100 : 0;

  const hook_type = caption_length > 0 ? classifyHook(caption) : "description";
  const tone = caption_length > 0 ? classifyTone(caption) : "mixed";
  const content_elements = detectContentElements(caption, post.post_type, clientCity);
  const hashtag_count = parseHashtagCount(post.hashtags);

  return {
    caption_length,
    emoji_count,
    emoji_density,
    hook_type,
    tone,
    content_elements,
    hashtag_count,
  };
}
