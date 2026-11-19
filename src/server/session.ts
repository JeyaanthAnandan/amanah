import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import type { Role } from "@/lib/roles";
import { isLang, type Lang } from "@/i18n";

export const PERSONA_COOKIE = "amanah_persona";
export const LANG_COOKIE = "amanah_lang";

export type SessionUser = {
  id: string;
  name: string;
  nameAr: string;
  roles: Role[];
  phone: string;
  lang: string;
};

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const id = (await cookies()).get(PERSONA_COOKIE)?.value;
  if (!id) return null;
  const u = await db.user.findUnique({ where: { id } });
  if (!u || u.simulated) return null;
  return { ...u, roles: parseJson<Role[]>(u.roles, []) };
}

export const hasRole = (u: SessionUser | null, ...roles: Role[]) =>
  !!u && roles.some((r) => u.roles.includes(r));
