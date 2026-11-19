import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { Role } from "@/lib/roles";
import { getCurrentUser, type SessionUser } from "./session";

import { HttpError } from "./http-error";
export { HttpError };

/** RBAC guard: throws 401 if no persona, 403 if the persona lacks every listed role. */
export async function requireUser(...roles: Role[]): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, "not_signed_in");
  if (roles.length && !roles.some((r) => u.roles.includes(r)))
    throw new HttpError(403, "forbidden");
  return u;
}

export function handle<A extends unknown[]>(
  fn: (...args: A) => Promise<unknown>,
) {
  return async (...args: A) => {
    try {
      const out = await fn(...args);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError)
        return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: "invalid_input", issues: e.issues }, { status: 400 });
      console.error(e);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  };
}
