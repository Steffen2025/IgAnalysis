/**
 * Intelligence pipeline CLI.
 *
 *   npx tsx src/scripts/intelligence.ts generate --auditId=27
 *   npx tsx src/scripts/intelligence.ts validate --auditId=27
 *   npx tsx src/scripts/intelligence.ts print    --auditId=27
 *
 * generate: build + write all artifacts; exits non-zero on blocking validation.
 * validate: re-run validation against the last generated gold-master.
 * print:    print the gold-master markdown to stdout.
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { sqlClient } from "../db/index.js";
import { generateGoldMaster } from "../services/instagram-intelligence/generateGoldMaster.js";
import { isOpenRouterConfigured, getOpenRouterConfig, callOpenRouter } from "../services/llm/openRouterClient.js";
import { REQUIRED_ARTIFACTS } from "../services/instagram-intelligence/validateGoldMaster.js";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "generate";
  const auditId = Number(arg("auditId") ?? "27");
  if (!Number.isFinite(auditId)) throw new Error("Pass --auditId=<number>");

  const dir = path.resolve("reports", "intelligence", String(auditId));

  if (cmd === "test-llm") {
    if (!isOpenRouterConfigured()) {
      console.error("❌ OPENROUTER_API_KEY is not set.");
      console.error("   Add it to your .env or .env.local (both are gitignored):");
      console.error("   OPENROUTER_API_KEY=sk-or-...");
      process.exitCode = 1;
      return;
    }
    const cfg = getOpenRouterConfig();
    console.log(`OpenRouter key: configured ✅ · model: ${cfg.modelFast}`);
    const r = await callOpenRouter({
      model: cfg.modelFast,
      responseFormat: "json",
      taskLabel: "test-llm",
      temperature: 0,
      messages: [
        { role: "system", content: "Return only the exact JSON requested." },
        { role: "user", content: `Return JSON: {"ok": true, "provider": "openrouter", "model": "${cfg.modelFast}", "message": "OpenRouter live test passed"}` },
      ],
    });
    const ok = (r.json as { ok?: boolean })?.ok === true;
    console.log(`Response: ${JSON.stringify(r.json)}`);
    console.log(`Model: ${r.model} · elapsed: ${r.elapsedMs}ms · tokens: ${r.usage?.total_tokens ?? "?"}`);
    if (!ok) { console.error("❌ JSON did not validate."); process.exitCode = 1; }
    else console.log("✅ OpenRouter live test passed.");
    return;
  }

  if (cmd === "print") {
    process.stdout.write(readFileSync(path.join(dir, "gold-master.md"), "utf-8"));
    return;
  }

  if (cmd === "validate") {
    const report = readFileSync(path.join(dir, "validation-report.md"), "utf-8");
    process.stdout.write(report + "\n");
    if (/Result:\s*FAILED/.test(report)) process.exitCode = 1;
    return;
  }

  if (cmd === "analyze") {
    // Profile-first entry: handle in → derive city/type from scraped profile → generate.
    const handleArg = (arg("handle") ?? "").replace(/^@/, "").toLowerCase();
    if (!handleArg) { console.error("Pass --handle=<instagram_handle>"); process.exitCode = 1; return; }
    const { db } = await import("../db/index.js");
    const { audits } = await import("../db/schema.js");
    const { like, desc } = await import("drizzle-orm");
    const { enrichAuditMarketFromPosts } = await import("../services/audit/auditContextInference.js");
    const rows = await db.select({ id: audits.id }).from(audits)
      .where(like(audits.instagram_url, `%instagram.com/${handleArg}%`)).orderBy(desc(audits.id)).limit(1);
    if (rows.length === 0) {
      console.error(`No audit found for @${handleArg}. Scrape it first (runs the Apify profile+posts scrape), then re-run analyze.`);
      process.exitCode = 1; return;
    }
    const targetId = rows[0].id;
    console.log(`\n═══ Analyze @${handleArg} (audit ${targetId}) ═══`);
    console.log("Deriving city/type from scraped profile…");
    await enrichAuditMarketFromPosts(targetId); // fills city from profile/posts if missing
    const r = await generateGoldMaster(targetId);
    console.log(`Category: ${r.gm.meta.normalizedCategory} (${r.gm.meta.categoryKind}) · city: ${r.gm.meta.city || "—"}`);
    console.log(`Validation: ${r.passed ? "PASSED ✅" : "FAILED ❌"} · confidence ${r.gm.overallConfidence}/100`);
    console.log(`Gold master: reports/intelligence/${targetId}/gold-master.md`);
    if (!r.passed) process.exitCode = 1;
    return;
  }

  if (cmd === "discover") {
    // PAID: live Apify reference-competitor discovery. Requires explicit --live.
    if (!process.argv.includes("--live")) {
      console.error("⚠️  This runs PAID Apify actor runs. Re-run with --live to confirm:");
      console.error(`   npx tsx src/scripts/intelligence.ts discover --auditId=${auditId} --live`);
      process.exitCode = 1;
      return;
    }
    const { discoverAndPersistReferences } = await import("../services/instagram-intelligence/liveCompetitorDiscovery.js");
    console.log(`\n═══ Live reference discovery — audit ${auditId} ═══`);
    const r = await discoverAndPersistReferences(auditId);
    console.log(`Search terms: ${r.searchTerms.slice(0, 6).join(", ")}…`);
    console.log(`Hashtags: ${r.hashtags.map((h) => `#${h}`).join(" ")}`);
    console.log(`Candidates: ${r.candidateHandles.length} (hashtag ${r.candidatesBySource.hashtag} · search ${r.candidatesBySource.search} · google ${r.candidatesBySource.google} · related ${r.candidatesBySource.related}) · profiles scraped: ${r.profilesScraped} · Apify runs: ${r.apifyRuns}`);
    console.log(`Persisted (${r.persisted.length}):`);
    for (const p of r.persisted) console.log(`  ✓ @${p.handle} — ${p.followers ?? "?"} followers · success ${p.successScore} · ${p.type === "local_intel" ? "local peer" : "reference"} (via ${p.source})`);
    for (const x of r.rejected.slice(0, 10)) console.log(`  ✗ @${x.handle} — ${x.reason}`);
    console.log(`Status: ${r.status}`);
    console.log(`\nNext: npx tsx src/scripts/intelligence.ts generate --auditId=${auditId}  (picks up the new references)`);
    return;
  }

  if (cmd === "e2e:fixtures") {
    // Fixtures map to real audits in the DB.
    const fixtures = [
      { auditId: 27, handle: "boxbuddyapp", businessType: "moving and home inventory app" },
      { auditId: 22, handle: "activedoor", businessType: "garage door company" },
      { auditId: 18, handle: "jelinekmortgages", businessType: "mortgage broker" },
    ];
    const rows: string[] = [];
    let anyFail = false;
    for (const f of fixtures) {
      console.log(`\n── Fixture: @${f.handle} (audit ${f.auditId}) ──`);
      try {
        const r = await generateGoldMaster(f.auditId);
        if (!r.passed) anyFail = true;
        const gm = r.gm;
        const selHandles = gm.competitors.map((c) => `@${c.handle}`).join(", ") || "—";
        const rejHandles = gm.competitorDebug.rejected.map((x) => `@${x.handle} (${x.code})`).join(", ") || "—";
        const sectConf = gm.sectionConfidence.map((s) => `${s.sectionId}:${s.score}`).join(" ");
        const gaps = gm.dataGaps.map((g) => `[${g.severity}] ${g.area}`).join("; ") || "none";
        rows.push(`## @${f.handle} — audit ${f.auditId}

- **Business type:** ${f.businessType}
- **Normalized category:** ${gm.meta.normalizedCategory} (${gm.meta.categoryKind})
- **CTA strategy:** ${gm.category.ctaOptions[0]}
- **Overall confidence:** ${gm.overallConfidence}/100
- **Section confidence:** ${sectConf}
- **Top Five Moves:** ${gm.fixes.length} · **Next Seven Days:** ${gm.nextSevenDays.length}
- **Competitors selected:** ${gm.competitors.length} · **rejected:** ${gm.competitorDebug.rejected.length}
- **Selected:** ${selHandles}
- **Rejected:** ${rejHandles}
- **Observed posts:** ${gm.observedPosts.length}
- **Market:** ${gm.marketComparison.activityLevel} (${gm.marketComparison.cadenceVerdict})
- **Validation:** ${gm.validation.passed ? "PASSED ✅" : "FAILED ❌ (" + gm.validation.blockingCount + " blocking)"}
- **Data gaps:** ${gaps}
- **Output:** reports/intelligence/${f.auditId}/gold-master.md`);
        console.log(`  ${gm.meta.normalizedCategory} · conf ${gm.overallConfidence} · comps ${gm.competitors.length}✓/${gm.competitorDebug.rejected.length}✗ · ${gm.validation.passed ? "PASS" : "FAIL"}`);
      } catch (e) {
        anyFail = true;
        rows.push(`## @${f.handle} — audit ${f.auditId}\n\n**ERROR:** ${(e as Error).message}`);
        console.error(`  ERROR: ${(e as Error).message}`);
      }
    }
    const outPath = path.resolve("reports", "intelligence", "fixture-comparison.md");
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `# Fixture Comparison — Instagram Intelligence Engine\n\n_Generated ${new Date().toISOString()}_\n\nProves the engine runs generically across an app, a home-service business, and a financial-services business.\n\n${rows.join("\n\n")}\n`, "utf-8");
    console.log(`\nComparison report: ${outPath}`);
    if (anyFail) process.exitCode = 1;
    return;
  }

  if (cmd === "e2e") {
    console.log(`\n═══ E2E — audit ${auditId} ═══`);
    console.log(`OpenRouter configured: ${isOpenRouterConfigured() ? "yes (live)" : "no (deterministic core)"}`);
    const result = await generateGoldMaster(auditId);
    // Artifact presence.
    const missing = REQUIRED_ARTIFACTS.filter((f) => !existsSync(path.join(dir, f)));
    if (missing.length) { console.error("❌ Missing artifacts:", missing.join(", ")); process.exitCode = 1; }
    console.log(`Artifacts: ${REQUIRED_ARTIFACTS.length - missing.length}/${REQUIRED_ARTIFACTS.length} present`);
    console.log(`Validation: ${result.passed ? "PASSED ✅" : "FAILED ❌"} (${result.gm.validation.blockingCount} blocking)`);
    console.log(`Overall confidence: ${result.gm.overallConfidence}/100`);
    console.log(`Category: ${result.gm.meta.normalizedCategory} (${result.gm.meta.categoryKind}) · model: ${result.gm.meta.modelUsed}`);
    console.log(`Competitors: ${result.gm.competitors.length} selected / ${result.gm.competitorDebug.rejected.length} rejected`);
    if (!result.passed || missing.length) process.exitCode = 1;
    return;
  }

  // generate
  console.log(`\n═══ Gold Master — audit ${auditId} ═══\n`);
  const result = await generateGoldMaster(auditId);
  console.log("Artifacts:");
  for (const [k, v] of Object.entries(result.paths)) console.log(`  ${k}: ${v}`);
  console.log(`\nValidation: ${result.passed ? "PASSED ✅" : "FAILED ❌"} ` +
    `(${result.gm.validation.blockingCount} blocking, ${result.gm.validation.warningCount} warnings)`);
  console.log(`Category: ${result.gm.meta.normalizedCategory} (${result.gm.meta.categoryKind}) · model: ${result.gm.meta.modelUsed}`);
  console.log(`Competitors: ${result.gm.competitors.length} selected / ${result.gm.competitorDebug.rejected.length} rejected`);
  if (!result.passed) {
    console.error("\nBlocking issues:");
    for (const i of result.gm.validation.issues.filter((x) => x.severity === "blocking")) {
      console.error(`  🛑 [${i.rule}] ${i.detail}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("\nIntelligence run failed:", err);
    process.exitCode = 1;
  })
  .finally(() => sqlClient.end({ timeout: 5 }));
