import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/server/http";
import { LANG_COOKIE } from "@/server/session";

export const POST = handle(async (req: Request) => {
  const { lang } = z.object({ lang: z.enum(["en", "ar"]) }).parse(await req.json());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LANG_COOKIE, lang, { sameSite: "lax", path: "/" });
  return res;
});
