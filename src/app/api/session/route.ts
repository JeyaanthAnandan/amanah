import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError } from "@/server/http";
import { PERSONA_COOKIE } from "@/server/session";

/** Mock UAE PASS login: picks a seeded demo persona. */
export const POST = handle(async (req: Request) => {
  const { personaId } = z.object({ personaId: z.string() }).parse(await req.json());
  const u = await db.user.findUnique({ where: { id: personaId } });
  if (!u || u.simulated) throw new HttpError(404, "unknown_persona");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PERSONA_COOKIE, u.id, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
});
