import type { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";

export async function verifyAdminPassword(input: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (hash) return bcrypt.compare(input, hash);

  const password = process.env.ADMIN_PASSWORD?.trim() || "botlogix";
  return input === password;
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if ((request.session as any).admin === true) return;
  reply.redirect(`/login?next=${encodeURIComponent(request.url)}`);
}

export function isAdmin(request: FastifyRequest): boolean {
  return (request.session as any).admin === true;
}
