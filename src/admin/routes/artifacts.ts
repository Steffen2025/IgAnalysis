import { createReadStream } from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../auth.js";
import {
  findRecordedArtifact,
  safeResolveRelativePath,
} from "../services/reportArtifacts.js";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".png": "image/png",
};

export async function artifactRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

  app.get("/artifacts/:id", async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    const artifact = await findRecordedArtifact(id);
    if (!artifact) return reply.code(404).send("Artifact not found");
    const absolute = safeResolveRelativePath(artifact.path);
    if (!absolute) return reply.code(404).send("Artifact file not found");
    return sendFile(reply, absolute);
  });

  app.get("/artifact-file", async (request, reply) => {
    const query = request.query as { path?: string };
    if (!query.path) return reply.code(400).send("Missing path");
    const absolute = safeResolveRelativePath(query.path);
    if (!absolute) return reply.code(404).send("Artifact file not found");
    return sendFile(reply, absolute);
  });
}

function sendFile(reply: any, absolutePath: string): any {
  const ext = path.extname(absolutePath).toLowerCase();
  reply.header("Content-Type", MIME[ext] ?? "application/octet-stream");
  return reply.send(createReadStream(absolutePath));
}
