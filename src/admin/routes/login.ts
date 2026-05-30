import type { FastifyInstance } from "fastify";
import { loginPage } from "../views.js";
import { verifyAdminPassword } from "../auth.js";

export async function loginRoutes(app: FastifyInstance): Promise<void> {
  app.get("/login", async (request, reply) => {
    if ((request.session as any).admin === true) return reply.redirect("/audits");
    const query = request.query as { error?: string };
    return reply.type("text/html").send(loginPage(query.error));
  });

  app.post("/login", async (request, reply) => {
    const body = request.body as { password?: string; next?: string };
    if (await verifyAdminPassword(body.password ?? "")) {
      (request.session as any).admin = true;
      return reply.redirect(body.next || "/audits");
    }
    return reply.redirect("/login?error=Invalid%20password");
  });

  app.post("/logout", async (request, reply) => {
    request.session.destroy(() => {
      reply.redirect("/login");
    });
  });
}
