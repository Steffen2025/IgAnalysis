import path from "node:path";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { audits, report_deliveries, report_artifacts } from "../../db/schema.js";

export async function emailReport(auditId: number, emailTo: string): Promise<void> {
  const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
  if (!audit) throw new Error(`Audit ${auditId} not found`);

  const artifact = (await db
    .select()
    .from(report_artifacts)
    .where(eq(report_artifacts.audit_id, auditId)))
    .find((item) => item.kind === "pdf" && item.theme === "dark");

  if (!artifact) throw new Error("No dark PDF artifact found. Generate the report first.");

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "BotLogix <reports@botlogix.ca>";

  if (!host || !user || !pass) {
    const message = "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.";
    await db.insert(report_deliveries)
      .values({
        audit_id: auditId,
        email_to: emailTo,
        artifact_path: artifact.path,
        status: "failed",
        error_message: message,
      });
    throw new Error(message);
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from,
      to: emailTo,
      subject: `Your BotLogix Instagram audit is ready: ${audit.business_name ?? `Audit #${auditId}`}`,
      text: [
        `Hi,`,
        ``,
        `Your BotLogix Instagram audit is ready.`,
        ``,
        `Business: ${audit.business_name ?? "Untitled"}`,
        `Instagram: ${audit.instagram_url ?? ""}`,
        `Market: ${[audit.city, audit.service_area].filter(Boolean).join(" / ")}`,
        ``,
        `The PDF is attached.`,
        ``,
        `BotLogix`,
      ].join("\n"),
      attachments: [
        {
          filename: path.basename(artifact.path),
          path: path.resolve(process.cwd(), artifact.path),
        },
      ],
    });

    await db.insert(report_deliveries)
      .values({
        audit_id: auditId,
        email_to: emailTo,
        artifact_path: artifact.path,
        status: "sent",
      });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    await db.insert(report_deliveries)
      .values({
        audit_id: auditId,
        email_to: emailTo,
        artifact_path: artifact.path,
        status: "failed",
        error_message: message,
      });
    throw err;
  }
}
