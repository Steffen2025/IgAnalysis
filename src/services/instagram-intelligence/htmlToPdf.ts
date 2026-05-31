/**
 * Best-effort HTML → PDF using a headless browser already on the machine
 * (Edge or Chrome). No new dependency, no bundled Chromium download. Returns
 * the pdf path on success, or null if no browser was found / it failed — the
 * caller treats PDF as a bonus artifact, never a hard requirement.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

function browserCandidates(): string[] {
  if (process.platform === "win32") {
    return [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
  }
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
  }
  return ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
}

function fileUrl(p: string): string {
  const norm = p.replace(/\\/g, "/");
  return `file:///${norm.replace(/^\//, "")}`;
}

/** Convert an HTML file to PDF. Returns pdfPath on success, else null. */
export function htmlToPdf(htmlPath: string, pdfPath: string): string | null {
  const browser = browserCandidates().find((b) => existsSync(b));
  if (!browser) return null;
  try {
    execFileSync(
      browser,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        `--print-to-pdf=${pdfPath}`,
        fileUrl(htmlPath),
      ],
      { stdio: "ignore", timeout: 90_000 },
    );
    return existsSync(pdfPath) ? pdfPath : null;
  } catch {
    return null;
  }
}
